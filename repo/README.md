# Grouin — TCG cochons

Collectionne, ouvre des sacs, complète ta bassecour. Implémentation web (React +
Vite + TypeScript) du design **Grouin** exporté depuis Claude Design — voir
`project/design_handoff_grouin_tcg/README.md` pour la spec de design complète
(tokens, modèle de données, anatomie de carte, écrans) et `chats/chat1.md` pour
l'historique des décisions produit.

## Lancer le projet

```bash
npm install
npm run dev       # http://localhost:5173
npm run build      # build de prod dans dist/
npm run preview    # sert le build de prod
```

Pour ajouter/modifier des cartes vous-même (nom, image, rareté, catégorie)
sans toucher au code : voir **[`AJOUTER_DES_CARTES.md`](./AJOUTER_DES_CARTES.md)**.

## Structure

- `src/data/` — `cards.json` (58 cartes, raretés, packs) + métadonnées de
  présentation qui n'étaient pas dans le JSON (couleurs d'encre/halo par
  rareté, dégradés de pack).
- `src/lib/cardVisual.ts` — le langage visuel des cartes (6 raretés × 2
  directions), porté champ par champ depuis `build()` dans le prototype.
- `src/lib/draw.ts` — algorithme de tirage (`roll` / `openPack`), avec les
  garanties de rareté par pack et le filet de sécurité.
- `src/state/store.ts` — état du jeu (Zustand), persistance `localStorage` de
  `owned` / `glands` / `stock` / `openedCount` / `cardStyle`.
- `src/screens/` — les 5 onglets (Collection, Boutique, Ouvrir, Doublons,
  Profil), un fichier par écran, routés par `react-router` (`/collection`,
  `/shop`, `/open`, `/dupes`, `/profile`).
- `src/components/` — `PigCard` (le composant carte), `CardArt` (art +
  fallback placeholder), `TabBar`, `Toast`, `CardDetailOverlay`, etc.

## Décisions prises pendant l'implémentation

Le handoff laissait quelques points ouverts (section « À décider avant le
développement » du README de `design_handoff_grouin_tcg/`) ; voici comment ils
ont été tranchés pour cette v1 — à révisiter avec l'utilisateur :

1. **Direction visuelle** : les **deux** directions (`Sticker cartoon` et
   `Collector foil`) sont implémentées, commutables dans Profil → *Style des
   cartes*. **`Sticker cartoon` est la valeur par défaut** (le prototype avait
   `Collector foil` par défaut — inversé ici sur demande explicite).
2. **Visuels des cartes** : en place, tirés du zip de designs envoyé —
   `CardArt` charge `/assets/cards/<id sur 3 chiffres>.jpg` (chemin déjà dans
   `cards.json`) et retombe sur un placeholder stylé si un fichier manque.
   Voir « Tri des visuels envoyés » ci-dessous pour le détail de la sélection
   et **ce qui a été écarté**.
