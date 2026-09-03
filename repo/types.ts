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

// A plain string, not a fixed union: the card types are whatever's listed in
// cards.json's `types` array, so adding a new category is a JSON-only edit —
// see CONTRIBUTING.md — with no TypeScript union to keep in sync.
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

/** Nombre de cartes par ligne dans la collection. */
export type GridCols = 2 | 3 | 4;

export type SortKey = 'rarete' | 'nom' | 'type' | 'nb';

export type TabKey = 'collection' | 'shop' | 'open' | 'dupes' | 'profile';

export type PackState = 'idle' | 'tearing' | 'reveal' | 'summary';
