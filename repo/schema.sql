-- Comptes, sessions et échanges — Cloudflare D1 (SQLite).
-- À exécuter une fois : Cloudflare dashboard → D1 → ta base → Console →
-- coller ce fichier, ou `wrangler d1 execute <nom-de-la-base> --file=./schema.sql`.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  -- Le même blob JSON que partialize() produit côté client (owned, glands,
  -- stock, dos, réglages…) — le serveur ne rejoue aucune règle de jeu, il
  -- stocke l'état tel que le client le lui envoie. Seuls les échanges
  -- touchent ce blob côté serveur (transfert de cartes entre deux comptes).
  state_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- { "<cardId>": qty } de chaque côté.
  offer_json TEXT NOT NULL,
  request_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | declined | cancelled
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_trades_from ON trades(from_user_id);
CREATE INDEX IF NOT EXISTS idx_trades_to ON trades(to_user_id);

-- Combats — voir IDEES_AMIS_COMBAT.md pour la conception et
-- functions/_lib/battle.ts pour le calcul de puissance/résolution.
-- Asynchrone, même forme que `trades` : le défieur propose son équipe,
-- l'adversaire compose la sienne pour répondre, le résultat est calculé et
-- figé au moment où il valide.
CREATE TABLE IF NOT EXISTS battles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenger_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opponent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- [{ "cardId": n, "holo": bool }] × 5, dans l'ordre choisi par chaque
  -- joueur (l'ordre fixe les duels slot à slot). `opponent_team_json` et
  -- `result_json` restent NULL tant que l'adversaire n'a pas répondu.
  challenger_team_json TEXT NOT NULL,
  opponent_team_json TEXT,
  result_json TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | completed | declined | cancelled
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_battles_challenger ON battles(challenger_id);
CREATE INDEX IF NOT EXISTS idx_battles_opponent ON battles(opponent_id);

-- Boîte aux lettres : notifications lues côté joueur dans Profil. Pensée pour
-- les cadeaux manuels via la console D1 (voir ADMIN.md) — quand tu crédites
-- des glands à la main, le joueur voit désormais *pourquoi* son solde a
-- changé plutôt qu'un chiffre qui bouge sans explication. `glands` à 0 pour
-- un message sans cadeau (annonce, etc.).
CREATE TABLE IF NOT EXISTS mailbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  glands INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  read_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_mailbox_user ON mailbox(user_id);

-- Requêtes SQL d'administration, pré-enregistrées et modifiables depuis
-- l'appli (Profil → Outils de test, compte "Dukes" uniquement — voir
-- functions/api/admin/queries) : jusqu'ici les opérations manuelles
-- décrites dans ADMIN.md se faisaient à la main dans la console D1 du
-- dashboard Cloudflare, copiées-collées à chaque fois. Ici elles sont
-- stockées en base, donc ajoutables/modifiables sans déploiement.
CREATE TABLE IF NOT EXISTS admin_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sql_text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Amorce avec les modèles déjà documentés dans ADMIN.md — le `WHERE
-- username = '...'` est à remplacer par le joueur visé avant chaque
-- exécution (l'outil permet d'éditer le texte juste avant de lancer, sans
-- forcément sauvegarder la modif). `INSERT OR IGNORE` sur l'id explicite :
-- recoller ce fichier dans la console ne duplique pas les entrées.
INSERT OR IGNORE INTO admin_queries (id, name, sql_text, created_at, updated_at) VALUES
  (1, 'Remplacer les glands d''un joueur',
   'UPDATE users SET state_json = json_set(state_json, ''$.glands'', 500) WHERE username = ''Dukes''',
   0, 0),
  (2, 'Ajouter des glands au solde',
   'UPDATE users SET state_json = json_set(state_json, ''$.glands'', json_extract(state_json, ''$.glands'') + 500) WHERE username = ''Dukes''',
   0, 0),
  (3, 'Fixer le nombre d''exemplaires d''une carte',
   'UPDATE users SET state_json = json_set(state_json, ''$.owned.42'', 3) WHERE username = ''Dukes''',
   0, 0),
  (4, 'Fixer le stock d''un type de sac',
   'UPDATE users SET state_json = json_set(state_json, ''$.stock.basic'', 10) WHERE username = ''Dukes''',
   0, 0),
  (5, 'Créditer des glands + notifier (boîte aux lettres)',
   'UPDATE users SET state_json = json_set(state_json, ''$.glands'', json_extract(state_json, ''$.glands'') + 500) WHERE username = ''Dukes'';
INSERT INTO mailbox (user_id, message, glands, created_at) SELECT id, ''Cadeau de l''''administrateur 🐷'', 500, unixepoch() * 1000 FROM users WHERE username = ''Dukes''',
   0, 0),
  (6, 'Annonce sans cadeau, à un joueur',
   'INSERT INTO mailbox (user_id, message, glands, created_at) SELECT id, ''Nouvelle Roue de la chance dans la Boutique — 3 essais par jour !'', 0, unixepoch() * 1000 FROM users WHERE username = ''Dukes''',
   0, 0),
  (7, 'Annonce à tout le monde',
   'INSERT INTO mailbox (user_id, message, glands, created_at) SELECT id, ''Maintenance ce soir 22h-23h, l''''appli sera indisponible.'', 0, unixepoch() * 1000 FROM users',
   0, 0),
  (8, 'Vue d''ensemble des joueurs',
   'SELECT username, json_extract(state_json,''$.glands'') AS glands, json_extract(state_json,''$.openedCount'') AS sacs_ouverts FROM users ORDER BY glands DESC',
   0, 0),
  (9, 'Messages déjà envoyés à un joueur',
   'SELECT message, glands, datetime(mailbox.created_at/1000, ''unixepoch'') AS envoye_le, read_at IS NOT NULL AS lu FROM mailbox JOIN users ON users.id = mailbox.user_id WHERE users.username = ''Dukes'' ORDER BY mailbox.created_at DESC',
   0, 0);