3. **État initial / économie** : v1 en `localStorage` uniquement (pas de
   compte), état neuf plutôt que l'état de démo du prototype — `owned: {}`,
   `glands: 0`, `stock: { basic: 3, foire: 0, doree: 0 }` (3 sacs de base
   offerts pour découvrir l'ouverture sans attendre). Prix des packs et
   valeurs de recyclage repris tels quels du prototype — **non équilibrés**,
   comme noté dans le handoff.
4. **Routing** : les 5 onglets sont de vraies routes (`react-router`,
   `HashRouter` pour rester compatible avec un hébergement statique simple) —
   le prototype gérait ça en state interne sans URL.
5. **`prefers-reduced-motion`** : les animations décoratives (foil, reflet,
   particules) se désactivent automatiquement si l'utilisateur·rice a demandé
   moins de mouvement au niveau OS — pas dans le prototype, ajout raisonnable
   pour le web.
6. **Ouverture de pack — anti-spoil** : au changement de carte pendant la
   révélation, le nouveau visuel n'est chargé qu'une fois la carte
   précédente entièrement retournée face cachée (après la transition CSS de
   620 ms), au lieu d'être basculé en même temps que le déclenchement du
   flip. Sans ça, la carte suivante flashait brièvement face visible avant
   de se retourner — un vrai bug de spoil, pas un choix du prototype.
7. **Coins sertis retirés** : l'ornement « 4 disques dorés aux coins »
   prévu pour les raretés Rare et Mythique (spec du handoff) se superposait
   au nom/type en mini format — retiré de `cardVisual.ts`/`PigCard.tsx`.
8. **Booster gratuit** (pas dans le design original) : un sac de glands
   toutes les heures, jusqu'à 3 empilés — passé ce plafond le minuteur se
   met en pause et repart dès qu'un des sacs en stock est ouvert. Basé sur
   un horodatage (`nextFreeBoosterAt`), pas un compteur qui tourne, donc ça
   rattrape correctement plusieurs heures passées avec l'app fermée.
   Bannière dédiée en haut de la Boutique, séparée du stock acheté — voir
   `src/state/store.ts` (`reconcileFreeBoosters`/`claimFreeBooster`) et
   `src/components/FreeBoosterBanner.tsx`.
9. **Sélecteur de pack dans Ouvrir** (pas dans le design original) : trois
   pastilles en haut de l'écran Ouvrir (une par pack, comptage en poche,
   grisée si vide) pour changer de pack directement, sans repasser par la
   Boutique — `src/components/PackPicker.tsx`.
10. **Plus d'auto-flip** : dans le prototype, chaque carte se retournait
    seule après 360 ms si on ne touchait rien. Sur demande explicite,
    retiré — une carte reste face cachée tant qu'on ne la touche pas
    (le texte d'indice « Touche pour retourner » était déjà cohérent avec
    ce fonctionnement, aucune copie à changer).

Points du handoff encore ouverts, à trancher avec l'utilisateur : équilibrage
de l'économie, comptes/synchronisation au-delà de `localStorage`.

## Tri des visuels envoyés (`Designs.zip`)

