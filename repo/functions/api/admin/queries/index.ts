import { json, requireAdmin, type Env } from '../../../_lib/auth';

interface QueryRow {
  id: number;
  name: string;
  sql_text: string;
  created_at: number;
  updated_at: number;
}

/** Requêtes SQL d'administration pré-enregistrées, éditables depuis
 *  Profil → Outils de test (compte "Dukes" uniquement — voir requireAdmin
 *  dans _lib/auth). Contexte : ADMIN.md documentait ces opérations comme
 *  du copier-coller manuel dans la console D1 du dashboard Cloudflare ;
 *  ici elles vivent dans la table `admin_queries`, donc ajoutables et
 *  modifiables depuis l'appli sans déploiement. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const me = await requireAdmin(request, env);
  if (!me) return json({ error: 'Accès refusé.' }, 403);

  const { results } = await env.DB.prepare('SELECT * FROM admin_queries ORDER BY id').all<QueryRow>();
  return json({ queries: results ?? [] });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const me = await requireAdmin(request, env);
  if (!me) return json({ error: 'Accès refusé.' }, 403);

  const body = await request.json<{ name?: string; sqlText?: string }>().catch(() => null);
  if (!body?.name?.trim() || !body.sqlText?.trim()) return json({ error: 'Nom et requête SQL requis.' }, 400);

  const now = Date.now();
  const res = await env.DB.prepare('INSERT INTO admin_queries (name, sql_text, created_at, updated_at) VALUES (?, ?, ?, ?)')
    .bind(body.name.trim(), body.sqlText, now, now)
    .run();

  return json({ id: res.meta.last_row_id });
};
