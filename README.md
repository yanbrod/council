<p align="center">
  <img src="logo.png" alt="AI Council" width="300">
</p>

<h1 align="center">AI Council</h1>

<p align="center">
  <strong>Ask multiple AIs. Get one perfect answer.</strong>
</p>

<p align="center">
  <a href="./README.ru.md">Русский</a> · <a href="./README.zh.md">中文</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-22%2B-brightgreen" alt="Node 22+">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License">
  <img src="https://img.shields.io/badge/MCP-compatible-purple" alt="MCP Compatible">
</p>

---

AI Council sends your prompt to **any number of AI systems** in parallel, collects their responses, and asks a compiler AI to synthesize one unified answer — picking the best ideas, resolving contradictions, and removing duplicates.

Configured for Claude, Codex, and Gemini out of the box — but you can add any CLI-based AI (Grok, Ollama, local models) in one line of config.

Available as a Web UI, REST API, and MCP server. Under the hood it orchestrates CLI tools — no API keys required.

<p align="center">
  <img src="screenshot.png" alt="AI Council UI" width="700">
</p>

## How It Works

```
You: "How do I optimize a PostgreSQL query?"
         │
         ├──→ Claude    ──→ "Use EXPLAIN ANALYZE, add indexes..."
         ├──→ Codex     ──→ "Check for sequential scans, consider..."
         ├──→ Gemini    ──→ "Start with query plan analysis..."
         ├──→ ...any AI  ──→ (add as many as you want)
         │
         ▼
    ┌─────────┐
    │Compiler │  Anonymized responses → one final answer
    └─────────┘
         │
         ▼
    "Here's a complete optimization strategy..."
```

1. Your prompt goes to all configured AI advisors in parallel
2. Responses are anonymized (shuffled, labeled A/B/C/...) to prevent bias
3. A compiler AI (your choice) synthesizes the best unified answer
4. Everything is stored in SQLite for history and review

## Features

- **Multi-AI consensus** — query 3, 5, or 10 AIs at once and compare their approaches
- **Bias-free compilation** — anonymized responses prevent the compiler from favoring any source
- **Pluggable providers** — add any CLI-based AI in one line of config; no code changes needed
- **Two interfaces** — Web UI for interactive use, MCP server for integration with AI tools
- **Fault-tolerant** — one AI timing out doesn't break the session
- **Session history** — browse, review, and delete past sessions
- **i18n** — UI available in English, Russian, and Chinese

## Quick Start

### Prerequisites

- **Node.js 22+**
- At least one AI CLI installed (3 configured by default): [`claude`](https://docs.anthropic.com/en/docs/claude-code), [`codex`](https://github.com/openai/codex), [`gemini`](https://github.com/google-gemini/gemini-cli), [`ollama`](https://ollama.com/) and etc.

### Install & Run

```bash
git clone https://github.com/yanbrod/council
cd council
npm install

# Copy and customize provider config
cp council.example.json council.json

# Development (two terminals)
npm run dev:server   # Backend on :3001
npm run dev:client   # Frontend on :3000

# — or production —
npm run build
npm start            # Everything on :3001
```

Open [http://localhost:3000](http://localhost:3000) (dev) or [http://localhost:3001](http://localhost:3001) (production).

## Using as MCP Server

AI Council also works as an [MCP](https://modelcontextprotocol.io/) server, so you can call it directly from Claude Code, Claude Desktop, or any MCP-compatible host.

### Connect to Claude Code

Add to `.claude/settings.json` or `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "ai-council": {
      "command": "node",
      "args": ["/absolute/path/to/council/mcp-server.js"]
    }
  }
}
```

### Connect to Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ai-council": {
      "command": "node",
      "args": ["/absolute/path/to/council/mcp-server.js"]
    }
  }
}
```

### MCP Tools

| Tool | Description |
|------|-------------|
| `ask_council` | Send a prompt to all configured AI advisors, compile a unified answer. Params: `prompt` (string), `compiler` (provider name) |

### Smart Host Detection

When running inside an AI host (e.g., Claude Code calls `ask_council`), the MCP server automatically detects the parent process and uses **MCP Sampling** instead of spawning a conflicting CLI process.

```
Launched from Claude Code:
  Claude → MCP Sampling (no conflict)
  Codex  → CLI spawn
  Gemini → CLI spawn

