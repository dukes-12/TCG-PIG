# Administration via la console D1

Toutes les données des joueurs vivent dans une seule base D1 (nom : `grouin`
dans le dashboard Cloudflare), table `users` — une ligne par joueur, avec
une colonne `state_json` qui contient tout : glands, cartes possédées, sacs
en poche, dos de carte, réglages. Voici les requêtes SQL pour le faire à la
main dans la console D1.

**Où** : Cloudflare dashboard → Workers & Pages → Storage & Databases → D1 →
`grouin` → onglet **Console**. Colle le SQL, Execute. (Ou `wrangler d1
execute grouin --file=...` en local si tu préfères la CLI.)

**Depuis l'appli directement** (Profil → Outils de test → Requêtes SQL,
compte "Dukes" uniquement) : tous les modèles ci-dessous sont déjà
enregistrés (voir `admin_queries` dans `schema.sql`), éditables et
exécutables en un clic — plus besoin de revenir ici copier-coller à chaque
fois. Cette page reste la référence pour comprendre ce que fait chaque
requête et en écrire de nouvelles. Le `WHERE username = '...'` est à
adapter au joueur visé avant de lancer, dans l'un ou l'autre outil.

## Modifier les glands, les cartes, le stock d'un joueur

Tout est dans le blob JSON `state_json` — on passe par les fonctions JSON de
SQLite (`json_set`, `json_extract`) plutôt que par une colonne dédiée :

```sql
-- Donner 500 glands à un joueur (remplace le solde)
UPDATE users SET state_json = json_set(state_json, '$.glands', 500)
WHERE username = 'Dukes';

-- Ajouter 500 glands au solde existant (plutôt que le remplacer)
UPDATE users SET state_json = json_set(state_json, '$.glands',
  json_extract(state_json, '$.glands') + 500)
WHERE username = 'Dukes';

-- Mettre 3 exemplaires de la carte 42
UPDATE users SET state_json = json_set(state_json, '$.owned.42', 3)
WHERE username = 'Dukes';

-- Mettre 10 sachets "basic" en poche (aussi : foire, doree)
UPDATE users SET state_json = json_set(state_json, '$.stock.basic', 10)
WHERE username = 'Dukes';
```

⚠️ Le jeu pousse l'état local du joueur vers le serveur en continu pendant
qu'il joue (sync avec un léger débounce). Si sa partie est ouverte pendant
que tu modifies sa ligne, son prochain changement local peut écraser ta
modif. Le plus sûr : modifier quand il ne joue pas, ou lui demander de
recharger l'appli juste après.

## Notifier un joueur (boîte aux lettres)

Depuis l'ajout de la table `mailbox` (voir `schema.sql`), un cadeau manuel
peut s'accompagner d'un message que le joueur voit dans Profil (icône
enveloppe, pastille de notif avec le nombre de messages non lus) — il sait
*pourquoi* son solde a changé, pas juste "ça a bougé". Ce n'est **pas**
automatique : créditer les glands (ci-dessus) et notifier sont deux
requêtes séparées, à lancer l'une après l'autre :

```sql
-- 1) créditer les glands
UPDATE users SET state_json = json_set(state_json, '$.glands',
  json_extract(state_json, '$.glands') + 500)
WHERE username = 'Dukes';

-- 2) notifier le joueur (unixepoch() est en secondes, ×1000 pour matcher
--    les timestamps en millisecondes utilisés partout ailleurs dans l'appli)
INSERT INTO mailbox (user_id, message, glands, created_at)
SELECT id, 'Cadeau de l''administrateur 🐷', 500, unixepoch() * 1000
FROM users WHERE username = 'Dukes';
```

Un message sans cadeau (annonce, etc.) fonctionne pareil avec `glands` à 0 —
la pastille "+X glands" ne s'affiche simplement pas dans la boîte aux
lettres du joueur :

```sql
INSERT INTO mailbox (user_id, message, glands, created_at)
SELECT id, 'Nouvelle Roue de la chance dans la Boutique — 3 essais par jour !', 0, unixepoch() * 1000
FROM users WHERE username = 'Dukes';
```

Pour notifier **tout le monde** d'un coup, retire le `WHERE username = ...`
du `SELECT` :

```sql
INSERT INTO mailbox (user_id, message, glands, created_at)
SELECT id, 'Maintenance ce soir 22h-23h, l'\''appli sera indisponible.', 0, unixepoch() * 1000
FROM users;
```

**Si la table `mailbox` n'existe pas encore** sur ta base (créée avant cet
ajout) : recolle tout `schema.sql` dans la console — chaque `CREATE TABLE`
utilise `IF NOT EXISTS`, donc ça ne touche pas aux tables déjà là, ça ajoute
juste `mailbox`.

## Consulter sans modifier

```sql
-- Vue d'ensemble de tous les joueurs
SELECT username, json_extract(state_json,'$.glands') AS glands,
       json_extract(state_json,'$.openedCount') AS sacs_ouverts
FROM users ORDER BY glands DESC;

-- Les messages déjà envoyés à un joueur
SELECT message, glands, datetime(mailbox.created_at/1000, 'unixepoch') AS envoye_le,
       read_at IS NOT NULL AS lu
FROM mailbox JOIN users ON users.id = mailbox.user_id
WHERE users.username = 'Dukes' ORDER BY mailbox.created_at DESC;
```
