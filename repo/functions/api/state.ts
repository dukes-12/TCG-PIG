import { json, requireUser, type Env } from '../_lib/auth';

/** L'état persisté complet (owned, glands, stock, dos, réglages…) — un seul
 *  blob, le serveur ne connaît pas sa forme au-delà de JSON valide. C'est le
 *  client qui décide de ce qu'il synchronise (voir partialize() côté store). */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env);
  if (!user) return json({ error: 'Session expirée.' }, 401);
  const row = await env.DB.prepare('SELECT state_json FROM users WHERE id = ?').bind(user.id).first<{ state_json: string }>();
  return json({ state: JSON.parse(row?.state_json || '{}') });
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env);
  if (!user) return json({ error: 'Session expirée.' }, 401);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return json({ error: 'Corps invalide.' }, 400);
  await env.DB.prepare('UPDATE users SET state_json = ?, updated_at = ? WHERE id = ?')
    .bind(JSON.stringify(body), Date.now(), user.id)
    .run();
  return json({ ok: true });
};
