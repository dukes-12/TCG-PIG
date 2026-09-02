import raw from './cards.json';
import type { CardCatalog } from '../types';

/** The card/rarity/pack database — id, name, type, rarity, image path.
 *  Ported verbatim from the handoff's `data/cards.json`. */
export const CATALOG = raw as CardCatalog;

export const RARITIES = CATALOG.rarities;
export const TYPES = CATALOG.types;
export const CARDS = CATALOG.cards;
export const PACKS = CATALOG.packs;

export const TOTAL_CARDS = CARDS.length;

export function cardById(id: number) {
  return CARDS.find((c) => c.id === id);
}

export function rarityById(id: number) {
  return RARITIES.find((r) => r.id === id)!;
}

export function packByKey(key: string) {
  return PACKS.find((p) => p.key === key)!;
}
