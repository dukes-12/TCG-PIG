import { json, requireUser, type Env } from '../../_lib/auth';

// Id de la carte secrète (Chipo Oméga, rareté 7) dans src/data/cards.json —
// dupliqué ici en dur parce que les Pages Functions n'importent pas le
// catalogue front-end. Si la carte est un jour recréée avec un autre id,
// mettre à jour cette constante. Volontairement jamais renvoyée par cette
// route : ni son état de possession, ni même son existence en creux
// (compter dedans ferait un `owned` avec une clé qu'aucune autre carte du
// catalogue ne référencerait côté client) ne doit filtrer vers un autre
// joueur — voir la demande "pas visible depuis Amis/Échanges".
const SECRET_CARD_ID = 184;

/** Le profil public d'un joueur — sa collection, ce qui en dépend (nombre de
 *  sacs ouverts), et son identité visuelle (avatar préréglé + photo
 *  éventuelle, comme le pseudo). Jamais les glands, le dos actif ou les
 *  réglages : ce n'est pas ce que "voir la collection d'un ami" veut dire.
 *  Jamais la carte secrète non plus, même en creux. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const me = await requireUser(request, env);
  if (!me) return json({ error: 'Session expirée.' }, 401);

  const username = String(params.username);
  const row = await env.DB.prepare('SELECT state_json FROM users WHERE username = ?').bind(username).first<{ state_json: string }>();
  if (!row) return json({ error: 'Joueur introuvable.' }, 404);

  const state = JSON.parse(row.state_json || '{}') as {
    owned?: Record<string, number>;
    openedCount?: number;
    avatar?: string;
    avatarPhoto?: string | null;
  };
  const owned = { ...(state.owned ?? {}) };
  delete owned[String(SECRET_CARD_ID)];

  return json({
    username,
    owned,
    openedCount: state.openedCount ?? 0,
    avatar: state.avatar ?? 'truffe-rose',
    avatarPhoto: state.avatarPhoto ?? null,
  });
};
