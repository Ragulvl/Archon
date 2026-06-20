/**
 * File System Engine — Real CRUD for project files.
 *
 * Every file lives in `project_files` with full metadata.
 * Content is stored in PostgreSQL Text columns.
 * All mutations create FileVersion records for rollback.
 */

import { createHash } from 'crypto';
import prisma from '../../db/prisma.client';
import { createError } from '../../middleware/error.middleware';
import { aiLogger } from '../../utils/logger';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateFileInput {
  projectId: string;
  path: string;
  content: string;
  language?: string;
}

export interface UpdateFileInput {
  content: string;
  createVersion?: boolean;
}

export interface MoveFileInput {
  newPath: string;
}

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'FILE' | 'DIRECTORY';
  language?: string | null;
  size: number;
  children?: FileTreeNode[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    tsx: 'typescript', ts: 'typescript', jsx: 'javascript', js: 'javascript',
    css: 'css', scss: 'scss', less: 'less', html: 'html', json: 'json',
    md: 'markdown', sql: 'sql', py: 'python', rb: 'ruby', go: 'go',
    rs: 'rust', java: 'java', kt: 'kotlin', swift: 'swift', yaml: 'yaml',
    yml: 'yaml', toml: 'toml', xml: 'xml', sh: 'bash', dockerfile: 'dockerfile',
    graphql: 'graphql', vue: 'vue', svelte: 'svelte', prisma: 'prisma',
  };
  return map[ext] ?? 'text';
}

function detectMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'text/typescript', tsx: 'text/typescript', js: 'text/javascript',
    jsx: 'text/javascript', css: 'text/css', html: 'text/html',
    json: 'application/json', md: 'text/markdown', sql: 'text/sql',
    png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml',
  };
  return map[ext] ?? 'text/plain';
}

function getParentPath(filePath: string): string | null {
  const parts = filePath.split('/');
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('/');
}

function getFileName(filePath: string): string {
  return filePath.split('/').pop() ?? filePath;
}

// ─── CRUD Operations ─────────────────────────────────────────────────────────

/**
 * Create a single file in the project.
 * Automatically creates parent directories if they don't exist.
 */
export async function createFile(input: CreateFileInput) {
  const { projectId, path, content, language } = input;

  // Check for duplicate
  const existing = await prisma.projectFile.findUnique({
    where: { projectId_path: { projectId, path } },
  });
  if (existing) throw createError(`File already exists: ${path}`, 409);

  // Ensure parent directories exist
  await ensureDirectories(projectId, path);

  const hash = hashContent(content);
  const file = await prisma.projectFile.create({
    data: {
      projectId,
      path,
      name: getFileName(path),
      type: 'FILE',
      content,
      language: language ?? detectLanguage(path),
      mimeType: detectMimeType(path),
      size: Buffer.byteLength(content, 'utf8'),
      hash,
      parentPath: getParentPath(path),
    },
  });

  // Create initial version
  await prisma.fileVersion.create({
    data: {
      fileId: file.id,
      version: 1,
      content,
      hash,
      changeType: 'create',
    },
  });

  return file;
}

/**
 * Create multiple files at once (used after AI generation).
 * Returns all created files.
 */
export async function createFilesFromMap(
  projectId: string,
  files: Record<string, string>,
  snapshotId?: string
) {
  const results = [];

  for (const [filePath, content] of Object.entries(files)) {
    // Upsert: if file exists, update it; otherwise create it
    const existing = await prisma.projectFile.findUnique({
      where: { projectId_path: { projectId, path: filePath } },
    });

    if (existing) {
      const updated = await updateFile(existing.id, { content, createVersion: true }, snapshotId);
      results.push(updated);
    } else {
      await ensureDirectories(projectId, filePath);
      const hash = hashContent(content);
      const file = await prisma.projectFile.create({
        data: {
          projectId,
          path: filePath,
          name: getFileName(filePath),
          type: 'FILE',
          content,
          language: detectLanguage(filePath),
          mimeType: detectMimeType(filePath),
          size: Buffer.byteLength(content, 'utf8'),
          hash,
          parentPath: getParentPath(filePath),
        },
      });

      await prisma.fileVersion.create({
        data: {
          fileId: file.id,
          version: 1,
          content,
          hash,
          changeType: 'create',
          snapshotId,
        },
      });

      results.push(file);
    }
  }

  return results;
}

/**
 * Read file content by ID.
 */
export async function readFile(fileId: string) {
  const file = await prisma.projectFile.findUnique({ where: { id: fileId } });
  if (!file) throw createError('File not found', 404);
  return file;
}

/**
 * Read file by project + path.
 */
export async function readFileByPath(projectId: string, path: string) {
  const file = await prisma.projectFile.findUnique({
    where: { projectId_path: { projectId, path } },
  });
  if (!file) throw createError(`File not found: ${path}`, 404);
  return file;
}

/**
 * Update file content. Creates a new FileVersion.
 */
export async function updateFile(fileId: string, input: UpdateFileInput, snapshotId?: string) {
  const file = await prisma.projectFile.findUnique({
    where: { id: fileId },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
  });
  if (!file) throw createError('File not found', 404);
  if (file.type === 'DIRECTORY') throw createError('Cannot update directory content', 400);

  const newHash = hashContent(input.content);

  // Skip if content unchanged
  if (newHash === file.hash) return file;

  const latestVersion = file.versions[0]?.version ?? 0;

  const [updatedFile] = await prisma.$transaction([
    prisma.projectFile.update({
      where: { id: fileId },
      data: {
        content: input.content,
        size: Buffer.byteLength(input.content, 'utf8'),
        hash: newHash,
      },
    }),
    prisma.fileVersion.create({
      data: {
        fileId,
        version: latestVersion + 1,
        content: input.content,
        hash: newHash,
        changeType: 'modify',
        snapshotId,
      },
    }),
  ]);

  return updatedFile;
}

