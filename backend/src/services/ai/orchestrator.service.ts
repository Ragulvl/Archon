import { v4 as uuidv4 } from 'uuid';
import { Server as SocketServer } from 'socket.io';
import { MessageRole } from '@prisma/client';
import type { AgentType, ArtifactType } from '@archon/shared';
import { INTENT_AGENT_MAP, AGENT_TOKEN_BUDGETS } from '@archon/shared';

import prisma from '../../db/prisma.client';
import { aiLogger } from '../../utils/logger';
import { callAI, extractJSON, LLMMessage } from './router.service';
import { classifyIntent } from './classifier.service';
import { buildContext, updateProjectContext } from './context.service';
import { PROMPTS, buildUserMessage, buildModifyMessage } from './prompts.service';
import { countTokens } from '../../utils/token.counter';

let _io: SocketServer | null = null;

export function setSocketServer(io: SocketServer): void {
  _io = io;
}

function emit(sessionId: string, event: string, data: unknown): void {
  _io?.to(`session:${sessionId}`).emit(event, data);
}

// ─── Main Orchestrator ────────────────────────────────────────────

export interface OrchestratorInput {
  sessionId: string;
  projectId: string;
  userMessage: string;
  userId: string;
}

export interface OrchestratorResult {
  messageId: string;
  content: string;
  artifactIds: string[];
  model: string;
  totalTokens: number;
}

export async function orchestrate(input: OrchestratorInput): Promise<OrchestratorResult> {
  const { sessionId, projectId, userMessage, userId } = input;
  const jobId = uuidv4();
  const startedAt = Date.now();

  aiLogger.info(`[${jobId}] Orchestrating: "${userMessage.slice(0, 80)}"`);

  // 1. Save user message to DB
  await prisma.chatMessage.create({
    data: { sessionId, role: MessageRole.USER, content: userMessage },
  });

  // 2. Classify intent
  const { intent } = await classifyIntent(userMessage);
  const agents: AgentType[] = INTENT_AGENT_MAP[intent];
  aiLogger.info(`[${jobId}] Intent: ${intent} → Agents: ${agents.join(', ')}`);

  // Notify client of pipeline start
  emit(sessionId, 'agent:pipeline', { jobId, agents, intent, status: 'running' });

  // 3. Load context
  const { systemAddendum, recentMessages } = await buildContext(projectId, sessionId);

  // 4. Run agents
  let fullContent   = '';
  let combinedData: Record<string, unknown> = {};
  let usedModel     = 'unknown';
  let totalTokens   = 0;
  const artifactIds: string[] = [];

  for (const agentType of agents) {
    emit(sessionId, 'agent:status', { jobId, agent: agentType, status: 'running', progress: 0 });

    try {
      const agentResult = await runAgent(agentType, {
        jobId,
        sessionId,
        projectId,
        userMessage,
        intent,
        systemAddendum,
        recentMessages,
        previousData: combinedData,
        onToken: (token) => {
          fullContent += token;
          emit(sessionId, 'chat:token', { token });
        },
      });

      combinedData = { ...combinedData, ...agentResult.data };
      usedModel    = agentResult.model;
      totalTokens += agentResult.tokens;

      emit(sessionId, 'agent:status', { jobId, agent: agentType, status: 'done', progress: 100 });
    } catch (err) {
      aiLogger.error(`[${jobId}] Agent ${agentType} failed:`, err);
      emit(sessionId, 'agent:status', {
        jobId, agent: agentType, status: 'error', progress: 0,
        message: (err as Error).message,
      });
    }
  }

  // 5. Build readable response text
  const responseText = buildResponseText(combinedData, intent, userMessage);
  if (!fullContent) fullContent = responseText; // non-streaming fallback

  // 6. Save assistant message + artifacts
  const assistantMsg = await prisma.chatMessage.create({
    data: {
      sessionId,
      role:       MessageRole.ASSISTANT,
      content:    responseText,
      tokenCount: totalTokens,
      metadata:   {
        model: usedModel,
        agentPipeline: agents,
        intentType: intent,
        durationMs: Date.now() - startedAt,
      },
    },
  });

  // 7. Persist artifacts
  if (Object.keys(combinedData).length > 0) {
    const artifactType: ArtifactType = intentToArtifactType(intent);
    const artifact = await prisma.artifact.create({
      data: {
        projectId,
        messageId: assistantMsg.id,
        type:      artifactType,
        name:      `${intent}-${new Date().toISOString().slice(0, 10)}`,
        content:   JSON.stringify(combinedData),
        version:   1,
      },
    });
    artifactIds.push(artifact.id);

    // Persist individual generated files
    if (combinedData.frontend && typeof combinedData.frontend === 'object') {
      const files = combinedData.frontend as Record<string, string>;
      await prisma.generatedFile.createMany({
        data: Object.entries(files).map(([path, content]) => ({
          artifactId: artifact.id,
          path,
          content,
          language: detectLanguage(path),
          sizeBytes: Buffer.byteLength(content, 'utf8'),
        })),
      });
    }

    // Emit artifact update to client
    emit(sessionId, 'artifact:update', {
      artifactId: artifact.id,
      type:       artifactType,
      data:       combinedData,
    });
  }

  // 8. Update project context asynchronously
  updateProjectContext(projectId, sessionId, JSON.stringify(combinedData).slice(0, 1000))
    .catch(err => aiLogger.warn('Context update failed:', err));

  // 9. Log usage
  await prisma.usageLog.create({
    data: {
      projectId,
      model:            usedModel,
      provider:         usedModel.includes('groq') ? 'groq' : 'openrouter',
      promptTokens:     Math.round(totalTokens * 0.7),
      completionTokens: Math.round(totalTokens * 0.3),
      totalTokens,
      durationMs:       Date.now() - startedAt,
    },
  });

  emit(sessionId, 'chat:done', {
    messageId:   assistantMsg.id,
    content:     responseText,
    artifactIds,
  });

  return {
    messageId:   assistantMsg.id,
    content:     responseText,
    artifactIds,
    model:       usedModel,
    totalTokens,
  };
}

