/**
 * LLM Service — Groq API
 * Uses Groq's fast inference for architecture + React code generation.
 * Groq API is OpenAI-compatible: POST https://api.groq.com/openai/v1/chat/completions
 */

// ── System Prompt ─────────────────────────────────────────────
// Optimized for Groq (Llama 3.3 70B): ~600 tokens, max_tokens: 8000
// Groq guide: lead with must-do, show don't tell, concise
const SYSTEM_PROMPT = `You are Archon, an elite React developer. Return ONLY valid JSON with ACTUAL working code in the frontend values — not descriptions or placeholders. First char: {, last char: }.

SINGLE-FILE RULE: App.jsx contains ALL component functions (Navbar, Hero, ProductCard, Footer) in ONE file. The ONLY import allowed: import React, { useState, useEffect, useRef } from 'react'; — NEVER import from ./Navbar, ./Hero, etc.

OUTPUT JSON KEYS:
- architecture.features.user: array of 5-8 feature strings
- architecture.features.admin: array of 4-6 feature strings
- architecture.systemArchitecture: object with frontend, backend, database, hosting, ci_cd strings
- architecture.databaseSchema: object of tables with columns
- architecture.apiEndpoints: array of {method, path, description}
- architecture.techStack: object of category: technology pairs
- architecture.scalingStrategy: object of strategy: description pairs
- frontend["App.jsx"]: string containing COMPLETE WORKING React JSX code (250+ lines, all components inline)
- frontend["index.css"]: string containing COMPLETE CSS (250+ lines)
- frontend["main.jsx"]: string containing the React entry point code
- frontend["index.html"]: string containing the Vite HTML shell

The frontend values MUST contain actual executable code as strings (with \\n for newlines), NOT descriptions.

APP.JSX CODE REQUIREMENTS:
- First line: import React, { useState, useEffect, useRef } from 'react';
- Define function Navbar() returning JSX with logo, nav links, CTA button, hamburger toggle
- Define function Hero() returning JSX with headline, subtitle, search bar, stats
- Define function ProductCard({ item }) returning JSX with image area, title, rating stars, price, badges
- Define function Footer() returning JSX with 4-column grid, brand info, links, social icons
- Define function App() with useState for menuOpen, activeCategory, searchQuery
- Inside App: products array with 8+ items (realistic names like "The Golden Spoon", "Bella Italia", "Sushi Express"), testimonials array, features array with FA icon classes, categories array
- Filter logic: products.filter by activeCategory and searchQuery
- Last line: export default App;
- Use className not class. Self-close void elements. Use 15+ different FA icons: <i className="fas fa-star"></i>
- 250+ lines total with realistic content — NEVER "Restaurant 1" or "Lorem ipsum"

INDEX.CSS REQUIREMENTS:
- CSS reset, :root with 10+ variables including --primary set to correct brand color
- Full component styles with hover effects, animations, responsive @media(max-width:768px)

BRAND COLORS for --primary: Zomato=#E23744|Spotify=#1DB954,bg#121212|Netflix=#E50914,bg#141414|Airbnb=#FF5A5F|Amazon=#FF9900|YouTube=#FF0000|Swiggy=#FC8019
New ideas: Food=#E23744|Finance=#1A365D|Gaming=#0D1117+neon|Health=#38A169

main.jsx exact code: import React from 'react';\\nimport ReactDOM from 'react-dom/client';\\nimport App from './App';\\nimport './index.css';\\nReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);

index.html: standard Vite shell with Font Awesome 6.5.0 CDN and Google Fonts Inter.

JSON escaping: \\\\", \\\\n for newlines in code strings. No trailing commas.`;

