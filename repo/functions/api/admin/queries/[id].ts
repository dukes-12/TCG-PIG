import { json, requireAdmin, type Env } from '../../../_lib/auth';

/** Modifie ou supprime une requête SQL d'administration pré-enregistrée
 *  (voir index.ts pour la liste/création). */
export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const me = await requireAdmin(request, env);
  if (!me) return json({ error: 'Accès refusé.' }, 403);

  const id = Number(params.id);
  const body = await request.json<{ name?: string; sqlText?: string }>().catch(() => null);
  if (!body || (!body.name?.trim() && !body.sqlText?.trim())) return json({ error: 'Rien à modifier.' }, 400);

  const existing = await env.DB.prepare('SELECT id FROM admin_queries WHERE id = ?').bind(id).first();
  if (!existing) return json({ error: 'Requête introuvable.' }, 404);

  const sets: string[] = [];
  const binds: unknown[] = [];
  if (body.name?.trim()) {
    sets.push('name = ?');
    binds.push(body.name.trim());
  }
  if (body.sqlText?.trim()) {
    sets.push('sql_text = ?');
    binds.push(body.sqlText);
  }
  sets.push('updated_at = ?');
  binds.push(Date.now());
  binds.push(id);

  await env.DB.prepare(`UPDATE admin_queries SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...binds)
    .run();
  return json({ ok: true });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const me = await requireAdmin(request, env);
  if (!me) return json({ error: 'Accès refusé.' }, 403);

  const id = Number(params.id);
  await env.DB.prepare('DELETE FROM admin_queries WHERE id = ?').bind(id).run();
  return json({ ok: true });
};

interface RunStatementResult {
  results: unknown[];
  meta: { changes?: number; last_row_id?: number; rows_read?: number; rows_written?: number };
}

/** Exécute la requête — le texte enregistré par défaut, ou celui fourni
 *  dans le corps (`sqlText`) pour ajuster une valeur (typiquement le
 *  `WHERE username = '...'` des modèles ADMIN.md) sans forcément
 *  sauvegarder la modif d'abord. Découpe naïve sur `;` : une "requête"
 *  peut être plusieurs instructions (ex. "créditer puis notifier"),
 *  passées à `env.DB.batch()` qui les exécute dans une transaction
 *  implicite — suffisant pour un outil réservé à un seul compte de
 *  confiance qui écrit son propre SQL, pas un vrai parseur SQL. */
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const me = await requireAdmin(request, env);
  if (!me) return json({ error: 'Accès refusé.' }, 403);

  const id = Number(params.id);
  const body = await request.json<{ sqlText?: string }>().catch(() => ({}) as { sqlText?: string });

  let sqlText = body.sqlText;
  if (!sqlText) {
    const row = await env.DB.prepare('SELECT sql_text FROM admin_queries WHERE id = ?').bind(id).first<{ sql_text: string }>();
    if (!row) return json({ error: 'Requête introuvable.' }, 404);
    sqlText = row.sql_text;
  }

  const statements = sqlText
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!statements.length) return json({ error: 'Requête vide.' }, 400);

  try {
    const results = await env.DB.batch(statements.map((s) => env.DB.prepare(s)));
    const out: RunStatementResult[] = results.map((r) => ({
      results: r.results ?? [],
      meta: { changes: r.meta.changes, last_row_id: r.meta.last_row_id, rows_read: r.meta.rows_read, rows_written: r.meta.rows_written },
    }));
    return json({ results: out });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erreur SQL.' }, 400);
  }
};
