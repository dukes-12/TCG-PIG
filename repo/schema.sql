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
