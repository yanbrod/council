import type { Session, SessionListItem, ProviderInfo } from './types';

export async function getProviders(): Promise<ProviderInfo[]> {
  const res = await fetch('/api/providers');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createSession(prompt: string, compiler: string): Promise<{ sessionId: number }> {
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, compiler }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getSession(id: number): Promise<Session> {
  const res = await fetch(`/api/sessions/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export interface SessionListResponse {
  items: SessionListItem[];
  total: number;
}

export async function cancelSession(id: number): Promise<void> {
  const res = await fetch(`/api/sessions/${id}/cancel`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
}

export async function deleteSession(id: number): Promise<void> {
  const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

export async function listSessions(limit = 20, offset = 0): Promise<SessionListResponse> {
  const res = await fetch(`/api/sessions?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