// ─── Agent Runners ────────────────────────────────────────────────

interface AgentRunInput {
  jobId: string;
  sessionId: string;
  projectId: string;
  userMessage: string;
  intent: string;
  systemAddendum: string;
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  previousData: Record<string, unknown>;
  onToken: (token: string) => void;
}

interface AgentRunResult {
  data: Record<string, unknown>;
  model: string;
  tokens: number;
}

async function runAgent(agentType: AgentType, input: AgentRunInput): Promise<AgentRunResult> {
  const { userMessage, intent, systemAddendum, recentMessages, previousData, onToken } = input;

  const systemPrompt = getSystemPrompt(agentType, intent) + systemAddendum;
  const userContent  = buildAgentUserMessage(agentType, userMessage, intent, previousData);

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    ...recentMessages,
    { role: 'user', content: userContent },
  ];

  const maxTokens = AGENT_TOKEN_BUDGETS[agentType];

  // FRONTEND agent uses streaming; others use JSON mode
  const useStreaming = agentType === 'FRONTEND' || agentType === 'REPAIR';

  let rawContent = '';

  if (useStreaming) {
    let streamBuf = '';
    const result = await callAI(messages, { maxTokens }, (token) => {
      streamBuf += token;
      onToken(token);
    });
    rawContent = result.content || streamBuf;

    try {
      const parsed = extractJSON(rawContent);
      return { data: parsed, model: result.model, tokens: countTokens(rawContent) };
    } catch {
      return { data: { rawOutput: rawContent }, model: result.model, tokens: countTokens(rawContent) };
    }
  } else {
    const result = await callAI(messages, {
      maxTokens,
      responseFormat: 'json_object',
    });
    rawContent = result.content;
    const parsed = extractJSON(rawContent);
    return {
      data:   parsed,
      model:  result.model,
      tokens: (result.promptTokens ?? 0) + (result.completionTokens ?? 0),
    };
  }
}

