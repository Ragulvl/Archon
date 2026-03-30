<div align="center">

# ⚡ Archon — AI System Architect

**Generate full-stack architectures and working frontend code from a single prompt.**

[![Live Demo](https://img.shields.io/badge/🌐_Live-archon.dinez.in-6ee7b7?style=for-the-badge)](https://archon.dinez.in)
[![GitHub](https://img.shields.io/badge/GitHub-Ragulvl/Archon-181717?style=for-the-badge&logo=github)](https://github.com/Ragulvl/Archon)

</div>

---

## 🎯 What is Archon?

Archon is an AI-powered system design tool that takes a project idea and generates:

- **System Architecture** — features, tech stack, scaling strategies
- **Database Schema** — production-ready SQL with proper types and constraints
- **API Endpoints** — RESTful routes with methods and descriptions
- **Working Frontend** — complete HTML/CSS/JS with brand-matched design

> Type "clone Zomato" → get Zomato-colored UI with restaurant cards, ratings, search.
> Type "e-commerce marketplace" → get a full product grid with cart UI.

---

## 🖥️ Screenshots

| Architecture Tab | Code Tab | Files Tab |
|:---:|:---:|:---:|
| System design output | Syntax-highlighted code | Project structure + ZIP download |

---

## 🏗️ Architecture

```
┌──────────────┐     POST /generate     ┌──────────────────┐
│   React UI   │ ──────────────────────→ │  Express Backend  │
│  (Vite/8080) │ ←────────────────────── │   (Node/5000)     │
└──────────────┘     JSON response       └────────┬─────────┘
                                                  │
                                    ┌─────────────┼──────────────┐
                                    ▼             ▼              ▼
                              ┌──────────┐ ┌──────────┐ ┌──────────────┐
                              │ Nemotron │ │  Qwen 3  │ │ HuggingFace  │
                              │ (primary)│ │  (free)  │ │  (fallback)  │
                              └──────────┘ └──────────┘ └──────────────┘
```

**Fallback Chain:** Nemotron → Qwen 3 Coder → HuggingFace → Demo Data

**Key Rotation:** 16 OpenRouter keys + 6 HuggingFace keys auto-rotate on rate limits.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm

### 1. Clone & Install

```bash
git clone https://github.com/Ragulvl/Archon.git
cd Archon

# Frontend
npm install

# Backend
cd backend
npm install
```

### 2. Configure API Keys

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your keys:

```env
OPENROUTER_API_KEYS=sk-or-v1-key1,sk-or-v1-key2,sk-or-v1-key3
HF_API_KEYS=hf_key1,hf_key2
PORT=5000
```

Get keys from:
- [OpenRouter](https://openrouter.ai/keys) (free tier available)
- [HuggingFace](https://huggingface.co/settings/tokens)

### 3. Run

```bash
# Terminal 1 — Backend
cd backend && node server.js

# Terminal 2 — Frontend
npm run dev
```

Open **http://localhost:8080**

---

## 📁 Project Structure

```
Archon/
├── backend/
│   ├── server.js              # Express server
│   ├── routes/generate.js     # POST /generate endpoint
│   ├── services/llm.js        # LLM chain + brand-aware prompt
│   ├── utils/keyRotation.js   # API key rotation
│   ├── .env                   # API keys (gitignored)
│   └── .env.example           # Template
├── src/
│   ├── pages/Index.tsx        # Main page (state hub)
│   ├── components/
│   │   ├── ArchonSidebar.tsx  # Input + Generate button
│   │   ├── MainPanel.tsx      # Architecture/Code/Files tabs
│   │   ├── AgentPanel.tsx     # Live generation logs
│   │   ├── StatusBar.tsx      # Status + model info
│   │   └── TitleBar.tsx       # App title
│   ├── App.tsx                # Router
│   ├── main.tsx               # Entry point
│   └── index.css              # Design system
├── index.html
├── vite.config.ts             # Vite + backend proxy
├── tailwind.config.ts
└── package.json
```

---

## ✨ Features

- **Brand-Aware Generation** — detects clones (Zomato, Spotify, Netflix) and uses real brand colors
- **Multi-Provider Fallback** — Nemotron → Qwen → HuggingFace → demo data
- **16-Key Rotation** — auto-rotates API keys on rate limits
- **ZIP Download** — downloads individual files (HTML, CSS, JS, schema.sql, architecture.md)
- **Live Agent Logs** — real-time progress in the agent panel
- **3-Panel IDE Layout** — sidebar, main editor, agent panel
- **Dark Theme** — professional IDE-style dark UI

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| LLM Providers | OpenRouter (Nemotron, Qwen), HuggingFace |
| Styling | Tailwind CSS, custom design tokens |
| Download | JSZip (client-side ZIP generation) |

---

## 🌐 Deployment

**Live at:** [archon.dinez.in](https://archon.dinez.in)

---

## 📄 License

MIT © [Ragulvl](https://github.com/Ragulvl)
