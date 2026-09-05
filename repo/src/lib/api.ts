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
  return call<{
    username: string;
    owned: Record<string, number>;
    ownedHolo: Record<string, number>;
    openedCount: number;
    avatar: string;
    avatarPhoto: string | null;
  }>(`/profile/${encodeURIComponent(username)}`);
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

/** Combats — voir IDEES_AMIS_COMBAT.md pour la conception et
 *  functions/_lib/battle.ts pour le calcul (côté serveur, jamais côté
 *  client — le résultat n'est jamais fait confiance s'il venait d'ici). */
export interface TeamSlot {
  cardId: number;
  holo: boolean;
}

/** Les 3 "camps" thématiques, façon pierre-papier-ciseaux — Fiction bat
 *  Pouvoir bat Culture bat Fiction. Voir functions/_lib/battle.ts pour le
 *  détail de la répartition des catégories et le calcul. */
export type Camp = 'fiction' | 'pouvoir' | 'culture';

export interface DuelResult {
  slot: number;
  challengerCardId: number;
  opponentCardId: number;
  challengerPower: number;
  opponentPower: number;
  challengerCamp: Camp | null;
  opponentCamp: Camp | null;
  /** true si le camp de cette carte a l'avantage sur le camp adverse pour
   *  ce duel précis (déjà pris en compte dans *Power ci-dessus). */
  challengerCampAdvantage: boolean;
  opponentCampAdvantage: boolean;
  /** true si cette carte profite du bonus de "lancée" (la carte précédente
   *  de la même équipe a gagné son duel) — déjà pris en compte dans
   *  *Power ci-dessus. */
  challengerMomentum: boolean;
  opponentMomentum: boolean;
  winner: 'challenger' | 'opponent' | 'tie';
}

export interface BattleResult {
  duels: DuelResult[];
  challengerRoundsWon: number;
  opponentRoundsWon: number;
  challengerTotalPower: number;
  opponentTotalPower: number;
  challengerSynergyBonus: number;
  opponentSynergyBonus: number;
  winner: 'challenger' | 'opponent' | 'tie';
}

export interface Battle {
  id: number;
  challengerUsername: string;
  opponentUsername: string;
  challengerTeam: TeamSlot[];
  opponentTeam: TeamSlot[] | null;
  result: BattleResult | null;
  status: 'pending' | 'completed' | 'declined' | 'cancelled';
  createdAt: number;
  resolvedAt: number | null;
  direction: 'incoming' | 'outgoing';
}

export function apiFetchBattles() {
  return call<{ battles: Battle[] }>('/battles');
}
export function apiCreateBattle(opponentUsername: string, team: TeamSlot[]) {
  return call<{ id: number }>('/battles', { method: 'POST', body: JSON.stringify({ opponentUsername, team }) });
}
export function apiRespondBattle(id: number, action: 'respond' | 'decline' | 'cancel', team?: TeamSlot[]) {
  return call<{ ok: true; result?: BattleResult; reward?: { amount: number; toMe: boolean } }>(`/battles/${id}`, {
    method: 'POST',
    body: JSON.stringify({ action, team }),
  });
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
