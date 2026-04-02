# Archon — AI System Architect

Archon is an AI-powered system architect that generates complete technical blueprints and working frontend code from a single prompt. Powered by **Groq** for blazing-fast inference.

## Features

- **Architecture Generation** — System design, database schemas, API endpoints, tech stack, and scaling strategies
- **Frontend Code Generation** — Complete HTML/CSS/JS with brand-matching design, responsive layouts, and interactivity
- **Live Preview** — Instant iframe preview of generated frontend code
- **File Explorer** — Browse and view generated files with syntax highlighting
- **Agent Panel** — Real-time generation progress with step-by-step logging

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express |
| AI | Groq API (Llama 3.3 70B, Llama 3.1 8B) |
| Build | Vite, PostCSS |

## Quick Start

### Prerequisites
- Node.js 18+
- A free [Groq API key](https://console.groq.com/keys)

### Setup

```bash
# Install dependencies
npm install
cd backend && npm install && cd ..

# Configure API key
cp backend/.env.example backend/.env
# Edit backend/.env and add your GROQ_API_KEYS=gsk_...

# Start development server
npm run dev
```

This starts both the Vite frontend (port 8080) and Express backend (port 5000).

### Production Build

```bash
npm run build
cd backend && node server.js
```

## Project Structure

```
archon/
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── TitleBar.tsx    # App header with branding
│   │   ├── ArchonSidebar.tsx # Prompt input sidebar
│   │   ├── MainPanel.tsx   # Architecture/Code/Files/Preview tabs
│   │   ├── AgentPanel.tsx  # Generation progress logs
│   │   └── StatusBar.tsx   # Connection & model status
│   ├── pages/
│   │   ├── Index.tsx       # Main page with generation logic
│   │   └── NotFound.tsx    # 404 page
│   ├── App.tsx             # Router setup
│   ├── index.css           # Design system & global styles
│   └── main.tsx            # Entry point
├── backend/                # Express API server
│   ├── server.js           # Server entry point
│   ├── routes/generate.js  # POST /generate endpoint
│   ├── services/llm.js     # Groq API integration
│   ├── .env                # API keys (not in git)
│   └── .env.example        # Template for env vars
├── public/                 # Static assets
│   ├── Logo.png            # App logo
│   ├── favicon.svg         # Browser icon
│   └── robots.txt          # SEO
├── render.yaml             # Render.com deployment config
├── tailwind.config.ts      # Tailwind CSS theme
├── vite.config.ts          # Vite build config
└── package.json            # Dependencies & scripts
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEYS` | Comma-separated Groq API keys |
| `PORT` | Backend port (default: 5000) |

## Deployment

Configured for [Render.com](https://render.com) via `render.yaml`. Set `GROQ_API_KEYS` as an environment variable in the Render dashboard.

## License

MIT
