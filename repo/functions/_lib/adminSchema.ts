import type { Env } from './auth';

/** Création + amorce automatiques de la table `admin_queries`, jouées à la
 *  volée par les routes /api/admin/* avant de la lire ou de l'écrire.
 *
 *  Pourquoi : ajouter une table à D1 demandait jusqu'ici de recoller
 *  `schema.sql` à la main dans la console du dashboard Cloudflare — une
 *  étape manuelle facile à oublier, qui laissait le panneau planter sur un
 *  « no such table » sans rien dire d'utile. Tout est idempotent
 *  (`CREATE TABLE IF NOT EXISTS`, `INSERT OR IGNORE` sur des id explicites),
 *  donc rejouable sans risque : la première ouverture du panneau après
 *  déploiement crée la table et ses modèles, les suivantes ne font rien.
 *
 *  C'est ICI la source de vérité des 9 modèles (plus dans `schema.sql`, qui
 *  ne garde que la structure) — sinon les deux finissaient par diverger. */

/** Structure — identique à ce que décrit `schema.sql`. */
const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS admin_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sql_text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)`;

/** Les modèles documentés dans ADMIN.md. Le `WHERE username = 'Dukes'` est
 *  à remplacer par le joueur visé avant chaque exécution (le panneau permet
 *  d'éditer le texte juste avant de lancer, sans forcément sauvegarder).
 *  Passés en paramètres liés (`bind`) et non concaténés : aucune gymnastique
 *  d'échappement de quotes ici, contrairement à la version SQL pure. */
const SEED: { id: number; name: string; sql: string }[] = [
  {
    id: 1,
    name: "Remplacer les glands d'un joueur",
    sql: "UPDATE users SET state_json = json_set(state_json, '$.glands', 500) WHERE username = 'Dukes'",
  },
  {
    id: 2,
    name: 'Ajouter des glands au solde',
    sql: "UPDATE users SET state_json = json_set(state_json, '$.glands', json_extract(state_json, '$.glands') + 500) WHERE username = 'Dukes'",
  },
  {
    id: 3,
    name: "Fixer le nombre d'exemplaires d'une carte",
    sql: "UPDATE users SET state_json = json_set(state_json, '$.owned.42', 3) WHERE username = 'Dukes'",
  },
  {
    id: 4,
    name: "Fixer le stock d'un type de sac",
    sql: "UPDATE users SET state_json = json_set(state_json, '$.stock.basic', 10) WHERE username = 'Dukes'",
  },
  {
    id: 5,
    name: 'Créditer des glands + notifier (boîte aux lettres)',
    // Deux instructions séparées par `;` — découpées et jouées en batch
    // (transaction) par la route d'exécution, voir queries/[id].ts.
    sql:
      "UPDATE users SET state_json = json_set(state_json, '$.glands', json_extract(state_json, '$.glands') + 500) WHERE username = 'Dukes';\n" +
      "INSERT INTO mailbox (user_id, message, glands, created_at) SELECT id, 'Cadeau de l''administrateur 🐷', 500, unixepoch() * 1000 FROM users WHERE username = 'Dukes'",
  },
  {
    id: 6,
    name: 'Annonce sans cadeau, à un joueur',
    sql: "INSERT INTO mailbox (user_id, message, glands, created_at) SELECT id, 'Nouvelle Roue de la chance dans la Boutique — 3 essais par jour !', 0, unixepoch() * 1000 FROM users WHERE username = 'Dukes'",
  },
  {
    id: 7,
    name: 'Annonce à tout le monde',
    sql: "INSERT INTO mailbox (user_id, message, glands, created_at) SELECT id, 'Maintenance ce soir 22h-23h, l''appli sera indisponible.', 0, unixepoch() * 1000 FROM users",
  },
  {
    id: 8,
    name: "Vue d'ensemble des joueurs",
    sql: "SELECT username, json_extract(state_json,'$.glands') AS glands, json_extract(state_json,'$.openedCount') AS sacs_ouverts FROM users ORDER BY glands DESC",
  },
  {
    id: 9,
    name: 'Messages déjà envoyés à un joueur',
    // `mailbox.created_at` préfixé : `mailbox` et `users` ont chacune une
    // colonne `created_at`, sans préfixe la requête est ambiguë et plante.
    sql: "SELECT message, glands, datetime(mailbox.created_at/1000, 'unixepoch') AS envoye_le, read_at IS NOT NULL AS lu FROM mailbox JOIN users ON users.id = mailbox.user_id WHERE users.username = 'Dukes' ORDER BY mailbox.created_at DESC",
  },
];

/** Court-circuit par isolat : une fois la table créée, inutile de rejouer
 *  les 10 instructions à chaque requête admin. Purement une optimisation —
 *  un isolat recyclé rejouera le tout, ce qui reste sans effet. */
let ensured = false;

export async function ensureAdminQueries(env: Env): Promise<void> {
  if (ensured) return;
  const statements = [
    env.DB.prepare(CREATE_TABLE),
    ...SEED.map((q) =>
      env.DB.prepare('INSERT OR IGNORE INTO admin_queries (id, name, sql_text, created_at, updated_at) VALUES (?, ?, ?, 0, 0)').bind(q.id, q.name, q.sql),
    ),
  ];
  await env.DB.batch(statements);
  ensured = true;
}
