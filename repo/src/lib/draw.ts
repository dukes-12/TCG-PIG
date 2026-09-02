import { CARDS, RARITIES } from '../data/catalog';
import type { Card, RarityId, Pack } from '../types';

/** Draws one card: rolls a rarity by weight, then a uniformly random card
 *  within that rarity's pool. `floor` forces a minimum rarity (used for a
 *  pack's guaranteed-rarity slot). Ported from Grouin - TCG Cochons.dc.html
 *  (`roll`) / the handoff README's draw algorithm. */
export function roll(floor: RarityId | 0 = 0): Card {
  const x = Math.random() * 100;
  let acc = 0;
  let rarity: RarityId = 1;
  for (const r of RARITIES) {
    acc += r.weight;
    if (x < acc) {
      rarity = r.id as RarityId;
      break;
    }
  }
  if (floor && rarity < floor) rarity = floor;
  const pool = CARDS.filter((c) => c.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Opens a pack: draws `size` cards, with the last slot forced to at least
 *  `pack.guaranteedFloor` when set, and a safety net that re-rolls the last
 *  card at that floor if the guarantee wasn't otherwise met. */
export function openPack(pack: Pack, size: number): Card[] {
  const floor = (pack.guaranteedFloor ?? 0) as RarityId | 0;
  const pull = Array.from({ length: size }, (_, i) => roll(i === size - 1 ? floor : 0));
  if (floor && !pull.some((c) => c.rarity >= floor)) {
    pull[pull.length - 1] = roll(floor);
  }
  return pull;
}
