const { sanitize } = require('./sanitizer');

// mcpServer here is the inner Server instance (mcpServer.server)
async function runViaSampling(mcpServer, prompt, timeoutMs) {
  const startTime = Date.now();

  try {
    const result = await mcpServer.createMessage(
      {
        messages: [{ role: 'user', content: { type: 'text', text: prompt } }],
        maxTokens: 8192,
      },
      { timeout: timeoutMs }
    );

    const text =
      result.content.type === 'text'
        ? result.content.text
        : JSON.stringify(result.content);

    return {
      stdout: sanitize(text),
      stderr: '',
      exitCode: 0,
      durationMs: Date.now() - startTime,
      timedOut: false,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const isTimeout = durationMs >= timeoutMs - 100;

    return {
      stdout: '',
      stderr: err.message,
      exitCode: -1,
      durationMs,
      timedOut: isTimeout,
    };
  }
}

module.exports = { runViaSampling };
