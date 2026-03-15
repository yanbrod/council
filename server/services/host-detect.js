const { execSync } = require('child_process');

const PROVIDER_PATTERNS = {
  claude: /\bclaude\b/i,
  codex: /\bcodex\b/i,
  gemini: /\bgemini\b/i,
};

let _cachedHost = undefined;

function detectHostProvider() {
  if (_cachedHost !== undefined) return _cachedHost;

  try {
    const ppid = process.ppid;
    // Walk up the process tree to find a matching AI CLI
    let pid = ppid;
    for (let depth = 0; depth < 5; depth++) {
      const line = execSync(`ps -p ${pid} -o comm=,ppid=`, { encoding: 'utf8' }).trim();
      const parts = line.split(/\s+/);
      const comm = parts.slice(0, -1).join(' ');
      const parentPid = parseInt(parts[parts.length - 1], 10);

      for (const [provider, pattern] of Object.entries(PROVIDER_PATTERNS)) {
        if (pattern.test(comm)) {
          _cachedHost = provider;
          return provider;
        }
      }

      if (parentPid <= 1 || parentPid === pid) break;
      pid = parentPid;
    }
  } catch {}

  _cachedHost = null;
  return null;
}

module.exports = { detectHostProvider };
