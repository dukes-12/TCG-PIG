import { json, requireUser, type Env } from '../../_lib/auth';
import { isTeamShape, teamError } from '../../_lib/battle';

interface BattleRow {
  id: number;
  challenger_id: number;
  opponent_id: number;
  challenger_username: string;
  opponent_username: string;
  challenger_team_json: string;
  opponent_team_json: string | null;
  result_json: string | null;
  status: string;
  created_at: number;
  resolved_at: number | null;
}

/** Liste des combats où je suis défieur ou défié — voir IDEES_AMIS_COMBAT.md
 *  et functions/_lib/battle.ts pour la conception/le calcul. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const me = await requireUser(request, env);
  if (!me) return json({ error: 'Session expirée.' }, 401);

  const { results } = await env.DB.prepare(
    `SELECT b.id, b.challenger_id, b.opponent_id, cu.username as challenger_username, ou.username as opponent_username,
            b.challenger_team_json, b.opponent_team_json, b.result_json, b.status, b.created_at, b.resolved_at
     FROM battles b
     JOIN users cu ON cu.id = b.challenger_id
     JOIN users ou ON ou.id = b.opponent_id
     WHERE b.challenger_id = ?1 OR b.opponent_id = ?1
     ORDER BY b.created_at DESC`,
  )
    .bind(me.id)
    .all<BattleRow>();

  return json({
    battles: (results ?? []).map((r) => ({
      id: r.id,
      challengerUsername: r.challenger_username,
      opponentUsername: r.opponent_username,
      challengerTeam: JSON.parse(r.challenger_team_json),
      opponentTeam: r.opponent_team_json ? JSON.parse(r.opponent_team_json) : null,
      result: r.result_json ? JSON.parse(r.result_json) : null,
      status: r.status,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at,
      direction: r.challenger_id === me.id ? 'outgoing' : 'incoming',
    })),
  });
};

/** Lance un défi. Revérifié ici comme partout ailleurs dans l'API : jamais
 *  fait confiance au seul client sur la possession des cartes de l'équipe
 *  (teamError), ni sur leur rareté/catégorie pour la puissance (CARD_META,
 *  côté serveur — voir battle.ts). */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const me = await requireUser(request, env);
  if (!me) return json({ error: 'Session expirée.' }, 401);

  const body = await request.json<{ opponentUsername?: string; team?: unknown }>().catch(() => null);
  if (!body?.opponentUsername || !isTeamShape(body.team)) return json({ error: 'Défi incomplet — il faut 5 cartes.' }, 400);

  const opponent = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(body.opponentUsername).first<{ id: number }>();
  if (!opponent) return json({ error: 'Joueur introuvable.' }, 404);
  if (opponent.id === me.id) return json({ error: 'Impossible de se défier soi-même.' }, 400);

  const meRow = await env.DB.prepare('SELECT state_json FROM users WHERE id = ?').bind(me.id).first<{ state_json: string }>();
  const meState = JSON.parse(meRow?.state_json || '{}') as { owned?: Record<string, number>; ownedHolo?: Record<string, number> };
  const err = teamError(body.team, meState.owned ?? {}, meState.ownedHolo ?? {});
  if (err) return json({ error: err }, 400);

  const now = Date.now();
  const res = await env.DB.prepare(
    'INSERT INTO battles (challenger_id, opponent_id, challenger_team_json, status, created_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(me.id, opponent.id, JSON.stringify(body.team), 'pending', now)
    .run();

  return json({ id: res.meta.last_row_id });
};
