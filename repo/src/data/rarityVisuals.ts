import type { RarityId } from '../types';

/** Presentation-only rarity metadata that isn't part of the data model
 *  (ink color for dots/bars, halo glow color, short label for tight UI).
 *
 *  Palette validée : Rare = bleu, Épique = violet, Mythique = noir + or +
 *  violet (halo or). Les mêmes valeurs vivent dans `src/data/rarities.ts`
 *  (`ink` / `glow`) et dans `src/lib/cardVisual.ts` (`SKIN`) — garder les
 *  trois en phase. */
export interface RarityVisual {
  short: string;
  ink: string;
  glow: string;
}

export const RARITY_VISUALS: Record<RarityId, RarityVisual> = {
  1: { short: 'Com.', ink: 'var(--color-neutral-700)', glow: 'rgba(161,151,134,.55)' },
  2: { short: 'Peu c.', ink: 'var(--color-accent-2-700)', glow: 'rgba(143,160,115,.6)' },
  3: { short: 'Rare', ink: '#2f5c9e', glow: 'rgba(91,143,214,.75)' },
  4: { short: 'Épique', ink: '#6c3fa0', glow: 'rgba(122,73,180,.85)' },
  5: { short: 'Légend.', ink: '#8c6318', glow: 'rgba(255,215,130,1)' },
  6: { short: 'Myth.', ink: '#43206d', glow: 'rgba(255,217,138,1)' },
};
