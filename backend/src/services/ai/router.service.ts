import { env } from '../../config/env';
import {
  OPENROUTER_BASE_URL,
  OPENROUTER_MODELS,
  GROQ_BASE_URL,
  GROQ_MODELS,
  AI_REQUEST_TIMEOUT_MS,
} from '../../config/constants';
import { aiLogger } from '../../utils/logger';
import { withRetry, isRateLimitError, isContextLengthError } from '../../utils/retry';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCallOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  responseFormat?: 'json_object' | 'text';
}

export interface LLMResult {
  content: string;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
}

export type StreamCallback = (token: string) => void;

// ─── OpenRouter Call ──────────────────────────────────────────────

async function callOpenRouter(
  messages: LLMMessage[],
  opts: LLMCallOptions = {},
  onToken?: StreamCallback
): Promise<LLMResult> {
  if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not configured');

  const modelId = opts.model ?? OPENROUTER_MODELS[0].id;
  const isStream = !!onToken;

  const body: Record<string, unknown> = {
    model: modelId,
    messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? 8000,
    stream: isStream,
  };

  if (opts.responseFormat === 'json_object') {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': env.OPENROUTER_SITE_URL,
      'X-Title': env.OPENROUTER_APP_NAME,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${errText}`);
  }

  // ── Streaming response ────────────────────────────────────────
  if (isStream && response.body) {
    let content = '';
    const reader  = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        const jsonStr = line.slice(6);
        if (jsonStr === '[DONE]') break;
        try {
          const parsed = JSON.parse(jsonStr);
          const token  = parsed.choices?.[0]?.delta?.content ?? '';
          if (token) {
            content += token;
            onToken(token);
          }
        } catch { /* skip malformed SSE */ }
      }
    }

    return {
      content,
      model: modelId,
      provider: 'openrouter',
      promptTokens: 0,    // Not available in stream mode
      completionTokens: 0,
    };
  }

  // ── Non-streaming response ────────────────────────────────────
  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens: number; completion_tokens: number };
    model: string;
  };

  return {
    content:          data.choices[0].message.content,
    model:            data.model ?? modelId,
    provider:         'openrouter',
    promptTokens:     data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
  };
}

// ─── Groq Fallback Call ───────────────────────────────────────────

async function callGroq(
  messages: LLMMessage[],
  opts: LLMCallOptions = {}
): Promise<LLMResult> {
  const keys = (env.GROQ_API_KEYS ?? '').split(',').map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) throw new Error('GROQ_API_KEYS not configured');

  const modelId = opts.model ?? GROQ_MODELS[0].id;

  for (const key of keys) {
    try {
      const body: Record<string, unknown> = {
        model: modelId,
        messages,
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 8000,
      };
      if (opts.responseFormat === 'json_object') {
        body.response_format = { type: 'json_object' };
      }

      const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Groq ${response.status}: ${text}`);
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
        usage?: { prompt_tokens: number; completion_tokens: number };
        model: string;
      };

      return {
        content:          data.choices[0].message.content,
        model:            data.model ?? modelId,
        provider:         'groq',
        promptTokens:     data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
      };
    } catch (err) {
      if (isRateLimitError(err as Error)) continue; // try next key
      throw err;
    }
  }
  throw new Error('All Groq API keys exhausted');
}

// ─── Public Router Function ───────────────────────────────────────

/**
 * Call the AI with automatic fallback chain:
 *   OpenRouter (multi-model) → Groq (fallback) → error
 */
export async function callAI(
  messages: LLMMessage[],
  opts: LLMCallOptions = {},
  onToken?: StreamCallback
): Promise<LLMResult> {
  // 1. Try OpenRouter models in priority order
  if (env.OPENROUTER_API_KEY) {
    for (const model of OPENROUTER_MODELS) {
      try {
        aiLogger.debug(`Trying ${model.label} via OpenRouter`);
        const result = await withRetry(
          () => callOpenRouter(messages, { ...opts, model: model.id }, onToken),
          { retries: 1 }
        );
        aiLogger.debug(`✓ Success via ${model.label}`);
        return result;
      } catch (err) {
        const error = err as Error;
        if (isContextLengthError(error)) {
          aiLogger.warn(`${model.label} context too long, trying next model`);
          continue;
        }
        if (isRateLimitError(error)) {
          aiLogger.warn(`${model.label} rate limited, trying next model`);
          continue;
        }
        aiLogger.warn(`${model.label} failed: ${error.message}`);
        // Non-recoverable error on first model → try next
        if (OPENROUTER_MODELS.indexOf(model) < OPENROUTER_MODELS.length - 1) continue;
      }
    }
  }

  // 2. Groq fallback (non-streaming only)
  for (const model of GROQ_MODELS) {
    try {
      aiLogger.debug(`Fallback: trying ${model.label} via Groq`);
      const result = await callGroq(messages, { ...opts, model: model.id });
      aiLogger.debug(`✓ Fallback success via ${model.label}`);
      return result;
    } catch (err) {
      aiLogger.warn(`Groq ${model.label} failed: ${(err as Error).message}`);
    }
  }

  throw new Error('All AI providers exhausted. Please check your API keys.');
}

/** Extract JSON from a potentially markdown-wrapped LLM response */
export function extractJSON(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw);
  } catch { /* noop */ }

  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try { return JSON.parse(fence[1].trim()); } catch { /* noop */ }
  }

  const start = raw.indexOf('{');
  const end   = raw.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(raw.slice(start, end + 1)); } catch { /* noop */ }
  }

  throw new Error('Could not extract valid JSON from AI response');
}
