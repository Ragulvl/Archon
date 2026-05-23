/**
 * File Selector — Given a user prompt, determine which files need editing.
 *
 * Uses a combination of:
 * 1. Keyword matching against file paths/names
 * 2. Dependency analysis (imports/exports)
 * 3. LLM classification for ambiguous cases
 */

import prisma from '../../db/prisma.client';
import { aiLogger } from '../../utils/logger';

export interface SelectedFile {
  id: string;
  path: string;
  content: string;
  relevance: 'direct' | 'dependent' | 'contextual';
  reason: string;
}

interface FileRecord {
  id: string;
  path: string;
  content: string | null;
  language: string | null;
  size: number;
}

// ─── Main Selector ───────────────────────────────────────────────────────────

/**
 * Select relevant files for a given prompt.
 * Returns files ranked by relevance, within token budget.
 */
export async function selectRelevantFiles(
  projectId: string,
  prompt: string,
  maxFiles: number = 10,
  maxTotalChars: number = 30000
): Promise<SelectedFile[]> {
  const files = await prisma.projectFile.findMany({
    where: { projectId, type: 'FILE' },
    select: { id: true, path: true, content: true, language: true, size: true },
  });

  if (files.length === 0) return [];

  const promptLower = prompt.toLowerCase();
  const scored: Array<{ file: FileRecord; score: number; relevance: SelectedFile['relevance']; reason: string }> = [];

  for (const file of files) {
    const { score, relevance, reason } = scoreFile(file, promptLower, files);
    if (score > 0) {
      scored.push({ file, score, relevance, reason });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Select within budget
  const selected: SelectedFile[] = [];
  let totalChars = 0;

  for (const item of scored) {
    if (selected.length >= maxFiles) break;
    const contentLength = item.file.content?.length ?? 0;
    if (totalChars + contentLength > maxTotalChars) continue;

    selected.push({
      id: item.file.id,
      path: item.file.path,
      content: item.file.content ?? '',
      relevance: item.relevance,
      reason: item.reason,
    });
    totalChars += contentLength;
  }

  return selected;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

function scoreFile(
  file: FileRecord,
  promptLower: string,
  allFiles: FileRecord[]
): { score: number; relevance: SelectedFile['relevance']; reason: string } {
  let score = 0;
  let relevance: SelectedFile['relevance'] = 'contextual';
  const reasons: string[] = [];
  const pathLower = file.path.toLowerCase();
  const nameLower = pathLower.split('/').pop() ?? '';

  // Direct mention of filename or component
  const nameWithoutExt = nameLower.replace(/\.[^.]+$/, '');
  if (promptLower.includes(nameWithoutExt) && nameWithoutExt.length > 2) {
    score += 100;
    relevance = 'direct';
    reasons.push(`Filename "${nameWithoutExt}" mentioned in prompt`);
  }

  // Component/class name mentions (camelCase/PascalCase)
  const componentName = nameWithoutExt.replace(/[-_]/g, '').toLowerCase();
  if (promptLower.replace(/[\s-_]/g, '').includes(componentName) && componentName.length > 3) {
    score += 80;
    relevance = 'direct';
    reasons.push(`Component "${nameWithoutExt}" referenced`);
  }

  // Keyword-based relevance
  const keywords = extractKeywords(promptLower);
  for (const kw of keywords) {
    if (pathLower.includes(kw)) {
      score += 40;
      reasons.push(`Path contains keyword "${kw}"`);
    }
    if (file.content?.toLowerCase().includes(kw)) {
      score += 20;
      reasons.push(`Content contains keyword "${kw}"`);
    }
  }

  // Context-aware boosting
  if (promptLower.includes('navbar') || promptLower.includes('header') || promptLower.includes('nav')) {
    if (pathLower.includes('navbar') || pathLower.includes('header') || pathLower.includes('nav')) {
      score += 90;
      relevance = 'direct';
      reasons.push('Navigation component match');
    }
  }

  if (promptLower.includes('style') || promptLower.includes('css') || promptLower.includes('color') ||
      promptLower.includes('spacing') || promptLower.includes('font') || promptLower.includes('layout')) {
    if (file.language === 'css' || file.language === 'scss') {
      score += 60;
      if (relevance !== 'direct') relevance = 'dependent';
      reasons.push('CSS file for styling change');
    }
  }

  // Important structural files always get some score
  if (nameLower === 'app.jsx' || nameLower === 'app.tsx') {
    score += 30;
    if (relevance === 'contextual') relevance = 'dependent';
    reasons.push('Root component');
  }
  if (nameLower === 'package.json') {
    if (promptLower.includes('install') || promptLower.includes('dependency') || promptLower.includes('package')) {
      score += 80;
      relevance = 'direct';
      reasons.push('Package configuration');
    } else {
      score += 10;
      reasons.push('Project metadata');
    }
  }
  if (nameLower === 'index.css' || nameLower === 'global.css' || nameLower === 'styles.css') {
    score += 15;
    reasons.push('Global styles');
  }

  // Dependency analysis: if a directly-matched file imports this one, boost it
  if (relevance !== 'direct' && file.content) {
    const importedBy = findImporters(file.path, allFiles);
    for (const importer of importedBy) {
      const importerName = importer.path.split('/').pop()?.replace(/\.[^.]+$/, '').toLowerCase() ?? '';
      if (promptLower.includes(importerName)) {
        score += 40;
        relevance = 'dependent';
        reasons.push(`Imported by "${importer.path}"`);
      }
    }
  }

  return { score, relevance, reason: reasons.join('; ') || 'General context' };
}

// ─── Dependency Analysis ─────────────────────────────────────────────────────

/**
 * Find files that import a given file path.
 */
function findImporters(targetPath: string, allFiles: FileRecord[]): FileRecord[] {
  const importers: FileRecord[] = [];
  const targetName = targetPath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';

  for (const file of allFiles) {
    if (!file.content || file.path === targetPath) continue;

    // Check for import statements referencing this file
    const importRegex = /(?:import|require)\s*\(?.*?['"]([^'"]+)['"]\)?/g;
    let match;
    while ((match = importRegex.exec(file.content)) !== null) {
      const importPath = match[1];
      if (importPath.includes(targetName)) {
        importers.push(file);
        break;
      }
    }
  }

  return importers;
}

/**
 * Find files that a given file imports.
 */
export function findDependencies(content: string): string[] {
  const deps: string[] = [];
  const importRegex = /(?:import|require)\s*\(?.*?['"]([^'"]+)['"]\)?/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const dep = match[1];
    // Only local imports (starting with . or /)
    if (dep.startsWith('.') || dep.startsWith('/')) {
      deps.push(dep);
    }
  }
  return deps;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractKeywords(prompt: string): string[] {
  // Remove common stop words, extract meaningful terms
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'shall', 'would',
    'should', 'may', 'might', 'must', 'can', 'could', 'to', 'of', 'in',
    'for', 'on', 'with', 'at', 'by', 'from', 'up', 'about', 'into',
    'through', 'during', 'before', 'after', 'and', 'but', 'or', 'not',
    'this', 'that', 'these', 'those', 'it', 'its', 'my', 'your', 'fix',
    'add', 'change', 'update', 'make', 'please', 'want', 'need', 'like',
    'also', 'just', 'more', 'some', 'new', 'old',
  ]);

  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}
