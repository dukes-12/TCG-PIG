import { json, requireUser, type Env } from '../../_lib/auth';

/** Le profil public d'un joueur — sa collection, ce qui en dépend (nombre de
 *  sacs ouverts), et son identité visuelle (avatar préréglé + photo
 *  éventuelle, comme le pseudo). Jamais les glands, le dos actif ou les
 *  réglages : ce n'est pas ce que "voir la collection d'un ami" veut dire. */
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
  return json({
    username,
    owned: state.owned ?? {},
    openedCount: state.openedCount ?? 0,
    avatar: state.avatar ?? 'truffe-rose',
    avatarPhoto: state.avatarPhoto ?? null,
  });
};
