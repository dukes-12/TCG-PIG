import type { PackKey } from '../types';

/** Presentation-only pack metadata (long-form description + thumbnail
 *  gradient) that isn't part of the data model. Ported from
 *  Grouin - TCG Cochons.dc.html (`PACKS`). */
export interface PackVisual {
  desc: string;
  bg: string;
}

export const PACK_VISUALS: Record<PackKey, PackVisual> = {
  basic: { desc: '5 cartes, taux standard.', bg: 'linear-gradient(160deg,#f6a06b,#8c491a)' },
  foire: { desc: '6 cartes, dont 3 Rare ou mieux garanties.', bg: 'linear-gradient(160deg,#aebf92,#3d472b)' },
  doree: { desc: '7 cartes, dont 2 Épique ou mieux garanties.', bg: 'linear-gradient(160deg,#ffd2b4,#b2622d 55%,#402310)' },
};
