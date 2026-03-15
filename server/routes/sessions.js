const { Router } = require('express');
const db = require('../db');
const { runSession, cancelSession } = require('../services/orchestrator');
const config = require('../config');

const router = Router();

const VALID_COMPILERS = Object.keys(config.PROVIDERS);

router.post('/', (req, res) => {
  const { prompt, compiler } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt is required' });
  }
  if (!compiler || !VALID_COMPILERS.includes(compiler)) {
    return res
      .status(400)
      .json({ error: `compiler must be one of: ${VALID_COMPILERS.join(', ')}` });
  }

  const session = db.createSession(prompt.trim(), compiler);

  runSession(session.id).catch((err) => {
    console.error(`Session ${session.id} failed:`, err);
    db.updateSessionStatus(session.id, 'failed');
  });

  res.status(201).json({ sessionId: session.id, status: 'created' });
});

router.get('/', (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  const result = db.listSessions(limit, offset);
  res.json(result);
});

router.get('/:id', (req, res) => {
  const session = db.getSession(Number(req.params.id));
  if (!session) {
    return res.status(404).json({ error: 'session not found' });
  }
  res.json(session);
});

router.post('/:id/cancel', (req, res) => {
  const id = Number(req.params.id);
  const session = db.getSession(id);
  if (!session) {
    return res.status(404).json({ error: 'session not found' });
  }
  const cancelled = cancelSession(id);
  if (!cancelled) {
    return res.status(409).json({ error: 'session is not running' });
  }
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const deleted = db.deleteSession(Number(req.params.id));
  if (!deleted) {
    return res.status(404).json({ error: 'session not found' });
  }
  res.json({ ok: true });
});

module.exports = router;
