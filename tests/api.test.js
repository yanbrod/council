const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const http = require('http');

const TEST_DB_PATH = './data/test_api.db';

function request(server, method, path, body) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const options = {
      hostname: '127.0.0.1',
      port: addr.port,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('API integration', () => {
  let server;
  let app;

  before(() => {
    const config = require('../server/config');
    config.DB_PATH = TEST_DB_PATH;
    config.PORT = 0; // random port
    // Use very short timeouts for test speed
    config.PROCESS_TIMEOUT_MS = 3000;
    config.COMPILER_TIMEOUT_MS = 3000;
    // Override providers to use echo for fast tests
    config.PROVIDERS = {
      claude: { command: 'echo', args: (p) => [`Claude says: ${p}`], label: 'Claude', stdin: 'ignore' },
      codex: { command: 'echo', args: (p) => [`Codex says: ${p}`], label: 'Codex', stdin: 'pipe' },
      gemini: { command: 'echo', args: (p) => [`Gemini says: ${p}`], label: 'Gemini', stdin: 'pipe' },
    };

    delete require.cache[require.resolve('../server/db')];
    delete require.cache[require.resolve('../server/services/orchestrator')];
    delete require.cache[require.resolve('../server/services/runner')];
    delete require.cache[require.resolve('../server/routes/sessions')];
    delete require.cache[require.resolve('../server/routes/council')];

    const express = require('express');
    app = express();
    app.use(express.json());
    app.get('/api/providers', (_req, res) => {
      const providers = Object.entries(config.PROVIDERS).map(([name, cfg]) => ({
        name,
        label: cfg.label || name,
      }));
      res.json(providers);
    });
    app.use('/api/sessions', require('../server/routes/sessions'));
    app.use('/api/council', require('../server/routes/council'));

    return new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
  });

  after(() => {
    return new Promise((resolve) => {
      server.close(() => {
        try { fs.unlinkSync(TEST_DB_PATH); } catch {}
        resolve();
      });
    });
  });

  it('GET /api/providers returns configured providers', async () => {
    const res = await request(server, 'GET', '/api/providers');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.equal(res.body.length, 3);
    const names = res.body.map((p) => p.name);
    assert.ok(names.includes('claude'));
    assert.ok(names.includes('codex'));
    assert.ok(names.includes('gemini'));
    assert.ok(res.body.every((p) => typeof p.label === 'string'));
  });

  it('GET /api/providers reflects config changes', async () => {
    const config = require('../server/config');
    const orig = config.PROVIDERS;
    // Remove gemini
    config.PROVIDERS = {
      claude: orig.claude,
      codex: orig.codex,
    };

    const res = await request(server, 'GET', '/api/providers');
    assert.equal(res.body.length, 2);
    const names = res.body.map((p) => p.name);
    assert.ok(!names.includes('gemini'));

    config.PROVIDERS = orig;
  });

  it('POST /api/sessions creates a session', async () => {
    const res = await request(server, 'POST', '/api/sessions', {
      prompt: 'hello',
      compiler: 'claude',
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.sessionId > 0);
    assert.equal(res.body.status, 'created');
  });

  it('POST /api/sessions validates prompt', async () => {
    const res = await request(server, 'POST', '/api/sessions', {
      prompt: '',
      compiler: 'claude',
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/sessions validates compiler', async () => {
    const res = await request(server, 'POST', '/api/sessions', {
      prompt: 'test',
      compiler: 'invalid',
    });
    assert.equal(res.status, 400);
  });

  it('GET /api/sessions returns paginated list', async () => {
    const res = await request(server, 'GET', '/api/sessions');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.items));
    assert.equal(typeof res.body.total, 'number');
  });

  it('GET /api/sessions respects limit and offset', async () => {
    // Create a few more sessions to have data
    await request(server, 'POST', '/api/sessions', { prompt: 'pag1', compiler: 'claude' });
    await request(server, 'POST', '/api/sessions', { prompt: 'pag2', compiler: 'claude' });
    await request(server, 'POST', '/api/sessions', { prompt: 'pag3', compiler: 'claude' });

    const page1 = await request(server, 'GET', '/api/sessions?limit=2&offset=0');
    assert.equal(page1.status, 200);
    assert.equal(page1.body.items.length, 2);
    assert.ok(page1.body.total >= 3);

    const page2 = await request(server, 'GET', '/api/sessions?limit=2&offset=2');
    assert.equal(page2.status, 200);
    assert.ok(page2.body.items.length > 0);
    assert.equal(page2.body.total, page1.body.total);

    // No overlap between pages
    const ids1 = page1.body.items.map((s) => s.id);
    const ids2 = page2.body.items.map((s) => s.id);
    assert.ok(ids1.every((id) => !ids2.includes(id)));
  });

  it('GET /api/sessions clamps limit to 100', async () => {
    const res = await request(server, 'GET', '/api/sessions?limit=999');
    assert.equal(res.status, 200);
    // Should succeed and not return more than 100
    assert.ok(res.body.items.length <= 100);
  });

  it('GET /api/sessions handles invalid params gracefully', async () => {
    const res = await request(server, 'GET', '/api/sessions?limit=abc&offset=-5');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.items));
  });

  it('GET /api/sessions/:id returns session', async () => {
    const createRes = await request(server, 'POST', '/api/sessions', {
      prompt: 'detail test',
      compiler: 'gemini',
    });
    // Wait a bit for async orchestrator
    await new Promise((r) => setTimeout(r, 2000));

    const res = await request(server, 'GET', `/api/sessions/${createRes.body.sessionId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.user_prompt, 'detail test');
    assert.ok(Array.isArray(res.body.responses));
  });

  it('GET /api/sessions/:id returns 404 for missing', async () => {
    const res = await request(server, 'GET', '/api/sessions/99999');
    assert.equal(res.status, 404);
  });

  it('POST /api/council returns complete result', async () => {
    const res = await request(server, 'POST', '/api/council', {
      prompt: 'sync test',
      compiler: 'claude',
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.sessionId > 0);
    assert.equal(res.body.advisors.length, 3);
    assert.ok(res.body.advisors.every((a) => a.status === 'success'));
    assert.ok(res.body.compiled);
    assert.equal(res.body.compiled.status, 'success');
  });

  it('DELETE /api/sessions/:id deletes a session', async () => {
    const createRes = await request(server, 'POST', '/api/sessions', {
      prompt: 'to be deleted',
      compiler: 'claude',
    });
    const id = createRes.body.sessionId;

    const delRes = await request(server, 'DELETE', `/api/sessions/${id}`);
    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.ok, true);

    const getRes = await request(server, 'GET', `/api/sessions/${id}`);
    assert.equal(getRes.status, 404);
  });

  it('DELETE /api/sessions/:id returns 404 for non-existent', async () => {
    const res = await request(server, 'DELETE', '/api/sessions/99999');
    assert.equal(res.status, 404);
  });

  it('DELETE /api/sessions/:id decreases total count', async () => {
    const createRes = await request(server, 'POST', '/api/sessions', {
      prompt: 'count delete test',
      compiler: 'codex',
    });
    const id = createRes.body.sessionId;

    const beforeRes = await request(server, 'GET', '/api/sessions');
    const totalBefore = beforeRes.body.total;

    await request(server, 'DELETE', `/api/sessions/${id}`);

    const afterRes = await request(server, 'GET', '/api/sessions');
    assert.equal(afterRes.body.total, totalBefore - 1);
  });

  it('POST /api/sessions/:id/cancel cancels a running session', async () => {
    // Switch to slow providers for this test
    const config = require('../server/config');
    const origProviders = config.PROVIDERS;
    config.PROVIDERS = {
      claude: { command: 'sleep', args: () => ['30'] },
      codex: { command: 'sleep', args: () => ['30'] },
      gemini: { command: 'sleep', args: () => ['30'] },
    };

    const createRes = await request(server, 'POST', '/api/sessions', {
      prompt: 'cancel me',
      compiler: 'claude',
    });
    const id = createRes.body.sessionId;

    // Wait a bit for processes to start
    await new Promise((r) => setTimeout(r, 500));

    const cancelRes = await request(server, 'POST', `/api/sessions/${id}/cancel`);
    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.ok, true);

    // Wait for cancellation to propagate
    await new Promise((r) => setTimeout(r, 1000));

    const session = await request(server, 'GET', `/api/sessions/${id}`);
    assert.equal(session.body.status, 'cancelled');

    // Restore fast providers
    config.PROVIDERS = origProviders;
  });

  it('POST /api/sessions/:id/cancel returns 404 for non-existent', async () => {
    const res = await request(server, 'POST', '/api/sessions/99999/cancel');
    assert.equal(res.status, 404);
  });

  it('POST /api/sessions/:id/cancel returns 409 for finished session', async () => {
    const createRes = await request(server, 'POST', '/api/sessions', {
      prompt: 'already done',
      compiler: 'claude',
    });
    // Wait for it to complete (echo is fast)
    await new Promise((r) => setTimeout(r, 2000));

    const cancelRes = await request(server, 'POST', `/api/sessions/${createRes.body.sessionId}/cancel`);
    assert.equal(cancelRes.status, 409);
  });

  it('POST /api/council validates input', async () => {
    const res = await request(server, 'POST', '/api/council', {
      prompt: '',
      compiler: 'claude',
    });
    assert.equal(res.status, 400);
  });
});
