import { createSession, hashPin, json, type Env } from '../_lib/auth';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<{ username?: string; pin?: string }>().catch(() => null);
  if (!body?.username || !body?.pin) return json({ error: 'Pseudo et code requis.' }, 400);

  const user = await env.DB.prepare(
    'SELECT id, username, pin_hash, pin_salt, state_json FROM users WHERE username = ?',
  )
    .bind(body.username.trim())
    .first<{ id: number; username: string; pin_hash: string; pin_salt: string; state_json: string }>();
  if (!user) return json({ error: 'Pseudo ou code incorrect.' }, 401);

  const hash = await hashPin(body.pin, user.pin_salt);
  if (hash !== user.pin_hash) return json({ error: 'Pseudo ou code incorrect.' }, 401);

  const token = await createSession(env, user.id);
  return json({ token, username: user.username, state: JSON.parse(user.state_json || '{}') });
};
