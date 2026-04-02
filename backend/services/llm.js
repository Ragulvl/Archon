/**
 * LLM Service — Groq API
 * Uses Groq's fast inference for architecture + code generation.
 * Groq API is OpenAI-compatible: POST https://api.groq.com/openai/v1/chat/completions
 */

// ── System Prompt (strict JSON enforcement) ───────────────────
const SYSTEM_PROMPT = `You are "Archon", a world-class full-stack developer and system architect AI known for producing STUNNING, production-quality code.

Your ONLY job is to receive a project idea and return a SINGLE valid JSON object.
You must NEVER include markdown, commentary, code fences, or explanations — ONLY raw JSON.

The JSON must follow this EXACT schema:

{
  "architecture": {
    "features": {
      "user": ["string — each a specific user-facing feature"],
      "admin": ["string — each a specific admin-facing feature"]
    },
    "systemArchitecture": {
      "frontend": "string — frontend technology and pattern",
      "backend": "string — backend technology and pattern",
      "database": "string — database engine and strategy",
      "hosting": "string — hosting and deployment approach",
      "ci_cd": "string — CI/CD pipeline description"
    },
    "databaseSchema": {
      "table_name": {
        "column_name": "SQL_TYPE CONSTRAINTS"
      }
    },
    "apiEndpoints": [
      { "method": "GET|POST|PUT|DELETE", "path": "/api/...", "description": "string" }
    ],
    "techStack": {
      "category": "string — specific technology with version"
    },
    "scalingStrategy": {
      "strategy_name": "string — description of scaling approach"
    }
  },
  "frontend": {
    "index.html": "string — complete valid HTML5 document",
    "style.css": "string — complete CSS stylesheet",
    "script.js": "string — complete JavaScript file"
  }
}

ARCHITECTURE RULES:
1. "features.user" must have 5-8 specific, detailed features relevant to the idea
2. "features.admin" must have 4-6 specific admin features
3. "databaseSchema" must have 3-6 tables with realistic columns and proper SQL types (UUID, VARCHAR, TIMESTAMP, ENUM, etc.)
4. "apiEndpoints" must have 6-12 RESTful endpoints with correct HTTP methods
5. "techStack" must list 5-8 specific technologies with versions
6. "scalingStrategy" must have 4-6 named strategies with explanations

FRONTEND CODE QUALITY RULES (THIS IS THE MOST CRITICAL PART):

STEP 1 — UNDERSTAND THE PROJECT:
Before generating ANY code, analyze the project idea deeply:
- If it says "clone X" or references an existing app/brand (e.g. Zomato, Spotify, Airbnb, Uber, Netflix), you MUST replicate that brand's visual identity:
  - Use the REAL brand colors (e.g. Zomato = #E23744 red, Spotify = #1DB954 green, Airbnb = #FF5A5F, Uber = black/white, Netflix = #E50914)
  - Match the brand's layout style (e.g. Zomato = restaurant cards with ratings, food categories; Spotify = dark UI with album art grid)
  - Use the brand's typical font style and UI patterns
- If it's a new/original idea, choose colors and style that fit the INDUSTRY:
  - Food/Restaurant → warm reds, oranges, food imagery placeholders
  - Finance/Banking → deep blues, whites, trust-building layouts
  - Social Media → vibrant gradients, card-based feeds
  - E-commerce → clean white with accent color, product grids
  - Gaming → dark with neon accents, bold typography
  - Health/Fitness → greens, clean whites, wellness vibes

STEP 2 — BUILD PREMIUM HTML (index.html):
- Valid HTML5 with <!DOCTYPE html>, <html lang="en">, proper <head> and <body>
- Must include <meta charset>, <meta viewport>, <title> matching the project name
- Must link style.css and script.js
- Use semantic HTML: <nav>, <header>, <main>, <section>, <footer>
- Use Font Awesome icons: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
- Use Google Fonts (pick the font that fits the brand): <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
- MUST include these sections (adapted to the specific project):
  1. Navigation bar with logo, links, and CTA button
  2. Hero section with compelling headline, subtext, search bar or CTA
  3. Category/feature cards section (e.g. food categories for Zomato, genres for Spotify)
  4. Product/content showcase section with realistic cards (ratings, prices, images placeholders using colored divs)
  5. How it works / value proposition section
  6. Testimonials or social proof
  7. Footer with links, social icons, copyright
- Use <i class="fas fa-..."> icons throughout — at least 10 different icons
- Use realistic placeholder content — real-sounding restaurant names, product names, prices

STEP 3 — CRAFT BEAUTIFUL CSS (style.css):
- CSS custom properties (--primary, --secondary, --bg, --card, --text etc.)
- Colors MUST match the brand/industry (NOT a generic dark theme unless the brand requires it)
- Professional typography: proper font-family, font-weight, line-height, letter-spacing
- Smooth gradients for hero and CTAs
- Card designs with: border-radius: 12px, box-shadow, hover transforms (scale 1.02-1.05)
- Glassmorphism where appropriate: backdrop-filter: blur(), semi-transparent backgrounds
- Smooth transitions on ALL interactive elements: transition: all 0.3s ease
- CSS animations: @keyframes for fade-in, slide-up, pulse effects
- Responsive: mobile-first with @media at 768px and 1024px breakpoints
- Grid layouts: display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))
- Star ratings using Font Awesome stars (<i class="fas fa-star">) styled inline
- Image placeholders: use colored divs with aspect-ratio and border-radius as image stand-ins
- Minimum 120 lines of CSS

STEP 4 — ADD REAL INTERACTIVITY (script.js):
- Smooth scroll for all anchor links
- IntersectionObserver for scroll-triggered .visible animations on sections
- Mobile hamburger menu toggle (show/hide nav)
- Active nav link highlighting on scroll
- Search bar functionality (filter visible cards by title)
- Tab switching or category filtering (click category → show/hide relevant cards)
- Counter animation for stats (animate numbers from 0 to target)
- No frameworks, no jQuery — pure vanilla JS
- Minimum 50 lines of JavaScript

COMMON MISTAKES YOU MUST AVOID:
1. NEVER use <ul><li> for nav links without removing bullet points. The CSS MUST include: nav ul { list-style: none; display: flex; gap: 1.5rem; margin: 0; padding: 0; }
2. NEVER put hero heading, subtitle, and search bar on the same line. The hero MUST use: display: flex; flex-direction: column; align-items: center; text-align: center; with each child on its own line.
3. NEVER forget to add * { margin: 0; padding: 0; box-sizing: border-box; } as the first CSS rule.
4. NEVER skip card layouts — if the idea involves products/restaurants/items, you MUST show a grid of at least 6 realistic cards with: image placeholder (colored div 200px height), title, subtitle, rating stars, and price/info.
5. NEVER use generic placeholder text like "Lorem ipsum". Use realistic content that matches the project (restaurant names like "Spice Garden", "Pizza Paradise" etc.)
6. ALWAYS include this CSS reset at the very top of style.css:
   * { margin: 0; padding: 0; box-sizing: border-box; }
   html { scroll-behavior: smooth; }
   body { font-family: 'Inter', system-ui, sans-serif; }
   a { text-decoration: none; color: inherit; }
   ul { list-style: none; }
   img { max-width: 100%; display: block; }
7. The navbar MUST be: display: flex; justify-content: space-between; align-items: center; padding: 1rem 2rem; position: sticky; top: 0; z-index: 100;
8. Cards MUST have a visible border, shadow, and hover effect — they should NOT be invisible flat divs.

JSON FORMATTING RULES:
1. Return ONLY the JSON object — no \`\`\`, no "Here is...", no commentary
2. All strings must be properly escaped for JSON (escape quotes with \\", newlines with \\n, backslashes with \\\\)
3. The first character of your response MUST be { and the last must be }
4. No trailing commas in arrays or objects`;

