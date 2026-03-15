import { useRef, useCallback } from 'preact/hooks';
import type { SessionListItem } from '../types';
import { useT } from '../i18n';

interface Props {
  sessions: SessionListItem[];
  activeId: number | null;
  hasMore: boolean;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onLoadMore: () => void;
}

export function SessionHistory({ sessions, activeId, hasMore, onSelect, onDelete, onLoadMore }: Props) {
  const t = useT();
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node || !hasMore) return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) onLoadMore();
        },
        { threshold: 0.1 }
      );
      observerRef.current.observe(node);
    },
    [hasMore, onLoadMore]
  );

  if (sessions.length === 0) {
    return (
      <div class="sidebar">
        <h2>{t.history}</h2>
        <p style={{ fontSize: '13px', color: '#9ca3af' }}>{t.noSessions}</p>
      </div>
    );
  }

  return (
    <div class="sidebar">
      <h2>{t.history}</h2>
      <div class="history-scroll">
        <ul class="history-list">
          {sessions.map((s) => (
            <li
              key={s.id}
              class={`history-item ${s.id === activeId ? 'history-item--active' : ''}`}
              onClick={() => onSelect(s.id)}
            >
              <div class="history-item__top">
                <div class="history-item__prompt">{s.user_prompt}</div>
                <button
                  class="history-item__delete"
                  title={t.delete}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(s.id);
                  }}
                >
                  &times;
                </button>
              </div>
              <div class="history-item__meta">
                <span class={`badge badge--${s.status}`}>{s.status}</span>
                <span>{new Date(s.created_at + 'Z').toLocaleString()}</span>
              </div>
            </li>
          ))}
        </ul>
        {hasMore && <div ref={sentinelRef} class="history-sentinel" />}
      </div>
    </div>
  );
}