/**
 * Delete a file or directory.
 * Directories: recursively delete all children.
 */
export async function deleteFile(fileId: string) {
  const file = await prisma.projectFile.findUnique({ where: { id: fileId } });
  if (!file) throw createError('File not found', 404);

  if (file.type === 'DIRECTORY') {
    // Delete all files under this directory
    await prisma.projectFile.deleteMany({
      where: {
        projectId: file.projectId,
        path: { startsWith: file.path + '/' },
      },
    });
  }

  await prisma.projectFile.delete({ where: { id: fileId } });
  return { deleted: true };
}

/**
 * Move or rename a file.
 */
export async function moveFile(fileId: string, input: MoveFileInput) {
  const file = await prisma.projectFile.findUnique({ where: { id: fileId } });
  if (!file) throw createError('File not found', 404);

  // Check destination doesn't exist
  const existing = await prisma.projectFile.findUnique({
    where: { projectId_path: { projectId: file.projectId, path: input.newPath } },
  });
  if (existing) throw createError(`Destination already exists: ${input.newPath}`, 409);

  // Ensure parent directories for destination
  await ensureDirectories(file.projectId, input.newPath);

  if (file.type === 'DIRECTORY') {
    // Move all children
    const children = await prisma.projectFile.findMany({
      where: {
        projectId: file.projectId,
        path: { startsWith: file.path + '/' },
      },
    });

    for (const child of children) {
      const newChildPath = child.path.replace(file.path, input.newPath);
      await prisma.projectFile.update({
        where: { id: child.id },
        data: {
          path: newChildPath,
          name: getFileName(newChildPath),
          parentPath: getParentPath(newChildPath),
        },
      });
    }
  }

  return prisma.projectFile.update({
    where: { id: fileId },
    data: {
      path: input.newPath,
      name: getFileName(input.newPath),
      parentPath: getParentPath(input.newPath),
      language: file.type === 'FILE' ? detectLanguage(input.newPath) : file.language,
    },
  });
}

/**
 * List all files in a project as a flat list.
 */
export async function listFiles(projectId: string) {
  return prisma.projectFile.findMany({
    where: { projectId },
    orderBy: { path: 'asc' },
    select: {
      id: true,
      path: true,
      name: true,
      type: true,
      content: true,
      language: true,
      size: true,
      parentPath: true,
      updatedAt: true,
    },
  });
}

/**
 * List files as a nested tree structure.
 */
export async function getFileTree(projectId: string): Promise<FileTreeNode[]> {
  const files = await listFiles(projectId);

  const nodeMap = new Map<string, FileTreeNode>();
  const roots: FileTreeNode[] = [];

  // Build nodes
  for (const f of files) {
    const node: FileTreeNode = {
      id: f.id,
      name: f.name,
      path: f.path,
      type: f.type,
      language: f.language,
      size: f.size,
      children: f.type === 'DIRECTORY' ? [] : undefined,
    };
    nodeMap.set(f.path, node);
  }

  // Build tree
  for (const f of files) {
    const node = nodeMap.get(f.path)!;
    if (f.parentPath && nodeMap.has(f.parentPath)) {
      nodeMap.get(f.parentPath)!.children?.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Create a directory.
 */
export async function createFolder(projectId: string, path: string) {
  const existing = await prisma.projectFile.findUnique({
    where: { projectId_path: { projectId, path } },
  });
  if (existing) return existing;

  await ensureDirectories(projectId, path + '/placeholder');

  return prisma.projectFile.upsert({
    where: { projectId_path: { projectId, path } },
    create: {
      projectId,
      path,
      name: getFileName(path),
      type: 'DIRECTORY',
      parentPath: getParentPath(path),
      size: 0,
    },
    update: {},
  });
}

/**
 * Get all files' content for a project (used for context building).
 */
export async function getProjectFilesWithContent(projectId: string) {
  return prisma.projectFile.findMany({
    where: { projectId, type: 'FILE' },
    select: { path: true, content: true, language: true, size: true },
    orderBy: { path: 'asc' },
  });
}

/**
 * Get file version history.
 */
export async function getFileVersions(fileId: string) {
  return prisma.fileVersion.findMany({
    where: { fileId },
    orderBy: { version: 'desc' },
    select: {
      id: true,
      version: true,
      hash: true,
      changeType: true,
      createdAt: true,
    },
  });
}

/**
 * Restore a file to a specific version.
 */
export async function restoreFileVersion(fileId: string, versionId: string) {
  const version = await prisma.fileVersion.findUnique({ where: { id: versionId } });
  if (!version || version.fileId !== fileId) {
    throw createError('Version not found', 404);
  }

  return updateFile(fileId, { content: version.content, createVersion: true });
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Ensure all parent directories for a file path exist.
 * E.g., for "src/components/Navbar.tsx", creates "src" and "src/components".
 */
async function ensureDirectories(projectId: string, filePath: string) {
  const parts = filePath.split('/');
  if (parts.length <= 1) return;

  for (let i = 1; i < parts.length; i++) {
    const dirPath = parts.slice(0, i).join('/');
    const dirName = parts[i - 1];

    await prisma.projectFile.upsert({
      where: { projectId_path: { projectId, path: dirPath } },
      create: {
        projectId,
        path: dirPath,
        name: dirName,
        type: 'DIRECTORY',
        parentPath: i > 1 ? parts.slice(0, i - 1).join('/') : null,
        size: 0,
      },
      update: {},
    });
  }
}
