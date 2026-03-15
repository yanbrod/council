<p align="center">
  <img src="logo.png" alt="AI Council" width="300">
</p>

<h1 align="center">AI Council</h1>

<p align="center">
  <strong>询问多个 AI，获得一个完美答案。</strong>
</p>

<p align="center">
  <a href="./README.md">English</a> · <a href="./README.ru.md">Русский</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-22%2B-brightgreen" alt="Node 22+">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License">
  <img src="https://img.shields.io/badge/MCP-compatible-purple" alt="MCP Compatible">
</p>

---

AI Council 将您的提示**同时发送给任意数量的 AI 系统**，收集它们的回答，然后让一个编译器 AI 综合出统一的最终答案——选取最佳观点、解决矛盾、去除重复。

开箱即用支持 Claude、Codex 和 Gemini——您也可以通过一行配置添加任何基于 CLI 的 AI（Grok、Ollama、本地模型）。

提供 Web UI、REST API 和 MCP 服务器三种使用方式。底层通过 CLI 工具编排调度——无需配置任何 API 密钥。

<p align="center">
  <img src="screenshot.png" alt="AI Council UI" width="700">
</p>

## 工作原理

```
您: "如何优化 PostgreSQL 查询？"
         │
         ├──→ Claude    ──→ "使用 EXPLAIN ANALYZE，添加索引..."
         ├──→ Codex     ──→ "检查顺序扫描，考虑..."
         ├──→ Gemini    ──→ "从查询计划分析开始..."
         ├──→ ...任意 AI ──→（想加多少加多少）
         │
         ▼
    ┌─────────┐
    │ 编译器  │  匿名化回答 → 一个最终答案
    └─────────┘
         │
         ▼
    "这是一个完整的优化策略..."
```

1. 您的提示同时发送给所有已配置的 AI 顾问
2. 回答被匿名化（打乱顺序，标记为 A/B/C/...）以防止偏见
3. 编译器 AI（由您选择）综合出最佳统一答案
4. 所有内容存储在 SQLite 中，便于查看历史记录

## 功能特性

- **多 AI 共识** — 同时查询 3 个、5 个或 10 个 AI，比较它们的方案
- **无偏见编译** — 匿名化回答防止编译器偏袒任何来源
- **可插拔提供者** — 一行配置即可添加任何基于 CLI 的 AI，无需修改代码
- **双重接口** — Web UI 用于交互式使用，MCP 服务器用于与 AI 工具集成
- **容错设计** — 单个 AI 超时不会影响整个会话
- **会话历史** — 浏览、查看和删除过往会话
- **国际化** — 界面支持英文、俄文和中文

## 快速开始

### 前置要求

