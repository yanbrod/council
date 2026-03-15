const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'council.json');

const DEFAULT_COMPILER_PROMPT = {
  preamble: 'The user asked the following question:',
  responsesIntro:
    'Below are several independent responses from different AI systems.\nThey are anonymized.',
  instructionsHeader: 'Compile a single final response:',
  instructions: [
    'Remove duplicates.',
    'Pick the strongest ideas.',
    'If there are contradictions, resolve them or explicitly note them.',
    'Make the result clear and coherent.',
    'Do not mention A/B/C in the final text.',
    'Respond in the same language as the user\'s original question.',
  ],
};

function loadCompilerPromptConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    if (raw.compilerPrompt && typeof raw.compilerPrompt === 'object') {
      return { ...DEFAULT_COMPILER_PROMPT, ...raw.compilerPrompt };
    }
  } catch {
    // fall through
  }
  return DEFAULT_COMPILER_PROMPT;
}

const cfg = loadCompilerPromptConfig();

function buildCompilerPrompt(userPrompt, anonymizedResponses) {
  const responsesBlock = anonymizedResponses
    .map((r) => `${r.label}:\n${r.text}`)
    .join('\n\n');

  const numberedInstructions = cfg.instructions
    .map((line, i) => `${i + 1}. ${line}`)
    .join('\n');

  return `${cfg.preamble}

${userPrompt}

${cfg.responsesIntro}

${responsesBlock}

${cfg.instructionsHeader}
${numberedInstructions}`;
}

module.exports = { buildCompilerPrompt };
