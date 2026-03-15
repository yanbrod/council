export type ResponseStatus = 'pending' | 'running' | 'success' | 'error' | 'timeout' | 'cancelled';
export type SessionStatus = 'created' | 'running' | 'completed' | 'partially_completed' | 'failed' | 'cancelled';
export type ProviderName = string;

export interface ProviderInfo {
  name: string;
  label: string;
}

export interface SessionResponse {
  id: number;
  session_id: number;
  provider_name: ProviderName;
  role: 'advisor' | 'compiler';
  status: ResponseStatus;
  response_text: string | null;
  stderr_text: string | null;
  exit_code: number | null;
  duration_ms: number | null;
  created_at: string;
}

export interface Session {
  id: number;
  user_prompt: string;
  compiler_provider: ProviderName;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
  responses: SessionResponse[];
}

export interface SessionListItem {
  id: number;
  user_prompt: string;
  compiler_provider: ProviderName;
  status: SessionStatus;
  created_at: string;
}
