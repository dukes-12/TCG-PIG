import { json, requireUser, type Env } from '../../_lib/auth';

interface TradeRow {
  id: number;
  from_user_id: number;
  to_user_id: number;
  from_username: string;
  to_username: string;
  offer_json: string;
  request_json: string;
  status: string;
  created_at: number;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const me = await requireUser(request, env);
  if (!me) return json({ error: 'Session expirée.' }, 401);

  const { results } = await env.DB.prepare(
    `SELECT t.id, t.from_user_id, t.to_user_id, fu.username as from_username, tu.username as to_username,
            t.offer_json, t.request_json, t.status, t.created_at
     FROM trades t
     JOIN users fu ON fu.id = t.from_user_id
     JOIN users tu ON tu.id = t.to_user_id
     WHERE t.from_user_id = ?1 OR t.to_user_id = ?1
     ORDER BY t.created_at DESC`,
  )
    .bind(me.id)
    .all<TradeRow>();

  return json({
    trades: (results ?? []).map((r) => ({
      id: r.id,
      fromUsername: r.from_username,
      toUsername: r.to_username,
      offer: JSON.parse(r.offer_json),
      request: JSON.parse(r.request_json),
      status: r.status,
      createdAt: r.created_at,
      direction: r.from_user_id === me.id ? 'outgoing' : 'incoming',
    })),
  });
};

/** Propose un échange. Le garde-fou "jamais ton dernier exemplaire" est
 *  revérifié ici — ne jamais faire confiance au seul client — sur les deux
 *  collections : la sienne et celle du destinataire. */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const me = await requireUser(request, env);
  if (!me) return json({ error: 'Session expirée.' }, 401);

  const body = await request
    .json<{ toUsername?: string; offer?: Record<string, number>; request?: Record<string, number> }>()
    .catch(() => null);
  if (!body?.toUsername || !body.offer || !body.request) return json({ error: 'Proposition incomplète.' }, 400);
  if (Object.keys(body.offer).length === 0 || Object.keys(body.request).length === 0) {
    return json({ error: 'Choisis au moins une carte de chaque côté.' }, 400);
  }

  const to = await env.DB.prepare('SELECT id, state_json FROM users WHERE username = ?')
    .bind(body.toUsername)
    .first<{ id: number; state_json: string }>();
  if (!to) return json({ error: 'Joueur introuvable.' }, 404);
  if (to.id === me.id) return json({ error: "Impossible de s'échanger avec soi-même." }, 400);

  const meRow = await env.DB.prepare('SELECT state_json FROM users WHERE id = ?').bind(me.id).first<{ state_json: string }>();
  const meState = JSON.parse(meRow?.state_json || '{}');
  const toState = JSON.parse(to.state_json || '{}');
  const myOwned = (meState.owned ?? {}) as Record<string, number>;
  const myOwnedHolo = (meState.ownedHolo ?? {}) as Record<string, number>;
  const theirOwned = (toState.owned ?? {}) as Record<string, number>;
  const theirOwnedHolo = (toState.ownedHolo ?? {}) as Record<string, number>;

  // Le plancher protégé (au moins 1 exemplaire, plus tous les holo) ne se
  // propose jamais dans un échange — mêmes garde-fous que le recyclage
  // (voir recycle/recycleHolo dans state/store.ts), revérifiés ici côté
  // serveur plutôt que de faire confiance au client.
  for (const [id, qty] of Object.entries(body.offer)) {
    const keep = Math.max(1, myOwnedHolo[id] || 0);
    if ((myOwned[id] || 0) - qty < keep) return json({ error: 'Tu ne peux proposer que tes doublons.' }, 400);
  }
  for (const [id, qty] of Object.entries(body.request)) {
    const keep = Math.max(1, theirOwnedHolo[id] || 0);
    if ((theirOwned[id] || 0) - qty < keep) return json({ error: "Cette carte n'est pas un doublon chez ce joueur." }, 400);
  }

  const now = Date.now();
  const res = await env.DB.prepare(
    'INSERT INTO trades (from_user_id, to_user_id, offer_json, request_json, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(me.id, to.id, JSON.stringify(body.offer), JSON.stringify(body.request), 'pending', now)
    .run();

  return json({ id: res.meta.last_row_id });
};
