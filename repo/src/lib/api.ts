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
 *  client — le résultat n'est jamais fait confiance s'il venait d'ici).
 *  Combat à PV FIXES (500) avec écran de défenseurs façon "position
 *  défense" — chaque équipe a EXACTEMENT 2 cartes en Attaque et 3 en
 *  Défense (plus de répartition libre), voir BattleResult ci-dessous. */
export type Stance = 'attaque' | 'defense';

export interface TeamSlot {
  cardId: number;
  holo: boolean;
  /** Posture choisie à la composition — EXACTEMENT 2 "attaque" et 3
   *  "defense" par équipe (voir functions/_lib/battle.ts, isTeamShape).
   *  STANCE_MULT y détaille l'effet exact sur l'attaque et la défense. */
  stance: Stance;
}

/** Les 3 "camps" thématiques, façon pierre-papier-ciseaux — Pouvoir bat
 *  Fiction bat Culture bat Pouvoir. Voir functions/_lib/battle.ts pour le
 *  détail de la répartition des catégories, le calcul, et pourquoi ce sens
 *  précis (rééquilibrage sur la puissance moyenne réelle de chaque camp). */
export type Camp = 'fiction' | 'pouvoir' | 'culture';

/** Un tour de combat — l'attaquant en cycle de chaque équipe agit
 *  simultanément, chacun visant le camp adverse : soit une carte-écran
 *  précise (`*TargetCardId`, encore debout), soit `null` si l'écran
 *  adverse est déjà entièrement détruit et que les PV sont visés
 *  directement. */
export interface RoundEvent {
  round: number;
  /** Carte "Attaque" qui agit ce tour, de chaque côté. */
  challengerAttackerId: number;
  opponentAttackerId: number;
  /** ATTAQUE finale utilisée ce tour (posture, camp, momentum, désespoir —
   *  aucun aléa caché dedans, voir functions/_lib/battle.ts). */
  challengerAtk: number;
  opponentAtk: number;
  /** Carte-écran visée par cette attaque, ou `null` si l'écran adverse est
   *  déjà percé (les PV sont visés directement). */
  challengerTargetCardId: number | null;
  opponentTargetCardId: number | null;
  /** true si cette attaque vient de détruire la carte-écran visée. */
  challengerTargetDestroyed: boolean;
  opponentTargetDestroyed: boolean;
  /** Dégâts infligés par chaque attaquant ce tour-ci (après coup critique
   *  et bouclier éventuels) — à la carte-écran visée, ou aux PV si l'écran
   *  est percé. */
  challengerDamage: number;
  opponentDamage: number;
  /** PV restants de chaque équipe APRÈS ce tour (jamais négatif). */
  challengerHp: number;
  opponentHp: number;
  challengerCamp: Camp | null;
  opponentCamp: Camp | null;
  /** true si l'attaquant a l'avantage de camp sur SA cible précise
   *  (toujours false si les PV sont visés directement — déjà pris en
   *  compte dans *Atk ci-dessus). */
  challengerCampAdvantage: boolean;
  opponentCampAdvantage: boolean;
  /** true si le tour précédent DE CET ATTAQUANT a atteint les PV adverses
   *  directement (déjà pris en compte dans *Atk ci-dessus). */
  challengerMomentum: boolean;
  opponentMomentum: boolean;
  /** true si l'équipe était sous 25% de ses PV max au début de ce tour
   *  (déjà pris en compte dans *Atk ci-dessus). */
  challengerDesperation: boolean;
  opponentDesperation: boolean;
  /** true si cette attaque a fait un coup critique (dégâts doublés, déjà
   *  pris en compte dans *Damage ci-dessus). */
  challengerCrit: boolean;
  opponentCrit: boolean;
  /** true si cette attaque a été bloquée par l'adversaire (0 dégâts, déjà
   *  pris en compte dans *Damage ci-dessus). */
  challengerBlocked: boolean;
  opponentBlocked: boolean;
  /** Capacité active de catégorie déclenchée CE tour par cet attaquant
   *  (`'heal'`, `'powerStrike'`...), ou `null` si aucune — voir
   *  categoryAbilities.ts. Optionnel : absent sur un combat PvP terminé
   *  avant l'ajout de ce champ, à traiter comme `null`. */
  challengerActiveKind?: string | null;
  opponentActiveKind?: string | null;
}

export interface BattleResult {
  rounds: RoundEvent[];
  challengerMaxHp: number;
  opponentMaxHp: number;
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
