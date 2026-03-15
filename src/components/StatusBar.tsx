import type { SessionResponse } from '../types';

const PROVIDER_LABELS: Record<string, string> = {
  claude: 'Claude',
  codex: 'Codex',
  gemini: 'Gemini',
};

interface Props {
  responses: SessionResponse[];
}

export function StatusBar({ responses }: Props) {
  const advisors = responses.filter((r) => r.role === 'advisor');

  return (
    <div class="status-bar">
      {advisors.map((r) => (
        <div class="status-item" key={r.provider_name}>
          <span class={`status-dot status-dot--${r.status}`} />
          <span>{PROVIDER_LABELS[r.provider_name] ?? r.provider_name}</span>
          {r.duration_ms != null && (
            <span style={{ color: '#9ca3af', fontSize: '12px' }}>
              {(r.duration_ms / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
