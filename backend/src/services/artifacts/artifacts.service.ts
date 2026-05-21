import prisma from '../../db/prisma.client';
import type { Artifact } from '@archon/shared';
import { createError } from '../../middleware/error.middleware';

export async function getProjectArtifacts(projectId: string): Promise<Artifact[]> {
  const artifacts = await prisma.artifact.findMany({
    where:   { projectId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { files: true } } },
  });

  return artifacts.map(a => ({
    ...a,
    type:      a.type as unknown as Artifact['type'],
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  })) as unknown as Artifact[];
}

export async function getArtifactFiles(artifactId: string) {
  const files = await prisma.generatedFile.findMany({
    where: { artifactId },
    orderBy: { path: 'asc' },
  });
  if (!files.length) throw createError('No files found for this artifact', 404);
  return files;
}

export async function getLatestArtifact(projectId: string) {
  return prisma.artifact.findFirst({
    where:   { projectId, type: { in: ['FULL_BUILD', 'FRONTEND'] } },
    orderBy: { createdAt: 'desc' },
    include: { files: { orderBy: { path: 'asc' } } },
  });
}
