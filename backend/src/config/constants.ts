/** Application-wide constants (not env-dependant) */

export const APP_VERSION = '2.0.0';
export const APP_NAME    = 'Archon';

/** OpenRouter model roster — primary first, fallbacks after */
export const OPENROUTER_MODELS = [
  {
    id:        'anthropic/claude-3.5-sonnet',
    label:     'Claude 3.5 Sonnet',
    maxTokens: 8192,
    priority:  1,
  },
  {
    id:        'openai/gpt-4o',
    label:     'GPT-4o',
    maxTokens: 8192,
    priority:  2,
  },
  {
    id:        'google/gemini-2.0-flash-exp:free',
    label:     'Gemini 2.0 Flash',
    maxTokens: 8000,
    priority:  3,
  },
  {
    id:        'meta-llama/llama-3.3-70b-instruct',
    label:     'Llama 3.3 70B',
    maxTokens: 8000,
    priority:  4,
  },
] as const;

/** Groq fallback models */
export const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Groq)', maxTokens: 8000 },
  { id: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B (Groq)',  maxTokens: 8000 },
] as const;

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
export const GROQ_BASE_URL       = 'https://api.groq.com/openai/v1';

export const AI_REQUEST_TIMEOUT_MS = 120_000;
export const AI_MAX_RETRIES        = 2;

export const GUEST_USER_ID    = 'guest-user';
export const GUEST_PROJECT_ID = 'demo';

/** Local storage path for dev */
export const LOCAL_STORAGE_DIR = 'storage/artifacts';
