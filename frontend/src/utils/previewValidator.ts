/**
 * previewValidator.ts
 *
 * Validates AI-generated React component code BEFORE it is injected into the
 * Babel-based live preview iframe.
 *
 * Problem: LLMs occasionally forget to wrap the component body in a function,
 * producing a bare top-level `return` statement which Babel rejects with:
 *   "SyntaxError: 'return' outside of function"
 *
 * This module:
 *  1. Detects the pattern deterministically via brace-depth tracking.
 *  2. Attempts a cheap auto-fix (wrap in `function App() { ... }`).
 *  3. Reports a structured result so the caller can decide whether to render
 *     or show a friendly error panel.
 *
 * No external dependencies — runs in the browser.
 */

export interface ValidationResult {
  /** true = code is safe to pass to Babel */
  ok: boolean;
  /** Human-readable reason for failure (only set when ok=false) */
  error?: string;
  /** Auto-fixed code (only set when ok=false AND auto-fix succeeded) */
  fixedCode?: string;
}

// ── Core detection ─────────────────────────────────────────────────────────────

/**
 * Returns true if `code` contains a `return` statement at brace-depth 0,
 * meaning it is outside any function, class, or block body.
 *
 * We walk the string character-by-character:
 *  - Skip single-line comments (//)
 *  - Skip block comments (/* ... *\/)
 *  - Skip string literals ("...", '...', `...`)
 *  - Track { / } to maintain depth
 *  - At depth === 0, check whether the next token is `return`
 */
export function hasTopLevelReturn(code: string): boolean {
  let depth = 0;
  let i = 0;
  const len = code.length;

  while (i < len) {
    const ch = code[i];

    // ── Single-line comment ──────────────────────────────────────────────────
    if (ch === '/' && code[i + 1] === '/') {
      i += 2;
      while (i < len && code[i] !== '\n') i++;
      continue;
    }

    // ── Block comment ────────────────────────────────────────────────────────
    if (ch === '/' && code[i + 1] === '*') {
      i += 2;
      while (i < len - 1 && !(code[i] === '*' && code[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    // ── String literals ──────────────────────────────────────────────────────
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      i++;
      while (i < len) {
        if (code[i] === '\\') { i += 2; continue; } // escape
        if (code[i] === quote) { i++; break; }
        i++;
      }
      continue;
    }

    // ── Braces ───────────────────────────────────────────────────────────────
    if (ch === '{') { depth++; i++; continue; }
    if (ch === '}') { depth--; i++; continue; }

    // ── Top-level return keyword detection ───────────────────────────────────
    if (depth === 0) {
      // Check for `return` preceded by whitespace/newline/start and followed by
      // whitespace/newline/( — i.e., a real statement, not `returnValue`
      const remaining = code.slice(i);
      const returnMatch = remaining.match(/^return(?=[\s(])/);
      if (returnMatch) {
        // Make sure we're actually at a word boundary (not inside e.g. 'myreturn')
        const before = i === 0 ? '\n' : code[i - 1];
        if (/[\s;{}]/.test(before) || i === 0) {
          return true;
        }
      }
    }

    i++;
  }

  return false;
}

// ── Auto-fix ──────────────────────────────────────────────────────────────────

/**
 * Wraps raw component body code (the broken kind) in a proper App function.
 *
 * Before:
 *   const [x, setX] = useState(null);
 *   return (<div>...</div>);
 *
 * After:
 *   function App() {
 *     const [x, setX] = useState(null);
 *     return (<div>...</div>);
 *   }
 */
export function autoWrapInAppFunction(code: string): string {
  return `function App() {\n${code}\n}`;
}

// ── Main validator ────────────────────────────────────────────────────────────

/**
 * Validate a single stripped component's code before injecting into the preview.
 *
 * Returns:
 *   { ok: true }                       → safe, use code as-is
 *   { ok: false, fixedCode: "..." }    → broken but auto-fixed, use fixedCode
 *   { ok: false, error: "..." }        → broken and unfixable, show error panel
 */
export function validateComponentCode(code: string): ValidationResult {
  const trimmed = code.trim();

  // Fast-path: empty or whitespace-only
  if (!trimmed) return { ok: true };

  const isBroken = hasTopLevelReturn(trimmed);

  if (!isBroken) {
    // Code looks structurally sound
    return { ok: true };
  }

  // ── Code has a bare top-level return — attempt auto-fix ───────────────────
  console.warn(
    '[Archon Preview] Detected bare top-level `return` in generated component. ' +
    'Attempting auto-wrap in function App() { ... }'
  );

  const fixed = autoWrapInAppFunction(trimmed);
  const fixedStillBroken = hasTopLevelReturn(fixed);

  if (!fixedStillBroken) {
    console.info('[Archon Preview] Auto-fix succeeded ✓');
    return { ok: false, fixedCode: fixed };
  }

  // ── Auto-fix failed (code has multiple structural problems) ───────────────
  console.error('[Archon Preview] Auto-fix failed. Blocking preview render.');
  return {
    ok: false,
    error:
      'The AI generated invalid React code (a `return` statement outside any component function). ' +
      'Click "Regenerate" to try again — this usually succeeds on the second attempt.',
  };
}
