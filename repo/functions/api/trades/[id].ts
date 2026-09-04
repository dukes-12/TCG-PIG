import { json, requireUser, type Env } from '../../_lib/auth';

interface TradeRecord {
  id: number;
  from_user_id: number;
  to_user_id: number;
  offer_json: string;
  request_json: string;
  status: string;
}

/** Répond à un échange (le destinataire) ou l'annule (l'auteur). L'acceptation
 *  revérifie les deux collections au moment T — elles ont pu changer depuis
 *  la proposition (l'une des cartes a pu être recyclée) — puis transfère les
 *  deux côtés en un seul batch D1, pour ne jamais laisser un compte débité
 *  sans que l'autre soit crédité. */
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const me = await requireUser(request, env);
  if (!me) return json({ error: 'Session expirée.' }, 401);

  const id = Number(params.id);
  const body = await request.json<{ action?: 'accept' | 'decline' | 'cancel' }>().catch(() => null);
  if (!body?.action) return json({ error: 'Action requise.' }, 400);

  const trade = await env.DB.prepare('SELECT * FROM trades WHERE id = ?').bind(id).first<TradeRecord>();
  if (!trade) return json({ error: 'Échange introuvable.' }, 404);
  if (trade.status !== 'pending') return json({ error: 'Cet échange a déjà été traité.' }, 409);

  if (body.action === 'cancel') {
    if (trade.from_user_id !== me.id) return json({ error: "Seul l'auteur peut annuler." }, 403);
    await env.DB.prepare('UPDATE trades SET status = ?, resolved_at = ? WHERE id = ?').bind('cancelled', Date.now(), id).run();
    return json({ ok: true });
  }

  if (trade.to_user_id !== me.id) return json({ error: 'Seul le destinataire peut répondre.' }, 403);

  if (body.action === 'decline') {
    await env.DB.prepare('UPDATE trades SET status = ?, resolved_at = ? WHERE id = ?').bind('declined', Date.now(), id).run();
    return json({ ok: true });
  }

  const fromRow = await env.DB.prepare('SELECT state_json FROM users WHERE id = ?').bind(trade.from_user_id).first<{ state_json: string }>();
  const toRow = await env.DB.prepare('SELECT state_json FROM users WHERE id = ?').bind(trade.to_user_id).first<{ state_json: string }>();
  const fromState = JSON.parse(fromRow?.state_json || '{}') as { owned?: Record<string, number>; ownedHolo?: Record<string, number> };
  const toState = JSON.parse(toRow?.state_json || '{}') as { owned?: Record<string, number>; ownedHolo?: Record<string, number> };
  fromState.owned ??= {};
  toState.owned ??= {};
  fromState.ownedHolo ??= {};
  toState.ownedHolo ??= {};

  const offer = JSON.parse(trade.offer_json) as Record<string, number>;
  const wanted = JSON.parse(trade.request_json) as Record<string, number>;

  // Même plancher protégé qu'à la proposition (voir index.ts) — revérifié
  // ici aussi : la collection a pu changer depuis (recyclage, autre
  // échange…), donc un exemplaire devenu "le seul holo" entre-temps ne doit
  // pas passer.
  for (const [cid, qty] of Object.entries(offer)) {
    const keep = Math.max(1, fromState.ownedHolo[cid] || 0);
    if ((fromState.owned[cid] || 0) - qty < keep) return json({ error: "Le proposant n'a plus ce doublon." }, 409);
  }
  for (const [cid, qty] of Object.entries(wanted)) {
    const keep = Math.max(1, toState.ownedHolo[cid] || 0);
    if ((toState.owned[cid] || 0) - qty < keep) return json({ error: "Tu n'as plus ce doublon." }, 409);
  }

  for (const [cid, qty] of Object.entries(offer)) {
    fromState.owned[cid] -= qty;
    toState.owned[cid] = (toState.owned[cid] || 0) + qty;
  }
  for (const [cid, qty] of Object.entries(wanted)) {
    toState.owned[cid] -= qty;
    fromState.owned[cid] = (fromState.owned[cid] || 0) + qty;
  }

  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET state_json = ?, updated_at = ? WHERE id = ?').bind(JSON.stringify(fromState), now, trade.from_user_id),
    env.DB.prepare('UPDATE users SET state_json = ?, updated_at = ? WHERE id = ?').bind(JSON.stringify(toState), now, trade.to_user_id),
    env.DB.prepare('UPDATE trades SET status = ?, resolved_at = ? WHERE id = ?').bind('accepted', now, id),
  ]);

  return json({ ok: true });
};
