/**
 * File Editing Engine — Targeted edits, NOT full regeneration.
 *
 * Supports two edit modes:
 * 1. Search/Replace blocks (primary — what the LLM returns)
 * 2. Unified diff patches (fallback)
 *
 * Flow:
 *   User prompt → file selector → send relevant files → LLM returns edits → apply → save
 */

import * as Diff from 'diff';
import prisma from '../../db/prisma.client';
import { updateFile, readFileByPath } from '../files/files.service';
import { aiLogger } from '../../utils/logger';

// ─── Types ───────────────────────────────────────────────────────────────────

/** A single search/replace edit block from LLM output */
export interface SearchReplaceEdit {
  file: string;       // File path: "src/components/Navbar.tsx"
  search: string;     // Exact text to find
  replace: string;    // Replacement text
}

/** A file-level patch (multiple edits per file) */
export interface FilePatch {
  path: string;
  edits: SearchReplaceEdit[];
}

/** Result of applying edits to a file */
export interface EditResult {
  path: string;
  success: boolean;
  applied: number;    // Number of edits applied
  failed: number;     // Number of edits that failed to match
  errors: string[];
}

/** Full response from the edit engine */
export interface EditEngineResult {
  results: EditResult[];
  totalApplied: number;
  totalFailed: number;
  snapshotId?: string;
}

// ─── Parse LLM Output ───────────────────────────────────────────────────────

/**
 * Parse structured edit instructions from LLM output.
 * Supports two formats:
 *
 * Format 1 — JSON array of search/replace blocks:
 * { "edits": [{ "file": "...", "search": "...", "replace": "..." }] }
 *
 * Format 2 — Markdown-style SEARCH/REPLACE blocks:
 * <<<<<<< SEARCH
 * old code
 * =======
 * new code
 * >>>>>>> REPLACE
 */
export function parseLLMEdits(rawOutput: string, targetFile?: string): SearchReplaceEdit[] {
  // Try JSON format first
  try {
    const parsed = JSON.parse(rawOutput);
    if (parsed.edits && Array.isArray(parsed.edits)) {
      return parsed.edits.map((e: any) => ({
        file: e.file || e.path || targetFile || '',
        search: e.search || e.old || '',
        replace: e.replace || e.new || e.replacement || '',
      }));
    }
    // Handle { "file_path": { search, replace } } format
    if (typeof parsed === 'object' && !Array.isArray(parsed)) {
      const edits: SearchReplaceEdit[] = [];
      for (const [file, changes] of Object.entries(parsed)) {
        if (Array.isArray(changes)) {
          for (const change of changes as any[]) {
            edits.push({ file, search: change.search || '', replace: change.replace || '' });
          }
        }
      }
      if (edits.length > 0) return edits;
    }
  } catch {
    // Not JSON, try markdown format
  }

  // Try SEARCH/REPLACE block format
  const blocks = parseSearchReplaceBlocks(rawOutput, targetFile);
  if (blocks.length > 0) return blocks;

  // Fallback: treat entire output as replacement for the target file
  if (targetFile) {
    return [{ file: targetFile, search: '', replace: rawOutput }];
  }

  return [];
}

/**
 * Parse <<<<<<< SEARCH / ======= / >>>>>>> REPLACE blocks.
 */
function parseSearchReplaceBlocks(text: string, defaultFile?: string): SearchReplaceEdit[] {
  const edits: SearchReplaceEdit[] = [];
  const regex = /<<<<<<< SEARCH\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> REPLACE/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    edits.push({
      file: defaultFile ?? '',
      search: match[1],
      replace: match[2],
    });
  }

  return edits;
}

// ─── Apply Edits ─────────────────────────────────────────────────────────────

/**
 * Apply a single search/replace edit to file content.
 * Returns null if the search string wasn't found.
 */
