/**
 * AI Orchestrator v3 — Consolidated generation with proper error handling.
 *
 * Key changes from v2:
 * - NEW: Consolidated single-call mode for rate-limited providers (Groq free tier)
 *   Instead of 5 sequential agent calls, uses 1 comprehensive call that generates
 *   architecture + code together. Falls back to multi-agent only when provider supports it.
 * - FIX: Errors no longer silently swallowed — reports failures to the user
 * - FIX: Properly populates `frontend` key for Code/Preview tab backward compat
 * - Files saved to ProjectFile (real file system)
 * - Modify intents use targeted edits
 * - Auto-snapshots before AI modifications
 */

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
import { getAgentPrompt } from './agents.contracts';
import { parseLLMEdits, applyEdits } from './edit.service';
import { selectRelevantFiles } from './file-selector.service';
import { createFilesFromMap, getProjectFilesWithContent } from '../files/files.service';
import { createSnapshot } from '../versions/versions.service';
import { countTokens } from '../../utils/token.counter';

let _io: SocketServer | null = null;

export function setSocketServer(io: SocketServer): void {
  _io = io;
}

function emit(sessionId: string, event: string, data: unknown): void {
  _io?.to(`session:${sessionId}`).emit(event, data);
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

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

  emit(sessionId, 'agent:pipeline', { jobId, agents, intent, status: 'running' });

  // 3. Determine if this is a new build or modification
  const isModification = ['modify_ui', 'modify_api', 'modify_db', 'fix_bug', 'add_feature'].includes(intent);

  // 4. For modifications, auto-snapshot current state
  if (isModification) {
    try {
      await createSnapshot({
        projectId,
        label: `Before: ${userMessage.slice(0, 40)}`,
        trigger: 'pre-edit',
        metadata: { prompt: userMessage, intent },
      });
    } catch (err) {
      aiLogger.warn('Pre-edit snapshot failed:', err);
    }
  }

  // 5. Load context
  const { systemAddendum, recentMessages } = await buildContext(projectId, sessionId);

  // 6. Select relevant files for modification context
  let relevantFiles: Array<{ path: string; content: string }> = [];
  if (isModification) {
    relevantFiles = await selectRelevantFiles(projectId, userMessage, 8, 25000);
  }

  // 7. Generate — use consolidated single-call for new builds, multi-agent for edits
  let combinedData: Record<string, unknown> = {};
  let usedModel = 'unknown';
  let totalTokens = 0;
  let fullContent = '';
  const artifactIds: string[] = [];
  const errors: string[] = [];

  if (intent === 'new_build' || intent === 'regenerate') {
    // ── CONSOLIDATED SINGLE CALL ──────────────────────────────────
    // Generates architecture + code in ONE call to avoid rate limits
    emit(sessionId, 'agent:status', { jobId, agent: 'FRONTEND', status: 'running', progress: 0 });

    try {
      const result = await generateFullBuild(userMessage, systemAddendum, recentMessages, (token) => {
        fullContent += token;
        emit(sessionId, 'chat:token', { token });
      });

      combinedData = result.data;
      usedModel = result.model;
      totalTokens = result.tokens;

      emit(sessionId, 'agent:status', { jobId, agent: 'FRONTEND', status: 'done', progress: 100 });
    } catch (err) {
      const errMsg = (err as Error).message;
      aiLogger.error(`[${jobId}] Full build failed:`, err);
      errors.push(errMsg);
      emit(sessionId, 'agent:status', {
        jobId, agent: 'FRONTEND', status: 'error', progress: 0, message: errMsg,
      });
    }
  } else if (intent === 'explain') {
    // ── EXPLAIN — single call ─────────────────────────────────────
    try {
      const result = await runAgent('EXPLAIN', {
        jobId, sessionId, projectId, userMessage, intent,
        systemAddendum, recentMessages,
        previousData: {}, relevantFiles,
        onToken: (token) => { fullContent += token; emit(sessionId, 'chat:token', { token }); },
      });
      combinedData = result.data;
      usedModel = result.model;
      totalTokens = result.tokens;
    } catch (err) {
      errors.push((err as Error).message);
    }
  } else {
    // ── MODIFICATION — targeted agent calls ───────────────────────
    for (const agentType of agents) {
      emit(sessionId, 'agent:status', { jobId, agent: agentType, status: 'running', progress: 0 });

      try {
        const agentResult = await runAgent(agentType, {
          jobId, sessionId, projectId, userMessage, intent,
          systemAddendum, recentMessages,
          previousData: combinedData, relevantFiles,
          onToken: (token) => { fullContent += token; emit(sessionId, 'chat:token', { token }); },
        });

        combinedData = { ...combinedData, ...agentResult.data };
        usedModel = agentResult.model;
        totalTokens += agentResult.tokens;

        emit(sessionId, 'agent:status', { jobId, agent: agentType, status: 'done', progress: 100 });
      } catch (err) {
        const errMsg = (err as Error).message;
        aiLogger.error(`[${jobId}] Agent ${agentType} failed:`, err);
        errors.push(`${agentType}: ${errMsg}`);
        emit(sessionId, 'agent:status', {
          jobId, agent: agentType, status: 'error', progress: 0, message: errMsg,
        });
      }
    }
  }

  // 8. Check if we got ANY data
  const hasData = Object.keys(combinedData).length > 0 &&
    (combinedData.files || combinedData.frontend || combinedData.architecture || combinedData.edits || combinedData.explanation);

  if (!hasData && errors.length > 0) {
    // ALL agents failed — report the error to the user
    const errorMsg = `❌ Generation failed:\n\n${errors.map(e => `• ${e}`).join('\n')}\n\nPlease check your API keys in the .env file.`;

    const assistantMsg = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: MessageRole.ASSISTANT,
        content: errorMsg,
        metadata: { error: true, errors, durationMs: Date.now() - startedAt },
      },
    });

    emit(sessionId, 'chat:done', { messageId: assistantMsg.id, content: errorMsg, artifactIds: [] });
    return { messageId: assistantMsg.id, content: errorMsg, artifactIds: [], model: 'none', totalTokens: 0 };
  }

  // 9. Persist files based on intent
  if (isModification && combinedData.edits) {
    const edits = parseLLMEdits(JSON.stringify(combinedData.edits));
    const editResult = await applyEdits(projectId, edits);
    aiLogger.info(`[${jobId}] Applied ${editResult.totalApplied} edits, ${editResult.totalFailed} failed`);
    emit(sessionId, 'files:updated', { results: editResult.results, totalApplied: editResult.totalApplied });
  } else if (combinedData.files && typeof combinedData.files === 'object') {
    const files = combinedData.files as Record<string, string>;
    await createFilesFromMap(projectId, files);
    // Backward compat: frontend viewers read from `frontend` key
    if (!combinedData.frontend) combinedData.frontend = files;
    emit(sessionId, 'files:created', { fileCount: Object.keys(files).length, paths: Object.keys(files) });
  } else if (combinedData.frontend && typeof combinedData.frontend === 'object') {
    const files = combinedData.frontend as Record<string, string>;
    await createFilesFromMap(projectId, files);
    emit(sessionId, 'files:created', { fileCount: Object.keys(files).length, paths: Object.keys(files) });
  }

  // 10. Build response text
  const responseText = buildResponseText(combinedData, intent, userMessage);
  if (!fullContent) fullContent = responseText;

  // 11. Save assistant message
  const assistantMsg = await prisma.chatMessage.create({
    data: {
      sessionId,
      role: MessageRole.ASSISTANT,
      content: responseText,
      tokenCount: totalTokens,
      metadata: {
        model: usedModel,
        agentPipeline: agents,
        intentType: intent,
        durationMs: Date.now() - startedAt,
      },
    },
  });

  // 12. Persist artifact
  if (hasData) {
    const artifactType: ArtifactType = intentToArtifactType(intent);
    const artifact = await prisma.artifact.create({
      data: {
        projectId,
        messageId: assistantMsg.id,
        type: artifactType,
        name: `${intent}-${new Date().toISOString().slice(0, 10)}`,
        content: JSON.stringify(combinedData),
        version: 1,
      },
    });
    artifactIds.push(artifact.id);

    emit(sessionId, 'artifact:update', {
      artifactId: artifact.id,
      type: artifactType,
      data: combinedData,
    });
  }

  // 13. Update project context (fire and forget)
  updateProjectContext(projectId, sessionId, JSON.stringify(combinedData).slice(0, 1000))
    .catch(err => aiLogger.warn('Context update failed:', err));

  // 14. Log usage
  await prisma.usageLog.create({
    data: {
      projectId,
      model: usedModel,
      provider: usedModel.includes('groq') ? 'groq' : 'openrouter',
      promptTokens: Math.round(totalTokens * 0.7),
      completionTokens: Math.round(totalTokens * 0.3),
      totalTokens,
      durationMs: Date.now() - startedAt,
    },
  });

  emit(sessionId, 'chat:done', {
    messageId: assistantMsg.id,
    content: responseText,
    artifactIds,
  });

  return {
    messageId: assistantMsg.id,
    content: responseText,
    artifactIds,
    model: usedModel,
    totalTokens,
  };
}

