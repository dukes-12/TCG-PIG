import { json, requireUser, type Env } from '../_lib/auth';

/** La boîte aux lettres du joueur — pensée pour les cadeaux manuels envoyés
 *  via la console D1 (voir ADMIN.md) : un message qui explique un
 *  changement de solde, pas un système de chat entre joueurs.
 *
 *  GET  → mes messages (50 derniers, plus récent d'abord) + le nombre non lus.
 *  POST { ids: number[] } → marque ces messages (m'appartenant) comme lus. */

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const me = await requireUser(request, env);
  if (!me) return json({ error: 'Session expirée.' }, 401);

  const { results } = await env.DB.prepare(
    'SELECT id, message, glands, created_at, read_at FROM mailbox WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
  )
    .bind(me.id)
    .all<{ id: number; message: string; glands: number; created_at: number; read_at: number | null }>();

  const messages = results ?? [];
  const unread = messages.filter((m) => m.read_at == null).length;
  return json({ messages, unread });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const me = await requireUser(request, env);
  if (!me) return json({ error: 'Session expirée.' }, 401);

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray((body as { ids?: unknown }).ids)
    ? (body as { ids: unknown[] }).ids.filter((n): n is number => Number.isInteger(n))
    : [];
  if (ids.length === 0) return json({ ok: true });

  // IN (?, ?, ...) construit dynamiquement — `ids` ne vient jamais tel quel
  // dans le SQL, seulement des `?` liés un par un via `.bind`.
  const placeholders = ids.map(() => '?').join(',');
  await env.DB.prepare(`UPDATE mailbox SET read_at = ? WHERE user_id = ? AND id IN (${placeholders})`)
    .bind(Date.now(), me.id, ...ids)
    .run();

  return json({ ok: true });
};
