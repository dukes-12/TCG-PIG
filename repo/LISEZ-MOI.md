# Comptes, sync multi-appareils et échanges

Fonctionnalité majeure : le jeu passe d'un stockage 100% local à des
**comptes** (pseudo + code à 4 chiffres) sur **Cloudflare Pages Functions +
D1** (base SQLite gratuite, déjà dans ton offre Cloudflare). Chaque compte
synchronise sa collection entre appareils, et deux comptes peuvent
s'échanger des doublons.

Choix retenus (d'après tes réponses) :
- **Auth** : pseudo + PIN 4 chiffres, pas d'email. Adapté à un petit groupe
  d'amis — pas de récupération de mot de passe, pas de limitation de
  tentatives sur le PIN (voir "Limites" plus bas).
- **Visibilité** : voir la collection d'un autre passe uniquement par son
  profil (recherche par pseudo dans Profil), pas de classement ni de liste
  publique des cartes.
- **Échanges** : proposition directe (tu choisis tes cartes à donner + celles
  demandées, l'autre accepte/refuse) — pas de marché public.
- **Cartes échangeables** : uniquement les doublons, jamais le dernier
  exemplaire — vérifié côté serveur, pas seulement dans l'interface.
- **Migration** : à la création d'un compte, la collection déjà présente sur
  l'appareil (l'ancien `localStorage`) devient le point de départ du compte.

## 1. Créer la base D1 (une fois, dans le dashboard Cloudflare)

1. Cloudflare dashboard → **Workers & Pages** → **D1 SQL Database** → **Create
   database**. Nom libre, par ex. `grouin`.
2. Dans la base créée → **Console** → colle le contenu de `schema.sql`
   (fourni ici) → Execute. Ça crée les tables `users`, `sessions`, `trades`.
3. Retourne sur ton projet Pages **TCG-PIG** → **Settings** → **Functions**
   → **D1 database bindings** → **Add binding** :
   - Variable name : **`DB`** (exactement — c'est le nom que le code attend)
   - D1 database : la base créée à l'étape 1
4. Redéploie (un nouveau commit suffit, ou "Retry deployment") pour que le
   binding soit pris en compte.

Pas besoin de `wrangler.toml`/`wrangler deploy` pour ça — les fonctions sous
`functions/` sont détectées et déployées automatiquement par Cloudflare
Pages à chaque push, exactement comme le reste du site.

## 2. Fichiers à déposer

| Fichier | Destination | Nature |
| --- | --- | --- |
| `schema.sql` | `repo/schema.sql` | **nouveau** — à exécuter dans la console D1, pas à builder |
| `functions/_lib/auth.ts` | `repo/functions/_lib/auth.ts` | **nouveau** |
| `functions/api/register.ts` | `repo/functions/api/register.ts` | **nouveau** |
| `functions/api/login.ts` | `repo/functions/api/login.ts` | **nouveau** |
| `functions/api/state.ts` | `repo/functions/api/state.ts` | **nouveau** |
| `functions/api/players.ts` | `repo/functions/api/players.ts` | **nouveau** |
| `functions/api/profile/[username].ts` | `repo/functions/api/profile/[username].ts` | **nouveau** |
| `functions/api/trades/index.ts` | `repo/functions/api/trades/index.ts` | **nouveau** |
| `functions/api/trades/[id].ts` | `repo/functions/api/trades/[id].ts` | **nouveau** |
| `src/lib/api.ts` | `repo/src/lib/api.ts` | **nouveau** |
| `src/screens/AuthScreen.tsx` | `repo/src/screens/AuthScreen.tsx` | **nouveau** |
| `src/screens/TradesScreen.tsx` | `repo/src/screens/TradesScreen.tsx` | **nouveau** |
| `src/screens/PlayerProfileScreen.tsx` | `repo/src/screens/PlayerProfileScreen.tsx` | **nouveau** |
| `src/components/icons.tsx` | `repo/src/components/icons.tsx` | remplace — ajoute `TradeIcon` |
| `src/components/TabBar.tsx` | `repo/src/components/TabBar.tsx` | remplace — 6ᵉ onglet Échanges |
| `src/screens/ProfileScreen.tsx` | `repo/src/screens/ProfileScreen.tsx` | remplace — recherche joueur + déconnexion |
| `src/App.tsx` | `repo/src/App.tsx` | remplace — auth gate + routes |
| `src/state/store.ts` | `repo/src/state/store.ts` | remplace — sync compte |
| `src/types.ts` | `repo/src/types.ts` | remplace — `TabKey` a `'trades'` |

Après avoir déposé tous ces fichiers : `npm run build`, commit, push.

## Comment ça marche

**Connexion** : `AuthScreen` bloque tout le reste de l'app tant qu'aucune
session n'est active. Inscription ou connexion renvoient un jeton, stocké
dans `localStorage` (`grouin-token`, séparé de la sauvegarde de jeu). Ce
jeton est envoyé en `Authorization: Bearer …` sur chaque appel `/api/*`.

**Synchro** : l'état persistable (collection, glands, stock, dos, réglages —
`persistedSlice()` dans `store.ts`) est renvoyé au serveur avec un léger
débounce (800 ms) à chaque changement, via un `useStore.subscribe`. Il n'y a
plus de logique de jeu côté serveur pour ça : le serveur stocke le blob tel
que le client le lui donne — c'est délibéré, ça évite de dupliquer les
règles (tirage, prix, etc.) côté Worker. Seuls les **échanges** touchent ce
blob depuis le serveur, puisqu'ils doivent modifier deux comptes à la fois
de façon atomique.

**Migration** : à l'inscription, le store lit l'ancienne sauvegarde
`localStorage` (`grouin-save-v1`, écrite par le zustand/persist d'avant les
comptes) et l'envoie comme état de départ. Un joueur qui avait déjà une
collection avant ce patch la retrouve donc telle quelle sur son compte tout
neuf.

**Visibilité** : `GET /api/players` ne renvoie que les pseudos (pour peupler
le sélecteur d'échange et la liste dans Profil) — jamais les collections.
Voir les cartes de quelqu'un passe toujours par `GET /api/profile/:username`,
qui ne renvoie que `owned` + `openedCount`, jamais les glands ni les
réglages.

**Échanges** : `TradesScreen` propose un flux en trois étapes — choisir un
joueur, cocher ses propres doublons à donner, cocher les doublons de l'autre
à demander. Le serveur **revérifie tout, deux fois** : à la proposition
(les deux collections doivent avoir les cartes en doublon) et à
l'acceptation (elles ont pu changer depuis — une carte recyclée entre
temps, par exemple). L'acceptation transfère les deux côtés en un seul
batch D1 pour ne jamais laisser un compte débité sans que l'autre soit
crédité.

## Limites à connaître

- **PIN à 4 chiffres, pas de limitation de tentatives.** Adapté à un jeu
  entre amis qui se font confiance — pas à un usage grand public. Si
  quelqu'un d'extérieur au groupe peut deviner un pseudo, il peut essayer
  les 10 000 codes sans être bloqué. Dis-moi si tu veux que j'ajoute une
  limite de tentatives (facile à faire : compter les échecs par pseudo dans
  `sessions` ou une table dédiée).
- **Pas de récupération de compte.** Code oublié = compte perdu (il faudrait
  supprimer la ligne dans D1 à la main). Pas de "mot de passe oublié" avec un
  simple PIN sans email.
- **La sauvegarde locale continue d'exister en parallèle** (même clé
  `grouin-save-v1`) comme cache offline-first — elle se resynchronise avec
  le compte à la reconnexion, mais ce n'est plus elle qui protège contre la
  perte de données : c'est D1.
