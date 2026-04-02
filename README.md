<div align="center">

<img src="docs/banner.png" alt="Archon Banner" width="100%" />

<br />
<br />

[![MIT License](https://img.shields.io/badge/License-MIT-6366f1?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.0-a855f7?style=for-the-badge&logo=semver&logoColor=white)](package.json)
[![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Groq](https://img.shields.io/badge/Powered_by-Groq-f55036?style=for-the-badge&logo=lightning&logoColor=white)](https://groq.com)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)

<br />

**Describe your vision. Archon builds it.**

*AI-powered system architect that generates complete technical blueprints<br />and production-ready React frontends from a single prompt.*

[🚀 Live Demo](https://archon.dinez.in) · [📖 Documentation](#-quick-start) · [🐛 Report Bug](../../issues) · [✨ Request Feature](../../issues)

<br />

---

</div>

## ⚡ What is Archon?

Archon is not just another code generator — it's a **complete system architect**. Give it a prompt like *"Clone Zomato"* and it will:

```
📐  Design the full-stack architecture
🗃️  Generate database schemas with proper relationships
🔌  Plan API endpoints with RESTful conventions
⚛️  Build a complete React frontend with real brand colors
🎨  Style everything with CSS variables, animations & responsive design
📦  Package it as a downloadable Vite project
```

All in **under 30 seconds**, powered by Groq's blazing-fast inference.

<br />

<div align="center">
<table>
<tr>
<td align="center"><b>🎯 Input</b></td>
<td align="center"><b>→</b></td>
<td align="center"><b>✨ Output</b></td>
</tr>
<tr>
<td><code>"Clone Zomato"</code></td>
<td align="center">⚡</td>
<td>Full Zomato UI with #E23744 brand red, restaurant cards, search, ratings</td>
</tr>
<tr>
<td><code>"Spotify Clone"</code></td>
<td align="center">⚡</td>
<td>Dark theme (#121212), sidebar, album grids, play buttons with #1DB954 green</td>
</tr>
<tr>
<td><code>"Netflix Clone"</code></td>
<td align="center">⚡</td>
<td>Hero banner, horizontal carousels, hover zoom, #E50914 brand red</td>
</tr>
<tr>
<td><code>"Finance Dashboard"</code></td>
<td align="center">⚡</td>
<td>Professional #1A365D blue theme, charts, analytics cards, data tables</td>
</tr>
</table>
</div>

<br />

## 🖼️ Screenshots

<div align="center">

<details>
<summary><b>🖥️ Main Interface — Dark-themed desktop IDE layout</b></summary>
<br />
<img src="docs/screenshots/main-ui.png" alt="Archon Main UI" width="90%" />
<br /><br />
<em>Three-panel layout: Prompt sidebar • Main content area • Agent progress panel</em>
</details>

<details open>
<summary><b>👁️ Live Preview — Real-time React rendering</b></summary>
<br />
<img src="docs/screenshots/preview-demo.png" alt="Preview Demo" width="90%" />
<br /><br />
<em>Generated Zomato clone rendering live in the browser with correct brand colors</em>
</details>

<details>
<summary><b>💻 Code View — Syntax-highlighted generated code</b></summary>
<br />
<img src="docs/screenshots/code-view.png" alt="Code View" width="90%" />
<br /><br />
<em>Full React JSX and CSS code with Prism.js syntax highlighting</em>
</details>

</div>

<br />

## ✨ Features

<table>
<tr>
<td width="50%">

### 🏗️ Architecture Generation
- System design with frontend/backend/database planning
- Database schemas with proper column types and relationships
- RESTful API endpoint design
- Tech stack recommendations
- Scaling strategy planning

</td>
<td width="50%">

### ⚛️ React Code Generation
- Complete React + Vite project output
- Single-file architecture (all components inline)
- Brand-accurate color matching for 10+ popular brands
- 8+ data items with realistic names and content
- 15+ Font Awesome icons per project

</td>
</tr>
<tr>
<td width="50%">

### 👁️ Live Preview
- In-browser React rendering via Babel transpilation
- Desktop / Tablet / Mobile viewport switcher
- Instant preview — no build step required
- React 18 UMD + Babel Standalone under the hood

</td>
<td width="50%">

### 📦 Export & Download
- One-click ZIP download with full Vite scaffolding
- Includes `package.json`, `vite.config.js`, source files
- Architecture docs exported as Markdown + SQL
- Copy-to-clipboard for individual code blocks

</td>
</tr>
<tr>
<td width="50%">

### 🤖 Agent Panel
- Real-time step-by-step generation progress
- Model selection visibility (which AI model was used)
- Error/retry status with automatic fallback logging
- Simulated phase messages for better UX during API calls

</td>
<td width="50%">

### 🛡️ Multi-Model Resilience
- 4-model automatic fallback chain
- 413 (payload too large) → auto-skip to next model
- 429 (rate limit) → rotate API keys and retry
- Graceful demo fallback when all models exhausted

</td>
</tr>
</table>

<br />

## 🏛️ Tech Stack

<div align="center">

| Layer | Technologies | 
|:------|:-------------|
| **Frontend** | ![React](https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white) ![Framer](https://img.shields.io/badge/Framer_Motion-0055FF?style=flat-square&logo=framer&logoColor=white) |
| **Backend** | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white) ![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white) |
| **AI Models** | ![Llama](https://img.shields.io/badge/Llama_3.3_70B-6366f1?style=flat-square) ![GPT-OSS](https://img.shields.io/badge/GPT--OSS_120B-a855f7?style=flat-square) ![GPT-OSS](https://img.shields.io/badge/GPT--OSS_20B-ec4899?style=flat-square) ![Llama](https://img.shields.io/badge/Llama_3.1_8B-f59e0b?style=flat-square) |
| **Build** | ![Vite](https://img.shields.io/badge/Vite_5-646CFF?style=flat-square&logo=vite&logoColor=white) ![PostCSS](https://img.shields.io/badge/PostCSS-DD3A0A?style=flat-square&logo=postcss&logoColor=white) |
| **Preview** | ![Babel](https://img.shields.io/badge/Babel_Standalone-F9DC3E?style=flat-square&logo=babel&logoColor=black) ![React UMD](https://img.shields.io/badge/React_UMD-61DAFB?style=flat-square&logo=react&logoColor=black) |

</div>

<br />

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** — [Download](https://nodejs.org)
- **Groq API Key** (free) — [Get one here](https://console.groq.com/keys)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/archon.git
cd archon

# 2. Install dependencies
npm install
cd backend && npm install && cd ..

# 3. Configure your API key
cp backend/.env.example backend/.env
```

Edit `backend/.env` and add your Groq key:

```env
GROQ_API_KEYS=gsk_your_key_here
```

### Development

```bash
npm run dev
```

This launches both servers concurrently:

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | `http://localhost:8080` | Vite dev server with HMR |
| Backend | `http://localhost:5000` | Express API server |

### Production Build

```bash
npm run build          # Build frontend → dist/
cd backend && node server.js   # Serve everything
```

<br />

## 📁 Project Structure

```
archon/
├── 🎨 src/                       # React frontend
│   ├── components/
│   │   ├── TitleBar.tsx          # App header with branding
│   │   ├── ArchonSidebar.tsx     # Prompt input + generate button
│   │   ├── MainPanel.tsx         # Architecture / Code / Files / Preview tabs
│   │   ├── AgentPanel.tsx        # Real-time generation progress
│   │   └── StatusBar.tsx         # Connection & model status
│   ├── pages/
│   │   ├── Index.tsx             # Main page with generation orchestration
│   │   └── NotFound.tsx          # 404 page
│   ├── App.tsx                   # Router setup
│   ├── index.css                 # Design system & global styles
│   └── main.tsx                  # Entry point
│
├── ⚙️ backend/                    # Express API server
│   ├── server.js                 # Server entry + static file serving
│   ├── routes/generate.js        # POST /generate endpoint
│   ├── services/llm.js           # Groq API · prompt engineering · model fallback
│   ├── .env                      # API keys (gitignored)
│   └── .env.example              # Template for env vars
│
├── 📂 public/                     # Static assets
│   ├── Logo.png                  # App logo
│   └── favicon.svg               # Browser icon
│
├── 📸 docs/                       # Documentation & screenshots
│   ├── banner.png                # README banner
│   └── screenshots/              # UI screenshots
│
├── render.yaml                   # Render.com deployment config
├── tailwind.config.ts            # Custom theme (dark mode, glass effects)
├── vite.config.ts                # Vite build + proxy config
└── package.json                  # v1.0.0
```

<br />

## 🔧 Environment Variables

| Variable | Required | Description |
|:---------|:--------:|:------------|
| `GROQ_API_KEYS` | ✅ | Comma-separated Groq API keys for rotation |
| `PORT` | ❌ | Backend port (default: `5000`) |

> **💡 Tip:** Use multiple API keys separated by commas for automatic key rotation on rate limits:
> ```env
> GROQ_API_KEYS=gsk_key1,gsk_key2,gsk_key3
> ```

<br />

## 🧠 How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                      USER PROMPT                            │
│                   "Clone Zomato"                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                    ARCHON BACKEND                            │
│                                                              │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐  │
│  │   System    │ → │  Groq API    │ → │  JSON Parser     │  │
│  │   Prompt    │   │  (4 models)  │   │  + Validator     │  │
│  │   (~800     │   │              │   │                  │  │
│  │   tokens)   │   │  Llama 70B   │   │  Architecture    │  │
│  │             │   │  GPT-OSS 120B│   │  + React Code    │  │
│  │  + User     │   │  GPT-OSS 20B │   │  + CSS           │  │
│  │    Message   │   │  Llama 8B   │   │  + HTML          │  │
│  └─────────────┘   └──────────────┘   └──────────────────┘  │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                    ARCHON FRONTEND                            │
│                                                              │
│  ┌────────────┐ ┌──────────┐ ┌────────┐ ┌────────────────┐  │
│  │Architecture│ │  Code    │ │ Files  │ │    Preview     │  │
│  │   View     │ │  View    │ │ View   │ │  (Babel +      │  │
│  │            │ │ (Prism)  │ │ (Tree) │ │   React UMD)   │  │
│  └────────────┘ └──────────┘ └────────┘ └────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

<br />

## 🌐 Deployment

### Render.com (Recommended)

The project includes `render.yaml` for one-click deployment:

1. Push to GitHub
2. Connect repo on [Render.com](https://render.com)
3. Set `GROQ_API_KEYS` in environment variables
4. Deploy → Your app is live!

### Manual Deployment

```bash
npm run build
cd backend
GROQ_API_KEYS=gsk_... PORT=3000 node server.js
```

The backend serves the built frontend from `dist/` automatically.

<br />

## 🎨 Brand Color Database

Archon knows the exact brand colors for popular apps:

| Brand | Primary Color | Hex Code |
|:------|:-------------|:---------|
| 🔴 Zomato | ![](https://img.shields.io/badge/-%23E23744-E23744?style=flat-square) | `#E23744` |
| 🟢 Spotify | ![](https://img.shields.io/badge/-%231DB954-1DB954?style=flat-square) | `#1DB954` |
| 🔴 Netflix | ![](https://img.shields.io/badge/-%23E50914-E50914?style=flat-square) | `#E50914` |
| 🩷 Airbnb | ![](https://img.shields.io/badge/-%23FF5A5F-FF5A5F?style=flat-square) | `#FF5A5F` |
| 🟠 Amazon | ![](https://img.shields.io/badge/-%23FF9900-FF9900?style=flat-square) | `#FF9900` |
| 🔴 YouTube | ![](https://img.shields.io/badge/-%23FF0000-FF0000?style=flat-square) | `#FF0000` |
| 🟠 Swiggy | ![](https://img.shields.io/badge/-%23FC8019-FC8019?style=flat-square) | `#FC8019` |
| 🟢 WhatsApp | ![](https://img.shields.io/badge/-%2325D366-25D366?style=flat-square) | `#25D366` |
| 🔵 Twitter | ![](https://img.shields.io/badge/-%231DA1F2-1DA1F2?style=flat-square) | `#1DA1F2` |
| ⚫ Uber | ![](https://img.shields.io/badge/-%23000000-000000?style=flat-square) | `#000000` |

<br />

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

<br />

---

<div align="center">

**Built with ⚡ by Archon**

*Generating the future of web development, one prompt at a time.*

<br />

[![Groq](https://img.shields.io/badge/Powered_by-Groq_AI-f55036?style=for-the-badge&logo=lightning&logoColor=white)](https://groq.com)

</div>
