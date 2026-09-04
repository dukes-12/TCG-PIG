import { json, requireUser, type Env } from '../_lib/auth';

/** La liste des autres joueurs, avec leur avatar (préréglage + photo
 *  éventuelle) — pour l'onglet Amis. Distincte de `/api/players` (pseudos
 *  seuls, utilisée par Échanges comme simple sélecteur de partenaire) : ici
 *  on affiche une liste, pas juste un menu. Jamais la collection ni les
 *  glands — comme `/api/profile/:username`, l'identité visuelle est la
 *  seule donnée publique en plus du pseudo. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const me = await requireUser(request, env);
  if (!me) return json({ error: 'Session expirée.' }, 401);

  const { results } = await env.DB.prepare('SELECT username, state_json FROM users ORDER BY username').all<{
    username: string;
    state_json: string;
  }>();

  const players = (results ?? [])
    .filter((r) => r.username !== me.username)
    .map((r) => {
      let avatar = 'truffe-rose';
      let avatarPhoto: string | null = null;
      try {
        const parsed = JSON.parse(r.state_json || '{}') as { avatar?: string; avatarPhoto?: string | null };
        if (parsed.avatar) avatar = parsed.avatar;
        if (parsed.avatarPhoto) avatarPhoto = parsed.avatarPhoto;
      } catch {
        // state_json corrompu ou vide — on garde l'avatar par défaut plutôt que de faire échouer toute la liste.
      }
      return { username: r.username, avatar, avatarPhoto };
    });

  return json({ players });
};