export function applySearchReplace(
  content: string,
  search: string,
  replace: string
): string | null {
  // Empty search = full file replacement
  if (!search || search.trim() === '') {
    return replace;
  }

  // Exact match first
  if (content.includes(search)) {
    return content.replace(search, replace);
  }

  // Try with normalized whitespace
  const normalizedSearch = search.replace(/\s+/g, ' ').trim();
  const normalizedContent = content.replace(/\s+/g, ' ');

  if (normalizedContent.includes(normalizedSearch)) {
    // Find the actual position using normalized form
    const startIdx = normalizedContent.indexOf(normalizedSearch);
    // Map back to original content (approximate)
    const lines = content.split('\n');
    let charCount = 0;
    let startLine = -1;
    let endLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const lineNorm = lines[i].replace(/\s+/g, ' ').trim();
      const searchLines = search.split('\n').map(l => l.replace(/\s+/g, ' ').trim());

      if (lineNorm.includes(searchLines[0]) && startLine === -1) {
        startLine = i;
      }
      if (startLine !== -1 && lineNorm.includes(searchLines[searchLines.length - 1])) {
        endLine = i;
        break;
      }
    }

    if (startLine !== -1 && endLine !== -1) {
      const before = lines.slice(0, startLine).join('\n');
      const after = lines.slice(endLine + 1).join('\n');
      return [before, replace, after].filter(Boolean).join('\n');
    }
  }

  return null; // No match found
}

/**
 * Apply multiple edits to a project.
 * Groups edits by file, applies each, saves with versioning.
 */
export async function applyEdits(
  projectId: string,
  edits: SearchReplaceEdit[],
  snapshotId?: string
): Promise<EditEngineResult> {
  // Group edits by file
  const editsByFile = new Map<string, SearchReplaceEdit[]>();
  for (const edit of edits) {
    const existing = editsByFile.get(edit.file) ?? [];
    existing.push(edit);
    editsByFile.set(edit.file, existing);
  }

  const results: EditResult[] = [];
  let totalApplied = 0;
  let totalFailed = 0;

  for (const [filePath, fileEdits] of editsByFile) {
    const result: EditResult = {
      path: filePath,
      success: true,
      applied: 0,
      failed: 0,
      errors: [],
    };

    try {
      const file = await readFileByPath(projectId, filePath);
      let currentContent = file.content ?? '';

      for (const edit of fileEdits) {
        const patched = applySearchReplace(currentContent, edit.search, edit.replace);
        if (patched !== null) {
          currentContent = patched;
          result.applied++;
        } else {
          result.failed++;
          result.errors.push(`Search text not found in ${filePath}: "${edit.search.slice(0, 50)}..."`);
        }
      }

      if (result.applied > 0) {
        await updateFile(file.id, { content: currentContent }, snapshotId);
      }

      totalApplied += result.applied;
      totalFailed += result.failed;
      result.success = result.failed === 0;
    } catch (err) {
      result.success = false;
      result.errors.push((err as Error).message);
      totalFailed += fileEdits.length;
    }

    results.push(result);
  }

  return { results, totalApplied, totalFailed, snapshotId };
}

// ─── Diff Engine ─────────────────────────────────────────────────────────────

/**
 * Generate a unified diff between two strings.
 */
export function generateDiff(
  oldContent: string,
  newContent: string,
  filePath: string = 'file'
): string {
  return Diff.createPatch(filePath, oldContent, newContent, 'old', 'new');
}

/**
 * Apply a unified diff patch to content.
 */
export function applyUnifiedPatch(content: string, patch: string): string | null {
  const result = Diff.applyPatch(content, patch);
  if (result === false) return null;
  return result;
}

/**
 * Validate that a patch can be applied to the given content.
 */
export function validatePatch(content: string, patch: string): boolean {
  const result = Diff.applyPatch(content, patch);
  return result !== false;
}

/**
 * Generate a structured diff with line-level changes.
 */
export function getStructuredDiff(
  oldContent: string,
  newContent: string
): Array<{ type: 'added' | 'removed' | 'unchanged'; value: string }> {
  const changes = Diff.diffLines(oldContent, newContent);
  return changes.map(change => ({
    type: change.added ? 'added' : change.removed ? 'removed' : 'unchanged',
    value: change.value,
  }));
}
