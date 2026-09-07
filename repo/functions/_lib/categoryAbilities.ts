/** Pouvoir des cartes, lié à leur CATÉGORIE (`card.type` — 31 valeurs
 *  distinctes du catalogue une fois les coquilles fusionnées, voir
 *  categoryAbilityFor plus bas), PAS à leur camp (fiction/culture/pouvoir,
 *  3 valeurs seulement — voir CAMP_BEATS dans battle.ts, mécanique
 *  différente et indépendante de celle-ci). Chaque catégorie a UN passif
 *  (toujours actif, aucune décision du joueur) et UNE capacité active (se
 *  déclenche automatiquement au tout premier tour où la carte agit — pas
 *  de bouton "utiliser" séparé, pour garder le combat aussi simple à
 *  jouer qu'avant : voir stepBattle/resolveBattle dans battle.ts,
 *  `usedActiveC`/`usedActiveO`).
 *
 *  DUPLIQUÉ depuis src/lib/categoryAbilities.ts (même contenu, caractère
 *  pour caractère) — même raison que pour battle.ts : les Pages Functions
 *  n'importent pas src/lib (voir cardMeta.ts). Si cette table change, la
 *  changer identiquement des deux côtés.
 *
 *  Volontairement construit sur une petite boîte à outils de mécaniques
 *  réutilisables (8 formes de passif, 5 formes d'actif) plutôt que 31
 *  effets tous différents : sinon, avec 276 cartes à répartir sur 31
 *  catégories, impossible à écrire ET à équilibrer proprement. Deux
 *  catégories qui partagent une forme restent distinctes par leur
 *  magnitude et leur thème (nom/icône/texte).
 *
 *  ⚠️ CALIBRÉ PAR SIMULATION, PAS À L'ŒIL (voir IDEES_AMIS_COMBAT.md,
 *  dix-septième passage) — deux allers-retours :
 *  - D'abord vérifié que les capacités ne rallongent PAS les combats :
 *    une première mesure semblait montrer un x3 (43 tours au lieu de
 *    ~14-15), qui s'est révélé être un artefact du script de test (rareté
 *    tirée au hasard de 1 à 6 au lieu de la rareté 3 fixe du calibrage
 *    d'origine) — à rareté égale, AVANT et APRÈS les capacités donnent le
 *    même ~13-14 tours en moyenne. Rien à corriger de ce côté.
 *  - Le vrai problème, confirmé par une équipe monocatégorie (5 cartes du
 *    même type, catégories d'au moins 5 cartes seulement — sinon
 *    complétée par du remplissage aléatoire qui noie le signal) contre
 *    une équipe adverse mélangée : `durability` et l'ex-`ignoreBlock`
 *    donnaient 88-99% de victoires, un passif purement `block` (sans rien
 *    pour l'attaque) 11-22% — signal net et reproductible, contrairement
 *    au reste (crit/thorns/lifesteal/atk), dont les écarts d'une
 *    simulation à l'autre pour une MÊME forme suggéraient plutôt du bruit
 *    statistique que des catégories réellement cassées. Corrigé
 *    spécifiquement : `durability` divisé par ~2 partout, et
 *    `ignoreBlock` (immunité TOTALE au blocage — la seule mécanique
 *    multiplicative du lot, elle n'atténue pas un chiffre, elle annule un
 *    tirage entier) remplacé par `blockReduction` à 35% (réduction forte
 *    mais partielle : une carte peut encore, plus rarement, se faire
 *    bloquer). Un passif purement défensif comme `block` reste plus
 *    faible que la moyenne du lot — accepté tel quel plutôt que
 *    retouché à l'aveugle : voir le passage pour le raisonnement complet
 *    et pourquoi une égalité parfaite à 31 catégories n'a pas été
 *    poursuivie plus loin. */

