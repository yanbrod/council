const { Router } = require('express');
const db = require('../db');
const { runSession } = require('../services/orchestrator');
const config = require('../config');

const router = Router();

const VALID_COMPILERS = Object.keys(config.PROVIDERS);

// POST /api/council
// Synchronous (blocking) endpoint: sends prompt to all advisors,
// compiles result, returns everything in one response.
router.post('/', async (req, res) => {
  const { prompt, compiler } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt is required' });
  }
  if (!compiler || !VALID_COMPILERS.includes(compiler)) {
    return res
      .status(400)
      .json({ error: `compiler must be one of: ${VALID_COMPILERS.join(', ')}` });
  }

  try {
    const session = db.createSession(prompt.trim(), compiler);
    await runSession(session.id);
    const result = db.getSession(session.id);

    const advisors = result.responses.filter((r) => r.role === 'advisor');
    const compilerResponse = result.responses.find((r) => r.role === 'compiler');

    res.json({
      sessionId: result.id,
      status: result.status,
      advisors: advisors.map((a) => ({
        provider: a.provider_name,
        status: a.status,
        text: a.response_text,
        durationMs: a.duration_ms,
      })),
      compiled: compilerResponse
        ? {
            provider: compilerResponse.provider_name,
            status: compilerResponse.status,
            text: compilerResponse.response_text,
            durationMs: compilerResponse.duration_ms,
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
