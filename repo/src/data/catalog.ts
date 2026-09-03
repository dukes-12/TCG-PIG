import raw from './cards.json';
import type { CardCatalog } from '../types';

/** The card/rarity/pack database — id, name, type, rarity, image path.
 *  Ported verbatim from the handoff's `data/cards.json`. */
export const CATALOG = raw as CardCatalog;

export const RARITIES = CATALOG.rarities;
export const TYPES = CATALOG.types;
export const CARDS = CATALOG.cards;
export const PACKS = CATALOG.packs;

/** La carte secrète — poids 0, jamais tirée par la table pondérée normale
 *  (voir SECRET_CHANCE dans lib/draw.ts). Un seul exemplaire dans tout le
 *  jeu, jamais visible d'un autre joueur (Amis/Échanges), toujours en bas
 *  de la collection — voir CollectionScreen, PlayerProfileScreen et
 *  functions/api/profile/[username].ts. */
export const SECRET_RARITY_ID = 7 as const;
export const SECRET_CARD = CARDS.find((c) => c.rarity === SECRET_RARITY_ID) ?? null;

// La carte secrète ne compte pas dans "complétion" — sinon personne
// n'atteint jamais 100 %. C'est un bonus caché, pas un objectif normal.
export const TOTAL_CARDS = CARDS.filter((c) => c.rarity !== SECRET_RARITY_ID).length;

export function cardById(id: number) {
  return CARDS.find((c) => c.id === id);
}

export function rarityById(id: number) {
  return RARITIES.find((r) => r.id === id)!;
}

export function packByKey(key: string) {
  return PACKS.find((p) => p.key === key)!;
}
