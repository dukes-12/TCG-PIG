export type RarityId = 1 | 2 | 3 | 4 | 5 | 6;

export type RarityKey =
  | 'commune'
  | 'peu_commune'
  | 'rare'
  | 'epique'
  | 'legendaire'
  | 'mythique';

export interface Rarity {
  id: RarityId;
  key: RarityKey;
  name: string;
  weight: number;
  recycleValue: number;
}

export type CardType = string;

export interface Card {
  id: number;
  name: string;
  type: CardType;
  rarity: RarityId;
  image: string;
  slotId: string;
}

export type PackKey = 'basic' | 'foire' | 'doree';

export interface Pack {
  key: PackKey;
  name: string;
  price: number;
  cards: number;
  guaranteedFloor: RarityId | null;
  subtitle: string;
}

export interface CardCatalog {
  version: number;
  types: CardType[];
  rarities: Rarity[];
  packs: Pack[];
  cards: Card[];
}

/** Les dos de carte — voir src/data/cardBacks.ts. `sceau` est le dos par
 *  défaut, les trois autres s'achètent en glands. */
export type CardBackKey = 'sceau' | 'souille' | 'deco' | 'nuit';

/** Préférence d'animations — voir src/lib/useAnimations.ts. */
export type AnimationPref = 'auto' | 'on' | 'off';

/** Avatars de profil — voir src/data/avatars.ts. Tous débloqués d'office
 *  (identité, pas une rareté à collectionner comme les dos de carte). */
export type AvatarKey =
  | 'classique'
  | 'truffe-rose'
  | 'sanglier'
  | 'dore'
  | 'nuit-violette'
  | 'prairie'
  | 'givre-bleu'
  | 'onyx';

/** Nombre de cartes par ligne dans la collection. */
export type GridCols = 2 | 3 | 4;

export type SortKey = 'rarete' | 'nom' | 'type' | 'nb';

export type TabKey = 'collection' | 'shop' | 'open' | 'dupes' | 'trades' | 'friends' | 'profile';

export type PackState = 'idle' | 'tearing' | 'reveal' | 'summary';

/** Roue de la chance — voir src/components/WheelOverlay.tsx. */
export type WheelState = 'idle' | 'spinning' | 'result';
