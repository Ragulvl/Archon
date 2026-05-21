import prisma from '../../db/prisma.client';
import { GUEST_USER_ID } from '../../config/constants';
import type { Project, CreateProjectInput, UpdateProjectInput } from '@archon/shared';
import { createError } from '../../middleware/error.middleware';

/** Ensure the guest user exists in DB (upsert on first call) */
export async function ensureGuestUser(): Promise<string> {
  await prisma.user.upsert({
    where:  { id: GUEST_USER_ID },
    create: { id: GUEST_USER_ID, name: 'Guest', guestToken: GUEST_USER_ID },
    update: {},
  });
  return GUEST_USER_ID;
}

export async function listProjects(userId: string): Promise<Project[]> {
  const rows = await prisma.project.findMany({
    where:   { userId, status: { not: 'DELETED' } },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { sessions: true, artifacts: true } } },
  });

  return rows.map(r => ({
    ...r,
    techStack:  r.techStack as Record<string, string> | null,
    createdAt:  r.createdAt.toISOString(),
    updatedAt:  r.updatedAt.toISOString(),
  })) as unknown as Project[];
}

export async function getProject(id: string, userId: string): Promise<Project & { context?: unknown }> {
  const project = await prisma.project.findFirst({
    where:   { id, userId, status: { not: 'DELETED' } },
    include: {
      context:  true,
      _count:   { select: { sessions: true, artifacts: true } },
    },
  });

  if (!project) throw createError('Project not found', 404);

  return {
    ...project,
    techStack: project.techStack as Record<string, string> | null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  } as unknown as Project & { context?: unknown };
}

export async function createProject(
  userId: string,
  input: CreateProjectInput
): Promise<Project> {
  const project = await prisma.project.create({
    data: { userId, name: input.name, description: input.description },
  });
  return {
    ...project,
    techStack: null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  } as unknown as Project;
}

export async function updateProject(
  id: string,
  userId: string,
  input: UpdateProjectInput
): Promise<Project> {
  const existing = await prisma.project.findFirst({ where: { id, userId } });
  if (!existing) throw createError('Project not found', 404);

  const updated = await prisma.project.update({
    where: { id },
    data:  { ...input },
  });
  return {
    ...updated,
    techStack: updated.techStack as Record<string, string> | null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  } as unknown as Project;
}

export async function deleteProject(id: string, userId: string): Promise<void> {
  const existing = await prisma.project.findFirst({ where: { id, userId } });
  if (!existing) throw createError('Project not found', 404);

  // Soft-delete
  await prisma.project.update({ where: { id }, data: { status: 'DELETED' } });
}
