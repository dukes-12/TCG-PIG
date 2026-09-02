# Handoff : Grouin — app TCG cochons (web)

## Overview

Grouin est une application mobile-web de collection de cartes à collectionner (TCG) sur le thème
des cochons. Deux boucles de jeu :

1. **Ouvrir des packs** — l'utilisateur déchire un sachet, révèle ses cartes une par une, découvre
   ce qu'il a obtenu.
2. **Compléter la collection** — 28 cartes réparties sur 6 raretés et 5 types, avec tri, filtres,
   recherche, doublons recyclables en monnaie (« glands ») et statistiques de complétion.

Cible : **web** (mobile-first, pensé pour un viewport de 402 × 874 px, iPhone 16-ish). À terme
installable en PWA. Les cartes n'ont qu'un **nom, une image et une rareté** (+ un type pour le tri) —
aucune mécanique de combat pour l'instant.

## About the design files

Les fichiers HTML de ce bundle sont des **références de design**, pas du code de production. Ils ont
été construits comme prototypes pour figer l'apparence et le comportement attendus. La tâche est de
**recréer ces écrans dans l'environnement du dépôt cible** en suivant ses patterns existants.

Aucun code n'existe encore côté produit. Recommandation pour la cible web :

- **React + Vite + TypeScript**, routing par `react-router`, état local via `useReducer` ou Zustand.
- **Tailwind ou CSS Modules** — les tokens de design (voir plus bas) sont fournis en variables CSS,
  reprenez-les tels quels dans un `theme.css` importé une fois.
- Persistance locale : `localStorage` pour la collection / les glands / les packs (aucun back-end
  requis en v1). Prévoir une couche `storage.ts` isolée pour brancher un back-end plus tard.
- Les images de cartes sont des **assets statiques** servis depuis `public/assets/cards/`.

