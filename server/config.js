const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'council.json');

const DEFAULT_PROVIDERS = {
  claude: {
    command: 'claude',
    args: ['-p', '{prompt}'],
    label: 'Claude',
    stdin: 'ignore',
  },
  codex: {
    command: 'codex',
    args: ['exec', '--skip-git-repo-check', '{prompt}'],
    label: 'Codex',
    stdin: 'pipe',
  },
  gemini: {
    command: 'gemini',
    args: ['-p', '{prompt}'],
    label: 'Gemini',
    stdin: 'pipe',
  },
};

function loadProviders() {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return DEFAULT_PROVIDERS;
  }

  if (!raw.providers || typeof raw.providers !== 'object') {
    return DEFAULT_PROVIDERS;
  }

  const providers = {};
  for (const [name, cfg] of Object.entries(raw.providers)) {
    if (!cfg.command || !Array.isArray(cfg.args)) continue;
    providers[name] = {
      command: cfg.command,
      args: cfg.args,
      label: cfg.label || name,
      stdin: cfg.stdin || 'pipe',
    };
  }

  return Object.keys(providers).length > 0 ? providers : DEFAULT_PROVIDERS;
}

function buildArgs(argsTemplate, prompt) {
  return argsTemplate.map((a) => a.replace('{prompt}', prompt));
}

const providers = loadProviders();

// Build PROVIDERS in the format the rest of the codebase expects
const PROVIDERS = {};
for (const [name, cfg] of Object.entries(providers)) {
  PROVIDERS[name] = {
    command: cfg.command,
    args: (prompt) => buildArgs(cfg.args, prompt),
    label: cfg.label,
    stdin: cfg.stdin,
  };
}

module.exports = {
  PORT: process.env.PORT || 3001,
  DB_PATH: './data/council.db',
  PROCESS_TIMEOUT_MS: 120_000,
  COMPILER_TIMEOUT_MS: 180_000,
  PROVIDERS,
};
