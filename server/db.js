const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const dbDir = path.dirname(config.DB_PATH);
fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(config.DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_prompt TEXT NOT NULL,
    compiler_provider TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'created',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id),
    provider_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('advisor', 'compiler')),
    status TEXT NOT NULL DEFAULT 'pending',
    response_text TEXT,
    stderr_text TEXT,
    exit_code INTEGER,
    duration_ms INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const stmts = {
  insertSession: db.prepare(
    `INSERT INTO sessions (user_prompt, compiler_provider) VALUES (?, ?)`
  ),
  updateSessionStatus: db.prepare(
    `UPDATE sessions SET status = ?, updated_at = datetime('now') WHERE id = ?`
  ),
  insertResponse: db.prepare(
    `INSERT INTO responses (session_id, provider_name, role) VALUES (?, ?, ?)`
  ),
  updateResponse: db.prepare(
    `UPDATE responses SET status = ?, response_text = ?, stderr_text = ?, exit_code = ?, duration_ms = ? WHERE id = ?`
  ),
  getSession: db.prepare(`SELECT * FROM sessions WHERE id = ?`),
  getResponses: db.prepare(
    `SELECT * FROM responses WHERE session_id = ? ORDER BY id`
  ),
  listSessions: db.prepare(
    `SELECT id, substr(user_prompt, 1, 100) as user_prompt, compiler_provider, status, created_at FROM sessions ORDER BY id DESC LIMIT ? OFFSET ?`
  ),
  countSessions: db.prepare(`SELECT COUNT(*) as total FROM sessions`),
  deleteResponses: db.prepare(`DELETE FROM responses WHERE session_id = ?`),
  deleteSession: db.prepare(`DELETE FROM sessions WHERE id = ?`),
};

module.exports = {
  createSession(userPrompt, compilerProvider) {
    const info = stmts.insertSession.run(userPrompt, compilerProvider);
    return stmts.getSession.get(info.lastInsertRowid);
  },

  updateSessionStatus(id, status) {
    stmts.updateSessionStatus.run(status, id);
  },

  createResponse(sessionId, providerName, role) {
    const info = stmts.insertResponse.run(sessionId, providerName, role);
    return { id: info.lastInsertRowid };
  },

  updateResponse(id, { status, responseText, stderrText, exitCode, durationMs }) {
    stmts.updateResponse.run(
      status,
      responseText || null,
      stderrText || null,
      exitCode ?? null,
      durationMs ?? null,
      id
    );
  },

  getSession(id) {
    const session = stmts.getSession.get(id);
    if (!session) return null;
    const responses = stmts.getResponses.all(id);
    return { ...session, responses };
  },

  deleteSession(id) {
    const session = stmts.getSession.get(id);
    if (!session) return false;
    stmts.deleteResponses.run(id);
    stmts.deleteSession.run(id);
    return true;
  },

  listSessions(limit = 20, offset = 0) {
    const items = stmts.listSessions.all(limit, offset);
    const { total } = stmts.countSessions.get();
    return { items, total };
  },
};