Le zip envoyé contenait **141 photos**, pas 28, sans mapping vers les
personnages du handoff. Une bonne partie ne pouvait pas aller dans une app
destinée à la prod : symboles haineux (uniforme SS + croix gammée, cagoule
KKK, stéréotype terroriste turban+AK-47), des personnes réelles identifiables
(Trump, Kim Jong-un, Fidel Castro, un dignitaire religieux, des noms explicites
incrustés dans l'image), des personnages sous copyright/marque (Marvel, DC,
Simpson, Dragon Ball, Pokémon, Nintendo, Transformers, logos Gucci/Nike/DHL…),
et des références gratuitement glauques (drogue, une hache ensanglantée, « I
CAN'T BREATHE »). Ces catégories ont été exclues sans exception.

Toutes les **58 images saines** restantes sont utilisées, une carte par
image, avec un nom, une rareté et une catégorie assignés à partir du contenu
visuel (comme demandé). Conséquence directe : la catégorie **« Dictateurs »
a été supprimée** — aucune image saine ne correspondait à ce thème (les
seules dispos étaient soit un vrai dictateur historique, soit un symbole
haineux) ; ses cartes ont été redistribuées sur les 4 catégories restantes.

Répartition par rareté (même forme que la proposition du handoff — beaucoup
de communes, très peu de mythiques — mise à l'échelle sur 58 cartes plutôt
que 28) : **Commune 19 · Peu commune 15 · Rare 11 · Épique 8 · Légendaire 4 ·
Mythique 1**. La Mythique reste volontairement unique — c'est la carte chase
du set (`Éclat de Diamant`).

Mapping carte → fichier source (dans le zip original, sous `Designs/`), pour
traçabilité :

| id | nom | type | rareté | fichier source |
| -- | --- | ---- | ------ | --------------- |
| 1 | Docteur Groin | Métiers | Commune | IMG_2534.JPG |
| 2 | Chef Cuistot Bacon | Métiers | Commune | IMG_2591.JPG |
| 3 | Commandant Groinfort | Métiers | Commune | IMG_0150.JPG |
| 4 | Présentateur Groink | Métiers | Commune | b69579e4….JPG |
| 5 | Curé Cochonnet | Métiers | Commune | b7dc3811….JPG |
| 6 | Professeur Museau | Métiers | Commune | IMG_0145.JPG |
| 7 | Le Gamin du Quartier | Hors catégorie | Commune | IMG_2535.JPG |
| 8 | Ceinture Noire Groin | Super-héros | Commune | bbf25719….JPG |
| 9 | Contractuel Groink | Métiers | Commune | IMG_0148.JPG |
| 10 | Cochon de Bronze | Hors catégorie | Peu commune | 351c4e56….JPG |
| 11 | Nomade du Désert | Hors catégorie | Peu commune | 01d2c651….JPG |
| 12 | Guerrier des Steppes | Super-héros | Peu commune | df1fff67….JPG |
| 13 | Le Gnome Groink | Hors catégorie | Peu commune | IMG_0349.JPG |
| 14 | Bandit des Plaines | Hors catégorie | Peu commune | IMG_2595.JPG |
| 15 | Coin-Coin Porcinet | Hors catégorie | Peu commune | IMG_2590.JPG |
| 16 | Le Maharadja | Politiques | Peu commune | 9000d5f1….JPG |
| 17 | Chevalier Jambon | Super-héros | Rare | 11d358e6….JPG |
| 18 | Samouraï Porcinet | Hors catégorie | Rare | e7294617….JPG |
| 19 | Sorcier Groink | Hors catégorie | Rare | d83e9a4c….JPG |
| 20 | L'Empereur Céleste | Politiques | Rare | dcf43140….JPG |
| 21 | Zombie Groin | Hors catégorie | Rare | IMG_2674.JPG |
| 22 | Museau de Palladium | Hors catégorie | Épique | IMG_0132.JPG |
| 23 | Cyber-Groin | Super-héros | Épique | 9a6ceccb….JPG |
| 24 | Robo-Lardon | Super-héros | Épique | IMG_2675.JPG |
| 25 | Mutant Groin-Vert | Super-héros | Épique | IMG_0134.JPG |
| 26 | Le Porcelet d'Or | Hors catégorie | Légendaire | IMG_0133.JPG |
| 27 | Truffe d'Améthyste | Hors catégorie | Légendaire | f90614d6….JPG |
| 28 | Éclat de Diamant | Hors catégorie | Mythique | f0a6e8aa….JPG |
| 29 | Cochon de Verre | Hors catégorie | Commune | 7140e52f….JPG |
| 30 | Étudiant Sérieux | Hors catégorie | Commune | 89f9a57f….JPG |
| 31 | Cochon d'Émeraude | Hors catégorie | Commune | IMG_0135.JPG |
| 32 | Le Placide | Hors catégorie | Commune | IMG_2539.JPG |
| 33 | Le Discret | Hors catégorie | Commune | IMG_2537.JPG |
| 34 | Lampe de Chevet Groink | Hors catégorie | Commune | IMG_2593.JPG |
| 35 | Esquimau Porcinet | Hors catégorie | Commune | IMG_2671.JPG |
| 36 | Chenille Groin-Segmentée | Hors catégorie | Commune | IMG_2672.JPG |
| 37 | Le Notable | Politiques | Commune | add3b9c5….JPG |
| 38 | Cochon Tout Simple | Hors catégorie | Commune | IMG_2526.JPG |
| 39 | Pilote en Herbe | Hors catégorie | Peu commune | 463a3e2c….JPG |
| 40 | Punk Solidaire | Hors catégorie | Peu commune | 6f5b2bc8….JPG |
| 41 | Gamer Groinstyle | Hors catégorie | Peu commune | 7f196767….JPG |
| 42 | Trader Groinstonks | Métiers | Peu commune | IMG_0151.JPG |
| 43 | Sage du Désert | Hors catégorie | Peu commune | IMG_2529.JPG |
| 44 | Plongeur Groin-Bulle | Métiers | Peu commune | IMG_2542.JPG |
| 45 | Vagabonde Bohème | Hors catégorie | Peu commune | a900a74f….JPG |
| 46 | Trendsetter Groink | Hors catégorie | Peu commune | e3ac0ca9….JPG |
| 47 | Le Costaud du Coin | Super-héros | Rare | IMG_0580.JPG |
| 48 | Punk Groin-Iroquois | Hors catégorie | Rare | IMG_2541.JPG |
| 49 | Agent Groin-Choc | Métiers | Rare | IMG_0152.JPG |
| 50 | Le Ministre Groin | Politiques | Rare | IMG_0156.JPG |
| 51 | Voyageur du Levant | Hors catégorie | Rare | IMG_0173.JPG |
| 52 | Rebelle à Crête | Hors catégorie | Rare | IMG_2669.JPG |
| 53 | Capitaine Groin-Rouge | Super-héros | Épique | IMG_0166.JPG |
| 54 | L'Esprit du Grenier | Hors catégorie | Épique | IMG_0581.JPG |
| 55 | L'Ombre sans Visage | Hors catégorie | Épique | IMG_0171.JPG |
| 56 | Diplodocus Groink | Hors catégorie | Épique | b1bb9302….JPG |
| 57 | La Tour Groinfel | Hors catégorie | Légendaire | IMG_0175.JPG |
| 58 | L'Écolière Modèle | Hors catégorie | Légendaire | c38281e0….JPG |

Deux images par ailleurs saines n'ont **pas** été retenues malgré tout,
remplacées par les 2 suivantes de la sélection pour garder 58 cartes :
- un personnage « rockeuse » portait une **signature d'artiste visible** —
  droits d'auteur incertains, écartée par prudence (remplacée par #13, le
  gnome) ;