- **Node.js 22+**
- 至少安装一个 AI CLI（默认配置 3 个）：[`claude`](https://docs.anthropic.com/en/docs/claude-code)、[`codex`](https://github.com/openai/codex)、[`gemini`](https://github.com/google-gemini/gemini-cli), [`ollama`](https://ollama.com/) 等

### 安装与运行

```bash
git clone https://github.com/yanbrod/council
cd council
npm install

# 复制并自定义提供者配置
cp council.example.json council.json

# 开发模式（两个终端）
npm run dev:server   # 后端运行在 :3001
npm run dev:client   # 前端运行在 :3000

# — 或生产模式 —
npm run build
npm start            # 全部运行在 :3001
```

打开 [http://localhost:3000](http://localhost:3000)（开发）或 [http://localhost:3001](http://localhost:3001)（生产）。

## 作为 MCP 服务器使用

AI Council 同时也是一个 [MCP](https://modelcontextprotocol.io/) 服务器，可以直接从 Claude Code、Claude Desktop 或任何兼容 MCP 的宿主调用。

### 连接到 Claude Code

添加到 `.claude/settings.json` 或 `~/.claude/settings.json`：

```json
{
  "mcpServers": {
    "ai-council": {
      "command": "node",
      "args": ["/council的绝对路径/mcp-server.js"]
    }
  }
}
```

### 连接到 Claude Desktop

添加到 `~/Library/Application Support/Claude/claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "ai-council": {
      "command": "node",
      "args": ["/council的绝对路径/mcp-server.js"]
    }
  }
}
```

### MCP 工具

| 工具 | 描述 |
|------|------|
| `ask_council` | 向所有已配置的 AI 顾问发送提示，编译统一答案。参数：`prompt`（string）、`compiler`（提供者名称） |

### 智能宿主检测

当在 AI 宿主内运行时（例如 Claude Code 调用 `ask_council`），MCP 服务器会自动检测父进程，使用 **MCP Sampling** 代替启动冲突的 CLI 进程。

```
从 Claude Code 启动:
  Claude → MCP Sampling（无冲突）
  Codex  → CLI spawn
  Gemini → CLI spawn

从终端/API 启动:
  Claude → CLI spawn
  Codex  → CLI spawn
  Gemini → CLI spawn
```

## 添加提供者

提供者在 `council.json` 中配置。从 `council.example.json` 复制并自定义：

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

| 字段 | 必填 | 描述 |
|------|------|------|
| `command` | 是 | CLI 可执行文件（必须在 PATH 中） |
| `args` | 是 | 参数数组。`{prompt}` 会被替换为用户输入 |
| `label` | 否 | UI 中的显示名称（默认使用键名） |
| `stdin` | 否 | `"pipe"`（默认）或 `"ignore"` |

**示例：**

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
<summary>Ollama（本地模型）</summary>

```json
"ollama": {
  "command": "ollama",
  "args": ["run", "llama3", "{prompt}"],
  "label": "Ollama (Llama 3)",
  "stdin": "pipe"
}
```
</details>

`council.json` 中的所有提供者都会成为顾问（并行查询）。任何提供者都可以被选为编译器。提供者数量没有限制。如果 `council.json` 缺失，默认使用 Claude + Codex + Gemini。

## 编译器提示词

编译器提示词模板也可以在 `council.json` 中配置：

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

## API 参考

### `POST /api/sessions` — 创建会话（异步）

```json
{ "prompt": "您的问题", "compiler": "claude" }
→ { "sessionId": 1, "status": "created" }
```

前端轮询 `GET /api/sessions/:id` 直到状态为终态。

### `POST /api/council` — 创建会话（同步）

阻塞请求——等待所有 AI 响应和编译器完成：

```json
{ "prompt": "您的问题", "compiler": "claude" }
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

### `GET /api/sessions` — 会话列表

### `GET /api/sessions/:id` — 会话详情

### `DELETE /api/sessions/:id` — 删除会话

## 架构

```
┌─────────────────────────────────────────────────────────┐
│  AI 宿主 (Claude Code / Codex / Gemini)                  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  MCP 服务器 (mcp-server.js)                        │  │
│  │                                                   │  │
│  │  ask_council(prompt, compiler)                     │  │
│  │    │                                              │  │
│  │    ├── 宿主提供者 → MCP Sampling ◄────────────────┼──┘
│  │    ├── 提供者 2   → CLI spawn                     │
│  │    ├── 提供者 3   → CLI spawn                     │
│  │    │                                              │
│  │    ├── 匿名化（打乱 + A/B/C 标签）                  │
│  │    ├── 编译器 → CLI spawn / Sampling               │
│  │    └── 结果 → SQLite + 响应                        │
│  └───────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────┘
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Node.js, Express, better-sqlite3 |
| 前端 | Preact, TypeScript, Rspack |
| MCP | @modelcontextprotocol/sdk (stdio transport) |

## 测试

```bash
npm test
```

## 许可证

[MIT](LICENSE)

---

<sub>本项目几乎完全由 AI 构建（Claude、Codex、Gemini——没错，就是它所调度的那些 AI）。可能存在 bug 和不完善之处，欢迎提交 Issue 和 PR。</sub>
