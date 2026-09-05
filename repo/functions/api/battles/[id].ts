import { json, requireUser, type Env } from '../../_lib/auth';
import { isTeamShape, resolveBattle, teamError, type TeamSlot } from '../../_lib/battle';

interface BattleRecord {
  id: number;
  challenger_id: number;
  opponent_id: number;
  challenger_team_json: string;
  status: string;
}

/** Répond à un défi (le défié), l'annule (le défieur, avant réponse) ou le
 *  décline (le défié). La résolution revérifie les DEUX équipes contre
 *  l'état actuel des deux comptes — même prudence que trades/[id].ts : la
 *  collection du défieur a pu changer depuis le défi (carte recyclée,
 *  échangée…). */
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const me = await requireUser(request, env);
  if (!me) return json({ error: 'Session expirée.' }, 401);

  const id = Number(params.id);
  const body = await request.json<{ action?: 'respond' | 'decline' | 'cancel'; team?: unknown }>().catch(() => null);
  if (!body?.action) return json({ error: 'Action requise.' }, 400);

  const battle = await env.DB.prepare('SELECT * FROM battles WHERE id = ?').bind(id).first<BattleRecord>();
  if (!battle) return json({ error: 'Combat introuvable.' }, 404);
  if (battle.status !== 'pending') return json({ error: 'Ce combat a déjà été résolu.' }, 409);

  if (body.action === 'cancel') {
    if (battle.challenger_id !== me.id) return json({ error: 'Seul le défieur peut annuler.' }, 403);
    await env.DB.prepare('UPDATE battles SET status = ?, resolved_at = ? WHERE id = ?').bind('cancelled', Date.now(), id).run();
    return json({ ok: true });
  }

  if (battle.opponent_id !== me.id) return json({ error: 'Seul le défié peut répondre.' }, 403);

  if (body.action === 'decline') {
    await env.DB.prepare('UPDATE battles SET status = ?, resolved_at = ? WHERE id = ?').bind('declined', Date.now(), id).run();
    return json({ ok: true });
  }

  // 'respond'
  if (!isTeamShape(body.team)) return json({ error: 'Équipe incomplète — il faut 5 cartes.' }, 400);

  const [meRow, challengerRow] = await Promise.all([
    env.DB.prepare('SELECT state_json FROM users WHERE id = ?').bind(me.id).first<{ state_json: string }>(),
    env.DB.prepare('SELECT state_json FROM users WHERE id = ?').bind(battle.challenger_id).first<{ state_json: string }>(),
  ]);
  const meState = JSON.parse(meRow?.state_json || '{}') as { owned?: Record<string, number>; ownedHolo?: Record<string, number> };
  const myErr = teamError(body.team, meState.owned ?? {}, meState.ownedHolo ?? {});
  if (myErr) return json({ error: myErr }, 400);

  const challengerTeam = JSON.parse(battle.challenger_team_json) as TeamSlot[];
  const challengerState = JSON.parse(challengerRow?.state_json || '{}') as { owned?: Record<string, number>; ownedHolo?: Record<string, number> };
  const theirErr = teamError(challengerTeam, challengerState.owned ?? {}, challengerState.ownedHolo ?? {});
  if (theirErr) return json({ error: "L'équipe du défieur n'est plus valide (une carte a été recyclée ou échangée depuis) — il doit relancer un défi." }, 409);

  const result = resolveBattle(id, challengerTeam, body.team);
  const now = Date.now();
  await env.DB.prepare('UPDATE battles SET opponent_team_json = ?, result_json = ?, status = ?, resolved_at = ? WHERE id = ?')
    .bind(JSON.stringify(body.team), JSON.stringify(result), 'completed', now, id)
    .run();

  // Récompense de victoire en glands (aucune en cas d'égalité) — scalée sur
  // la puissance de l'équipe VAINCUE, pas sur celle du vainqueur : battre un
  // adversaire déjà costaud rapporte gros, battre un adversaire famélique
  // presque rien, sinon "défier en boucle le même joueur faible" serait la
  // stratégie optimale. Bornée pour rester un à-côté de l'économie des sacs
  // (100 glands le moins cher), pas un moyen de la contourner.
  let reward: { amount: number; toMe: boolean } | undefined;
  if (result.winner !== 'tie') {
    const winnerIsChallenger = result.winner === 'challenger';
    const loserTotalPower = winnerIsChallenger ? result.opponentTotalPower : result.challengerTotalPower;
    const amount = Math.min(80, Math.max(8, Math.round(loserTotalPower * 0.4)));
    const winnerId = winnerIsChallenger ? battle.challenger_id : me.id;
    const winnerRow = winnerIsChallenger ? challengerRow : meRow;
    const winnerState = JSON.parse(winnerRow?.state_json || '{}') as Record<string, unknown>;
    winnerState.glands = (Number(winnerState.glands) || 0) + amount;
    await env.DB.prepare('UPDATE users SET state_json = ? WHERE id = ?').bind(JSON.stringify(winnerState), winnerId).run();
    reward = { amount, toMe: !winnerIsChallenger };
  }

  return json({ ok: true, result, reward });
};
