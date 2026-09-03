import { CARDS, RARITIES } from '../data/catalog';
import type { Card, RarityId, Pack } from '../types';

/** Draws one card: rolls a rarity by weight, then a uniformly random card
 *  within that rarity's pool. `floor` forces a minimum rarity (used for a
 *  pack's guaranteed-rarity slot). */
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

/** Opens a pack: draws `size` cards, with a guaranteed-floor slot when the
 *  pack defines one, then **trie le tirage par rareté croissante** — la
 *  carte la plus rare du paquet est donc toujours révélée en dernier,
 *  garanti même quand plusieurs cartes rares sortent naturellement (pas
 *  seulement sur le slot garanti). Un mélange préalable évite qu'à rareté
 *  maximale égale ce soit toujours la même carte qui atterrisse en dernier. */
export function openPack(pack: Pack, size: number): Card[] {
  const floor = (pack.guaranteedFloor ?? 0) as RarityId | 0;
  const pull = Array.from({ length: size }, () => roll());
  if (floor && !pull.some((c) => c.rarity >= floor)) {
    pull[Math.floor(Math.random() * size)] = roll(floor);
  }
  for (let i = pull.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pull[i], pull[j]] = [pull[j], pull[i]];
  }
  pull.sort((a, b) => a.rarity - b.rarity);
  return pull;
}