Launched from terminal/API:
  Claude → CLI spawn
  Codex  → CLI spawn
  Gemini → CLI spawn
```

## Adding Providers

Providers are configured in `council.json`. Copy from `council.example.json` and customize:

```json
{
  "providers": {
    "grok": {
      "command": "grok",
      "args": ["-p", "{prompt}"],
      "label": "Grok",
      "stdin": "pipe"
    }
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `command` | Yes | CLI executable (must be in PATH) |
| `args` | Yes | Arguments array. `{prompt}` is replaced with user input |
| `label` | No | Display name in UI (defaults to key name) |
| `stdin` | No | `"pipe"` (default) or `"ignore"` |

**Examples:**

<details>
<summary>Grok CLI</summary>

```json
"grok": {
  "command": "grok",
  "args": ["-p", "{prompt}"],
  "label": "Grok",
  "stdin": "pipe"
}
```
</details>

<details>
<summary>Ollama (local models)</summary>

```json
"ollama": {
  "command": "ollama",
  "args": ["run", "llama3", "{prompt}"],
  "label": "Ollama (Llama 3)",
  "stdin": "pipe"
}
```
</details>

All providers in `council.json` become advisors (queried in parallel). Any provider can be selected as the compiler. There is no limit on the number of providers. If `council.json` is missing, defaults to Claude + Codex + Gemini.

## Compiler Prompt

The compiler prompt template is also configurable in `council.json`:

```json
{
  "compilerPrompt": {
    "preamble": "The user asked the following question:",
    "responsesIntro": "Below are several independent responses from different AI systems.\nThey are anonymized.",
    "instructionsHeader": "Compile a single final response:",
    "instructions": [
      "Remove duplicates.",
      "Pick the strongest ideas.",
      "If there are contradictions, resolve them or explicitly note them.",
      "Make the result clear and coherent.",
      "Do not mention A/B/C in the final text.",
      "Respond in the same language as the user's original question."
    ]
  }
}
```

## API Reference

### `POST /api/sessions` — Create session (async)

```json
{ "prompt": "your question", "compiler": "claude" }
→ { "sessionId": 1, "status": "created" }
```

The frontend polls `GET /api/sessions/:id` until status is terminal.

### `POST /api/council` — Create session (sync)

Blocks until all AIs respond and the compiler finishes:

```json
{ "prompt": "your question", "compiler": "claude" }
→ {
    "sessionId": 1,
    "status": "completed",
    "advisors": [
      { "provider": "claude", "status": "success", "text": "...", "durationMs": 5000 },
      { "provider": "codex", "status": "success", "text": "...", "durationMs": 3000 },
      { "provider": "gemini", "status": "success", "text": "...", "durationMs": 4000 }
    ],
    "compiled": {
      "provider": "claude", "status": "success", "text": "...", "durationMs": 6000
    }
  }
```

### `GET /api/sessions` — List sessions

### `GET /api/sessions/:id` — Get session details

### `DELETE /api/sessions/:id` — Delete session

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Host AI (Claude Code / Codex / Gemini)                 │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  MCP Server (mcp-server.js)                       │  │
│  │                                                   │  │
│  │  ask_council(prompt, compiler)                     │  │
│  │    │                                              │  │
│  │    ├── Host provider → MCP Sampling ◄─────────────┼──┘
│  │    ├── Provider 2    → CLI spawn                  │
│  │    ├── Provider 3    → CLI spawn                  │
│  │    │                                              │
│  │    ├── Anonymize (shuffle + A/B/C labels)         │
│  │    ├── Compiler → CLI spawn / Sampling            │
│  │    └── Result → SQLite + response                 │
│  └───────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express, better-sqlite3 |
| Frontend | Preact, TypeScript, Rspack |
| MCP | @modelcontextprotocol/sdk (stdio transport) |

## Testing

```bash
npm test
```

## License

[MIT](LICENSE)

---

<sub>This project was built almost entirely by AI (Claude, Codex, Gemini — eating our own dogfood). Bugs and rough edges are expected. Issues and PRs are welcome.</sub>
