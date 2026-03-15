const { spawn } = require('child_process');
const { sanitize } = require('./sanitizer');

function runCliProcess(command, args, timeoutMs, signal, { stdin = 'pipe' } = {}) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let killed = false;
    let cancelled = false;
    let child;

    try {
      child = spawn(command, args, {
        stdio: [stdin, 'pipe', 'pipe'],
        env: { ...process.env },
      });
    } catch (err) {
      resolve({
        stdout: '',
        stderr: err.message,
        exitCode: -1,
        durationMs: Date.now() - startTime,
        timedOut: false,
        cancelled: false,
      });
      return;
    }

    if (signal) {
      const onAbort = () => {
        cancelled = true;
        child.kill('SIGTERM');
        setTimeout(() => {
          try { child.kill('SIGKILL'); } catch {}
        }, 3000);
      };
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener('abort', onAbort, { once: true });
        child.on('close', () => signal.removeEventListener('abort', onAbort));
      }
    }

    const timeout = setTimeout(() => {
      killed = true;
      child.kill('SIGTERM');
      setTimeout(() => {
        try { child.kill('SIGKILL'); } catch {}
      }, 5000);
    }, timeoutMs);

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        stdout: '',
        stderr: err.message,
        exitCode: -1,
        durationMs: Date.now() - startTime,
        timedOut: false,
        cancelled,
      });
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({
        stdout: sanitize(stdout),
        stderr: stderr.trim(),
        exitCode: code,
        durationMs: Date.now() - startTime,
        timedOut: killed && !cancelled,
        cancelled,
      });
    });
  });
}

module.exports = { runCliProcess };