// ── Build the user message ────────────────────────────────────
function buildUserMessage(userInput) {
  return `Design the complete system architecture and build a STUNNING, production-quality frontend for this idea:

"${userInput}"

IMPORTANT: The frontend must look like a REAL, POLISHED website — not a basic wireframe. Use the brand's actual colors if cloning an existing app. Include a proper CSS reset, flexbox/grid layouts, card components with hover effects, and realistic content. The hero section must stack heading, subtitle, and CTA vertically using flex-direction: column.

Remember: respond with ONLY the JSON object. First character must be {, last must be }.`;
}

// ── Groq API Configuration ───────────────────────────────────
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const API_TIMEOUT_MS = 60000; // 60 second timeout

// Models to try in priority order
const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile",   label: "Llama 3.3 70B" },
  { id: "llama-3.1-8b-instant",      label: "Llama 3.1 8B" },
];

// ── Groq API Call ─────────────────────────────────────────────
async function callGroq(apiKey, model, userInput) {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserMessage(userInput) },
      ],
      temperature: 0.2,
      max_tokens: 8000,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Groq ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ── Parse JSON from LLM response ─────────────────────────────
function extractJSON(raw) {
  // Try direct parse first
  try {
    return JSON.parse(raw);
  } catch {
    // noop
  }

  // Try to extract from markdown code fence
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // noop
    }
  }

  // Try to find JSON object boundaries
  const startIdx = raw.indexOf("{");
  const endIdx = raw.lastIndexOf("}");
  if (startIdx !== -1 && endIdx > startIdx) {
    try {
      return JSON.parse(raw.slice(startIdx, endIdx + 1));
    } catch {
      // noop
    }
  }

  throw new Error("Could not extract valid JSON from LLM response");
}

