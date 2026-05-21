import prisma from '../../db/prisma.client';
import { createError } from '../../middleware/error.middleware';
import type { ChatSession, ChatMessage, CreateSessionInput } from '@archon/shared';

export async function createSession(input: CreateSessionInput): Promise<ChatSession> {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) throw createError('Project not found', 404);

  const session = await prisma.chatSession.create({
    data: { projectId: input.projectId, title: input.title ?? 'New conversation' },
  });

  return {
    ...session,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  } as unknown as ChatSession;
}

export async function getSession(id: string): Promise<ChatSession> {
  const session = await prisma.chatSession.findUnique({ where: { id } });
  if (!session) throw createError('Session not found', 404);

  return {
    ...session,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  } as unknown as ChatSession;
}

export async function getSessionsByProject(projectId: string): Promise<ChatSession[]> {
  const sessions = await prisma.chatSession.findMany({
    where:   { projectId },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { messages: true } } },
  });

  return sessions.map(s => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  })) as unknown as ChatSession[];
}

export async function getMessageHistory(sessionId: string, limit = 50): Promise<ChatMessage[]> {
  const messages = await prisma.chatMessage.findMany({
    where:   { sessionId },
    orderBy: { createdAt: 'asc' },
    take:    limit,
    include: { artifacts: { select: { id: true, type: true, name: true } } },
  });

  return messages.map(m => ({
    ...m,
    role:      m.role as unknown as 'USER' | 'ASSISTANT' | 'SYSTEM',
    createdAt: m.createdAt.toISOString(),
  })) as unknown as ChatMessage[];
}

/** Auto-generate a session title from the first user message */
export async function autoTitleSession(sessionId: string, firstMessage: string): Promise<void> {
  const title = firstMessage.slice(0, 60) + (firstMessage.length > 60 ? '…' : '');
  await prisma.chatSession.update({ where: { id: sessionId }, data: { title } });
}
