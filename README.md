# Archon — AI System Architect

AI-powered system architecture and frontend code generator. Describe your project idea and get a complete architecture + working frontend code instantly.

## Quick Start

### Backend
```bash
cd backend
npm install
# Add your API keys to .env
npm run dev
```

### Frontend
```bash
npm install
npm run dev
```

Open `http://localhost:8080` and start generating.

## Features

- **Architecture generation** — features, database schema, API endpoints, tech stack, scaling strategy
- **Frontend code generation** — working HTML/CSS/JS output
- **LLM fallback chain** — Qwen → Nemotron → Hugging Face → demo data
- **API key rotation** — automatic failover across multiple keys
- **Copy & download** — export generated code as JSON
