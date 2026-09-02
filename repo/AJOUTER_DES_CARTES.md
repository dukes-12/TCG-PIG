# Ajouter / modifier des cartes

Tuto pour gérer le contenu du jeu vous-même : ajouter une carte, changer un
nom, remplacer une image, changer la rareté ou la catégorie d'une carte
existante, ou même créer une nouvelle catégorie. **Aucune des opérations
ci-dessous ne touche au code** — tout se passe dans un seul fichier JSON et
un dossier d'images.

Les deux seuls endroits à connaître :

- `src/data/cards.json` — la liste des cartes (le texte : nom, catégorie,
  rareté, chemin d'image).
- `public/assets/cards/` — les images des cartes.

Après une modification : `npm run dev` pour voir le résultat en direct, ou
`npm run build` pour vérifier que tout est valide avant de commit/push.

---

## 1. Modifier une carte existante

Ouvrez `src/data/cards.json`, trouvez la carte dans le tableau `cards` (une
entrée par carte, repérable par son `id` ou son `name`) :

```json
{
  "id": 17,
  "name": "Chevalier Jambon",
  "type": "Super-héros",
  "rarity": 3,
  "image": "assets/cards/017.jpg",
  "slotId": "art-17"
}
```

- **Nom** → changez `name`. C'est le texte affiché sur la carte, aucune
  contrainte (accents, apostrophes, espaces : tout passe).
- **Image** → changez `image` si vous voulez pointer vers un autre fichier,
  ou plus simplement **remplacez le fichier existant** dans
  `public/assets/cards/` en gardant le même nom (voir § 3 pour le format).
- **Rareté** → changez `rarity` (un chiffre de 1 à 6, voir la table au § 4).
- **Catégorie** → changez `type` (voir § 5 pour la liste actuelle ou en
  créer une nouvelle).
- `slotId` : hérité du prototype de design, pas utilisé par l'app — laissez
  `"art-<id>"` par habitude, sans y penser davantage.

Sauvegardez, rechargez `npm run dev` : le changement est immédiat.

---

## 2. Ajouter une nouvelle carte

1. **Choisissez un id libre.** Le plus simple : un de plus que le plus
   grand id actuel (58 cartes aujourd'hui → prochain id `59`).
2. **Déposez l'image** dans `public/assets/cards/`, nommée
   `<id sur 3 chiffres>.jpg` — pour l'id 59 : `059.jpg`. Voir § 3 pour le
   format attendu.
3. **Ajoutez une entrée** dans le tableau `cards` de `cards.json` (n'importe
   où dans le tableau, l'ordre n'a pas d'importance) :

   ```json
   {
     "id": 59,
     "name": "Nom de la carte",
     "type": "Hors catégorie",
     "rarity": 2,
     "image": "assets/cards/059.jpg",
     "slotId": "art-59"
   }
   ```

4. Vérifiez que le JSON reste valide : virgule après chaque entrée sauf la
   dernière du tableau, guillemets doubles partout. Un JSON cassé fait
   planter tout le build — en cas de doute, faites relire le fichier par
   Claude Code avant de commit.
5. `npm run dev` puis onglet **Collection** ou **Ouvrir** pour vérifier que
   la carte apparaît et se tire correctement.

**Retirer une carte** : supprimez son entrée du tableau et son fichier
image. Si un·e joueur·se possédait déjà cette carte (son id est dans son
`localStorage`), elle disparaîtra simplement de sa collection au prochain
chargement — pas de plantage, juste une carte en moins comptée.

---

## 3. Format des images

- **Fichier** : `.jpg`, nommé exactement comme le champ `image` de la carte
  (`assets/cards/<fichier>` → le fichier physique va dans
  `public/assets/cards/<fichier>`).
- **Cadrage** : carré ou proche du carré, sujet centré. La zone d'image
  d'une carte est légèrement plus large que haute en mini format (grille de
  collection) et quasi carrée en grand format (détail, ouverture de pack) —
  un centrage au milieu de l'image couvre les deux cas.
- **Taille** : 800×800px est ce qu'utilisent déjà les 58 cartes en place ;
  600×600 minimum recommandé. Pas besoin de compresser à la main, un simple
  export photo suffit — mais évitez les fichiers de plusieurs Mo bruts
  (photo de smartphone non recadrée) : ça alourdit inutilement le dépôt.
- **Pas d'image ?** Une carte sans fichier correspondant retombe
  automatiquement sur un placeholder teinté par sa rareté (pas d'icône
  cassée) — vous pouvez ajouter l'entrée dans `cards.json` avant d'avoir
  l'image finale, et déposer le fichier plus tard sans rien changer d'autre.

---

## 4. Table des raretés

`rarity` prend un chiffre de 1 à 6 — **n'ajoutez ni ne retirez de palier**,
les 6 sont câblés dans le rendu visuel des cartes (dégradés, animations,
ornements par rareté) ; changer ce nombre demande une vraie modification de
code, pas juste du JSON.

| `rarity` | Nom | Probabilité de tirage | Glands au recyclage |
| --- | --- | --- | --- |
| 1 | Commune | 44 % | 8 |
| 2 | Peu commune | 28 % | 22 |
| 3 | Rare | 17 % | 60 |
| 4 | Épique | 8 % | 160 |
| 5 | Légendaire | 2,5 % | 450 |
| 6 | Mythique | 0,5 % | 1500 |

Ces pourcentages sont fixés dans `cards.json` → `rarities` (le tableau juste
au-dessus de `cards`) et s'appliquent **par tirage de carte**, pas par
carte individuelle : si la rareté 1 (Commune) contient 19 cartes, chaque
tirage a 44 % de chance de tomber sur *une* Commune tirée au hasard parmi
les 19 — ajouter une 20ᵉ carte Commune ne change pas ces 44 %, juste la
carte precise qui a des chances d'apparaître dans ce lot de 44 %. Pas besoin
de recalculer quoi que ce soit en ajoutant des cartes à une rareté existante.

**Astuce répartition** : gardez la même logique que le set actuel — beaucoup
de Communes, très peu de Mythiques (idéalement une seule, LA carte chase du
set) — sinon la Mythique perd son côté exceptionnel.

---

## 5. Catégories (`type`)

Catégories actuelles (visibles dans les filtres de l'onglet Collection) :
`Super-héros`, `Politiques`, `Métiers`, `Hors catégorie`.

Pour **créer une nouvelle catégorie**, écrivez simplement le nom que vous
voulez dans le champ `type` d'une carte, et ajoutez ce même nom dans le
tableau `types` en haut de `cards.json` (c'est cette liste qui alimente les
chips de filtre « Type » de l'écran Collection) :

```json
"types": [
  "Super-héros",
  "Politiques",
  "Métiers",
  "Hors catégorie",
  "Animaux"
],
```

Aucune autre modification n'est nécessaire — le filtre, le tri par type et
les compteurs de complétion s'adaptent automatiquement à la liste.

---

## 6. Récapitulatif express

| Je veux… | Je fais… |
| --- | --- |
| Renommer une carte | `name` dans `cards.json` |
| Changer son image | remplacer le fichier dans `public/assets/cards/` (même nom), ou changer `image` |
| Changer sa rareté | `rarity` (1 à 6, voir § 4) |
| Changer sa catégorie | `type` (existante ou nouvelle, voir § 5) |
| Ajouter une carte | nouvel objet dans `cards`, + fichier image, voir § 2 |
| Retirer une carte | supprimer l'objet dans `cards` + le fichier image |
| Ajouter une catégorie | ajouter le nom dans `types`, l'utiliser dans `type` |

Ne touchez pas au nombre de paliers de `rarities` (toujours 6) ni aux noms
techniques `key`/`weight` de ce tableau sans repasser par du code — tout le
reste (`cards`, `types`) est un vrai fichier de contenu, à vous de jouer.
