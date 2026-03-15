const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { runCliProcess } = require('../server/services/runner');

describe('runner', () => {
  it('captures stdout from a simple command', async () => {
    const result = await runCliProcess('echo', ['hello world'], 5000);
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, 'hello world');
    assert.equal(result.timedOut, false);
  });

  it('captures stderr on error', async () => {
    const result = await runCliProcess('node', ['-e', 'console.error("oops"); process.exit(1)'], 5000);
    assert.equal(result.exitCode, 1);
    assert.equal(result.stderr, 'oops');
  });

  it('times out and kills long-running process', async () => {
    const result = await runCliProcess('sleep', ['30'], 500);
    assert.equal(result.timedOut, true);
    assert.ok(result.durationMs >= 400);
    assert.ok(result.durationMs < 5000);
  });

  it('handles non-existent command', async () => {
    const result = await runCliProcess('nonexistent_command_xyz', [], 5000);
    assert.equal(result.exitCode, -1);
    assert.ok(result.stderr.length > 0);
  });

  it('strips ANSI codes from stdout', async () => {
    const result = await runCliProcess('printf', ['\x1B[31mred\x1B[0m'], 5000);
    assert.equal(result.stdout, 'red');
  });

  it('reports duration', async () => {
    const result = await runCliProcess('echo', ['fast'], 5000);
    assert.ok(typeof result.durationMs === 'number');
    assert.ok(result.durationMs >= 0);
  });

  it('cancels process via AbortSignal', async () => {
    const ac = new AbortController();
    const promise = runCliProcess('sleep', ['30'], 60000, ac.signal);
    setTimeout(() => ac.abort(), 300);
    const result = await promise;
    assert.equal(result.cancelled, true);
    assert.equal(result.timedOut, false);
    assert.ok(result.durationMs < 5000);
  });

  it('handles already-aborted signal', async () => {
    const ac = new AbortController();
    ac.abort();
    const result = await runCliProcess('sleep', ['30'], 60000, ac.signal);
    assert.equal(result.cancelled, true);
  });

  it('does not set cancelled when no signal provided', async () => {
    const result = await runCliProcess('echo', ['hi'], 5000);
    assert.equal(result.cancelled, false);
  });

  it('works with stdin=ignore option', async () => {
    const result = await runCliProcess('echo', ['test'], 5000, null, { stdin: 'ignore' });
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, 'test');
  });

  it('works with stdin=pipe option (default)', async () => {
    const result = await runCliProcess('echo', ['test'], 5000, null, { stdin: 'pipe' });
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, 'test');
  });
});
