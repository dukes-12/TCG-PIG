import type { RarityId } from '../types';

/** Presentation-only rarity metadata that isn't part of the data model
 *  (ink color for dots/bars, halo glow color, short label for tight UI).
 *  Ported from Grouin - TCG Cochons.dc.html (`RAR`). */
export interface RarityVisual {
  short: string;
  ink: string;
  glow: string;
}

export const RARITY_VISUALS: Record<RarityId, RarityVisual> = {
  1: { short: 'Com.', ink: 'var(--color-neutral-700)', glow: 'rgba(161,151,134,.55)' },
  2: { short: 'Peu c.', ink: 'var(--color-accent-2-700)', glow: 'rgba(143,160,115,.6)' },
  3: { short: 'Rare', ink: 'var(--color-accent-700)', glow: 'rgba(246,160,107,.75)' },
  4: { short: 'Épique', ink: 'var(--color-accent-2-800)', glow: 'rgba(86,99,63,.85)' },
  5: { short: 'Légend.', ink: 'var(--color-accent-800)', glow: 'rgba(246,160,107,.95)' },
  6: { short: 'Myth.', ink: '#8c6318', glow: 'rgba(255,215,130,1)' },
};