// ── Build the user message ────────────────────────────────────
function buildUserMessage(userInput) {
  return `Generate a complete architecture plan and WORKING React frontend for: "${userInput}"

The frontend["App.jsx"] value must contain ACTUAL WORKING React code as a string — not a description. Write the complete code with all components (Navbar, Hero, ProductCard, Footer) defined as functions in the same file, 250+ lines, with 8+ realistic data items, useState for search/filter, and correct brand colors.

The frontend["index.css"] value must contain ACTUAL CSS code — 250+ lines with CSS variables, component styles, hover effects, animations, and responsive breakpoints.

Return valid JSON. First char {, last char }.`;
}

// ── Groq API Configuration ───────────────────────────────────
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const API_TIMEOUT_MS = 120000; // 120 second timeout

// Models to try in priority order (production models only)
const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile",   label: "Llama 3.3 70B",   maxTokens: 8000 },
  { id: "openai/gpt-oss-120b",       label: "GPT-OSS 120B",    maxTokens: 8000 },
  { id: "openai/gpt-oss-20b",        label: "GPT-OSS 20B",     maxTokens: 8000 },
  { id: "llama-3.1-8b-instant",      label: "Llama 3.1 8B",    maxTokens: 8000 },
];

// ── Groq API Call ─────────────────────────────────────────────
async function callGroq(apiKey, model, userInput, maxTokens = 8000) {
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
      temperature: 0.3,
      max_tokens: maxTokens,
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

        const raw = await callGroq(key, model.id, userInput, model.maxTokens);
        const parsed = extractJSON(raw);

        steps.push({ step: `${model.label} succeeded`, status: "done" });
        console.log(`[LLM] ✓ Success via ${model.id}`);
        return { data: parsed, steps, model: model.label };
      } catch (err) {
        const msg = err.message || "";
        const is429 = msg.includes("429") || msg.includes("rate_limit");
        const is413 = msg.includes("413") || msg.includes("too large") || msg.includes("Request too large");
        const isTimeout = msg.includes("aborted") || msg.includes("timeout");

        console.log(`[LLM] ✗ ${model.id} failed: ${msg.slice(0, 120)}`);

        if (is429) {
          steps.push({ step: `${model.label} rate limited`, status: "error" });
          // Try next key for same model, or next model if last key
          continue;
        }
        if (is413) {
          steps.push({ step: `${model.label} request too large`, status: "error" });
          break; // Skip to next model — this model can't handle the payload
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
  const projectName = userInput || "My App";
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
        frontend: "React 18 + Vite 5 SPA",
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
        frontend: "React 18, Vite 5",
        ui: "Custom CSS with CSS variables",
        icons: "Font Awesome 6",
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
      "App.jsx": `import React, { useState, useEffect, useRef } from 'react';

/* ── Helper Components ──────────────────────────────── */

function Navbar({ menuOpen, setMenuOpen }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={\`navbar \${scrolled ? 'scrolled' : ''}\`}>
      <div className="nav-container">
        <div className="logo">
          <i className="fas fa-bolt"></i>
          <span>${projectName}</span>
        </div>
        <div className={\`nav-links \${menuOpen ? 'active' : ''}\`}>
          <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#showcase" onClick={() => setMenuOpen(false)}>Showcase</a>
          <a href="#testimonials" onClick={() => setMenuOpen(false)}>Reviews</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
          <button className="btn-primary">Get Started</button>
        </div>
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          <i className={\`fas fa-\${menuOpen ? 'times' : 'bars'}\`}></i>
        </button>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <span className="hero-badge">
          <i className="fas fa-rocket"></i> Now in Beta
        </span>
        <h1>Build Something <span className="highlight">Amazing</span></h1>
        <p className="hero-subtitle">
          The modern platform for creators, developers, and teams who want to ship faster and scale effortlessly.
        </p>
        <div className="hero-actions">
          <button className="btn-primary btn-lg">
            <i className="fas fa-play"></i> Start Free Trial
          </button>
          <button className="btn-outline btn-lg">
            <i className="fas fa-book"></i> Documentation
          </button>
        </div>
        <div className="hero-stats">
          <div className="stat"><span className="stat-number">10K+</span><span className="stat-label">Users</span></div>
          <div className="stat"><span className="stat-number">99.9%</span><span className="stat-label">Uptime</span></div>
          <div className="stat"><span className="stat-number">50+</span><span className="stat-label">Integrations</span></div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">
        <i className={\`fas fa-\${icon}\`}></i>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function ShowcaseCard({ color, title, subtitle, rating, price }) {
  return (
    <div className="showcase-card">
      <div className="showcase-img" style={{ background: color }}></div>
      <div className="showcase-info">
        <h4>{title}</h4>
        <p>{subtitle}</p>
        <div className="showcase-meta">
          <div className="stars">
            {[1, 2, 3, 4, 5].map(n => (
              <i key={n} className={\`fas fa-star\${n <= Math.floor(rating) ? '' : n - 0.5 <= rating ? '-half-alt' : ' far'}\`}></i>
            ))}
            <span>{rating}</span>
          </div>
          <span className="price">{price}</span>
        </div>
      </div>
    </div>
  );
}

function TestimonialCard({ name, role, text, avatar }) {
  return (
    <div className="testimonial-card">
      <div className="testimonial-header">
        <div className="avatar" style={{ background: avatar }}></div>
        <div>
          <h4>{name}</h4>
          <span>{role}</span>
        </div>
      </div>
      <p>"{text}"</p>
      <div className="stars">
        {[1, 2, 3, 4, 5].map(n => <i key={n} className="fas fa-star"></i>)}
      </div>
    </div>
  );
}

/* ── Main App ───────────────────────────────────────── */

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const features = [
    { icon: 'shield-alt', title: 'Enterprise Security', description: 'Bank-grade encryption with SOC2 compliance and automated threat detection.' },
    { icon: 'tachometer-alt', title: 'Lightning Fast', description: 'Sub-100ms response times with global CDN and edge computing.' },
    { icon: 'plug', title: '50+ Integrations', description: 'Connect with Slack, GitHub, Jira, and all your favorite tools.' },
    { icon: 'chart-line', title: 'Real-time Analytics', description: 'Live dashboards with custom reports and data export.' },
    { icon: 'users', title: 'Team Collaboration', description: 'Real-time editing, comments, and role-based access control.' },
    { icon: 'cloud', title: 'Cloud Native', description: 'Auto-scaling infrastructure that grows with your needs.' },
  ];

  const categories = ['All', 'Popular', 'New', 'Trending'];

  const showcaseItems = [
    { color: 'linear-gradient(135deg, #667eea, #764ba2)', title: 'Project Alpha', subtitle: 'Full-stack web application', rating: 4.8, price: '$49/mo', category: 'Popular' },
    { color: 'linear-gradient(135deg, #f093fb, #f5576c)', title: 'Design Studio', subtitle: 'Creative toolkit platform', rating: 4.6, price: '$29/mo', category: 'Trending' },
    { color: 'linear-gradient(135deg, #4facfe, #00f2fe)', title: 'Cloud Manager', subtitle: 'Infrastructure dashboard', rating: 4.9, price: '$79/mo', category: 'Popular' },
    { color: 'linear-gradient(135deg, #43e97b, #38f9d7)', title: 'DevOps Suite', subtitle: 'CI/CD pipeline manager', rating: 4.7, price: '$59/mo', category: 'New' },
    { color: 'linear-gradient(135deg, #fa709a, #fee140)', title: 'Social Hub', subtitle: 'Community management', rating: 4.5, price: '$19/mo', category: 'Trending' },
    { color: 'linear-gradient(135deg, #a18cd1, #fbc2eb)', title: 'Analytics Pro', subtitle: 'Data visualization suite', rating: 4.8, price: '$69/mo', category: 'New' },
  ];

  const testimonials = [
    { name: 'Sarah Chen', role: 'CTO at TechFlow', text: 'This platform transformed how our team ships products. We reduced our deployment time by 80%.', avatar: 'linear-gradient(135deg, #667eea, #764ba2)' },
    { name: 'Marcus Johnson', role: 'Lead Developer', text: 'The developer experience is unlike anything I have used before. Incredibly intuitive and powerful.', avatar: 'linear-gradient(135deg, #f093fb, #f5576c)' },
    { name: 'Emily Rodriguez', role: 'Product Manager', text: 'Our team productivity increased 3x after switching. The analytics alone are worth the investment.', avatar: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
  ];

  const filteredShowcase = showcaseItems.filter(item => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <Navbar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <Hero />

      {/* Features Section */}
      <section id="features" className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Features</span>
            <h2>Everything you need to <span className="highlight">succeed</span></h2>
            <p>Powerful tools designed for modern teams and ambitious projects.</p>
          </div>
          <div className="features-grid">
            {features.map((f, i) => <FeatureCard key={i} {...f} />)}
          </div>
        </div>
      </section>

      {/* Showcase Section */}
      <section id="showcase" className="section section-alt">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Showcase</span>
            <h2>Explore our <span className="highlight">products</span></h2>
          </div>
          <div className="showcase-toolbar">
            <div className="category-tabs">
              {categories.map(cat => (
                <button key={cat} className={\`tab \${activeCategory === cat ? 'active' : ''}\`} onClick={() => setActiveCategory(cat)}>{cat}</button>
              ))}
            </div>
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input type="text" placeholder="Search products..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <div className="showcase-grid">
            {filteredShowcase.map((item, i) => <ShowcaseCard key={i} {...item} />)}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Testimonials</span>
            <h2>Loved by <span className="highlight">thousands</span></h2>
          </div>
          <div className="testimonials-grid">
            {testimonials.map((t, i) => <TestimonialCard key={i} {...t} />)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <h2>Ready to get started?</h2>
          <p>Join 10,000+ teams already building with us.</p>
          <button className="btn-primary btn-lg"><i className="fas fa-arrow-right"></i> Start Free Trial</button>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="logo"><i className="fas fa-bolt"></i> ${projectName}</div>
              <p>Building the future of digital experiences.</p>
              <div className="social-links">
                <a href="#"><i className="fab fa-twitter"></i></a>
                <a href="#"><i className="fab fa-github"></i></a>
                <a href="#"><i className="fab fa-linkedin"></i></a>
                <a href="#"><i className="fab fa-discord"></i></a>
              </div>
            </div>
            <div className="footer-links">
              <h4>Product</h4>
              <a href="#">Features</a>
              <a href="#">Pricing</a>
              <a href="#">Changelog</a>
            </div>
            <div className="footer-links">
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Careers</a>
              <a href="#">Blog</a>
            </div>
            <div className="footer-links">
              <h4>Support</h4>
              <a href="#">Help Center</a>
              <a href="#">Documentation</a>
              <a href="#">Status</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 ${projectName}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}

export default App;`,

      "index.css": `/* ── Reset & Base ─────────────────────────────────── */
* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { font-family: 'Inter', system-ui, sans-serif; background: #0a0a0f; color: #e0e0e8; }
a { text-decoration: none; color: inherit; }
ul { list-style: none; }
img { max-width: 100%; display: block; }

:root {
  --primary: #6366f1;
  --primary-light: #818cf8;
  --secondary: #a855f7;
  --bg: #0a0a0f;
  --surface: #12121a;
  --card: #16161f;
  --border: #1e1e2e;
  --text: #e0e0e8;
  --text-muted: #888;
  --green: #6ee7b7;
  --radius: 12px;
}

.container { max-width: 1200px; margin: 0 auto; padding: 0 2rem; }

/* ── Navbar ───────────────────────────────────────── */
.navbar { position: sticky; top: 0; z-index: 100; background: rgba(10,10,15,0.85); backdrop-filter: blur(16px); border-bottom: 1px solid var(--border); transition: all 0.3s ease; }
.navbar.scrolled { background: rgba(10,10,15,0.95); box-shadow: 0 4px 30px rgba(0,0,0,0.3); }
.nav-container { max-width: 1200px; margin: 0 auto; padding: 0.8rem 2rem; display: flex; justify-content: space-between; align-items: center; }
.logo { display: flex; align-items: center; gap: 0.5rem; font-size: 1.3rem; font-weight: 700; color: var(--primary-light); }
.logo i { font-size: 1.1rem; }
.nav-links { display: flex; align-items: center; gap: 1.5rem; }
.nav-links a { color: var(--text-muted); font-size: 0.9rem; font-weight: 500; transition: color 0.3s ease; }
.nav-links a:hover { color: #fff; }
.hamburger { display: none; background: none; border: none; color: #fff; font-size: 1.3rem; cursor: pointer; }

/* ── Buttons ──────────────────────────────────────── */
.btn-primary { background: linear-gradient(135deg, var(--primary), var(--secondary)); color: #fff; border: none; padding: 0.6rem 1.4rem; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.3s ease; display: inline-flex; align-items: center; gap: 0.5rem; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(99,102,241,0.3); }
.btn-outline { background: transparent; color: var(--text); border: 1px solid var(--border); padding: 0.6rem 1.4rem; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.3s ease; display: inline-flex; align-items: center; gap: 0.5rem; }
.btn-outline:hover { border-color: var(--primary); color: var(--primary-light); }
.btn-lg { padding: 0.8rem 2rem; font-size: 0.95rem; }

/* ── Hero ─────────────────────────────────────────── */
.hero { text-align: center; padding: 6rem 2rem 4rem; background: radial-gradient(ellipse at top, rgba(99,102,241,0.08), transparent 70%); }
.hero-content { max-width: 700px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 1.2rem; }
.hero-badge { display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2); padding: 0.4rem 1rem; border-radius: 50px; font-size: 0.8rem; color: var(--primary-light); }
.hero h1 { font-size: 3.2rem; font-weight: 800; line-height: 1.15; letter-spacing: -0.02em; }
.highlight { background: linear-gradient(135deg, var(--primary), var(--secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.hero-subtitle { color: var(--text-muted); font-size: 1.15rem; line-height: 1.6; max-width: 550px; }
.hero-actions { display: flex; gap: 1rem; margin-top: 0.5rem; }
.hero-stats { display: flex; gap: 3rem; margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--border); }
.stat { text-align: center; }
.stat-number { display: block; font-size: 1.6rem; font-weight: 700; color: #fff; }
.stat-label { font-size: 0.8rem; color: var(--text-muted); }

/* ── Sections ─────────────────────────────────────── */
.section { padding: 5rem 0; }
.section-alt { background: var(--surface); }
.section-header { text-align: center; margin-bottom: 3rem; }
.section-badge { display: inline-block; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2); padding: 0.3rem 0.8rem; border-radius: 50px; font-size: 0.75rem; color: var(--primary-light); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }
.section-header h2 { font-size: 2.2rem; font-weight: 700; margin-bottom: 0.5rem; }
.section-header p { color: var(--text-muted); font-size: 1rem; }

/* ── Features Grid ────────────────────────────────── */
.features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
.feature-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 2rem; transition: all 0.3s ease; }
.feature-card:hover { transform: translateY(-4px); border-color: rgba(99,102,241,0.3); box-shadow: 0 12px 40px rgba(0,0,0,0.2); }
.feature-icon { width: 48px; height: 48px; border-radius: 12px; background: rgba(99,102,241,0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; color: var(--primary-light); font-size: 1.2rem; }
.feature-card h3 { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; }
.feature-card p { color: var(--text-muted); font-size: 0.9rem; line-height: 1.5; }

/* ── Showcase ─────────────────────────────────────── */
.showcase-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; gap: 1rem; flex-wrap: wrap; }
.category-tabs { display: flex; gap: 0.5rem; }
.tab { background: var(--card); border: 1px solid var(--border); color: var(--text-muted); padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 500; transition: all 0.3s ease; }
.tab.active, .tab:hover { background: var(--primary); color: #fff; border-color: var(--primary); }
.search-box { display: flex; align-items: center; gap: 0.5rem; background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 0.5rem 1rem; }
.search-box i { color: var(--text-muted); font-size: 0.85rem; }
.search-box input { background: none; border: none; color: var(--text); font-size: 0.85rem; outline: none; width: 180px; }
.search-box input::placeholder { color: #555; }
.showcase-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
.showcase-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; transition: all 0.3s ease; }
.showcase-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.2); }
.showcase-img { height: 180px; border-radius: 0; }
.showcase-info { padding: 1.2rem; }
.showcase-info h4 { font-size: 1rem; font-weight: 600; margin-bottom: 0.3rem; }
.showcase-info p { color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.8rem; }
.showcase-meta { display: flex; justify-content: space-between; align-items: center; }
.stars { color: #f59e0b; font-size: 0.8rem; display: flex; gap: 0.15rem; align-items: center; }
.stars span { color: var(--text-muted); margin-left: 0.3rem; font-size: 0.8rem; }
.price { font-weight: 600; color: var(--green); font-size: 0.9rem; }

/* ── Testimonials ─────────────────────────────────── */
.testimonials-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
.testimonial-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.8rem; transition: all 0.3s ease; }
.testimonial-card:hover { transform: translateY(-4px); border-color: rgba(99,102,241,0.3); }
.testimonial-header { display: flex; align-items: center; gap: 0.8rem; margin-bottom: 1rem; }
.avatar { width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0; }
.testimonial-header h4 { font-size: 0.95rem; font-weight: 600; }
.testimonial-header span { font-size: 0.8rem; color: var(--text-muted); }
.testimonial-card > p { color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; font-style: italic; margin-bottom: 1rem; }

/* ── CTA Section ──────────────────────────────────── */
.cta-section { text-align: center; padding: 5rem 2rem; background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.08)); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.cta-section h2 { font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem; }
.cta-section p { color: var(--text-muted); margin-bottom: 1.5rem; }

/* ── Footer ───────────────────────────────────────── */
.footer { padding: 4rem 0 2rem; border-top: 1px solid var(--border); }
.footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 3rem; margin-bottom: 3rem; }
.footer-brand p { color: var(--text-muted); font-size: 0.9rem; margin-top: 0.5rem; line-height: 1.5; }
.social-links { display: flex; gap: 1rem; margin-top: 1rem; }
.social-links a { width: 36px; height: 36px; border-radius: 8px; background: var(--card); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--text-muted); transition: all 0.3s ease; }
.social-links a:hover { color: var(--primary-light); border-color: var(--primary); transform: translateY(-2px); }
.footer-links h4 { font-size: 0.9rem; font-weight: 600; margin-bottom: 1rem; }
.footer-links a { display: block; color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.6rem; transition: color 0.3s ease; }
.footer-links a:hover { color: #fff; }
.footer-bottom { text-align: center; padding-top: 2rem; border-top: 1px solid var(--border); }
.footer-bottom p { color: #555; font-size: 0.8rem; }

/* ── Responsive ───────────────────────────────────── */
@media (max-width: 768px) {
  .hero h1 { font-size: 2rem; }
  .hero-actions { flex-direction: column; width: 100%; }
  .hero-stats { gap: 1.5rem; }
  .nav-links { display: none; position: absolute; top: 100%; left: 0; right: 0; flex-direction: column; background: var(--surface); padding: 1.5rem; border-bottom: 1px solid var(--border); gap: 1rem; }
  .nav-links.active { display: flex; }
  .hamburger { display: block; }
  .footer-grid { grid-template-columns: 1fr; gap: 2rem; }
  .showcase-toolbar { flex-direction: column; align-items: stretch; }
}`,

      "main.jsx": `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,

      "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${projectName}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>`,
    },
  };
}

module.exports = { generate };