- une tête emmitouflée fumante posée sur une base marron tachetée lisait
  comme un clin d'œil « cigarette » — écartée par cohérence avec les autres
  visuels de cigarette exclus (remplacée par #32, Le Placide).

**À revoir avec l'utilisateur** : ce roster est une proposition raisonnable
faite pour débloquer la v1, pas une validation créative — noms, répartition
par rareté et choix définitif des visuels restent à confirmer.

---

# CODING AGENTS: READ THIS FIRST (handoff bundle d'origine)

This is a **handoff bundle** from Claude Design (claude.ai/design).

A user mocked up designs in HTML/CSS/JS using an AI design tool, then exported this bundle so a coding agent can implement the designs for real.

## What you should do — IMPORTANT

**Read the chat transcripts first.** There are 1 chat transcript(s) in `chats/`. The transcripts show the full back-and-forth between the user and the design assistant — they tell you **what the user actually wants** and **where they landed** after iterating. Don't skip them. The final HTML files are the output, but the chat is where the intent lives.

**Read `project/Grouin - TCG Cochons.dc.html` in full.** The user had this file open when they triggered the handoff, so it's almost certainly the primary design they want built. Read it top to bottom — don't skim. Then **follow its imports**: open every file it pulls in (shared components, CSS, scripts) so you understand how the pieces fit together before you start implementing.

**If anything is ambiguous, ask the user to confirm before you start implementing.** It's much cheaper to clarify scope up front than to build the wrong thing.

## About the design files

The design medium is **HTML/CSS/JS** — these are prototypes, not production code. Your job is to **recreate them pixel-perfectly** in whatever technology makes sense for the target codebase (React, Vue, native, whatever fits). Match the visual output; don't copy the prototype's internal structure unless it happens to fit.

**Don't render these files in a browser or take screenshots unless the user asks you to.** Everything you need — dimensions, colors, layout rules — is spelled out in the source. Read the HTML and CSS directly; a screenshot won't tell you anything they don't.

## Bundle contents

- `README.md` — this file
- `chats/` — conversation transcripts (read these!)
- `project/` — the `Grouin : app TCG cochons` project files (HTML prototypes, assets, components)