// ─── Consolidated Full Build ──────────────────────────────────────────────────

/**
 * Generate a complete application in ONE LLM call.
 * This avoids rate-limiting issues with providers like Groq free tier.
 *
 * The single call produces architecture + all source files together.
 */
const FULL_BUILD_SYSTEM = `You are Archon, an AI software engineering platform.
Generate a COMPLETE, WORKING React application based on the user's request.

Return ONLY valid JSON with this EXACT structure:
{
  "architecture": {
    "features": { "user": ["feature1", "feature2"], "admin": ["feature1"] },
    "systemArchitecture": { "frontend": "React + Vite", "styling": "CSS" },
    "techStack": { "frontend": "React 18", "build": "Vite", "styling": "CSS" },
    "apiEndpoints": [{ "method": "GET", "path": "/api/items", "description": "List items" }]
  },
  "frontend": {
    "App.jsx": "complete React component code here",
    "index.css": "complete CSS code here",
    "main.jsx": "import React from 'react';\\nimport ReactDOM from 'react-dom/client';\\nimport App from './App.jsx';\\nimport './index.css';\\nReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);",
    "index.html": "<!DOCTYPE html>\\n<html lang=\\"en\\">\\n<head>\\n<meta charset=\\"UTF-8\\"/>\\n<meta name=\\"viewport\\" content=\\"width=device-width,initial-scale=1.0\\"/>\\n<title>App</title>\\n</head>\\n<body><div id=\\"root\\"></div>\\n<script type=\\"module\\" src=\\"/src/main.jsx\\"></script></body></html>"
  }
}

CRITICAL RULES:
1. The "frontend" object MUST contain keys like "App.jsx", "index.css", "main.jsx", "index.html"
2. Each value MUST be the COMPLETE source code as a string (NOT a description)
3. Write real, working React code with useState, proper JSX, event handlers
4. Include COMPLETE CSS with colors, spacing, hover effects, responsive design
5. Use realistic data (8+ items), never "Lorem ipsum"
6. Include Google Fonts link in index.html if using custom fonts
7. BRAND COLORS: Zomato=#E23744 | Spotify=#1DB954 | Netflix=#E50914 | Airbnb=#FF5A5F | Uber=#000000
8. The FIRST character of your response must be { and the LAST must be }
9. Do NOT wrap in markdown code blocks
10. Keep all code in App.jsx as a single component (simpler for preview rendering)`;

