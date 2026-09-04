# Amis & combat — proposition de conception

Document de conception original. Objectif : poser le plan (modèle de
données, écrans, règles) avant de partir coder quoi que ce soit, puisque ça
change la nature de l'app — de 100 % locale/hors-ligne à un vrai backend
avec comptes utilisateurs.

> **Statut** : Comptes et amis (section 1 et une bonne partie de la 2) sont
> en place depuis un moment. **Le combat (section 3) est maintenant
> implémenté** — écran `/battles` (`BattlesScreen.tsx`), résolution côté
> serveur dans `functions/_lib/battle.ts`, table `battles` (`schema.sql`).
> Version retenue, "Niveau 1 amélioré" par rapport à ce que décrit ce
> document plus bas :
> - Puissance par rareté doublée à chaque palier (Commune=1 … Mythique=32),
>   **+50% si la carte est en holo** (mécanique ajoutée après ce document,
>   voir `HOLO_CHANCE`) — pas dans le barème d'origine ci-dessous.
> - **Bonus de synergie** : 3+ cartes de la même catégorie dans l'équipe →
>   +15% de puissance totale — pas dans la proposition d'origine, ajouté
>   pour récompenser une équipe "à thème" plutôt qu'un calcul froid.
> - Résolution en **5 duels slot à slot** (pas une simple somme comparée) :
>   chaque camp choisit l'ordre de ses 5 cartes, un peu de variance (±10%)
>   par duel tirée d'une graine liée à l'id du combat (reproductible,
>   calculée côté serveur), le camp qui gagne le plus de manches l'emporte
>   (égalité de manches → puissance totale qui départage).
> - **Asynchrone**, exactement le schéma envisagé plus bas (table dédiée,
>   même modèle que `trades`) — pas de temps réel.
> - Question ouverte tranchée : l'équipe adverse n'est **pas** montrée avant
>   de composer la sienne — connue seulement après résolution.
> - Carte secrète explicitement exclue des équipes.
>
> Le reste de ce document (schéma Postgres/Supabase, phasage, questions
> restées ouvertes) garde sa valeur de référence historique mais ne
> correspond plus à l'implémentation réelle (Cloudflare D1, pas Supabase —
> voir la note plus bas, déjà présente avant ce statut).

> **Note d'adaptation à cette branche** : ce document a été écrit à l'origine
> sur une base sans backend, d'où la recommandation Supabase. Cette branche a
> depuis son propre backend (Cloudflare Pages Functions + D1, comptes
> pseudo + code PIN — voir `LISEZ-MOI.md`) et un système d'échanges déjà en
> place (`functions/api/trades`, écran Échanges). La section **1. Comptes**
> ci-dessous est donc déjà largement couverte par l'existant ; ne garder de
> ce document que **2. Système d'ami** et **3. Combat**, à rebrancher sur les
> tables `users`/`sessions` de `schema.sql` plutôt que sur du Supabase — même
> logique (profils, demandes, historique), juste porté sur l'infra déjà en
> place ici.

## Pourquoi ça change tout

Aujourd'hui, `Ma bassecour` vit entièrement dans le `localStorage` du
téléphone — aucun serveur, aucun compte, aucune notion de "joueur" au-delà
d'un appareil. Un système d'amis et un combat demandent, au minimum :

- un **compte** par joueur (pour identifier quelqu'un au-delà de son propre
  téléphone) ;
- un **backend** où la collection de chacun est visible par quelqu'un
  d'autre — `localStorage` seul ne suffit plus ;
- une vraie **migration** : au premier login, la collection locale
  existante doit être envoyée au serveur, qui devient ensuite la source de
  vérité (le local reste un cache/mode hors-ligne).

Recommandation technique : **Supabase** (Postgres + Auth + Realtime),
disponible directement dans les outils de développement utilisés pour cette
app — pas de serveur à gérer soi-même, tier gratuit large pour démarrer.

---

## 1. Comptes

- **Auth Supabase**, méthode à trancher :
  - *Email + lien magique* — pas de mot de passe à retenir, standard et
    simple à intégrer, mais demande une adresse email.
  - *Email + mot de passe* — plus classique, un peu plus de friction à
    l'inscription.
  - *Anonyme + pseudo* — le plus proche de l'expérience actuelle (zéro
    friction, pas d'email), mais un compte "anonyme" perdu = collection
    perdue si l'appareil est réinitialisé ; à réserver si on accepte ce
    compromis pour la v1 et qu'on ajoute la vraie auth plus tard.
- **Pseudo public** + **code ami** court (ex. `GRK-7F3K`) affiché dans le
  Profil — sert à se trouver sans exposer l'email.
- **Migration au premier login** : upload de `owned` / `glands` /
  `openedCount` locaux vers le serveur (une fois, avec confirmation —
  jamais d'écrasement silencieux si un compte a déjà une collection
  serveur, ex. reconnexion sur un nouvel appareil).

