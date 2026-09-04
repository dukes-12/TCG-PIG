/** Client HTTP vers les fonctions `/api/*` (Cloudflare Pages Functions +
 *  D1) — voir functions/api/. Le jeton de session vit dans le localStorage
 *  du navigateur, hors du store zustand : il ne doit pas suivre les mêmes
 *  règles de fusion que l'état de jeu. */

const TOKEN_KEY = 'grouin-token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string })?.error ?? 'Erreur réseau.');
  return body as T;
}

export interface AuthResponse {
  token: string;
  username: string;
  state: Record<string, unknown>;
}

export function apiRegister(username: string, pin: string, localState: unknown) {
  return call<AuthResponse>('/register', { method: 'POST', body: JSON.stringify({ username, pin, localState }) });
}
export function apiLogin(username: string, pin: string) {
  return call<AuthResponse>('/login', { method: 'POST', body: JSON.stringify({ username, pin }) });
}
export function apiFetchState() {
  return call<{ state: Record<string, unknown> }>('/state');
}
export function apiPushState(state: Record<string, unknown>) {
  return call<{ ok: true }>('/state', { method: 'PUT', body: JSON.stringify(state) });
}
export function apiFetchPlayers() {
  return call<{ players: string[] }>('/players');
}
export function apiFetchFriends() {
  return call<{ players: { username: string; avatar: string; avatarPhoto: string | null }[] }>('/friends');
}
export function apiFetchProfile(username: string) {
  return call<{ username: string; owned: Record<string, number>; openedCount: number; avatar: string; avatarPhoto: string | null }>(
    `/profile/${encodeURIComponent(username)}`,
  );
}

export interface Trade {
  id: number;
  fromUsername: string;
  toUsername: string;
  offer: Record<string, number>;
  request: Record<string, number>;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: number;
  direction: 'incoming' | 'outgoing';
}

export function apiFetchTrades() {
  return call<{ trades: Trade[] }>('/trades');
}
export function apiProposeTrade(toUsername: string, offer: Record<string, number>, request: Record<string, number>) {
  return call<{ id: number }>('/trades', { method: 'POST', body: JSON.stringify({ toUsername, offer, request }) });
}
export function apiRespondTrade(id: number, action: 'accept' | 'decline' | 'cancel') {
  return call<{ ok: true }>(`/trades/${id}`, { method: 'POST', body: JSON.stringify({ action }) });
}

export interface MailboxMessage {
  id: number;
  message: string;
  glands: number;
  created_at: number;
  read_at: number | null;
}

export function apiFetchMailbox() {
  return call<{ messages: MailboxMessage[]; unread: number }>('/mailbox');
}
export function apiMarkMailboxRead(ids: number[]) {
  return call<{ ok: true }>('/mailbox', { method: 'POST', body: JSON.stringify({ ids }) });
}

/** Requêtes SQL d'administration — voir functions/api/admin/queries et
 *  ADMIN.md. Réservées côté serveur au compte "Dukes" (requireAdmin) ;
 *  ces routes répondent 403 pour tout autre compte, il ne faut donc
 *  appeler ces fonctions qu'après avoir déjà vérifié `account === 'Dukes'`
 *  côté client (voir AdminSqlOverlay). */
export interface AdminQuery {
  id: number;
  name: string;
  sql_text: string;
  created_at: number;
  updated_at: number;
}

export interface AdminQueryRunResult {
  results: { results: Record<string, unknown>[]; meta: { changes?: number; last_row_id?: number; rows_read?: number; rows_written?: number } }[];
}

export function apiFetchAdminQueries() {
  return call<{ queries: AdminQuery[] }>('/admin/queries');
}
export function apiCreateAdminQuery(name: string, sqlText: string) {
  return call<{ id: number }>('/admin/queries', { method: 'POST', body: JSON.stringify({ name, sqlText }) });
}
export function apiUpdateAdminQuery(id: number, patch: { name?: string; sqlText?: string }) {
  return call<{ ok: true }>(`/admin/queries/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}
export function apiDeleteAdminQuery(id: number) {
  return call<{ ok: true }>(`/admin/queries/${id}`, { method: 'DELETE' });
}
export function apiRunAdminQuery(id: number, sqlText?: string) {
  return call<AdminQueryRunResult>(`/admin/queries/${id}`, { method: 'POST', body: JSON.stringify({ sqlText }) });
}
