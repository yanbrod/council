const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Use a temporary database for testing
const TEST_DB_PATH = './data/test_council.db';

describe('db', () => {
  let db;

  before(() => {
    // Override config before requiring db
    const config = require('../server/config');
    config.DB_PATH = TEST_DB_PATH;
    // Clear require cache so db.js picks up new path
    delete require.cache[require.resolve('../server/db')];
    db = require('../server/db');
  });

  after(() => {
    try { fs.unlinkSync(TEST_DB_PATH); } catch {}
  });

  it('creates a session', () => {
    const session = db.createSession('test prompt', 'claude');
    assert.ok(session.id > 0);
    assert.equal(session.user_prompt, 'test prompt');
    assert.equal(session.compiler_provider, 'claude');
    assert.equal(session.status, 'created');
  });

  it('updates session status', () => {
    const session = db.createSession('another prompt', 'gemini');
    db.updateSessionStatus(session.id, 'running');
    const fetched = db.getSession(session.id);
    assert.equal(fetched.status, 'running');
  });

  it('creates and updates response', () => {
    const session = db.createSession('prompt', 'claude');
    const resp = db.createResponse(session.id, 'claude', 'advisor');
    assert.ok(resp.id > 0);

    db.updateResponse(resp.id, {
      status: 'success',
      responseText: 'answer text',
      stderrText: '',
      exitCode: 0,
      durationMs: 1500,
    });

    const fetched = db.getSession(session.id);
    const r = fetched.responses.find((x) => x.id === Number(resp.id));
    assert.equal(r.status, 'success');
    assert.equal(r.response_text, 'answer text');
    assert.equal(r.exit_code, 0);
    assert.equal(r.duration_ms, 1500);
  });

  it('getSession returns null for non-existent id', () => {
    assert.equal(db.getSession(99999), null);
  });

  it('listSessions returns sessions in desc order', () => {
    const s1 = db.createSession('first', 'claude');
    const s2 = db.createSession('second', 'codex');
    const { items: list } = db.listSessions();
    const ids = list.map((s) => s.id);
    assert.ok(ids.indexOf(s2.id) < ids.indexOf(s1.id));
  });

  it('listSessions returns total count', () => {
    const before = db.listSessions();
    db.createSession('count test', 'claude');
    const after = db.listSessions();
    assert.equal(after.total, before.total + 1);
  });

  it('listSessions respects limit', () => {
    // Ensure we have at least 3 sessions from prior tests
    const { total } = db.listSessions();
    assert.ok(total >= 3);
    const { items } = db.listSessions(2, 0);
    assert.equal(items.length, 2);
  });

  it('listSessions respects offset', () => {
    const all = db.listSessions(100, 0);
    const page2 = db.listSessions(2, 2);
    assert.equal(page2.items[0].id, all.items[2].id);
    assert.equal(page2.total, all.total);
  });

  it('listSessions returns empty items when offset exceeds total', () => {
    const { total } = db.listSessions();
    const { items } = db.listSessions(20, total + 100);
    assert.equal(items.length, 0);
  });

  it('listSessions defaults to limit 20 offset 0', () => {
    const result = db.listSessions();
    assert.ok(Array.isArray(result.items));
    assert.equal(typeof result.total, 'number');
    assert.ok(result.items.length <= 20);
  });

  it('getSession includes all responses', () => {
    const session = db.createSession('multi', 'claude');
    db.createResponse(session.id, 'claude', 'advisor');
    db.createResponse(session.id, 'codex', 'advisor');
    db.createResponse(session.id, 'gemini', 'advisor');
    const fetched = db.getSession(session.id);
    assert.equal(fetched.responses.length, 3);
  });

  it('deleteSession removes session and its responses', () => {
    const session = db.createSession('to delete', 'claude');
    db.createResponse(session.id, 'claude', 'advisor');
    db.createResponse(session.id, 'codex', 'advisor');
    const deleted = db.deleteSession(session.id);
    assert.equal(deleted, true);
    assert.equal(db.getSession(session.id), null);
  });

  it('deleteSession returns false for non-existent id', () => {
    assert.equal(db.deleteSession(99999), false);
  });

  it('deleteSession decreases total count', () => {
    const session = db.createSession('will be deleted', 'gemini');
    const before = db.listSessions();
    db.deleteSession(session.id);
    const after = db.listSessions();
    assert.equal(after.total, before.total - 1);
  });
});
