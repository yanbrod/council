const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'council.json');

describe('config', () => {
  let originalContent;

  before(() => {
    try {
      originalContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
    } catch {
      originalContent = null;
    }
  });

  after(() => {
    // Restore original config
    if (originalContent != null) {
      fs.writeFileSync(CONFIG_PATH, originalContent);
    }
    // Clear require cache so other tests aren't affected
    delete require.cache[require.resolve('../server/config')];
  });

  function loadFreshConfig() {
    delete require.cache[require.resolve('../server/config')];
    return require('../server/config');
  }

  it('loads default providers from council.json', () => {
    const config = loadFreshConfig();
    assert.ok(config.PROVIDERS.claude);
    assert.ok(config.PROVIDERS.codex);
    assert.ok(config.PROVIDERS.gemini);
  });

  it('providers have command, args function, label, and stdin', () => {
    const config = loadFreshConfig();
    for (const [name, provider] of Object.entries(config.PROVIDERS)) {
      assert.equal(typeof provider.command, 'string', `${name} missing command`);
      assert.equal(typeof provider.args, 'function', `${name} missing args function`);
      assert.equal(typeof provider.label, 'string', `${name} missing label`);
      assert.equal(typeof provider.stdin, 'string', `${name} missing stdin`);
    }
  });

  it('claude has stdin=ignore, others have stdin=pipe', () => {
    const config = loadFreshConfig();
    assert.equal(config.PROVIDERS.claude.stdin, 'ignore');
    assert.equal(config.PROVIDERS.codex.stdin, 'pipe');
    assert.equal(config.PROVIDERS.gemini.stdin, 'pipe');
  });

  it('args function substitutes {prompt}', () => {
    const config = loadFreshConfig();
    const args = config.PROVIDERS.claude.args('hello world');
    assert.ok(args.includes('hello world'));
  });

  it('loads custom provider set from council.json', () => {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({
      providers: {
        claude: {
          command: 'claude',
          args: ['-p', '{prompt}'],
          label: 'Claude Only',
          stdin: 'ignore',
        },
      },
    }));

    const config = loadFreshConfig();
    const names = Object.keys(config.PROVIDERS);
    assert.equal(names.length, 1);
    assert.equal(names[0], 'claude');
    assert.equal(config.PROVIDERS.claude.label, 'Claude Only');
  });

  it('falls back to defaults on invalid JSON', () => {
    fs.writeFileSync(CONFIG_PATH, 'not json at all');

    const config = loadFreshConfig();
    assert.ok(Object.keys(config.PROVIDERS).length >= 3);
  });

  it('falls back to defaults when providers is empty', () => {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ providers: {} }));

    const config = loadFreshConfig();
    assert.ok(Object.keys(config.PROVIDERS).length >= 3);
  });

  it('skips providers with missing command or args', () => {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({
      providers: {
        good: { command: 'echo', args: ['{prompt}'], label: 'Good' },
        bad1: { args: ['{prompt}'] },
        bad2: { command: 'echo' },
      },
    }));

    const config = loadFreshConfig();
    const names = Object.keys(config.PROVIDERS);
    assert.equal(names.length, 1);
    assert.equal(names[0], 'good');
  });

  it('defaults stdin to pipe when not specified', () => {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({
      providers: {
        test: { command: 'echo', args: ['{prompt}'] },
      },
    }));

    const config = loadFreshConfig();
    assert.equal(config.PROVIDERS.test.stdin, 'pipe');
  });
});
