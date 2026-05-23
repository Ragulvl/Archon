/**
 * Version Control — Project snapshots and rollback.
 *
 * Every AI modification auto-creates a snapshot.
 * Users can manually snapshot, compare, and restore.
 */

import prisma from '../../db/prisma.client';
import { createError } from '../../middleware/error.middleware';
import { generateDiff } from '../ai/edit.service';
import { createFilesFromMap } from '../files/files.service';
import { aiLogger } from '../../utils/logger';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SnapshotInput {
  projectId: string;
  label?: string;
  description?: string;
  trigger?: 'auto' | 'manual' | 'pre-edit' | 'deploy';
  metadata?: Record<string, unknown>;
}

export interface SnapshotComparison {
  added: string[];
  removed: string[];
  modified: Array<{
    path: string;
    diff: string;
  }>;
}

// ─── Create Snapshot ─────────────────────────────────────────────────────────

/**
 * Create a full snapshot of all project files.
 * Stores references to each file's current version.
 */
export async function createSnapshot(input: SnapshotInput) {
  const { projectId, label, description, trigger = 'auto', metadata } = input;

  // Get next version number
  const lastSnapshot = await prisma.projectSnapshot.findFirst({
    where: { projectId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  const nextVersion = (lastSnapshot?.version ?? 0) + 1;

  // Get all current files
  const files = await prisma.projectFile.findMany({
    where: { projectId, type: 'FILE' },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
  });

  // Create snapshot
  const snapshot = await prisma.projectSnapshot.create({
    data: {
      projectId,
      version: nextVersion,
      label: label ?? `v${nextVersion}`,
      description,
      trigger,
      fileCount: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      metadata: metadata as any,
    },
  });

  // Create file version entries linked to this snapshot
  for (const file of files) {
    if (file.content) {
      const latestVersion = file.versions[0]?.version ?? 0;
      await prisma.fileVersion.create({
        data: {
          fileId: file.id,
          version: latestVersion + 1,
          content: file.content,
          hash: file.hash ?? '',
          changeType: 'snapshot',
          snapshotId: snapshot.id,
        },
      });
    }
  }

  aiLogger.info(`Snapshot v${nextVersion} created for project ${projectId} (${files.length} files)`);
  return snapshot;
}

// ─── List Snapshots ──────────────────────────────────────────────────────────

export async function listSnapshots(projectId: string) {
  return prisma.projectSnapshot.findMany({
    where: { projectId },
    orderBy: { version: 'desc' },
    select: {
      id: true,
      version: true,
      label: true,
      description: true,
      trigger: true,
      fileCount: true,
      totalSize: true,
      createdAt: true,
    },
  });
}

// ─── Restore Snapshot ────────────────────────────────────────────────────────

/**
 * Restore all project files to a previous snapshot state.
 * Creates a new snapshot of the current state first (safety net).
 */
export async function restoreSnapshot(projectId: string, snapshotId: string) {
  const snapshot = await prisma.projectSnapshot.findUnique({
    where: { id: snapshotId },
    include: {
      fileVersions: {
        include: { file: true },
      },
    },
  });

  if (!snapshot || snapshot.projectId !== projectId) {
    throw createError('Snapshot not found', 404);
  }

  // Create safety snapshot of current state
  await createSnapshot({
    projectId,
    label: `Pre-restore backup`,
    description: `Auto-backup before restoring to v${snapshot.version}`,
    trigger: 'auto',
  });

  // Build file map from snapshot versions
  const fileMap: Record<string, string> = {};
  for (const fv of snapshot.fileVersions) {
    if (fv.file && fv.content) {
      fileMap[fv.file.path] = fv.content;
    }
  }

  // Get current files
  const currentFiles = await prisma.projectFile.findMany({
    where: { projectId, type: 'FILE' },
    select: { id: true, path: true },
  });

  // Delete files that don't exist in snapshot
  const snapshotPaths = new Set(Object.keys(fileMap));
  for (const currentFile of currentFiles) {
    if (!snapshotPaths.has(currentFile.path)) {
      await prisma.projectFile.delete({ where: { id: currentFile.id } });
    }
  }

  // Restore files from snapshot
  await createFilesFromMap(projectId, fileMap);

  aiLogger.info(`Restored project ${projectId} to snapshot v${snapshot.version}`);
  return { restored: true, version: snapshot.version, fileCount: Object.keys(fileMap).length };
}

// ─── Compare Snapshots ───────────────────────────────────────────────────────

/**
 * Compare two snapshots and return the diff.
 */
export async function compareSnapshots(
  projectId: string,
  fromVersion: number,
  toVersion: number
): Promise<SnapshotComparison> {
  const [fromSnapshot, toSnapshot] = await Promise.all([
    prisma.projectSnapshot.findUnique({
      where: { projectId_version: { projectId, version: fromVersion } },
      include: { fileVersions: { include: { file: { select: { path: true } } } } },
    }),
    prisma.projectSnapshot.findUnique({
      where: { projectId_version: { projectId, version: toVersion } },
      include: { fileVersions: { include: { file: { select: { path: true } } } } },
    }),
  ]);

  if (!fromSnapshot || !toSnapshot) throw createError('Snapshot not found', 404);

  // Build content maps
  const fromFiles = new Map<string, string>();
  for (const fv of fromSnapshot.fileVersions) {
    if (fv.file) fromFiles.set(fv.file.path, fv.content);
  }

  const toFiles = new Map<string, string>();
  for (const fv of toSnapshot.fileVersions) {
    if (fv.file) toFiles.set(fv.file.path, fv.content);
  }

  const added: string[] = [];
  const removed: string[] = [];
  const modified: Array<{ path: string; diff: string }> = [];

  // Find added and modified
  for (const [path, content] of toFiles) {
    if (!fromFiles.has(path)) {
      added.push(path);
    } else if (fromFiles.get(path) !== content) {
      modified.push({
        path,
        diff: generateDiff(fromFiles.get(path)!, content, path),
      });
    }
  }

  // Find removed
  for (const path of fromFiles.keys()) {
    if (!toFiles.has(path)) {
      removed.push(path);
    }
  }

  return { added, removed, modified };
}

// ─── Get Snapshot Details ────────────────────────────────────────────────────

export async function getSnapshot(snapshotId: string) {
  return prisma.projectSnapshot.findUnique({
    where: { id: snapshotId },
    include: {
      fileVersions: {
        select: {
          id: true,
          version: true,
          changeType: true,
          file: { select: { path: true, name: true, language: true } },
        },
      },
    },
  });
}