export type PassiveEffect =
  /** +pct % d'ATTAQUE — ne compte que quand la carte est en posture
   *  Attaque (c'est l'ATTAQUE qui frappe). */
  | { kind: 'atk'; pct: number }
  /** +pct % de DÉFENSE — ne compte que quand la carte est en posture
   *  Défense (c'est la DÉFENSE qui mitige les coups reçus par l'écran). */
  | { kind: 'def'; pct: number }
  /** +pct de chance de coup critique (additif à CRIT_CHANCE), quand la
   *  carte attaque. */
  | { kind: 'crit'; pct: number }
  /** +pct de chance de bloquer un coup (additif à BLOCK_CHANCE), quand la
   *  carte encaisse en tant que carte-écran. */
  | { kind: 'block'; pct: number }
  /** +pct % sur la durabilité MAX de l'écran spécifiquement (distinct de
   *  `def` : une carte peut mitiger pareil par coup mais tenir plus de
   *  coups au total, ou l'inverse) — posture Défense uniquement. */
  | { kind: 'durability'; pct: number }
  /** Récupère pct % des dégâts infligés en PV pour son équipe, quand la
   *  carte touche en attaquant (coup bloqué = 0 dégât = rien à récupérer). */
  | { kind: 'lifesteal'; pct: number }
  /** Renvoie pct % des dégâts encaissés directement en PV à l'équipe
   *  attaquante, quand cette carte-écran est touchée (coup bloqué = rien
   *  à renvoyer). */
  | { kind: 'thorns'; pct: number }
  /** Réduit la chance de bloquer ses attaques de pct % (MULTIPLICATIF sur
   *  BLOCK_CHANCE, ex. pct=0.6 → 40% de la chance normale) — PAS une
   *  immunité totale : la première version ('ignoreBlock', bloquer devenait
   *  impossible) s'est révélée bien trop forte à l'usage, voir l'en-tête. */
  | { kind: 'blockReduction'; pct: number };

export type ActiveAbility =
  /** Ce tour : dégâts × (1 + pct) avant tirage crit/bouclier (peut encore
   *  critiquer ou être bloqué normalement). */
  | { kind: 'powerStrike'; pct: number }
  /** Ce tour : ignore la DÉFENSE de la cible (dégâts = ATTAQUE brute). */
  | { kind: 'guardBreak' }
  /** Ce tour : coup critique garanti et imblocable. */
  | { kind: 'trueStrike' }
  /** Restaure pct % des PV MAX de sa propre équipe (plafonné au max). */
  | { kind: 'heal'; pct: number }
  /** Restaure pct % de la durabilité MAX à la carte-écran la plus abîmée
   *  (encore en vie) de sa propre équipe — rien si l'écran est déjà
   *  entièrement détruit. */
  | { kind: 'fortify'; pct: number };

export interface CategoryAbility {
  icon: string;
  passiveLabel: string;
  passiveDesc: string;
  passive: PassiveEffect;
  activeLabel: string;
  activeDesc: string;
  active: ActiveAbility;
}

