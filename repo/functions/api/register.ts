import { createSession, hashPin, json, randomSalt, type Env } from '../_lib/auth';

const USERNAME_RE = /^[a-zA-Z0-9_-]{2,20}$/;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request
    .json<{ username?: string; pin?: string; localState?: unknown }>()
    .catch(() => null);
  if (!body?.username || !body?.pin) return json({ error: 'Pseudo et code requis.' }, 400);

  const username = body.username.trim();
  if (!USERNAME_RE.test(username)) {
    return json({ error: 'Pseudo : 2 à 20 lettres/chiffres/tirets, sans espace.' }, 400);
  }
  if (!/^\d{4}$/.test(body.pin)) return json({ error: 'Le code doit faire 4 chiffres.' }, 400);

  const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (existing) return json({ error: 'Ce pseudo est déjà pris.' }, 409);

  const salt = randomSalt();
  const pinHash = await hashPin(body.pin, salt);
  const now = Date.now();
  // La collection déjà présente sur cet appareil (localStorage) devient
  // l'état de départ du compte — c'est le client qui l'envoie ici.
  const stateJson = JSON.stringify(body.localState ?? {});

  const res = await env.DB.prepare(
    'INSERT INTO users (username, pin_hash, pin_salt, state_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(username, pinHash, salt, stateJson, now, now)
    .run();
  const userId = res.meta.last_row_id as number;

  const token = await createSession(env, userId);
  return json({ token, username, state: JSON.parse(stateJson) });
};
