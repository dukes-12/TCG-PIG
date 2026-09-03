import { json, requireUser, type Env } from '../_lib/auth';

/** La liste des pseudos — pour choisir un partenaire d'échange. Ne renvoie
 *  jamais les collections : voir la collection d'un joueur passe par son
 *  profil (`/api/profile/:username`), pas par cette liste. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const me = await requireUser(request, env);
  if (!me) return json({ error: 'Session expirée.' }, 401);
  const { results } = await env.DB.prepare('SELECT username FROM users ORDER BY username').all<{ username: string }>();
  return json({ players: (results ?? []).map((r) => r.username).filter((u) => u !== me.username) });
};
