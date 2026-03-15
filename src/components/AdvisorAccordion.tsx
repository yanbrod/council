import { useState } from 'preact/hooks';
import type { SessionResponse } from '../types';
import { useT } from '../i18n';

interface Props {
  response: SessionResponse;
  providerLabels?: Record<string, string>;
}

export function AdvisorAccordion({ response, providerLabels = {} }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);

  const title = providerLabels[response.provider_name] ?? response.provider_name;

  const formatDuration = (ms: number | null) =>
    ms != null ? `${(ms / 1000).toFixed(1)}s` : '';

  const isError = response.status === 'error' || response.status === 'timeout';
  const isLoading = response.status === 'pending' || response.status === 'running';
  const isCancelled = response.status === 'cancelled';

  const statusLabel =
    response.status === 'pending'
      ? t.pending
      : response.status === 'running'
        ? t.running
        : response.status === 'timeout'
          ? t.timeout
          : response.status === 'error'
            ? t.error
            : response.status === 'cancelled'
              ? t.cancelled
              : '';

  return (
    <div class={`accordion ${isError ? 'accordion--error' : ''}`}>
      <button
        class="accordion__header"
        onClick={() => setOpen(!open)}
        disabled={isLoading || isCancelled}
      >
        <div class="accordion__left">
          <span class={`accordion__arrow ${open ? 'accordion__arrow--open' : ''}`}>&#9654;</span>
          <span class="accordion__title">{title}</span>
          {isLoading && <span class="accordion__status">{statusLabel}</span>}
          {isError && <span class="accordion__status accordion__status--error">{statusLabel}</span>}
          {isCancelled && <span class="accordion__status">{statusLabel}</span>}
        </div>
        <span class="accordion__meta">{formatDuration(response.duration_ms)}</span>
      </button>
      {open && (
        <div class={`accordion__body ${isError ? 'accordion__body--error' : ''}`}>
          {response.status === 'success' && response.response_text}
          {response.status === 'error' && (
            <>
              <div>{t.errorWithCode(response.exit_code)}</div>
              {response.stderr_text && <div>{response.stderr_text}</div>}
              {response.response_text && <div>{response.response_text}</div>}
            </>
          )}
          {response.status === 'timeout' && <span>{t.timeoutExceeded}</span>}
        </div>
      )}
    </div>
  );
}
