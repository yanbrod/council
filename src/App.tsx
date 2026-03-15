import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import type { Session, SessionListItem, ProviderName, ProviderInfo } from './types';
import * as api from './api';
import { PromptForm } from './components/PromptForm';
import { StatusBar } from './components/StatusBar';
import { AdvisorAccordion } from './components/AdvisorAccordion';
import { ResponseCard } from './components/ResponseCard';
import { SessionHistory } from './components/SessionHistory';
import { LanguageSelector } from './components/LanguageSelector';
import { I18nContext, LocaleContext, getTranslations, loadLocale, saveLocale, useT } from './i18n';
import type { Locale } from './i18n';

const TERMINAL_STATUSES = ['completed', 'partially_completed', 'failed', 'cancelled'];
const PAGE_SIZE = 20;

function AppContent() {
  const t = useT();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewingHistory, setViewingHistory] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadingMoreRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const { items, total } = await api.listSessions(PAGE_SIZE, 0);
      setSessions(items);
      setTotalSessions(total);
    } catch {}
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    try {
      const offset = sessions.length;
      const { items, total } = await api.listSessions(PAGE_SIZE, offset);
      setSessions((prev) => [...prev, ...items]);
      setTotalSessions(total);
    } catch {}
    loadingMoreRef.current = false;
  }, [sessions.length]);

  const pollSession = useCallback(
    (id: number) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const session = await api.getSession(id);
          setCurrentSession(session);
          if (TERMINAL_STATUSES.includes(session.status)) {
            stopPolling();
            setLoading(false);
            loadHistory();
          }
        } catch {}
      }, 2500);
    },
    [stopPolling, loadHistory]
  );

  const handleSubmit = useCallback(
    async (prompt: string, compiler: ProviderName) => {
      setLoading(true);
      setCurrentSession(null);
      setViewingHistory(false);
      try {
        const { sessionId } = await api.createSession(prompt, compiler);
        const session = await api.getSession(sessionId);
        setCurrentSession(session);
        pollSession(sessionId);
        loadHistory();
      } catch {
        setLoading(false);
      }
    },
    [pollSession, loadHistory]
  );

  const handleSelectSession = useCallback(
    async (id: number) => {
      stopPolling();
      try {
        const session = await api.getSession(id);
        setCurrentSession(session);
        setViewingHistory(true);
        if (!TERMINAL_STATUSES.includes(session.status)) {
          setLoading(true);
          setViewingHistory(false);
          pollSession(id);
        } else {
          setLoading(false);
        }
      } catch {}
    },
    [stopPolling, pollSession]
  );

  const handleCancel = useCallback(async () => {
    if (!currentSession) return;
    try {
      await api.cancelSession(currentSession.id);
    } catch {}
  }, [currentSession]);

  const handleDeleteSession = useCallback(
    async (id: number) => {
      try {
        await api.deleteSession(id);
        if (currentSession?.id === id) {
          stopPolling();
          setCurrentSession(null);
          setViewingHistory(false);
          setLoading(false);
        }
        loadHistory();
      } catch {}
    },
    [currentSession?.id, stopPolling, loadHistory]
  );

  const handleNewRequest = useCallback(() => {
    stopPolling();
    setCurrentSession(null);
    setViewingHistory(false);
    setLoading(false);
  }, [stopPolling]);

  useEffect(() => {
    api.getProviders().then(setProviders).catch(() => {});
    loadHistory();
    return stopPolling;
  }, [loadHistory, stopPolling]);

  const providerLabels: Record<string, string> = {};
  for (const p of providers) providerLabels[p.name] = p.label;

  const advisors = currentSession?.responses.filter((r) => r.role === 'advisor') ?? [];
  const compiler = currentSession?.responses.find((r) => r.role === 'compiler');

  return (
    <div class="layout">
      <div class="main">
        <div class="header-row">
          <h1>{t.title}</h1>
          <LanguageSelector />
        </div>

        <PromptForm
          onSubmit={handleSubmit}
          disabled={loading}
          readOnly={viewingHistory}
          externalPrompt={(viewingHistory || loading) ? currentSession?.user_prompt : undefined}
          onNewRequest={handleNewRequest}
          onCancel={handleCancel}
          loading={loading}
          providers={providers}
        />

        {currentSession && (
          <>
            {advisors.length > 0 && <StatusBar responses={currentSession.responses} />}

            <div class="advisors-list">
              {advisors.map((r) => (
                <AdvisorAccordion key={r.id} response={r} providerLabels={providerLabels} />
              ))}
            </div>

            {compiler && <ResponseCard response={compiler} isCompiler providerLabels={providerLabels} />}
          </>
        )}
      </div>

      <SessionHistory
        sessions={sessions}
        activeId={currentSession?.id ?? null}
        hasMore={sessions.length < totalSessions}
        onSelect={handleSelectSession}
        onDelete={handleDeleteSession}
        onLoadMore={loadMore}
      />
    </div>
  );
}

export function App() {
  const [locale, setLocaleState] = useState<Locale>(loadLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    saveLocale(l);
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <I18nContext.Provider value={getTranslations(locale)}>
        <AppContent />
      </I18nContext.Provider>
    </LocaleContext.Provider>
  );
}
