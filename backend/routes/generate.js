/**
 * Generate Route — POST /generate
 * Receives { prompt }, calls LLM service, returns structured JSON.
 */

const express = require("express");
const router = express.Router();
const { generate } = require("../services/llm");

router.post("/", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return res.status(400).json({
        error: "Prompt is required and must be a non-empty string.",
      });
    }

    console.log(`\n[Generate] Received prompt: "${prompt.slice(0, 80)}..."`);

    const result = await generate(prompt.trim());

    console.log(`[Generate] Success via model: ${result.model}`);

    return res.json({
      success: true,
      model: result.model,
      steps: result.steps,
      data: result.data,
    });
  } catch (err) {
    console.error("[Generate] Error:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
});

module.exports = router;
