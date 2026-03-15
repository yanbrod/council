const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

const db = require('./server/db');
const { runSession } = require('./server/services/orchestrator');
const { detectHostProvider } = require('./server/services/host-detect');
const config = require('./server/config');

const VALID_COMPILERS = Object.keys(config.PROVIDERS);

const mcpServer = new McpServer({
  name: 'ai-council',
  version: '1.0.0',
  capabilities: { sampling: {} },
});

// Detect which AI host launched us (claude, codex, gemini, or null)
const hostProvider = detectHostProvider();

function getSessionContext() {
  // If running inside an AI host that supports sampling,
  // use MCP sampling for that provider instead of spawning a conflicting CLI process.
  if (hostProvider) {
    return { mcpServer: mcpServer.server, hostProvider };
  }
  return {};
}

mcpServer.tool(
  'ask_council',
  `Send a prompt to 3 AI systems (Claude, Codex, Gemini) in parallel, then compile their responses into a unified answer. Returns advisor responses and the compiled result.`,
  {
    prompt: { type: 'string', description: 'The text prompt to send to all AI advisors' },
    compiler: {
      type: 'string',
      description: 'Which AI to use as compiler: claude, codex, or gemini',
      enum: VALID_COMPILERS,
    },
  },
  async ({ prompt, compiler }) => {
    if (!prompt || !prompt.trim()) {
      return { content: [{ type: 'text', text: 'Error: prompt is required' }], isError: true };
    }
    if (!VALID_COMPILERS.includes(compiler)) {
      return {
        content: [{ type: 'text', text: `Error: compiler must be one of: ${VALID_COMPILERS.join(', ')}` }],
        isError: true,
      };
    }

    const session = db.createSession(prompt.trim(), compiler);
    await runSession(session.id, getSessionContext());
    const result = db.getSession(session.id);

    const advisors = result.responses.filter((r) => r.role === 'advisor');
    const comp = result.responses.find((r) => r.role === 'compiler');

    const lines = [];
    lines.push(`Session #${result.id} — ${result.status}`);
    if (hostProvider) {
      lines.push(`(host: ${hostProvider} — using sampling instead of CLI)\n`);
    } else {
      lines.push('');
    }

    for (const a of advisors) {
      lines.push(`--- ${a.provider_name.toUpperCase()} (${a.status}, ${a.duration_ms}ms) ---`);
      if (a.status === 'success') {
        lines.push(a.response_text);
      } else if (a.status === 'timeout') {
        lines.push('[Timeout]');
      } else {
        lines.push(`[Error: exit ${a.exit_code}] ${a.stderr_text || ''}`);
      }
      lines.push('');
    }

    if (comp) {
      lines.push(`=== COMPILED ANSWER (${comp.provider_name}, ${comp.status}, ${comp.duration_ms}ms) ===`);
      if (comp.status === 'success') {
        lines.push(comp.response_text);
      } else if (comp.status === 'timeout') {
        lines.push('[Compiler timeout]');
      } else {
        lines.push(`[Compiler error: exit ${comp.exit_code}] ${comp.stderr_text || ''}`);
      }
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }
);

mcpServer.tool(
  'list_council_sessions',
  'List past AI Council sessions with their statuses.',
  {},
  async () => {
    const { items: sessions } = db.listSessions();
    if (sessions.length === 0) {
      return { content: [{ type: 'text', text: 'No sessions yet.' }] };
    }
    const text = sessions
      .map((s) => `#${s.id} [${s.status}] (compiler: ${s.compiler_provider}) ${s.user_prompt}`)
      .join('\n');
    return { content: [{ type: 'text', text }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}

main().catch((err) => {
  console.error('MCP server error:', err);
  process.exit(1);
});