## 2. Système d'ami

- Nouvel onglet (ou sous-écran de Profil) **Amis** : recherche par pseudo
  ou code ami, envoi de demande, liste des demandes reçues/envoyées, liste
  d'amis.
- Fiche d'un ami : sa collection (lecture seule, même présentation que
  l'écran Collection), ses stats de profil (cartes uniques, complétion,
  meilleure trouvaille) — bon contenu à lui seul, indépendamment du combat.
- Modération minimale à prévoir : bloquer un ami, signaler un pseudo.

### Schéma (Postgres / Supabase, esquisse)

```sql
profiles (
  id uuid primary key references auth.users,
  handle text unique,        -- pseudo affiché
  friend_code text unique,   -- code court partageable
  created_at timestamptz
)

friendships (
  id uuid primary key,
  requester_id uuid references profiles(id),
  addressee_id uuid references profiles(id),
  status text, -- 'pending' | 'accepted' | 'blocked'
  created_at timestamptz
)

collections (
  profile_id uuid references profiles(id),
  card_id int,
  count int,
  primary key (profile_id, card_id)
)
```

## 3. Combat

Aucune carte n'a de stats de combat aujourd'hui (juste nom / image / rareté
/ type). Deux niveaux possibles, du plus simple au plus profond :

### Niveau 1 — score de rareté (recommandé pour une v1)

- Chaque joueur compose une **équipe de 5 cartes** parmi sa collection.
- Score = somme d'une valeur par carte dérivée de sa rareté (ex. Commune=1,
  Peu commune=2, Rare=4, Épique=8, Légendaire=16, Mythique=32 — une échelle
  à trancher, pas forcément linéaire).
- Le score le plus haut gagne. Égalité → carte la plus rare de chaque
  équipe départage.
- Zéro nouvelle donnée par carte, ça marche avec le modèle existant tel
  quel — le plus rapide à livrer.

### Niveau 2 — vraies stats de combat (évolution possible)

- Attribuer à chaque carte des stats (attaque / défense, ou une seule
  valeur "puissance") dérivées de sa rareté + un multiplicateur par type,
  avec un vrai résolveur tour par tour (chaque carte de l'équipe A affronte
  une carte de l'équipe B, etc.).
- Plus satisfaisant comme jeu, mais demande : équilibrage des stats, une
  UI de combat dédiée (pas juste un score), et probablement des
  ajustements dans `cards.json` (un champ stats par carte).

### Synchrone vs asynchrone

- **Asynchrone (recommandé pour démarrer)** : A envoie un défi avec son
  équipe, B reçoit une notification, compose la sienne, le résultat tombe
  dès que B valide. Pas de contrainte de présence simultanée, robuste,
  simple à fiabiliser avec juste une table Postgres (pas de temps réel
  nécessaire).
- **Synchrone (PvP en direct)** : demande Supabase Realtime ou WebSockets,
  gestion de la présence, des déconnexions, du timing — plus engageant
  mais beaucoup plus de travail et de surface de bugs. À envisager une fois
  la version asynchrone stable et utilisée.

### Schéma (esquisse, niveau 1)

```sql
battles (
  id uuid primary key,
  challenger_id uuid references profiles(id),
  opponent_id uuid references profiles(id),
  challenger_team int[5],   -- card ids
  opponent_team int[5],     -- rempli quand l'adversaire répond
  challenger_score int,
  opponent_score int,
  status text, -- 'pending' | 'completed'
  created_at timestamptz,
  resolved_at timestamptz
)
```

---

## Nouveaux écrans nécessaires

- **Amis** : recherche, demandes, liste.
- **Fiche d'un ami** : sa collection en lecture seule.
- **Composer son équipe** : sélection de 5 cartes parmi sa collection.
- **Défier un ami** : depuis sa fiche, choix "défier".
- **Résultat de combat** : équipes des deux côtés, score, victoire/défaite.
- **Historique des combats** (liste des défis en cours / terminés).

## Phasage suggéré

1. Comptes + migration de la collection locale.
2. Amis (recherche, demande, fiche en lecture seule) — déjà un vrai apport
   sans combat.
3. Combat asynchrone, score simple (niveau 1).
4. Selon l'usage réel : stats de combat plus profondes (niveau 2), ou
   combat en direct (Realtime).

## Questions à trancher avant de coder

1. Méthode d'auth (email/lien magique, email/mot de passe, ou anonyme) ?
2. Taille d'équipe (5 cartes ? paramétrable ?) et barème de score par
   rareté ?
3. Un joueur peut-il défier plusieurs fois le même ami sans limite, ou
   cooldown ?
4. Doit-on afficher aux deux joueurs les cartes de l'adversaire *avant* de
   composer sa propre équipe (risque de "contre-pick") ou seulement après
   résolution ?
5. Budget/hébergement : le tier gratuit Supabase suffit pour démarrer, mais
   à qui appartient le projet Supabase (compte perso, facturation) ?