async function generateFullBuild(
  userMessage: string,
  systemAddendum: string,
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
  onToken: (token: string) => void,
): Promise<{ data: Record<string, unknown>; model: string; tokens: number }> {

  const messages: LLMMessage[] = [
    { role: 'system', content: FULL_BUILD_SYSTEM + '\n\n' + systemAddendum },
    ...recentMessages,
    {
      role: 'user',
      content: `Build: "${userMessage}"

Generate a complete, production-quality React application. Return valid JSON with "architecture" and "frontend" keys. All code must be COMPLETE and WORKING.`,
    },
  ];

  aiLogger.info('Running consolidated full-build (non-streaming JSON mode)');

  // Emit a progress token so the UI shows activity
  onToken('⚙️ Generating your application...');

  // ALWAYS use non-streaming JSON mode — streaming SSE corrupts large JSON responses
  const result = await callAI(messages, {
    maxTokens: 8000,
    responseFormat: 'json_object',
  });

  const rawContent = result.content;
  aiLogger.info(`Full build response: ${rawContent.length} chars via ${result.model}`);

  const parsed = extractJSON(rawContent);
  aiLogger.info(`Full build parsed OK. Keys: ${Object.keys(parsed).join(', ')}`);

  // Normalize: agent might use "files" instead of "frontend"
  if (parsed.files && !parsed.frontend) {
    parsed.frontend = parsed.files;
  }

  return { data: parsed, model: result.model, tokens: countTokens(rawContent) };
}


// ─── Agent Runner (for modifications/edits) ───────────────────────────────────

interface AgentRunInput {
  jobId: string;
  sessionId: string;
  projectId: string;
  userMessage: string;
  intent: string;
  systemAddendum: string;
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  previousData: Record<string, unknown>;
  relevantFiles: Array<{ path: string; content: string }>;
  onToken: (token: string) => void;
}

interface AgentRunResult {
  data: Record<string, unknown>;
  model: string;
  tokens: number;
}

