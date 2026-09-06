import type { RarityId } from '../types';

/** Machine à sous — remplace l'ancienne loterie. 3 rouleaux, un symbole par
 *  palier de rareté (une carte fixe du jeu, comme les fruits d'une vraie
 *  machine à sous), aligner 3 fois le même symbole multiplie la mise. Plus
 *  le symbole est rare, moins il sort, plus il paie gros — poids et
 *  multiplicateurs calibrés pour un taux de retour (RTP) volontairement
 *  modeste (~63%, ~1 tirage sur 10 gagnant) : un à-côté amusant avec de
 *  vrais gros coups possibles, pas un moyen de remplacer les sacs comme
 *  source de glands. */

export interface SlotSymbol {
  rarity: RarityId;
  /** Carte du jeu utilisée comme visuel de ce symbole — une par rareté,
   *  fixe (pas un tirage), comme les fruits d'une machine à sous. */
  cardId: number;
  weight: number;
  multiplier: number;
}

export const SLOT_SYMBOLS: SlotSymbol[] = [
  { rarity: 1, cardId: 1, weight: 42, multiplier: 5 },
  { rarity: 2, cardId: 5, weight: 26, multiplier: 8 },
  { rarity: 3, cardId: 6, weight: 17, multiplier: 15 },
  { rarity: 4, cardId: 4, weight: 10, multiplier: 40 },
  { rarity: 5, cardId: 19, weight: 4, multiplier: 150 },
  { rarity: 6, cardId: 32, weight: 1, multiplier: 500 },
];

const TOTAL_WEIGHT = SLOT_SYMBOLS.reduce((s, sym) => s + sym.weight, 0);

/** Mises proposées — les gains ne sont qu'un multiple de la mise, le
 *  barème des symboles (poids/multiplicateurs) ne change pas avec elle. */
export const SLOT_BETS = [20, 50, 100, 250] as const;
export type SlotBet = (typeof SLOT_BETS)[number];

function pickSymbol(): SlotSymbol {
  let x = Math.random() * TOTAL_WEIGHT;
  for (const sym of SLOT_SYMBOLS) {
    x -= sym.weight;
    if (x < 0) return sym;
  }
  return SLOT_SYMBOLS[SLOT_SYMBOLS.length - 1];
}

export interface SlotResult {
  reels: [SlotSymbol, SlotSymbol, SlotSymbol];
  win: boolean;
  payout: number;
}

/** Tire les 3 rouleaux indépendamment et calcule le gain — chaque rouleau
 *  a les mêmes chances, comme une vraie machine à sous (pas de rouleau
 *  "truqué" différent des autres). */
export function spinSlotMachine(bet: number): SlotResult {
  const reels: [SlotSymbol, SlotSymbol, SlotSymbol] = [pickSymbol(), pickSymbol(), pickSymbol()];
  const win = reels[0].cardId === reels[1].cardId && reels[1].cardId === reels[2].cardId;
  const payout = win ? bet * reels[0].multiplier : 0;
  return { reels, win, payout };
}