export const CATEGORY_ABILITIES: Record<string, CategoryAbility> = {
  'Super-héros': {
    icon: '🦸',
    passiveLabel: 'Sixième sens',
    passiveDesc: '+5% de chance de coup critique en attaquant.',
    passive: { kind: 'crit', pct: 0.05 },
    activeLabel: 'Justice ultime',
    activeDesc: 'À sa première action : coup critique garanti, imblocable.',
    active: { kind: 'trueStrike' },
  },
  'Harry Potter': {
    icon: '🪄',
    passiveLabel: 'Protego',
    passiveDesc: '+7% de chance de bloquer un coup, en Défense.',
    passive: { kind: 'block', pct: 0.07 },
    activeLabel: 'Reparo',
    activeDesc: 'À sa première action : répare 24% de l\'écran allié le plus abîmé.',
    active: { kind: 'fortify', pct: 0.24 },
  },
  YuGiOh: {
    icon: '🃏',
    passiveLabel: 'Carte piège',
    passiveDesc: 'Ses attaques ont 35% moins de chances d\'être bloquées.',
    passive: { kind: 'blockReduction', pct: 0.35 },
    activeLabel: 'Effet de carte',
    activeDesc: 'À sa première action : ignore la DÉFENSE de la cible.',
    active: { kind: 'guardBreak' },
  },
  Fantastique: {
    icon: '🐉',
    passiveLabel: 'Écailles anciennes',
    passiveDesc: '+5% de durabilité max, en Défense.',
    passive: { kind: 'durability', pct: 0.05 },
    activeLabel: 'Régénération',
    activeDesc: 'À sa première action : restaure 8% des PV max de son équipe.',
    active: { kind: 'heal', pct: 0.08 },
  },
  'One Piece': {
    icon: '🏴‍☠️',
    passiveLabel: 'Haki',
    passiveDesc: '+10% ATTAQUE.',
    passive: { kind: 'atk', pct: 0.1 },
    activeLabel: 'Gear 4',
    activeDesc: 'À sa première action : +45% de dégâts ce tour.',
    active: { kind: 'powerStrike', pct: 0.45 },
  },
  'Star Wars': {
    icon: '🚀',
    passiveLabel: 'Précision Mandalorienne',
    passiveDesc: '+6% de chance de coup critique en attaquant.',
    passive: { kind: 'crit', pct: 0.06 },
    activeLabel: 'Frappe chirurgicale',
    activeDesc: 'À sa première action : coup critique garanti, imblocable.',
    active: { kind: 'trueStrike' },
  },
  'Jeux-vidéo': {
    icon: '🎮',
    passiveLabel: 'Potion de vie',
    passiveDesc: 'Récupère 7% des dégâts infligés en PV pour son équipe.',
    passive: { kind: 'lifesteal', pct: 0.07 },
    activeLabel: 'Checkpoint',
    activeDesc: 'À sa première action : restaure 10% des PV max de son équipe.',
    active: { kind: 'heal', pct: 0.1 },
  },
  Mangas: {
    icon: '📖',
    passiveLabel: 'Cri de combat',
    passiveDesc: '+8% ATTAQUE.',
    passive: { kind: 'atk', pct: 0.08 },
    activeLabel: 'Page finale',
    activeDesc: 'À sa première action : +40% de dégâts ce tour.',
    active: { kind: 'powerStrike', pct: 0.4 },
  },
  BD: {
    icon: '💥',
    passiveLabel: 'Case de protection',
    passiveDesc: '+8% DÉFENSE, en Défense.',
    passive: { kind: 'def', pct: 0.08 },
    activeLabel: 'Rebond de planche',
    activeDesc: 'À sa première action : répare 20% de l\'écran allié le plus abîmé.',
    active: { kind: 'fortify', pct: 0.2 },
  },
  Mythologie: {
    icon: '⚡',
    passiveLabel: 'Malédiction',
    passiveDesc: '9% des dégâts encaissés (en Défense) sont renvoyés en PV.',
    passive: { kind: 'thorns', pct: 0.09 },
    activeLabel: 'Foudre divine',
    activeDesc: 'À sa première action : ignore la DÉFENSE de la cible.',
    active: { kind: 'guardBreak' },
  },
  'Dragon Ball': {
    icon: '🔥',
    passiveLabel: 'Aura de combat',
    passiveDesc: '+10% ATTAQUE.',
    passive: { kind: 'atk', pct: 0.1 },
    activeLabel: 'Kaméhaméha',
    activeDesc: 'À sa première action : +50% de dégâts ce tour.',
    active: { kind: 'powerStrike', pct: 0.5 },
  },
  Pokemon: {
    icon: '🐾',
    passiveLabel: 'Coup critique !',
    passiveDesc: '+5% de chance de coup critique en attaquant.',
    passive: { kind: 'crit', pct: 0.05 },
    activeLabel: 'Attaque éclair',
    activeDesc: 'À sa première action : coup critique garanti, imblocable.',
    active: { kind: 'trueStrike' },
  },
  Film: {
    icon: '🎬',
    passiveLabel: 'Scène de rédemption',
    passiveDesc: 'Récupère 5% des dégâts infligés en PV pour son équipe.',
    passive: { kind: 'lifesteal', pct: 0.05 },
    activeLabel: 'Happy end',
    activeDesc: 'À sa première action : restaure 9% des PV max de son équipe.',
    active: { kind: 'heal', pct: 0.09 },
  },
  'Série': {
    icon: '📺',
    passiveLabel: 'Saison suivante',
    passiveDesc: '+4% de durabilité max, en Défense.',
    passive: { kind: 'durability', pct: 0.04 },
    activeLabel: 'Cliffhanger résolu',
    activeDesc: 'À sa première action : répare 18% de l\'écran allié le plus abîmé.',
    active: { kind: 'fortify', pct: 0.18 },
  },
  Simpson: {
    icon: '🍩',
    passiveLabel: 'D\'oh !',
    passiveDesc: '+6% de chance de bloquer un coup, en Défense.',
    passive: { kind: 'block', pct: 0.06 },
    activeLabel: 'Increvable',
    activeDesc: 'À sa première action : restaure 10% des PV max de son équipe.',
    active: { kind: 'heal', pct: 0.1 },
  },
  Politiques: {
    icon: '🏛️',
    passiveLabel: 'Discours qui porte',
    passiveDesc: '+7% ATTAQUE.',
    passive: { kind: 'atk', pct: 0.07 },
    activeLabel: 'Décret',
    activeDesc: 'À sa première action : ignore la DÉFENSE de la cible.',
    active: { kind: 'guardBreak' },
  },
  Religion: {
    icon: '🙏',
    passiveLabel: 'Foi inébranlable',
    passiveDesc: '+5% de durabilité max, en Défense.',
    passive: { kind: 'durability', pct: 0.05 },
    activeLabel: 'Miracle',
    activeDesc: 'À sa première action : restaure 12% des PV max de son équipe.',
    active: { kind: 'heal', pct: 0.12 },
  },
  Dictateurs: {
    icon: '👊',
    passiveLabel: 'Pouvoir absolu',
    passiveDesc: '+12% ATTAQUE.',
    passive: { kind: 'atk', pct: 0.12 },
    activeLabel: 'Culte de la personnalité',
    activeDesc: 'À sa première action : +55% de dégâts ce tour.',
    active: { kind: 'powerStrike', pct: 0.55 },
  },
  'Métiers': {
    icon: '🛠️',
    passiveLabel: 'Travail d\'équipe',
    passiveDesc: 'Récupère 6% des dégâts infligés en PV pour son équipe.',
    passive: { kind: 'lifesteal', pct: 0.06 },
    activeLabel: 'Heures sup',
    activeDesc: 'À sa première action : répare 18% de l\'écran allié le plus abîmé.',
    active: { kind: 'fortify', pct: 0.18 },
  },
  'Célébrités': {
    icon: '📸',
    passiveLabel: 'Coup marketing',
    passiveDesc: '+6% de chance de coup critique en attaquant.',
    passive: { kind: 'crit', pct: 0.06 },
    activeLabel: 'Buzz viral',
    activeDesc: 'À sa première action : coup critique garanti, imblocable.',
    active: { kind: 'trueStrike' },
  },
  Sapeurs: {
    icon: '🧥',
    passiveLabel: 'Style impeccable',
    passiveDesc: '+10% DÉFENSE, en Défense.',
    passive: { kind: 'def', pct: 0.1 },
    activeLabel: 'Repassage impeccable',
    activeDesc: 'À sa première action : répare 20% de l\'écran allié le plus abîmé.',
    active: { kind: 'fortify', pct: 0.2 },
  },
  Humains: {
    icon: '🧠',
    passiveLabel: 'Instinct de survie',
    passiveDesc: '+5% de chance de bloquer un coup, en Défense.',
    passive: { kind: 'block', pct: 0.05 },
    activeLabel: 'Résilience',
    activeDesc: 'À sa première action : restaure 8% des PV max de son équipe.',
    active: { kind: 'heal', pct: 0.08 },
  },
  Art: {
    icon: '🎨',
    passiveLabel: 'Ça passe les âges',
    passiveDesc: '+5% de durabilité max, en Défense.',
    passive: { kind: 'durability', pct: 0.05 },
    activeLabel: 'Restauration',
    activeDesc: 'À sa première action : répare 18% de l\'écran allié le plus abîmé.',
    active: { kind: 'fortify', pct: 0.18 },
  },
  Fruits: {
    icon: '🍎',
    passiveLabel: 'Plein de vitamines',
    passiveDesc: 'Récupère 7% des dégâts infligés en PV pour son équipe.',
    passive: { kind: 'lifesteal', pct: 0.07 },
    activeLabel: 'Jus frais',
    activeDesc: 'À sa première action : restaure 10% des PV max de son équipe.',
    active: { kind: 'heal', pct: 0.1 },
  },
  Meme: {
    icon: '😂',
    passiveLabel: 'Ça devient viral',
    passiveDesc: 'Ses attaques ont 35% moins de chances d\'être bloquées.',
    passive: { kind: 'blockReduction', pct: 0.35 },
    activeLabel: 'Ça a pris',
    activeDesc: 'À sa première action : +45% de dégâts ce tour.',
    active: { kind: 'powerStrike', pct: 0.45 },
  },
  Graille: {
    icon: '🍗',
    passiveLabel: 'Bien nourri',
    passiveDesc: 'Récupère 8% des dégâts infligés en PV pour son équipe.',
    passive: { kind: 'lifesteal', pct: 0.08 },
    activeLabel: 'Resto du cœur',
    activeDesc: 'À sa première action : restaure 11% des PV max de son équipe.',
    active: { kind: 'heal', pct: 0.11 },
  },
  'Eléments chimique': {
    icon: '🧪',
    passiveLabel: 'Réaction explosive',
    passiveDesc: '8% des dégâts encaissés (en Défense) sont renvoyés en PV.',
    passive: { kind: 'thorns', pct: 0.08 },
    activeLabel: 'Réaction en chaîne',
    activeDesc: 'À sa première action : ignore la DÉFENSE de la cible.',
    active: { kind: 'guardBreak' },
  },
  'Hors catégorie': {
    icon: '🎲',
    passiveLabel: 'Difficile à cerner',
    passiveDesc: '+7% de chance de bloquer un coup, en Défense.',
    passive: { kind: 'block', pct: 0.07 },
    activeLabel: 'Anonymat récupérateur',
    activeDesc: 'À sa première action : restaure 9% des PV max de son équipe.',
    active: { kind: 'heal', pct: 0.09 },
  },
  Dinosaures: {
    icon: '🦖',
    passiveLabel: 'Force préhistorique',
    passiveDesc: '+13% ATTAQUE.',
    passive: { kind: 'atk', pct: 0.13 },
    activeLabel: 'Rugissement',
    activeDesc: 'À sa première action : +60% de dégâts ce tour.',
    active: { kind: 'powerStrike', pct: 0.6 },
  },
  LOTR: {
    icon: '💍',
    passiveLabel: 'La communauté ne cède pas',
    passiveDesc: '+7% de durabilité max, en Défense.',
    passive: { kind: 'durability', pct: 0.07 },
    activeLabel: 'Un anneau pour les réparer tous',
    activeDesc: 'À sa première action : répare 24% de l\'écran allié le plus abîmé.',
    active: { kind: 'fortify', pct: 0.24 },
  },
  'Mystère': {
    icon: '❓',
    passiveLabel: 'On ne sait jamais',
    passiveDesc: '+8% de chance de coup critique en attaquant.',
    passive: { kind: 'crit', pct: 0.08 },
    activeLabel: 'Effet de surprise',
    activeDesc: 'À sa première action : coup critique garanti, imblocable.',
    active: { kind: 'trueStrike' },
  },
};

/** Capacité de catégorie d'une carte, à partir de son `type` — repli sur
 *  "Hors catégorie" pour un type non répertorié (aucun aujourd'hui, filet
 *  de sécurité si le catalogue change). `.trim()` : " Mangas" (avec un
 *  espace de tête, coquille dans cards.json — deux cartes) partage ainsi
 *  directement l'entrée de "Mangas" plutôt que de rester sans capacité. */
export function categoryAbilityFor(type: string): CategoryAbility {
  return CATEGORY_ABILITIES[type.trim()] ?? CATEGORY_ABILITIES['Hors catégorie'];
}