function getSystemPrompt(agentType: AgentType, intent: string): string {
  // For full builds, use the combined prompt for efficiency
  if (intent === 'new_build' && (agentType === 'FRONTEND' || agentType === 'ARCHITECTURE')) {
    return PROMPTS.FULL_BUILD;
  }
  switch (agentType) {
    case 'ARCHITECTURE': return PROMPTS.ARCHITECTURE;
    case 'FRONTEND':     return PROMPTS.FRONTEND;
    case 'REPAIR':       return PROMPTS.REPAIR;
    case 'EXPLAIN':      return PROMPTS.EXPLAIN;
    default:             return PROMPTS.FULL_BUILD;
  }
}

function buildAgentUserMessage(
  agentType: AgentType,
  userMessage: string,
  intent: string,
  previousData: Record<string, unknown>
): string {
  if (intent === 'new_build' || intent === 'regenerate') {
    return buildUserMessage(userMessage);
  }

  const prevCode = previousData.frontend
    ? JSON.stringify(previousData.frontend).slice(0, 2000)
    : '';

  if (intent === 'modify_ui') return buildModifyMessage(userMessage, prevCode, 'ui');
  if (intent === 'modify_api') return buildModifyMessage(userMessage, prevCode, 'api');

  return buildModifyMessage(userMessage, prevCode, 'all');
}

function buildResponseText(data: Record<string, unknown>, intent: string, prompt: string): string {
  if (intent === 'explain' && data.explanation) {
    return data.explanation as string;
  }
  const hasArch = !!data.architecture;
  const hasFE   = !!data.frontend;

  if (hasArch && hasFE) {
    const arch = data.architecture as { techStack?: Record<string, string>; features?: { user?: string[] } };
    const stack = arch.techStack ? Object.values(arch.techStack).slice(0, 3).join(', ') : 'modern stack';
    const features = arch.features?.user?.slice(0, 3).join(', ') ?? '';
    return `✅ Generated complete application for **"${prompt}"**\n\n**Stack:** ${stack}\n**Features:** ${features}, and more.\n\nSee the Architecture, Code, and Preview tabs.`;
  }
  if (hasFE) return `✅ Frontend updated. Check the Code and Preview tabs.`;
  if (hasArch) return `✅ Architecture updated. Check the Architecture tab.`;

  return `✅ Generation complete.`;
}

function intentToArtifactType(intent: string): ArtifactType {
  const map: Record<string, ArtifactType> = {
    new_build:   'FULL_BUILD',
    modify_ui:   'FRONTEND',
    modify_api:  'API_ROUTES',
    modify_db:   'DATABASE',
    fix_bug:     'FRONTEND',
    add_feature: 'FULL_BUILD',
    regenerate:  'FULL_BUILD',
    explain:     'ARCHITECTURE',
  };
  return map[intent] ?? 'FULL_BUILD';
}

function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    jsx: 'javascript', tsx: 'typescript', js: 'javascript',
    ts: 'typescript', css: 'css', html: 'html', json: 'json',
  };
  return map[ext] ?? 'text';
}

// ─── Legacy /generate endpoint compatibility ──────────────────────

export async function generateLegacy(prompt: string): Promise<{
  data: Record<string, unknown>;
  steps: Array<{ step: string; status: string }>;
  model: string;
}> {
  const steps: Array<{ step: string; status: string }> = [];
  steps.push({ step: 'Routing to AI provider…', status: 'running' });

  try {
    const messages: LLMMessage[] = [
      { role: 'system', content: PROMPTS.FULL_BUILD },
      { role: 'user', content: buildUserMessage(prompt) },
    ];

    const result = await callAI(messages, {
      maxTokens: 8000,
      responseFormat: 'json_object',
    });

    steps.push({ step: `Generated via ${result.model}`, status: 'done' });
    const data = extractJSON(result.content);
    return { data, steps, model: result.model };
  } catch (err) {
    steps.push({ step: (err as Error).message, status: 'error' });
    throw err;
  }
}