async function runAgent(agentType: AgentType, input: AgentRunInput): Promise<AgentRunResult> {
  const { userMessage, intent, systemAddendum, recentMessages, previousData, relevantFiles, onToken } = input;

  const systemPrompt = getAgentPrompt(agentType) + '\n\n' + systemAddendum;
  const userContent = buildAgentUserMessage(agentType, userMessage, intent, previousData, relevantFiles);

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    ...recentMessages,
    { role: 'user', content: userContent },
  ];

  const maxTokens = AGENT_TOKEN_BUDGETS[agentType] ?? 4000;
  const useStreaming = agentType === 'FRONTEND' || agentType === 'REPAIR';

  if (useStreaming) {
    let streamBuf = '';
    const result = await callAI(messages, { maxTokens }, (token) => {
      streamBuf += token;
      onToken(token);
    });
    const rawContent = result.content || streamBuf;

    try {
      const parsed = extractJSON(rawContent);
      return { data: parsed, model: result.model, tokens: countTokens(rawContent) };
    } catch {
      return { data: { rawOutput: rawContent }, model: result.model, tokens: countTokens(rawContent) };
    }
  } else {
    const result = await callAI(messages, { maxTokens, responseFormat: 'json_object' });
    const parsed = extractJSON(result.content);
    return {
      data: parsed,
      model: result.model,
      tokens: (result.promptTokens ?? 0) + (result.completionTokens ?? 0),
    };
  }
}

// ─── User Message Builders ────────────────────────────────────────────────────

function buildAgentUserMessage(
  agentType: AgentType,
  userMessage: string,
  intent: string,
  previousData: Record<string, unknown>,
  relevantFiles: Array<{ path: string; content: string }>
): string {
  if (intent === 'new_build' || intent === 'regenerate') {
    return `Build request: "${userMessage}"

Generate complete, working code. Return valid JSON. First char {, last char }.`;
  }

  if (relevantFiles.length > 0) {
    const fileContext = relevantFiles.map(f =>
      `### ${f.path}\n\`\`\`\n${f.content.slice(0, 4000)}\n\`\`\``
    ).join('\n\n');

    return `User request: "${userMessage}"

Current project files:

${fileContext}

Apply the requested change using TARGETED edits. Return search/replace blocks.
Only modify what needs to change. Do NOT rewrite entire files.`;
  }

  return `User request: "${userMessage}"

Apply the requested changes. Return valid JSON with the modifications.`;
}

// ─── Response Text Builder ────────────────────────────────────────────────────

function buildResponseText(data: Record<string, unknown>, intent: string, prompt: string): string {
  if (intent === 'explain' && data.explanation) {
    return data.explanation as string;
  }

  if (data.edits) {
    const edits = data.edits as Array<{ file: string }>;
    const files = [...new Set(edits.map(e => e.file))];
    return `✅ Applied changes to ${files.length} file(s): ${files.join(', ')}`;
  }

  const hasArch = !!data.architecture;
  const hasFiles = !!data.files || !!data.frontend;

  if (hasArch && hasFiles) {
    const arch = data.architecture as { techStack?: Record<string, string>; features?: { user?: string[] } };
    const stack = arch.techStack ? Object.values(arch.techStack).slice(0, 3).join(', ') : 'modern stack';
    const features = arch.features?.user?.slice(0, 3).join(', ') ?? '';
    return `✅ Generated complete application for **"${prompt}"**\n\n**Stack:** ${stack}\n**Features:** ${features}, and more.\n\nCheck the Code and Preview tabs.`;
  }
  if (hasFiles) return `✅ Code generated! Check the Code and Preview tabs.`;
  if (hasArch) return `✅ Architecture designed. Check the Architecture tab.`;

  return `✅ Generation complete.`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function intentToArtifactType(intent: string): ArtifactType {
  const map: Record<string, ArtifactType> = {
    new_build: 'FULL_BUILD', modify_ui: 'FRONTEND', modify_api: 'API_ROUTES',
    modify_db: 'DATABASE', fix_bug: 'FRONTEND', add_feature: 'FULL_BUILD',
    regenerate: 'FULL_BUILD', explain: 'ARCHITECTURE',
  };
  return map[intent] ?? 'FULL_BUILD';
}

// ─── Legacy Compatibility ─────────────────────────────────────────────────────

export async function generateLegacy(prompt: string) {
  const steps: Array<{ step: string; status: string }> = [];
  steps.push({ step: 'Routing to AI provider…', status: 'running' });

  const messages: LLMMessage[] = [
    { role: 'system', content: FULL_BUILD_SYSTEM },
    { role: 'user', content: `Generate a complete React application for: "${prompt}"\n\nReturn valid JSON with "architecture" and "frontend" keys.` },
  ];

  const result = await callAI(messages, { maxTokens: 8000, responseFormat: 'json_object' });
  steps.push({ step: `Generated via ${result.model}`, status: 'done' });
  const data = extractJSON(result.content);
  if (data.files && !data.frontend) data.frontend = data.files;
  return { data, steps, model: result.model };
}
