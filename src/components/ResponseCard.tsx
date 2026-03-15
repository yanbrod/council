import type { SessionResponse } from '../types';
import { useT } from '../i18n';

interface Props {
  response: SessionResponse;
  isCompiler?: boolean;
  providerLabels?: Record<string, string>;
}

export function ResponseCard({ response, isCompiler, providerLabels = {} }: Props) {
  const t = useT();
  const label = providerLabels[response.provider_name] ?? response.provider_name;
  const title = isCompiler ? t.compilerTitle(label) : label;

  const cardClass = [
    'card',
    isCompiler && 'card--compiler',
    response.status === 'error' && 'card--error',
    response.status === 'timeout' && 'card--error',
  ]
    .filter(Boolean)
    .join(' ');

  const formatDuration = (ms: number | null) =>
    ms != null ? `${(ms / 1000).toFixed(1)}s` : '';

  return (
    <div class={cardClass}>
      <div class="card__header">
        <span class="card__title">{title}</span>
        <span class="card__meta">{formatDuration(response.duration_ms)}</span>
      </div>
      <div class="card__body">
        {response.status === 'pending' && (
          <span class="card--empty">{t.pending}</span>
        )}
        {response.status === 'running' && (
          <span class="card--empty">{t.running}</span>
        )}
        {response.status === 'success' && response.response_text}
        {response.status === 'error' && (
          <>
            <div>{t.errorWithCode(response.exit_code)}</div>
            {response.stderr_text && <div>{response.stderr_text}</div>}
            {response.response_text && <div>{response.response_text}</div>}
          </>
        )}
        {response.status === 'timeout' && (
          <span>{t.timeoutExceeded}</span>
        )}
      </div>
    </div>
  );
}