// ── Main generate function ────────────────────────────────────
async function generate(userInput) {
  const groqKeys = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const steps = [];

  if (groqKeys.length === 0) {
    console.log("[LLM] No Groq API keys configured");
    steps.push({ step: "No Groq API keys configured", status: "error" });
    steps.push({ step: "Using demo response", status: "warn" });
    return { data: getDemoResponse(userInput), steps, model: "demo" };
  }

  // Try each model in priority order
  for (let i = 0; i < GROQ_MODELS.length; i++) {
    const model = GROQ_MODELS[i];

    // Try each key for this model
    for (const key of groqKeys) {
      try {
        steps.push({ step: `Trying ${model.label}…`, status: "running" });
        console.log(`[LLM] Attempting ${model.id} with key ${key.slice(0, 12)}…`);

        const raw = await callGroq(key, model.id, userInput);
        const parsed = extractJSON(raw);

        steps.push({ step: `${model.label} succeeded`, status: "done" });
        console.log(`[LLM] ✓ Success via ${model.id}`);
        return { data: parsed, steps, model: model.label };
      } catch (err) {
        const msg = err.message || "";
        const is429 = msg.includes("429") || msg.includes("rate_limit");
        const isTimeout = msg.includes("aborted") || msg.includes("timeout");

        console.log(`[LLM] ✗ ${model.id} failed: ${msg.slice(0, 120)}`);

        if (is429) {
          steps.push({ step: `${model.label} rate limited`, status: "error" });
          // Try next key for same model, or next model if last key
          continue;
        }
        if (isTimeout) {
          steps.push({ step: `${model.label} timed out`, status: "error" });
          break; // Skip remaining keys for this model — it's slow
        }

        steps.push({ step: `${model.label} failed`, status: "error" });
        break; // Unknown error — skip to next model
      }
    }

    // Small delay between models
    if (i < GROQ_MODELS.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // All models failed — return demo data
  console.log("[LLM] All Groq models exhausted — returning demo data");
  steps.push({ step: "All models failed — using demo response", status: "warn" });
  return { data: getDemoResponse(userInput), steps, model: "demo" };
}

// ── Demo / fallback response ──────────────────────────────────
function getDemoResponse(userInput) {
  return {
    architecture: {
      features: {
        user: [
          "User registration & login",
          "Dashboard with analytics",
          "Profile management",
          "Real-time notifications",
          "Search & filtering",
        ],
        admin: [
          "User management panel",
          "Content moderation",
          "Analytics dashboard",
          "System configuration",
          "Audit logs",
        ],
      },
      systemArchitecture: {
        frontend: "Vanilla HTML/CSS/JS SPA",
        backend: "Node.js + Express REST API",
        database: "PostgreSQL with Redis cache",
        hosting: "Docker containers on cloud VPS",
        ci_cd: "GitHub Actions → Docker Hub → auto-deploy",
      },
      databaseSchema: {
        users: {
          id: "UUID PRIMARY KEY",
          email: "VARCHAR(255) UNIQUE NOT NULL",
          password_hash: "VARCHAR(255) NOT NULL",
          role: "ENUM('user','admin') DEFAULT 'user'",
          created_at: "TIMESTAMP DEFAULT NOW()",
        },
        sessions: {
          id: "UUID PRIMARY KEY",
          user_id: "UUID REFERENCES users(id)",
          token: "VARCHAR(512) NOT NULL",
          expires_at: "TIMESTAMP NOT NULL",
        },
      },
      apiEndpoints: [
        { method: "POST", path: "/api/auth/register", description: "Register new user" },
        { method: "POST", path: "/api/auth/login", description: "Login & get JWT" },
        { method: "GET", path: "/api/users/me", description: "Get current user profile" },
        { method: "PUT", path: "/api/users/me", description: "Update profile" },
        { method: "GET", path: "/api/admin/users", description: "List all users (admin)" },
        { method: "DELETE", path: "/api/admin/users/:id", description: "Delete user (admin)" },
      ],
      techStack: {
        frontend: "HTML5, CSS3, Vanilla JS",
        backend: "Node.js 20, Express 4",
        database: "PostgreSQL 16",
        cache: "Redis 7",
        auth: "JWT + bcrypt",
        deployment: "Docker, Nginx reverse proxy",
      },
      scalingStrategy: {
        horizontal: "Stateless API behind load balancer",
        database: "Read replicas + connection pooling",
        caching: "Redis for sessions & hot queries",
        cdn: "Static assets via CDN",
        monitoring: "Prometheus + Grafana",
      },
    },
    frontend: {
      "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${userInput || "My App"}</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <nav class="navbar">
    <div class="logo">${userInput || "MyApp"}</div>
    <div class="nav-links">
      <a href="#features">Features</a>
      <a href="#about">About</a>
      <button class="btn-primary" id="loginBtn">Login</button>
    </div>
  </nav>
  <header class="hero">
    <h1>Welcome to <span class="highlight">${userInput || "MyApp"}</span></h1>
    <p>Your next-generation platform built for scale.</p>
    <button class="btn-primary btn-lg" id="ctaBtn">Get Started</button>
  </header>
  <section id="features" class="features">
    <h2>Features</h2>
    <div class="feature-grid">
      <div class="feature-card"><h3>Fast</h3><p>Blazing fast performance.</p></div>
      <div class="feature-card"><h3>Secure</h3><p>Enterprise-grade security.</p></div>
      <div class="feature-card"><h3>Scalable</h3><p>Grows with your needs.</p></div>
    </div>
  </section>
  <footer class="footer"><p>&copy; 2026 ${userInput || "MyApp"}. All rights reserved.</p></footer>
  <script src="script.js"></script>
</body>
</html>`,
      "style.css": `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0a0a0f; color: #e0e0e8; }
.navbar { display: flex; justify-content: space-between; align-items: center; padding: 1rem 2rem; background: #12121a; border-bottom: 1px solid #1e1e2e; }
.logo { font-size: 1.4rem; font-weight: 700; color: #6ee7b7; }
.nav-links { display: flex; gap: 1.5rem; align-items: center; }
.nav-links a { color: #a0a0b0; text-decoration: none; transition: color 0.2s; }
.nav-links a:hover { color: #fff; }
.btn-primary { background: #6ee7b7; color: #0a0a0f; border: none; padding: 0.5rem 1.2rem; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.btn-primary:hover { background: #5cd4a4; }
.btn-lg { padding: 0.8rem 2rem; font-size: 1.1rem; }
.hero { text-align: center; padding: 6rem 2rem 4rem; }
.hero h1 { font-size: 3rem; margin-bottom: 1rem; }
.highlight { color: #6ee7b7; }
.hero p { color: #888; font-size: 1.2rem; margin-bottom: 2rem; }
.features { padding: 4rem 2rem; text-align: center; }
.features h2 { font-size: 2rem; margin-bottom: 2rem; }
.feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; max-width: 900px; margin: 0 auto; }
.feature-card { background: #12121a; padding: 2rem; border-radius: 12px; border: 1px solid #1e1e2e; }
.feature-card h3 { color: #6ee7b7; margin-bottom: 0.5rem; }
.footer { text-align: center; padding: 2rem; color: #555; border-top: 1px solid #1e1e2e; }`,
      "script.js": `document.getElementById('ctaBtn').addEventListener('click', () => {
  alert('Welcome! Registration coming soon.');
});
document.getElementById('loginBtn').addEventListener('click', () => {
  alert('Login modal coming soon.');
});
console.log('App initialized');`,
    },
  };
}

module.exports = { generate };
