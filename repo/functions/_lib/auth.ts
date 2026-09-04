/** Aides partagées par toutes les fonctions `/api/*` : hachage du PIN,
 *  session, réponse JSON. Le PIN à 4 chiffres est un choix délibérément
 *  léger (jeu entre amis, pas un compte bancaire) — haché avec un sel par
 *  utilisateur, mais sans limitation de tentatives : suffisant pour ce
 *  contexte, pas pour un service ouvert au public. */

export interface Env {
  DB: D1Database;
}

const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 jours

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return toHex(digest);
}

export function randomSalt(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

export function randomToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');
}

export interface AuthedUser {
  id: number;
  username: string;
}

export async function requireUser(request: Request, env: Env): Promise<AuthedUser | null> {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT users.id as id, users.username as username, sessions.expires_at as expires_at
     FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = ?`,
  )
    .bind(token)
    .first<{ id: number; username: string; expires_at: number }>();
  if (!row || row.expires_at < Date.now()) return null;
  return { id: row.id, username: row.username };
}

/** Seul ce compte peut passer les routes /api/admin/* (requêtes SQL
 *  pré-enregistrées, voir functions/api/admin/queries) — un pouvoir bien
 *  plus lourd que le reste de l'API (SQL arbitraire sur la base de
 *  production), donc vérifié ici côté serveur, pas seulement caché côté
 *  client comme le bouton "Outils de test" du Profil. Même compte,
 *  volontairement en dur plutôt qu'un rôle en base : un seul admin pour
 *  ce projet, pas besoin de plus. */
const ADMIN_USERNAME = 'Dukes';

export async function requireAdmin(request: Request, env: Env): Promise<AuthedUser | null> {
  const me = await requireUser(request, env);
  if (!me || me.username !== ADMIN_USERNAME) return null;
  return me;
}

export async function createSession(env: Env, userId: number): Promise<string> {
  const token = randomToken();
  const now = Date.now();
  await env.DB.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(token, userId, now, now + SESSION_TTL_MS)
    .run();
  return token;
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}
