const db = require('../db');
const config = require('../config');
const { runCliProcess } = require('./runner');
const { runViaSampling } = require('./sampling-runner');
const { anonymize } = require('./anonymizer');
const { buildCompilerPrompt } = require('./compiler-prompt');

// Track abort controllers for active sessions
const activeSessions = new Map();

async function runProvider(providerName, prompt, timeoutMs, { mcpServer, hostProvider, signal }) {
  if (mcpServer && providerName === hostProvider) {
    return runViaSampling(mcpServer, prompt, timeoutMs);
  }
  const provider = config.PROVIDERS[providerName];
  return runCliProcess(provider.command, provider.args(prompt), timeoutMs, signal, { stdin: provider.stdin || 'pipe' });
}

async function runAdvisor(responseId, providerName, prompt, ctx) {
  db.updateResponse(responseId, { status: 'running' });

  const result = await runProvider(providerName, prompt, config.PROCESS_TIMEOUT_MS, ctx);

  if (result.cancelled) {
    db.updateResponse(responseId, {
      status: 'cancelled',
      responseText: null,
      stderrText: null,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
    });
    return { id: responseId, providerName, status: 'cancelled', response_text: null };
  }

  const status = result.timedOut
    ? 'timeout'
    : result.exitCode === 0
      ? 'success'
      : 'error';

  db.updateResponse(responseId, {
    status,
    responseText: result.stdout,
    stderrText: result.stderr,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
  });

  return { id: responseId, providerName, status, response_text: result.stdout };
}

// ctx: { mcpServer?, hostProvider? }
async function runSession(sessionId, ctx = {}) {
  const session = db.getSession(sessionId);
  if (!session) return;

  const ac = new AbortController();
  activeSessions.set(sessionId, ac);

  try {
    return await _runSessionInner(session, sessionId, ac.signal, ctx);
  } finally {
    activeSessions.delete(sessionId);
  }
}

async function _runSessionInner(session, sessionId, signal, ctx) {
  db.updateSessionStatus(sessionId, 'running');

  const providerNames = Object.keys(config.PROVIDERS);
  const advisorRows = providerNames.map((name) =>
    db.createResponse(sessionId, name, 'advisor')
  );

  const results = await Promise.allSettled(
    providerNames.map((name, i) =>
      runAdvisor(advisorRows[i].id, name, session.user_prompt, { ...ctx, signal })
    )
  );

  if (signal.aborted) {
    db.updateSessionStatus(sessionId, 'cancelled');
    return db.getSession(sessionId);
  }

  const advisorResults = results.map((r) =>
    r.status === 'fulfilled' ? r.value : { status: 'error' }
  );

  const successfulAdvisors = advisorResults.filter((r) => r.status === 'success');

  if (successfulAdvisors.length === 0) {
    db.updateSessionStatus(sessionId, 'failed');
    return db.getSession(sessionId);
  }

  const anonymized = anonymize(successfulAdvisors);
  const compilerPrompt = buildCompilerPrompt(session.user_prompt, anonymized);

  const compilerRow = db.createResponse(
    sessionId,
    session.compiler_provider,
    'compiler'
  );
  db.updateResponse(compilerRow.id, { status: 'running' });

  const compilerResult = await runProvider(
    session.compiler_provider,
    compilerPrompt,
    config.COMPILER_TIMEOUT_MS,
    { ...ctx, signal }
  );

  if (compilerResult.cancelled) {
    db.updateResponse(compilerRow.id, {
      status: 'cancelled',
      responseText: null,
      stderrText: null,
      exitCode: compilerResult.exitCode,
      durationMs: compilerResult.durationMs,
    });
    db.updateSessionStatus(sessionId, 'cancelled');
    return db.getSession(sessionId);
  }

  const compilerStatus = compilerResult.timedOut
    ? 'timeout'
    : compilerResult.exitCode === 0
      ? 'success'
      : 'error';

  db.updateResponse(compilerRow.id, {
    status: compilerStatus,
    responseText: compilerResult.stdout,
    stderrText: compilerResult.stderr,
    exitCode: compilerResult.exitCode,
    durationMs: compilerResult.durationMs,
  });

  let sessionStatus;
  if (compilerStatus !== 'success') {
    sessionStatus = 'failed';
  } else if (successfulAdvisors.length === providerNames.length) {
    sessionStatus = 'completed';
  } else {
    sessionStatus = 'partially_completed';
  }

  db.updateSessionStatus(sessionId, sessionStatus);
  return db.getSession(sessionId);
}

function cancelSession(sessionId) {
  const ac = activeSessions.get(sessionId);
  if (!ac) return false;
  ac.abort();
  return true;
}

module.exports = { runSession, cancelSession };
