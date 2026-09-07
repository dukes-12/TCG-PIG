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
> **Second passage** (retour : "le système est trop simple, il suffit de
> prendre les meilleures cartes qu'on a et on gagne") — deux mécaniques
> stratégiques ajoutées à la résolution ci-dessus, dans
> `functions/_lib/battle.ts` (autoritaire) et son miroir client
> `src/lib/battle.ts` (mode bot) :
> - **Triangle de camps** : les ~28 catégories de cartes sont regroupées en
>   3 camps thématiques (Fiction, Pouvoir, Culture) façon
>   pierre-papier-ciseaux.
> - **Momentum** : gagner un duel donne un bonus d'ATTAQUE à la carte
>   suivante de la *même* équipe pour le duel suivant — l'ordre dans lequel
>   on aligne ses 5 cartes compte, pas seulement la force brute des cartes.
> - Affiché dans `BattleResultOverlay` (icône de camp, 💫 si avantage, 🔥 si
>   lancée) et dans le composeur d'équipe de `BattlesScreen` (icône de camp
>   par carte).
>
> Proposions A/B/C également implémentées à cette occasion :
> - **A** — victoire = glands gagnés, scalés sur la puissance de l'équipe
>   *vaincue* (pas la sienne) pour ne pas récompenser le fait de défier en
>   boucle un adversaire plus faible ; rien en cas d'égalité.
> - **B** — pastille de notification sur le bouton ⚔️ de Profil pour les
>   défis entrants en attente (même mécanique que la pastille Échanges).
> - **C** — équipe favorite : un bouton ★ dans le composeur sauvegarde la
>   composition actuelle, reproposée d'office au prochain défi si les 5
>   cartes sont toujours possédées.
>
> **Troisième passage** ("le système est trop simple" restait vrai à
> puissance égale — un tirage au sort pur — et un déséquilibre des camps
> était réel) — deux changements plus profonds :
> - **ATTAQUE et DÉFENSE remplacent la puissance unique**. Chaque carte a
>   maintenant deux stats, dérivées **indépendamment** l'une de l'autre
>   (±35% de bruit chacune autour de sa puissance de rareté habituelle,
>   tiré une fois pour toutes par un hash déterministe de son id — jamais
>   stocké, jamais re-tiré, recalculé à la volée comme l'ancienne
>   `cardPower`). Le duel se résout en "percée" plutôt qu'en simple
>   comparaison : l'ATTAQUE d'un camp doit dépasser la DÉFENSE d'en face
>   pour "percer" ; si les deux percent, la plus grosse marge gagne ; si
>   aucune ne perce, égalité. **Indépendamment**, pas une somme fixe par
>   carte : sinon le profil attaque/défense n'aurait mathématiquement aucun
>   effet sur qui gagne entre deux cartes de même rareté (démontré par le
>   calcul — toute formule symétrique se ramène alors à comparer les
>   totaux, qui sont égaux par construction). Vérifié par simulation sur le
>   vrai catalogue : à rareté égale, le profil seul tranche désormais un
>   duel dans la quasi-totalité des cas (contre un pur tirage au sort par
>   jitter avant ce passage), tout en gardant la rareté décisive au global
>   (rareté+1 bat rareté quasi systématiquement). Le camp et le momentum
>   s'appliquent maintenant à l'ATTAQUE uniquement (un avantage ou une
>   lancée fait taper plus fort, pas devenir plus solide) — recalibrés en
>   conséquence (`CAMP_ADVANTAGE_MULTIPLIER = 3.5`, `MOMENTUM_MULTIPLIER =
>   1.3`) pour retrouver les mêmes garanties qu'avant (quasi 100% à rareté
>   égale, ~59% face à un palier au-dessus, ~0% à deux paliers ou plus).
> - **Rééquilibrage du triangle de camps** : Fiction s'est révélé être en
>   moyenne le camp le plus fort (puissance moyenne 5,11 sur ses 107
>   cartes, contre 4,42 pour Culture et 3,61 pour Pouvoir, le plus faible),
>   et le premier sens retenu (Fiction bat Pouvoir) cumulait l'écart de
>   puissance et l'avantage de camp sur le même camp déjà en difficulté.
>   Sens inversé : **Pouvoir bat Fiction bat Culture bat Pouvoir** — chaque
>   camp n'encaisse plus qu'un seul écart de puissance "naturel" dans le
>   même sens au lieu de deux qui se cumulaient.
> - Affiché dans `BattleResultOverlay` (⚔️ATTAQUE, 🛡️DÉFENSE, 💥 si la carte
>   a percé la défense adverse) et dans le composeur (`BattlesScreen`, badge
>   ⚔️/🛡️ sur chaque carte de la sélection et de l'équipe en cours).
>
> **Quatrième passage** ("il faut un mode attaque et défense et chaque
> joueur a un nombre de PV, le combat se déroule progressivement... augmente
> aussi le niveau des bots") — le combat "5 duels slot à slot, résolu
> d'un coup" des passages précédents devient un vrai combat à **points de
> vie**, en **plusieurs tours** :
> - **Chaque équipe a une jauge de PV commune** (pas par carte) : somme de
>   la DÉFENSE *de base* de ses 5 cartes ×4, +15% si bonus de synergie. Basé
>   sur la défense *de base*, pas ajustée par la posture — sinon choisir
>   "défense" gonflerait à la fois les PV et l'encaissement, une stratégie
>   strictement dominante (vérifié par simulation : 68% de victoires sans ce
>   découplage, ~50% avec).
> - **Posture ⚔️ Attaque / 🛡️ Défense**, choisie PAR CARTE à la composition
>   de l'équipe (`TeamSlot.stance`) — reste asynchrone, pas de décision en
>   direct pendant le combat. Attaque : ATTAQUE ×1,15, DÉFENSE ×0,85.
>   Défense : ATTAQUE ×0,88, DÉFENSE ×1,18. Calibré par simulation pour un
>   vrai choix (~50/50 entre une équipe "tout attaque" et "tout défense" à
>   profil de cartes égal par ailleurs), pas une posture strictement
>   meilleure.
> - **Résolution en tours** : les 5 duels (carte *i* contre carte *i*)
>   tournent en boucle — carte 1, carte 2, …, carte 5, puis on reboucle sur
>   la carte 1 — chaque tour inflige des dégâts des deux côtés (`max(1,
>   ATTAQUE − DÉFENSE d'en face)`, au moins 1 point de dégâts pour ne jamais
>   staller), jusqu'à ce qu'une jauge de PV tombe à 0. Une dizaine à une
>   cinquantaine de tours pour un combat typique (vérifié par simulation),
>   pas un résultat instantané.
> - **Camp et momentum recalibrés pour s'appliquer À CHAQUE TOUR** où le
>   duel concerné agit (pas une fois) — `CAMP_ADVANTAGE_MULTIPLIER` 3,5 → 1,4
>   et `MOMENTUM_MULTIPLIER` 1,3 → 1,15 : un avantage modeste qui se répète
>   une dizaine de fois pèse déjà lourd sur la durée d'un combat (~70% de
>   victoires avec 1 seul duel avantagé sur 5, vérifié par simulation).
>   Momentum redéfini pour ce modèle : le duel *i* garde en mémoire s'il a
>   infligé plus de dégâts qu'il n'en a subi la dernière fois qu'IL a agi
>   (le fil "carte *i* contre carte *i*" reste le même sur toute la durée
>   du combat).
> - **`BattleResultOverlay` révèle le combat PROGRESSIVEMENT**, tour par
>   tour (bouton "Passer" pour sauter l'animation) — deux jauges de PV qui
>   descendent au fil d'un journal de combat qui se remplit, pas un score
>   déjà là dès l'ouverture. Vitesse adaptée au nombre de tours (plus rapide
>   si le combat est long) pour ne pas transformer un combat serré en
>   attente interminable.
> - **Niveau des bots relevé** (poids de rareté par difficulté et chance de
>   holo, tous les trois crans) — les combats à PV durent plus longtemps
>   qu'avant, un bot trop mou devient vite ennuyeux plutôt que juste facile.
>   Le bot choisit aussi sa posture par une heuristique simple (Attaque si
>   son ATTAQUE dépasse sa DÉFENSE, Défense sinon) plutôt qu'un choix
>   uniforme.
> - **Rupture de compatibilité assumée** : la forme du résultat stocké
>   change entièrement (`duels`/`challengerPower` → `rounds`/PV/postures).
>   Les combats déjà terminés et stockés en base avant ce passage ne se
>   réafficheront pas correctement depuis l'historique — acceptable sur
>   cette branche de test, pas de migration prévue.
> - **Bug corrigé après coup** : un défi créé avant ce passage a son équipe
>   stockée sans `stance` — y répondre plantait la résolution (500) plutôt
>   que de s'afficher. Fix : repli sur la posture "Attaque" partout où elle
>   est lue (`slotStats`, `cardStatsWithStance`, équipe favorite) quand elle
>   est absente ou invalide.
>
> **Cinquième passage** (retour : "je trouve que les multiplicateurs
> compliquent le jeu") — le calcul d'ATTAQUE enchaînait jusqu'à 4 facteurs
> multiplicatifs (posture × aléa ±10% × camp ×1,4 × momentum ×1,15),
> difficile à suivre même en décortiquant un combat réel à la main. Deux
> simplifications :
> - **Bonus additifs, pas multiplicatifs** : camp et momentum s'ajoutent
>   maintenant en un seul pourcentage (`+50%` si avantage de camp, `+40%`
>   si en lancée, les deux cumulés donnent `+90%`, jamais `×1,5×1,4=×2,1`).
>   Recalibré par simulation pour les mêmes garde-fous qu'avant : rareté
>   toujours décisive, posture ~50/50, avantage de camp sur 1 duel/5 donne
>   ~65-70% de victoires (fort mais pas automatique) sans suffire seul à
>   renverser un écart de rareté entière.
> - **Aléa ±10% par tour supprimé** : `resolveBattle` est maintenant
>   entièrement déterministe (mêmes équipes → même résultat, à chaque
>   appel) — `battleId`/`seed` ont disparu de sa signature, devenus inutiles
>   sans tirage à amorcer. Un duel donné fait toujours les mêmes dégâts à
>   situation égale ; la variété vient des vraies différences entre cartes
>   (profil ATK/DEF propre, posture, camp, lancée), pas d'un tirage caché
>   en plus qui rendait les nombres affichés difficiles à vérifier.
> - **Posture affichée dans `BattleResultOverlay`** (icône ⚔️/🛡️ à côté de
>   l'icône de camp, sur chaque carte de chaque tour) — jusque-là visible
>   seulement dans le composeur d'équipe, pas dans le récapitulatif.
>
> **Sixième passage** (choix parmi des propositions de nouvelles mécaniques
> — les trois retenues) — s'ajoutent au calcul ci-dessus :
> - **Sursaut du désespoir** : +30% d'ATTAQUE (additif, comme camp/momentum)
>   pour une équipe sous 25% de ses PV max — évalué au *début* de chaque
>   tour sur les PV du moment (pas un état mémorisé comme le momentum) —
>   pour permettre de vrais retournements de situation en fin de combat.
> - **Coup critique** : 15% de chances par attaque de doubler les dégâts
>   infligés ce tour-là.
> - **Bouclier** : 12% de chances de bloquer complètement une attaque (0
>   dégâts, sous le minimum de 1 habituel) — vérifié *avant* le coup
>   critique, un coup bloqué ne peut pas aussi être critique (fréquence de
>   critique réellement observée : ~13% = 88% × 15%, pas 15% pile).
>   Symétriques (mêmes chances pour les deux équipes), donc neutres sur
>   l'équilibre moyen — leur rôle est d'ajouter des moments de tension
>   visibles, pas de favoriser un camp. Recalibrage vérifié par simulation :
>   rareté toujours décisive, posture toujours ~50/50, avantage de camp
>   toujours ~62-70%.
> - Ces deux derniers réintroduisent de l'aléa par tour (contrairement à
>   l'ATTAQUE elle-même, restée déterministe) — volontairement, à la
>   différence de l'ancien ±10% retiré au passage précédent : ce sont des
>   événements **visibles** (icônes 🎯/🚫 + libellé "Bloqué !" dans le
>   journal de combat), jamais fondus silencieusement dans le chiffre
>   d'ATTAQUE affiché.
> - Affiché dans `BattleResultOverlay` : 💢 (désespoir) à côté des autres
>   icônes de statut, 🎯 devant les dégâts en cas de critique, "🚫 Bloqué !"
>   à la place des dégâts en cas de blocage.
>
> **Septième passage** ("il faudrait que les 2 joueurs aient 500pv que 3
> cartes soient en défense et 2 en attaque, quand les cartes défense sont
> brisées par les attaques adverses alors on passe aux PV adverses") —
> **rupture de compatibilité assumée** avec tous les combats déjà stockés
> (`result_json` change complètement de forme) : refonte du modèle de PV,
> de la répartition Attaque/Défense libre vers un **écran de défenseurs
> façon "position défense"** (Yu-Gi-Oh) :
> - Les deux équipes ont désormais **500 PV fixes** (+15% synergie comme
>   avant), au lieu d'une jauge dérivée de la DÉFENSE totale de l'équipe.
> - La répartition posture n'est plus libre : **exactement 2 cartes en
>   Attaque et 3 en Défense** par équipe (`isTeamShape` le vérifie
>   maintenant en plus de la forme générale ; le composeur, côté
>   `BattlesScreen`, bloque l'envoi tant que ce n'est pas respecté et
>   affiche un compteur ⚔️2/2 · 🛡️3/3).
> - Les 3 cartes en Défense forment un **écran ordonné** (l'ordre où elles
>   ont été alignées à la composition = ordre de l'écran, la 1ère encaisse
>   en premier) : chaque coup subi réduit sa **durabilité**
>   (`DEF × DEFENDER_DURABILITY_MULT`, calibré à **×4** par simulation —
>   assez pour que l'écran tienne plusieurs tours sans rendre le combat
>   interminable). Une fois détruite, l'attaque suivante vise l'écran
>   suivant ; une fois les 3 détruites, les attaques atteignent enfin les
>   PV directement — plus aucune protection après ça.
> - Les 2 cartes en Attaque de chaque équipe cyclent chacune leur tour
>   (round-robin, comme avant), et ne sont jamais elles-mêmes une cible —
>   l'écran, ce sont les défenseurs, qui eux-mêmes n'attaquent jamais.
> - **Camp** ne s'applique plus que face à une carte-écran précise (l'
>   attaquant a-t-il l'avantage sur CETTE carte ?) — sans objet une fois
>   que les PV sont visés directement (ils n'ont pas de camp). **Momentum**
>   change aussi de sens : ce n'est plus "a fait plus de dégâts qu'il n'en
>   a subi au tour précédent" (les défenseurs ne ripostent jamais, la
>   comparaison n'a plus de sens) mais "a atteint les PV adverses
>   directement au tour précédent" (l'écran adverse était déjà percé).
>   Désespoir, coup critique et bouclier sont inchangés.
> - `RoundEvent` change de forme en conséquence : `*AttackerId` (la carte
>   en Attaque qui agit ce tour) remplace l'ancien `*CardId` par slot,
>   `*TargetCardId` (carte-écran visée, `null` si PV visés directement) et
>   `*TargetDestroyed` sont nouveaux. `BattleResultOverlay` affiche
>   maintenant chaque attaque comme "attaquant → cible" (icône ❤️ si PV
>   visés directement, badge "💥 brisée" si le coup vient de détruire la
>   carte-écran) plutôt que l'ancien face-à-face symétrique "carte i contre
>   carte i".
> - **Calibrage vérifié par simulation** (prototype à la main, puis
>   ré-exécuté contre le vrai code serveur/client bundlé, 200 combats en
>   parité stricte RNG seedée — identiques à 100%) : rareté toujours très
>   décisive (3v3 ≈ 48%/52%, 4v3 et 5v3 → 100% pour la rareté supérieure,
>   plus tranché qu'avant du fait de l'échelle de DEF appliquée deux fois,
>   à la durabilité de l'écran et à la mitigation par coup), coup
>   critique/bouclier toujours conformes (~13,2%/12%).
> - **Deux effets de bord assumés, pas des bugs** : (1) les combats durent
>   nettement plus longtemps qu'avant (une centaine de tours en moyenne à
>   rareté égale, contre une dizaine avant) — mécanique de la jauge fixe à
>   500 PV combinée à seulement 2 attaquants qui cyclent, pas un problème
>   de performance (10-20ms par combat, `MAX_ROUNDS=1000` en filet de
>   sécurité, jamais atteint en pratique) ; (2) l'avantage de camp pèse
>   beaucoup moins qu'avant dans le résultat final (~50% observé sur "avoir
>   l'avantage sur le premier défenseur adverse", contre 62-70% au passage
>   précédent) puisqu'il ne s'applique plus que pendant la brève fenêtre où
>   un attaquant affronte précisément cette carte-écran, jamais sur
>   l'ensemble d'un combat de plusieurs dizaines de tours.
>
> **Huitième passage** ("il faudrait qu'on visualise sur l'écran la
> position choisie par chaque joueur comme un plateau sur Yu-Gi-Oh, avec un
> mouvement des cartes pour montrer qu'elles attaquent ou qu'elles
> résistent") — purement visuel, aucun changement de calcul :
> - Un **plateau permanent** (`BattleBoard` dans `BattleResultOverlay`)
>   s'affiche entre les jauges de PV et le journal de combat existant
>   (conservé tel quel en dessous, pour le détail tour par tour) : les 5
>   cartes de chaque équipe, dans l'ordre où elles ont été alignées, avec un
>   badge de posture (⚔️/🛡️) et un liseré de couleur (accent = Attaque,
>   accent-2 = Défense). Une carte-écran détruite reste à sa place mais
>   s'assombrit et se grise (façon "cimetière visible"), plutôt que de
>   disparaître — pour toujours voir d'un coup d'œil combien de défenseurs
>   il reste de chaque côté.
> - Contrairement au journal (qui défile), le plateau ne montre QUE l'état
>   du tour actuellement dévoilé — dérivé uniquement des tours déjà révélés
>   (`revealed`), jamais du résultat complet à l'avance.
> - **Mouvement des cartes**, rejoué une fois par tour dévoilé (via un
>   `key` React qui change pour forcer le remontage de l'élément animé,
>   jamais une boucle) : la carte en Attaque qui agit s'élance vers le
>   centre du plateau (vers le bas pour l'adversaire, vers le haut pour
>   soi) ; sa cible tressaute si elle encaisse, se brise (rotation + grisage
>   + fondu) si c'est le coup de grâce, ou s'entoure d'un halo bleu si
>   bloquée — plus un nombre de dégâts flottant qui s'élève et s'efface
>   au-dessus de la carte touchée (ou de la jauge de PV si l'écran est déjà
>   percé). Nouvelles keyframes dans `animations.css`
>   (`battleLungeUp/Down`, `battleShake`, `battleBreak`, `battleBlockFlash`,
>   `battleFloat`, `battlePvFlash`) — respectent automatiquement
>   `prefers-reduced-motion` comme tout le reste du fichier (aucune logique
>   supplémentaire à écrire côté composant).
> - Vérifié en live (Playwright contre `npm run dev`, viewport desktop et
>   mobile 390×844) : plateau lisible aux deux tailles, écrans détruits
>   bien grisés, halo de blocage et nombres flottants visibles, aucune
>   erreur console sur un combat complet de bot.
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
