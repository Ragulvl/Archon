import prisma from '../../db/prisma.client';
import { CONTEXT_MESSAGE_WINDOW, MAX_CONTEXT_SUMMARY_CHARS } from '@archon/shared';
import { callAI } from './router.service';
import { PROMPTS } from './prompts.service';
import { aiLogger } from '../../utils/logger';

export interface InjectedContext {
  systemAddendum: string;
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Load and format project context + recent chat history for injection into AI calls.
 */
export async function buildContext(
  projectId: string,
  sessionId: string,
  excludeLastN = 1 // Don't re-include the just-sent message
): Promise<InjectedContext> {
  // Fetch project context + recent messages in parallel
  const [projectContext, recentMessages] = await Promise.all([
    prisma.projectContext.findUnique({ where: { projectId } }),
    prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: CONTEXT_MESSAGE_WINDOW + excludeLastN,
      select: { role: true, content: true },
    }),
  ]);

  // Messages come in DESC order; reverse to chronological and drop the latest (user msg)
  const history = recentMessages
    .slice(excludeLastN)
    .reverse()
    .map(m => ({
      role: m.role.toLowerCase() as 'user' | 'assistant',
      content: m.content.slice(0, 2000), // cap per message
    }));

  let systemAddendum = '';

  if (projectContext?.summary) {
    systemAddendum += `\n\n## Project Context\n${projectContext.summary.slice(0, MAX_CONTEXT_SUMMARY_CHARS)}`;
  }

  if (projectContext?.techStack) {
    const ts = projectContext.techStack as Record<string, string>;
    systemAddendum += `\n\n## Established Tech Stack\n${Object.entries(ts).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`;
  }

  if (projectContext?.decisions) {
    const decisions = projectContext.decisions as Array<{ decision: string }>;
    if (decisions.length > 0) {
      systemAddendum += `\n\n## Previous Decisions\n${decisions.slice(-5).map(d => `- ${d.decision}`).join('\n')}`;
    }
  }

  return { systemAddendum, recentMessages: history };
}

/**
 * After generation, update the project context with a compressed summary.
 */
export async function updateProjectContext(
  projectId: string,
  sessionId: string,
  newArtifactSummary: string
): Promise<void> {
  try {
    // Get last N messages for compression
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { role: true, content: true },
    });

    const historyText = messages
      .reverse()
      .map(m => `${m.role}: ${m.content.slice(0, 500)}`)
      .join('\n');

    const compressResult = await callAI([
      { role: 'system', content: PROMPTS.CONTEXT_COMPRESS },
      { role: 'user', content: `Conversation:\n${historyText}\n\nLatest artifact: ${newArtifactSummary.slice(0, 500)}` },
    ], { maxTokens: 600, temperature: 0.1, responseFormat: 'json_object' });

    const parsed = JSON.parse(compressResult.content) as {
      summary: string;
      techStack?: Record<string, string>;
      decisions?: string[];
    };

    const existing = await prisma.projectContext.findUnique({ where: { projectId } });

    const existingDecisions = (existing?.decisions as Array<{ timestamp: string; decision: string }>) ?? [];
    const newDecisions = (parsed.decisions ?? []).map(d => ({
      timestamp: new Date().toISOString(),
      decision: d,
    }));

    await prisma.projectContext.upsert({
      where: { projectId },
      create: {
        projectId,
        summary:    parsed.summary,
        techStack:  parsed.techStack ?? {},
        decisions:  newDecisions,
        lastUpdated: new Date(),
      },
      update: {
        summary:    parsed.summary,
        techStack:  { ...((existing?.techStack as object) ?? {}), ...(parsed.techStack ?? {}) },
        decisions:  [...existingDecisions.slice(-20), ...newDecisions],
        lastUpdated: new Date(),
      },
    });
  } catch (err) {
    // Context update is non-critical — log and continue
    aiLogger.warn('Failed to update project context:', err);
  }
}
