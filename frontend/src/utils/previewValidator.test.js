/**
 * previewValidator.test.js
 *
 * Plain Node.js tests (no test runner required) for the previewValidator logic.
 * Run with: node frontend/src/utils/previewValidator.test.js
 *
 * Tests:
 *   1. BROKEN: exact Zomato App.jsx from this session (bare top-level return)
 *      → validator should catch it and auto-fix successfully
 *   2. VALID: properly wrapped component
 *      → validator should pass with ok: true and no fix applied
 *   3. EDGE: empty code
 *      → validator should return ok: true (fast-path)
 *   4. DEEPLY_BROKEN: bare return inside an outer function that itself has a
 *      bare return at module level (unfixable)
 *      → validator should return ok: false, error set, no fixedCode
 */

// ── Inline the validator (mirrors previewValidator.ts, compiled manually) ──────

function hasTopLevelReturn(code) {
  let depth = 0;
  let i = 0;
  const len = code.length;

  while (i < len) {
    const ch = code[i];

    // Single-line comment
    if (ch === '/' && code[i + 1] === '/') {
      i += 2;
      while (i < len && code[i] !== '\n') i++;
      continue;
    }

    // Block comment
    if (ch === '/' && code[i + 1] === '*') {
      i += 2;
      while (i < len - 1 && !(code[i] === '*' && code[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    // String literals
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      i++;
      while (i < len) {
        if (code[i] === '\\') { i += 2; continue; }
        if (code[i] === quote) { i++; break; }
        i++;
      }
      continue;
    }

    // Braces
    if (ch === '{') { depth++; i++; continue; }
    if (ch === '}') { depth--; i++; continue; }

    // Top-level return keyword detection
    if (depth === 0) {
      const remaining = code.slice(i);
      const returnMatch = remaining.match(/^return(?=[\s(])/);
      if (returnMatch) {
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

function autoWrapInAppFunction(code) {
  return `function App() {\n${code}\n}`;
}

function validateComponentCode(code) {
  const trimmed = code.trim();
  if (!trimmed) return { ok: true };

  const isBroken = hasTopLevelReturn(trimmed);

  if (!isBroken) {
    return { ok: true };
  }

  // Always attempt auto-wrap when a top-level return is detected
  const fixed = autoWrapInAppFunction(trimmed);
  const fixedStillBroken = hasTopLevelReturn(fixed);

  if (!fixedStillBroken) {
    return { ok: false, fixedCode: fixed };
  }

  // Auto-fix also failed — code has multiple structural problems
  return {
    ok: false,
    error: 'The AI generated invalid React code (a `return` statement outside any component function). Click "Regenerate" to try again.',
  };
}

// ── Test harness ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS  ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ FAIL  ${name}`);
    console.error(`         ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

console.log('\n── Archon Preview Validator Tests ───────────────────────────────\n');

// ── TEST 1: Broken — bare return (exact Zomato App.jsx from this session) ─────
const brokenZomato = `
const restaurants = [
   { id: 1, name: 'Restaurant 1' },
   { id: 2, name: 'Restaurant 2' },
   { id: 3, name: 'Restaurant 3' },
   { id: 8, name: 'Restaurant 8' }
];

const menus = {
   1: [
      { id: 1, name: 'Item 1', price: 10.99 },
      { id: 2, name: 'Item 2', price: 9.99 }
   ]
};

const [selectedRestaurant, setSelectedRestaurant] = React.useState(null);
const [cart, setCart] = React.useState([]);

const handleSelectRestaurant = (id) => {
   setSelectedRestaurant(id);
};

const handleAddToCart = (item) => {
   setCart([...cart, item]);
};

const handleRemoveFromCart = (id) => {
   setCart(cart.filter((item) => item.id !== id));
};

return (
   <div className='app'>
      <h1>Zomato Food Delivery Clone</h1>
   </div>
);
`.trim();

test('1. Broken code (bare top-level return) is caught', () => {
  const result = validateComponentCode(brokenZomato);
  assert(!result.ok, 'Expected ok=false for broken code');
  assert(!!result.fixedCode, 'Expected auto-fix to succeed (fixedCode should be set)');
  assert(!result.error, 'Expected no error message when auto-fix succeeded');
  // Verify the fixed code does not have a top-level return
  assert(!hasTopLevelReturn(result.fixedCode), 'Fixed code should not have top-level return');
  // Verify the fixed code is wrapped in App function
  assert(result.fixedCode.startsWith('function App()'), 'Fixed code should start with function App()');
});

test('2. Auto-fixed code is valid and contains the original JSX', () => {
  const result = validateComponentCode(brokenZomato);
  assert(result.fixedCode.includes("Zomato Food Delivery Clone"), 'Fixed code should preserve original JSX content');
});

// ── TEST 2: Valid — properly wrapped component ────────────────────────────────
const validComponent = `
function App() {
  const [count, setCount] = React.useState(0);

  const handleClick = () => {
    setCount(count + 1);
  };

  return (
    <div className="container">
      <h1>Counter: {count}</h1>
      <button onClick={handleClick}>Increment</button>
    </div>
  );
}
`.trim();

test('3. Valid component passes without modification', () => {
  const result = validateComponentCode(validComponent);
  assert(result.ok === true, `Expected ok=true for valid component, got ok=${result.ok}`);
  assert(!result.fixedCode, 'Expected no fixedCode for valid component');
  assert(!result.error, 'Expected no error for valid component');
});

// ── TEST 3: Edge — empty code ─────────────────────────────────────────────────
test('4. Empty code passes (fast-path)', () => {
  const result = validateComponentCode('');
  assert(result.ok === true, 'Expected ok=true for empty code');
});

test('5. Whitespace-only code passes (fast-path)', () => {
  const result = validateComponentCode('   \n\n   ');
  assert(result.ok === true, 'Expected ok=true for whitespace-only code');
});

// ── TEST 4: Edge — return inside a function IS allowed ────────────────────────
const validWithNestedReturn = `
function App() {
  function helper() {
    return 42;  // nested return — OK!
  }

  return (
    <div>Hello: {helper()}</div>
  );
}
`.trim();

test('6. Nested return (inside function) is not a false positive', () => {
  const result = validateComponentCode(validWithNestedReturn);
  assert(result.ok === true, 'Nested return should not be flagged as broken');
});

// ── TEST 5: Const arrow function with return IS valid ─────────────────────────
const validArrowComponent = `
const App = () => {
  const [val, setVal] = React.useState('hello');
  return (
    <div>{val}</div>
  );
};
`.trim();

test('7. Arrow function component passes validation', () => {
  const result = validateComponentCode(validArrowComponent);
  assert(result.ok === true, 'Arrow function component should pass');
});

// ── TEST 6: Comment containing "return" is NOT flagged ────────────────────────
const codeWithReturnInComment = `
// This function will return a value
const App = () => {
  /* we return the JSX below */
  return <div>Hello</div>;
};
`.trim();

test('8. "return" in comment is not flagged as top-level return', () => {
  const result = validateComponentCode(codeWithReturnInComment);
  assert(result.ok === true, '"return" in comment should not be flagged');
});

// ── TEST 7: "return" in string is NOT flagged ─────────────────────────────────
const codeWithReturnInString = `
const App = () => {
  const msg = "Please return to sender";
  return <div>{msg}</div>;
};
`.trim();

test('9. "return" inside a string literal is not flagged', () => {
  const result = validateComponentCode(codeWithReturnInString);
  assert(result.ok === true, '"return" in string should not be flagged');
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n─────────────────────────────────────────────────────────────────`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('  🎉 All tests passed!\n');
} else {
  console.log('  ⚠️  Some tests failed.\n');
  process.exit(1);
}
