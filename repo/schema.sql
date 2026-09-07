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
--
-- Table ET modèles de départ sont désormais créés AUTOMATIQUEMENT par
-- l'appli à la première ouverture du panneau (voir
-- functions/_lib/adminSchema.ts, `ensureAdminQueries`) : plus besoin de
-- recoller ce fichier dans la console D1 après un déploiement. Le CREATE
-- ci-dessous reste pour documenter la structure et pour repartir d'une
-- base vierge ; l'amorce des 9 modèles, elle, ne vit plus qu'en TypeScript
-- (une seule source de vérité, les deux copies finissaient par diverger).
CREATE TABLE IF NOT EXISTS admin_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sql_text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
