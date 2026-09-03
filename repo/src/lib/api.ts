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
  return call<{ players: { username: string; avatar: string }[] }>('/friends');
}
export function apiFetchProfile(username: string) {
  return call<{ username: string; owned: Record<string, number>; openedCount: number; avatar: string }>(
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
