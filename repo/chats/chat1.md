# Application mobile TCG cochons

_Started 2026-09-02 18:48 UTC_

---

## User

Faire une app mobile pour un tcg basé sur des cochons, l'idée serait de créer une collection et un onglet pack opener. 5 niveaux de raretés et donc 5 designs de cartes différents. Dans la collection on doit pouvoir trier par rareté, type etc. Pour l'instant les cartes ont juste un nom, une image et un design spécifique à la rareté.

## Assistant



## User

Answered — types: Super-héros, dictateurs, politiques, métiers, hors catégorie, etc; tone: Mignon / cartoon, Premium / collector, Rétro années 90, Décalé / humour; pack_feel: Tap pour déchirer le sachet puis cartes une par une, Swipe pour révéler chaque carte; pack_size: 5; screens: Collection (grille), Détail d'une carte, Ouverture de pack, Boutique / packs, Profil & stats, Doublons / échange; variations: Oui, plusieurs directions

## Assistant

_[tool: ask_user]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: copy_starter_component]_

_[tool: grep]_

_[tool: read_file]_

_[tool: copy_starter_component]_

_[tool: dc_write]_

_[tool: dc_write]_

Réponses reçues — je reprends avec tes types, les 6 écrans et 3 directions de design de cartes commutables.

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: show_html]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: dc_js_str_replace]_

_[tool: show_html]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: multi_screenshot]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: save_screenshot]_

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: grep]_

_[tool: run_script]_

_[tool: dc_js_str_replace]_

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: eval_js]_

_[tool: save_screenshot]_

_[tool: eval_js]_

_[tool: delete_file]_

_[tool: ready_for_verification]_

**Grouin** — app iOS complète, 5 onglets : Collection, Boutique, Ouvrir, Doublons, Profil.

- **27 cartes**, 5 raretés (Porcelet / Fermier / Truie d'Or / Sanglier / Mythique) et tes 5 types (Super-héros, Dictateurs, Politiques, Métiers, Hors catégorie). Noms 100 % fictifs côté dictateurs/politiques.
- **5 designs de cartes** réellement différents : cadre plat, bord sauge, foil doré + coins ornés, cadre sombre avec reflet animé, et holo animé + particules pour la mythique.
- **Tri** par rareté / nom / type / quantité, **filtres** rareté + type, recherche, bascule « possédées », doublons marqués ×n.
- **Ouverture** : tap pour déchirer le sachet → carte par carte, glisse (swipe) ou tap pour retourner, halo selon la rareté, écran butin avec badges NOUVEAU.
- **Boutique** 3 sacs (dont rare/épique garanti·e) payés en glands, gagnés en recyclant les doublons.

**3 directions visuelles** commutables dans les Tweaks (`Direction visuelle`) : *Collector foil* (par défaut), *Rétro 90s* (contour d'encre, trame, n° de série) et *Sticker cartoon* (contour blanc épais, ombre dure). Dis-moi laquelle tu gardes et je pousse celle-là plus loin.

Les emplacements d'image des cartes sont des zones de dépôt : glisse tes visuels dessus et ils apparaîtront partout dans l'app.

## User

Found issues — fixing…

## Assistant

_[tool: run_script]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Bundle du design system chargé dans les deux fichiers, et respiration ajoutée autour des pips sur les mini-cartes.

## User

pour les rareté garde des noms classqiues : commune, peu commune, rare, épique, légendaire et ajoute une carte mythique qui est le "Cochon OG"
on partira pas sur retro 90s ça c'est sur
j'aimerai que ça parte en prod et le mettre dans le projet TCG pig, j'enverrai les photos de toutes les cartes et on pourra définir les raretés de chaque

## Assistant

_[tool: run_script]_

_[tool: dc_set_props]_

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: run_script]_

_[tool: save_screenshot]_

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: delete_file]_

_[tool: ready_for_verification]_

Fait :

- **6 raretés** classiques — Commune, Peu commune, Rare, Épique, Légendaire, **Mythique** — avec un design par rareté. La Mythique est or/obsidienne (or animé, coins sertis, éclat doré) et ne contient qu'une carte : **Cochon OG**, 0,5 % de chance par carte, 1500 glands au recyclage. Je l'ai laissée possédée dans la démo pour que tu voies le design ; dis-moi si tu la veux verrouillée au départ.
- **Rétro 90s supprimé** des tweaks : il reste *Collector foil* (par défaut) et *Sticker cartoon*.

Pour la suite, deux choses de ton côté :
1. **Les photos** — envoie-les et je les place. Chaque carte a un emplacement identifié (`art-1` … `art-28`) ; le plus simple est de m'envoyer le lot avec la liste nom → rareté → type, et je remplis la base d'un coup.
2. **La prod** — je peux te préparer un package de passation pour Claude Code (structure React Native ou web, modèle de données des cartes, logique de tirage et de raretés déjà écrite). Dis-moi la cible (iOS/Android natif, ou web installable) et je le génère.

## User

Found issues — fixing…

## Assistant

_[tool: run_script]_

_[tool: grep]_

That's a card name, not a rarity — je le garde.

_[tool: ready_for_verification]_

Copie boutique corrigée : « au moins une Rare » et « au moins une Épique ».

## User

génere moi le pack pour claude code. pour l'intsant ce sera sur du web

## Assistant

_[tool: read_skill_prompt]_

_[tool: run_script]_

_[tool: write_file]_

_[tool: copy_files]_

_[tool: present_fs_item_for_download]_

Le pack est prêt (`design_handoff_grouin_tcg/`) : README exhaustif en français — tokens, modèle de données TypeScript, algorithme de tirage avec garanties, machine à états, anatomie de carte et les 6 designs de rareté valeur par valeur, les 7 écrans détaillés, keyframes — plus `data/cards.json` (28 cartes, raretés, packs) directement consommable, le `styles.css` du design system et les prototypes en référence.

Cible recommandée dedans : React + Vite + TS, état en localStorage, images statiques dans `public/assets/cards/001.jpg` … `028.jpg` — les chemins sont déjà dans le JSON, donc tes photos n'auront qu'à être nommées par id.

Veux-tu que j'ajoute des captures d'écran des designs au pack ?

## User

oui ajoute ça