`data/cards.json` est directement consommable en production : c'est la base de cartes complète
(id, nom, type, rareté, chemin d'image attendu).

## Fidelity

**High-fidelity.** Couleurs, typographies, rayons, ombres, timings d'animation et copie sont
définitifs. Les designs doivent être recréés au pixel près. Une seule zone reste ouverte : les
**images de cartes** sont encore des placeholders (voir « Assets »).

Le design existe en deux **directions visuelles** de carte, commutables :

- `Collector foil` (par défaut) — cadres métalliques/dégradés, plaque de nom centrée en Caprasimo.
- `Sticker cartoon` — contour blanc épais + bordure encre, ombre dure décalée, coins très arrondis.

Implémentez `Collector foil` en premier ; `Sticker cartoon` peut rester une variante derrière un
flag si le temps manque.

---

## Design tokens

Repris du design system « Organic » (fourni : `styles.css`). **Toujours** passer par ces variables.

### Couleurs de base

| Token | Valeur |
| --- | --- |
| `--color-bg` | `#f5ead8` |
| `--color-surface` | `#ebddc5` |
| `--color-text` | `#201e1d` |
| `--color-accent` | `#c67139` |
| `--color-accent-2` | `#7a8a5e` |
| `--color-divider` | `color-mix(in srgb, #201e1d 16%, transparent)` |

### Rampes (100 → 900)

- neutral : `#f9f4ed` `#eee7db` `#dcd3c4` `#c0b6a5` `#a19786` `#82796a` `#645c50` `#474238` `#2e2b25`
- accent (terracotta) : `#fff2eb` `#ffe1d0` `#ffc6a5` `#f6a06b` `#d67f48` `#b2622d` `#8c491a` `#643312` `#402310`
- accent-2 (sauge) : `#f0fae1` `#e1eecc` `#ccdbb2` `#aebf92` `#8fa073` `#728157` `#56633f` `#3d472b` `#272e1b`

### Typographie

- Titres : **Caprasimo** 400 (`--font-heading`), `line-height: 1.12`, `letter-spacing: -0.015em`.
- Texte : **Figtree** 400 / 600 / 700 (`--font-body`), base `15px`, `line-height: 1.55`.
- Import : `https://fonts.googleapis.com/css2?family=Caprasimo:wght@400&family=Figtree:wght@400;600;700&display=swap`

Tailles utilisées dans l'app : titres d'écran `30px` Caprasimo / `line-height: 1`; sous-titres
`13px` Figtree opacité `.6`; libellés de section `8.5px` 700 uppercase `letter-spacing: .14em`
opacité `.42`; chips `11.5px` 700; onglets `8.5px` 700.

### Espacement, rayons, ombres

- Espacement : `4.4 / 8.8 / 13.2 / 17.6 / 26.4 / 35.2 px` (`--space-1..8`).
- Rayons : `8 / 16 / 28 px` (`--radius-sm/md/lg`) ; **boutons, chips, inputs = `999px`** ;
  cartes de contenu (surfaces) = `26–32px`.
- Ombres : `--shadow-sm: 0 1px 2px #2e2b25@14%`, `--shadow-md: 0 3px 10px #2e2b25@16%`,
  `--shadow-lg: 0 12px 32px #2e2b25@22%`.
- Icônes : **Lucide**, `stroke-width: 2.75`, 20px dans la tab bar.

### Focus / états

`:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }`. Hover et pressed
prennent le cran suivant de la rampe accent (`-600`, puis `-700`). Jamais d'état navigateur par défaut.

---

## Modèle de données

```ts
type RarityId = 1 | 2 | 3 | 4 | 5 | 6;

interface Rarity {
  id: RarityId;
  key: 'commune' | 'peu_commune' | 'rare' | 'epique' | 'legendaire' | 'mythique';
  name: string;          // libellé affiché
  weight: number;        // probabilité par carte tirée, en %
  recycleValue: number;  // glands gagnés par exemplaire en trop
}

interface Card {
  id: number;
  name: string;
  type: 'Super-héros' | 'Dictateurs' | 'Politiques' | 'Métiers' | 'Hors catégorie';
  rarity: RarityId;
  image: string;         // assets/cards/001.jpg
}
```

### Table des raretés

| id | key | Nom | Poids | Recyclage | Cartes |
| --- | --- | --- | --- | --- | --- |
| 1 | commune | Commune | 44 % | 8 glands | 9 |
| 2 | peu_commune | Peu commune | 28 % | 22 | 7 |
| 3 | rare | Rare | 17 % | 60 | 5 |
| 4 | epique | Épique | 8 % | 160 | 4 |
| 5 | legendaire | Légendaire | 2,5 % | 450 | 2 |
| 6 | mythique | Mythique | 0,5 % | 1500 | 1 (**Cochon OG**) |

Total = 100 %. La rareté **Mythique** ne contient qu'une seule carte, `Cochon OG` (id 28) : c'est la
carte chase du set.

### Packs

| key | Nom | Prix | Cartes | Garantie |
| --- | --- | --- | --- | --- |
| basic | Sac de glands | 100 glands | 5 | — |
| foire | Caisse de la Foire | 260 | 5 | au moins une **Rare** (floor = 3) |
| doree | Malle Dorée | 640 | 5 | au moins une **Épique** (floor = 4) |

Le nombre de cartes par pack est paramétrable (3 à 8 dans le prototype ; 5 en production).

### Algorithme de tirage

```ts
function roll(floor = 0): Card {
  const x = Math.random() * 100;
  let acc = 0, rarity: RarityId = 1;
  for (const r of RARITIES) { acc += r.weight; if (x < acc) { rarity = r.id; break; } }
  if (floor && rarity < floor) rarity = floor as RarityId;
  const pool = CARDS.filter(c => c.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

function openPack(pack: Pack): Card[] {
  const pull = Array.from({ length: pack.cards }, (_, i) =>
    roll(i === pack.cards - 1 ? (pack.guaranteedFloor ?? 0) : 0));
  // filet de sécurité : si la garantie n'est pas remplie, on force la dernière carte
  if (pack.guaranteedFloor && !pull.some(c => c.rarity >= pack.guaranteedFloor))
    pull[pull.length - 1] = roll(pack.guaranteedFloor);
  return pull;
}
```

Les doublons sont autorisés dans un même pack. À l'ouverture, on incrémente `owned[cardId]` et on
marque `isNew` les cartes dont le compteur passe de 0 à 1.

---

## State management

```ts
interface AppState {
  tab: 'collection' | 'shop' | 'open' | 'dupes' | 'profile';
  // collection
  sort: 'rarete' | 'nom' | 'type' | 'nb';
  rarityFilter: RarityId | 'all';
  typeFilter: string | 'all';
  query: string;
  ownedOnly: boolean;
  detail: number | null;              // id de carte, ouvre l'overlay détail
  // possession
  owned: Record<number, number>;      // cardId -> nombre d'exemplaires
  glands: number;
  stock: Record<PackKey, number>;     // packs non ouverts en poche
  openedCount: number;                // stat de profil
  // ouverture
  activePack: PackKey;
  packState: 'idle' | 'tearing' | 'reveal' | 'summary';
  pull: Card[];
  pullIndex: number;
  flipped: boolean;                   // face avant visible pour la carte courante
  isNew: Record<number, true>;
  dragX: number;                      // offset de swipe en cours
  toast: string | null;
}
```

Transitions de l'ouverture de pack :

1. `idle` → tap sur le sachet (ou sur le bouton « Déchirer le sac »). Si `stock[activePack] === 0`,
   afficher un toast « Plus de <pack> — passe en boutique. » et ne rien faire.
2. `tearing` pendant **680 ms** (animation de déchirure + burst), puis `reveal`.
   Le tirage est calculé et la collection créditée **au moment du tear**, pas à la révélation.
3. `reveal` : la carte courante démarre face cachée, se retourne automatiquement après **360 ms**.
   Tap avant ce délai = retournement immédiat. Une fois retournée, tap ou swipe > 70 px = carte
   suivante (retour à `flipped = false`, nouveau délai de 360 ms).
4. Après la dernière carte → `summary`.

État initial de démo (à remplacer par un état vierge en production, ou à garder pour un mode démo) :
`glands: 480`, `stock: { basic: 4, foire: 1, doree: 0 }`, `openedCount: 12`, quelques cartes possédées.

Persistance : sérialiser `owned`, `glands`, `stock`, `openedCount` dans `localStorage` à chaque
mutation. Ne pas persister l'état d'ouverture en cours (`pull`, `packState`…).

---

## L'anatomie d'une carte

Une carte est une pile de 2 conteneurs + 3 zones. Toutes les valeurs existent en deux échelles :
**mini** (grille, ≈ 110 × 153 px, `aspect-ratio: 0.72`) et **grande** (238 × 332 px).

```
shell   (cadre extérieur — c'est lui qui porte l'identité de rareté : dégradé, ombre, animation)
└ inner (surface intérieure — fond, couleur de texte, overflow hidden)
  ├ artWrap   (flex:1, l'image de la carte, object-fit: cover)
  ├ namePlate (nom de la carte)
  └ metaRow   (type à gauche · 6 pastilles de rareté à droite)
  + ornements optionnels : coins sertis, reflet animé, particules
```

Échelles :

| | mini | grande |
| --- | --- | --- |
| padding de `inner` | 4 px | 8 px |
| gap interne | 3 px | 6 px |
| taille du nom | 10 px | 18 px |
| taille du type | 7 px | 10 px |
| diamètre pastille | 4 px | 7 px |
| rayon `shell` | 15 px | 26 px |
| rayon `inner` | 11 px | 19 px |

`namePlate` : Caprasimo, centré, `line-height: 1.06`, `text-shadow: 0 1px 6px rgba(0,0,0,.5)` à
partir de la rareté 4 (fonds sombres).
`metaRow` : `display:flex; justify-content:space-between; padding: 0 3px 1px`. Le type est en
`7px/700 uppercase`, `letter-spacing: .06em`, `opacity: .65`, `text-overflow: ellipsis`.
Les **6 pastilles** : `n` remplies (couleur du texte de la carte, `opacity: .9`), les autres en
`inset 0 0 0 1px currentColor` à `opacity: .28`.

### Les 6 designs de rareté (direction « Collector foil »)

| Rareté | `shell` padding | `shell` background | `inner` background | Fond image | Couleur texte | Ombre | Ornements |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 Commune | 1 px | `--color-neutral-400` | `--color-neutral-100` | `--color-neutral-200` | `--color-text` | aucune | — |
| 2 Peu commune | 2 px | `linear-gradient(180deg, --color-accent-2-400, --color-accent-2-700)` | `linear-gradient(180deg,#f4fce9,#e1eecc)` | `#ccdbb2` | `--color-accent-2-900` | `--shadow-sm` | — |
| 3 Rare | 2.5 px | `linear-gradient(150deg,#f6a06b,#ffeacb 42%,#c67139)` | `linear-gradient(180deg,#fff6ef,#ffe1d0)` | `#ffc6a5` | `--color-accent-900` | `0 2px 12px rgba(198,113,57,.35)` | 4 **coins sertis** |
| 4 Épique | 3 px | `linear-gradient(200deg,#8fa073,#2e2b25 46%,#56633f)` | `radial-gradient(120% 80% at 50% 0%,#474238,#201e1d)` | `#2e2b25` | `#f5ead8` | `--shadow-md` | **reflet animé** |
| 5 Légendaire | 3.5 px | `linear-gradient(100deg,#f6a06b,#ffe1d0,#aebf92,#ffc6a5,#f6a06b)` animé | `radial-gradient(130% 90% at 50% 0%,#5a3016,#201e1d 72%)` | `#402310` | `#ffe1d0` | `0 6px 22px rgba(214,127,72,.5)` | reflet + **3 particules** |
| 6 Mythique | 4 px | `linear-gradient(115deg,#8c6318,#ffe9b0 28%,#c99a3a 52%,#fff6d8 74%,#8c6318)` animé | `radial-gradient(140% 100% at 50% 0%,#3a2c10,#141210 74%)` | `#221b0e` | `#ffe9b0` | `0 8px 30px rgba(201,154,58,.6)` | coins **or** + reflet + particules or |

Ornements — détails exacts :

- **Coins sertis** : 4 disques absolus, `10px` (grande) / `5px` (mini), à `8px` / `4px` de chaque
  coin, `background: linear-gradient(140deg,#ffeacb,#c67139)` (or `#fff6d8 → #c99a3a` en rareté 6),
  `box-shadow: 0 0 0 1px rgba(255,255,255,.6)`.
- **Reflet animé (`pigShine`)** : bande absolue `top:-20%; left:0; width:55%; height:140%`,
  `background: linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent)`,
  `animation: pigShine 4.6s ease-in-out infinite` (3.1 s pour les raretés 5–6).
- **Particules (`pigFloat`)** : 3 disques `6px`/`3.5px` à `left: 18% / 46% / 74%`, `bottom: 12%`,
  couleur `#ffe1d0` (rareté 5) ou `#ffe9b0` (rareté 6), durées `2.4s / 3.0s / 3.6s`, `opacity: .6`.
- **Dégradé animé (`pigHolo`)** : `background-size: 300% 100%`, `animation: pigHolo 5s linear infinite`.

Cartes **non possédées** : le `shell` reçoit `filter: grayscale(1); opacity: .4`, aucune ombre,
aucune animation ; la zone image affiche un « ? » en Caprasimo (`54px` grande / `24px` mini,
`opacity: .3`). Le nom et le type restent lisibles (c'est une checklist).

### Direction « Sticker cartoon » (variante)

Mêmes couleurs de rareté, géométrie différente : `shell` padding `7px`/`4px`,
`background: #fffaf2`, `border: 3px`/`2px solid` (`#201e1d` à partir de la rareté 4, sinon
`--color-accent-800`), rayon `30px`/`18px`, ombre dure `0 8px 0 rgba(46,43,37,.55)` (ou
`rgba(140,73,26,.35)` pour les raretés 1-3), et `artWrap` avec un anneau intérieur
`inset 0 0 0 3px #fffaf2`. Pas d'animation de dégradé.

---

## Keyframes

```css
@keyframes pigHolo   { 0%{background-position:0% 50%}    100%{background-position:300% 50%} }
@keyframes pigShine  { 0%{transform:translateX(-130%) rotate(10deg)} 45%,100%{transform:translateX(150%) rotate(10deg)} }
@keyframes pigFloat  { 0%,100%{transform:translateY(0);opacity:.2} 50%{transform:translateY(-10px);opacity:.9} }
@keyframes pigPop    { 0%{transform:scale(.86);opacity:0} 60%{transform:scale(1.03);opacity:1} 100%{transform:scale(1);opacity:1} }
@keyframes pigRise   { 0%{transform:translateY(16px);opacity:0} 100%{transform:translateY(0);opacity:1} }
@keyframes pigBreathe{ 0%,100%{transform:translateY(0) rotate(-1.6deg)} 50%{transform:translateY(-12px) rotate(1.6deg)} }
@keyframes pigGlow   { 0%,100%{opacity:.4;transform:scale(.9)} 50%{opacity:.95;transform:scale(1.08)} }
@keyframes pigTear   { 0%{transform:scale(1) rotate(0)} 35%{transform:scale(1.06) rotate(-3deg)} 100%{transform:scale(1.5) rotate(6deg);opacity:0} }
@keyframes pigBurst  { 0%{transform:scale(.2);opacity:.9} 100%{transform:scale(2.6);opacity:0} }
```

---

## Écrans

Coquille commune : fond `--color-bg`, contenu scrollable avec `padding: 54px 0 104px` (54 px pour la
status bar, 104 px pour la tab bar), tab bar fixe en bas. Gouttière horizontale : **18 px**.

### 1. Tab bar (présente sur tous les écrans)

`position: absolute; bottom: 0`, fond `--color-surface`, `border-top-left/right-radius: 32px`,
`box-shadow: 0 -8px 24px rgba(46,43,37,.12)`, `padding: 11px 12px 30px`, 5 boutons `flex:1` en
colonne (icône 20px + libellé 8.5px/700, `gap: 4px`). Actif : `--color-accent`. Inactif :
`--color-neutral-600` à `opacity: .8`.

Onglets et icônes Lucide : Collection (`layout-grid`) · Boutique (`shopping-bag`) ·
Ouvrir (`package`) · Doublons (`copy`) · Profil (`user`).

### 2. Collection

- **Titre** « Ma bassecour » (30px Caprasimo) + compteur `uniques/total` aligné à droite
  (12px/700, `opacity: .5`).
- **Barre de progression** : hauteur 7px, rayon 999px, piste `--color-neutral-300`, remplissage
  `linear-gradient(90deg, --color-accent-2-500, --color-accent)`, `transition: width .4s ease`.
- **Bandeau de raretés** : 6 tuiles `flex:1`, fond `--color-surface`, rayon 18px, `padding: 9px 2px`,
  contenant une pastille 7px de la couleur de rareté, le libellé court (`Com.` `Peu c.` `Rare`
  `Épique` `Légend.` `Myth.` — 7.2px/700 uppercase, `opacity: .55`, `white-space: nowrap`) et le
  ratio `possédées/total` en 12px Caprasimo.
- **Recherche** : `.input` (pill, fond `--color-neutral-100`), placeholder « Chercher un cochon… »,
  filtre insensible à la casse sur le nom. À côté, un toggle pill « Toutes » / « Possédées »
  (actif : fond `--color-accent-2-600`, texte `--color-bg`).
- **Trois rangées de chips** sous les libellés « Trier » / « Rareté » / « Type » :
  - Trier : Rareté (défaut) · Nom · Type · Quantité.
  - Rareté : Toutes + les 6 noms.
  - Type : Tous + les 5 types.
  - Chip : `padding: 6px 13px`, `font: 700 11.5px Figtree`, `border-radius: 999px`,
    inactif `--color-neutral-200` + `inset 0 0 0 1px --color-divider`, actif `--color-accent` /
    texte `--color-bg` + `--shadow-sm`.
- **Grille** : `grid-template-columns: repeat(3, 1fr); gap: 10px`, cellules en `aspect-ratio: 0.72`.
  Badge de doublon si `count > 1` : `×n`, en haut à droite (`top:-5px; right:-4px`), fond
  `--color-neutral-900`, texte `--color-bg`, 9.5px/700, pill.
- **Vide** : « Aucun cochon ne correspond. Enlève un filtre, ou va ouvrir un sac. » centré, 13px,
  `opacity: .5`.
- Tri par défaut : rareté **décroissante**, puis nom alphabétique.

### 3. Détail d'une carte (overlay)

Déclenché par un tap sur n'importe quelle carte. `position:absolute; inset:0; z-index:80`, fond
`rgba(32,30,29,.6)` + `backdrop-filter: blur(7px)`, contenu centré.

Halo derrière la carte : disque de 340px, `radial-gradient(circle, <glow de la rareté>, transparent 68%)`,
`opacity: .8`. Couleurs de halo : `rgba(161,151,134,.55)` · `rgba(143,160,115,.6)` ·
`rgba(246,160,107,.75)` · `rgba(86,99,63,.85)` · `rgba(246,160,107,.95)` · `rgba(255,215,130,1)`.

Carte en grand (238 × 332, `animation: pigPop .3s ease`), puis, en `--color-bg` :
libellé de rareté (9px/uppercase/`letter-spacing:.2em`/`opacity:.7`), nom (25px Caprasimo),
méta (12px, `opacity:.7`) = `type · n exemplaire(s) · <valeur> glands`, ou
`type · pas encore trouvée` si non possédée. Bouton pill « Fermer » (fond `--color-bg`).

### 4. Boutique

Titre « Boutique » + **compteur de glands** à droite : pill `--color-accent-200` / texte
`--color-accent-800`, 12px/700, précédé d'un petit gland (disque 9 × 11px,
`border-radius: 50% 50% 45% 45%`, `--color-accent-700`).
Sous-titre : « Les glands se gagnent en recyclant tes doublons. »

Une ligne par pack : conteneur `display:flex; gap:13px; padding:13px; border-radius:30px`, fond
`--color-surface`, et `inset 0 0 0 2px --color-accent` si c'est le pack actif. À gauche une vignette
66 × 88, rayon 20px, `--shadow-sm`, avec le dégradé du pack et un groin (ellipse `#ffd2b4` +
2 naseaux `#8c491a`) :

- basic : `linear-gradient(160deg,#f6a06b,#8c491a)`
- foire : `linear-gradient(160deg,#aebf92,#3d472b)`
- doree : `linear-gradient(160deg,#ffd2b4,#b2622d 55%,#402310)`

À droite : nom (18px Caprasimo), description, prix en pill accent + « En poche : n » (10px/700,
`opacity:.5`), et deux boutons empilés — « Acheter » (pill accent, débite les glands, toast
« <pack> ajouté·e » ; si solde insuffisant : toast « Pas assez de glands (N requis). ») et
« Ouvrir » (pill outline, sélectionne le pack et bascule sur l'onglet Ouvrir).

### 5. Ouvrir (ouverture de pack)

**État `idle`** — titre = nom du pack actif, compteur « n en poche » à droite, blurb =
`<description du pack> Touche le sac pour le déchirer, puis glisse pour révéler carte par carte.`

Le sachet : 214 × 286, rayon 34px, dégradé du pack, `--shadow-lg`,
`animation: pigBreathe 4.5s ease-in-out infinite`, `cursor: pointer`. Contenu : une bande dentelée en
haut (`repeating-linear-gradient(90deg, rgba(245,234,216,.85) 0 9px, transparent 9px 18px)`,
hauteur 24px, `opacity: .45`), un groin 98 × 80, le mot « GROUIN » en 27px Caprasimo `#fff6ef`,
le sous-titre du pack en 9px `letter-spacing: .26em` `#ffd2b4`, et un voile bas
`linear-gradient(0deg, rgba(64,35,16,.45), transparent)` de 46px.

Bouton pleine largeur « Déchirer le sac » (ou « Aller en boutique » si stock nul) : pill accent,
16px Caprasimo, `padding: 14px`.

Encart « Chances par carte » (activable) : fond `--color-surface`, rayon 26px, une ligne par rareté
(pastille + nom + pourcentage en Caprasimo `opacity: .65`).

**État `tearing`** (680 ms) — le sachet joue `pigTear`, un disque de 230px
`radial-gradient(circle, rgba(246,160,107,.9), transparent 70%)` joue `pigBurst .7s`.

**État `reveal`** — plein écran tapable/glissable (`touch-action: none`, `user-select: none`) :

- Halo de 320px derrière la carte, couleur de la rareté ; `opacity: 0` face cachée, puis `.35`
  (raretés 1–2) ou `1` + `pigGlow 2.6s infinite` (raretés ≥ 3), `transition: opacity .5s`.
- Indicateur de progression en haut : une pastille par carte du pack, 7px de haut,
  **20px de large pour la carte courante**, `--color-accent` si déjà vue sinon
  `--color-neutral-400`, `transition: width .25s`.
- Carte : conteneur 238 × 332 en `perspective: 1100px`, transformé par le swipe
  (`translateX(dragX) rotate(dragX / 26 deg)`, `transition: transform .3s` relâché, `none` pendant
  le drag). Enfant en `transform-style: preserve-3d`, `rotateY(180deg)` → `rotateY(0)`,
  `transition: transform .62s cubic-bezier(.3,.7,.2,1)`. Les deux faces en
  `backface-visibility: hidden`.
- **Dos de carte** : rayon 26px, `linear-gradient(160deg,#8c491a,#402310)`, `--shadow-lg`, groin
  64 × 52 + « GROUIN » 20px Caprasimo `#ffe1d0`.
- Légende sous la carte : `Carte n sur N` (`opacity: .45`) face cachée, puis
  `<Rareté> · <Type>` (15px Caprasimo, `opacity: 1`).
- Indice : « Touche pour retourner » → « Glisse ou touche pour la suivante » → « Glisse pour voir le
  butin » sur la dernière (11px, `opacity: .4`).
- Seuil de swipe : **70 px** en valeur absolue, sur `pointerdown/move/up/cancel`.

**État `summary`** (`animation: pigRise .4s`) — titre « Ton butin », ligne
`N cartes · X nouvelle(s) · meilleure : <rareté max>`, grille 3 colonnes des cartes tirées avec badge
**NOUVEAU** (pill `--color-accent`, 7.5px/700, `letter-spacing: .1em`, en haut à gauche) et badge
`×n` si doublon, puis « Déchirer le sac » (pill accent) et « Voir la collection » (pill outline).

### 6. Doublons

Titre + compteur de glands, blurb « Recycle tes exemplaires en trop contre des glands. Tu gardes
toujours un exemplaire. »

Une ligne par carte possédée en > 1 exemplaire, triées par rareté décroissante :
`display:flex; gap:12px; padding:10px 12px; border-radius:26px`, fond `--color-surface`. À gauche la
mini-carte en 60 × 84 (tapable → détail). Au centre : nom (15px Caprasimo), méta
`<Rareté> · <Type>` (10.5px, `opacity:.6`), et un tag `×n — (n-1) en trop`
(fond `--color-neutral-200`, texte `--color-neutral-800`, 10px/700, pill). À droite un bouton pill
`--color-accent-2-600` libellé `+<gain>` : ramène le compteur à 1, crédite
`recycleValue × (n - 1)` glands, toast « +N glands ».

Vide : « Pas un seul doublon. Ouvre des sacs — ça viendra. »

### 7. Profil

- Avatar : disque 74px `linear-gradient(160deg,#ffd2b4,#f6a06b)`, `--shadow-md`, deux naseaux
  `#8c491a` (12 × 19px). À côté : « Éleveur Grouik » (22px Caprasimo) et le rang (11.5px,
  `opacity: .6`) — `Apprenti fermier` (< 60 % de complétion), `Éleveur confirmé` (≥ 60 %),
  `Grand Maître Truffier` (100 %).
- Grille 2 × 2 de statistiques : tuiles `--color-surface`, rayon 26px, `padding: 14px 16px`, valeur
  en 26px Caprasimo, libellé 9.5px/700 uppercase `letter-spacing: .1em` `opacity: .55` —
  **Cartes uniques** (`n/28`), **Complétion** (`%`), **Sacs ouverts**, **Glands**.
- « Complétion par rareté » : 6 lignes, pastille + nom + ratio, puis une barre 6px (piste
  `--color-neutral-300`, remplissage de la couleur d'encre de la rareté, `transition: width .4s`).
- « Meilleure trouvaille » : ligne cliquable (fond `--color-surface`, rayon 28px) avec la carte de
  plus haute rareté possédée en 74 × 104, son nom (18px Caprasimo) et
  `<Rareté> · <Type> · ×n`.

### Toast

`position:absolute; bottom:104px`, centré, `pointer-events:none`, fond `--color-neutral-900`, texte
`--color-bg`, 12px/600, `padding: 9px 18px`, pill, `--shadow-md`, `animation: pigRise .25s`,
auto-masqué après **1700 ms**.

---

## Assets

- **Images de cartes : manquantes.** Le prototype utilise un composant de placeholder déposable
  (`image-slot.js`) avec un identifiant par carte (`art-1` … `art-28`). En production, remplacez-le
  par une simple `<img>` en `object-fit: cover` pointant sur `assets/cards/<id sur 3 chiffres>.jpg`
  (chemin déjà présent dans `data/cards.json`). Prévoir un ratio d'image proche de **1:1**, cadré au
  centre — la zone image est plus large que haute en mini et quasi carrée en grand format.
  Format conseillé : WebP, 600 × 600 minimum, avec un fallback JPEG.
- **Icônes** : Lucide (`layout-grid`, `shopping-bag`, `package`, `copy`, `user`), stroke-width 2.75.
- **Polices** : Caprasimo + Figtree via Google Fonts (voir tokens).
- Le groin, les glands, le sachet et le dos de carte sont dessinés en CSS (pas d'asset) —
  reproduisez-les tels quels ou remplacez-les par un vrai logo quand il existera.

## Files

Dans ce bundle :

| Fichier | Rôle |
| --- | --- |
| `Grouin - TCG Cochons.dc.html` | Le prototype complet : 5 onglets, overlay détail, flux d'ouverture, toute la logique de jeu. C'est la **référence de comportement**. |
| `PigCard.dc.html` | Le composant carte (structure `shell / inner / art / nom / méta` + ornements). |
| `data/cards.json` | Base de cartes, raretés et packs prête à consommer en production. |
| `styles.css` | Le design system « Organic » : tous les tokens en variables CSS. À reprendre tel quel. |
| `image-slot.js` | Le placeholder d'image du prototype — **à ne pas porter en production**, remplacé par de vraies `<img>`. |
| `ios-frame.jsx` | Le cadre d'iPhone utilisé pour la présentation — **à ne pas porter**. |

Pour ouvrir les prototypes : servez le dossier en HTTP (`npx serve`) et ouvrez le `.dc.html`.

## À décider avant le développement

1. **Les 28 visuels de cartes** et la rareté définitive de chacun (la table actuelle est une
   proposition de répartition : 9 / 7 / 5 / 4 / 2 / 1).
2. **L'économie** : prix des packs, valeurs de recyclage et solde de départ n'ont pas été équilibrés.
   Un joueur qui recycle tout ne doit pas pouvoir s'acheter la Malle Dorée en boucle.
3. **Comptes / synchronisation** : v1 en `localStorage` seul, ou back-end dès le début ?
4. **Direction visuelle** finale : `Collector foil` seul, ou les deux avec un choix utilisateur ?
