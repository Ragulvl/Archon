/**
 * Archon Backend Server
 * Express server with CORS, JSON parsing, and /generate route.
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const generateRoute = require("./routes/generate");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ─────────────────────────────────────────────────
app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

// ── Request logging ───────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── API Routes ────────────────────────────────────────────────
app.use("/generate", generateRoute);

// ── Health check ──────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Serve frontend in production ──────────────────────────────
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));

// SPA fallback — serve index.html for any non-API route
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// ── Error handler ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[Server Error]", err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏗️  Archon backend running on http://localhost:${PORT}`);
  console.log(`   POST /generate  — generate architecture + code`);
  console.log(`   GET  /health    — health check\n`);
});
