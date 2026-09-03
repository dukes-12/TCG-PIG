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

/** Opens a pack: draws `size` cards, then force enough slots up to
 *  `guaranteedFloor` to reach `guaranteedCount` (au moins, pas exactement —
 *  un tirage naturel qui en donne déjà assez n'est pas retouché), puis
 *  **trie le tirage par rareté croissante** — la carte la plus rare du
 *  paquet est donc toujours révélée en dernier, garanti même quand
 *  plusieurs cartes rares sortent naturellement (pas seulement sur les
 *  slots garantis). Un mélange préalable évite qu'à rareté maximale égale
 *  ce soit toujours la même carte qui atterrisse en dernier, et que ce
 *  soient toujours les mêmes indices qui se fassent forcer. */
export function openPack(pack: Pack, size: number): Card[] {
  const floor = (pack.guaranteedFloor ?? 0) as RarityId | 0;
  const need = floor ? (pack.guaranteedCount ?? 1) : 0;
  const pull = Array.from({ length: size }, () => roll());

  if (need > 0) {
    let qualifying = pull.filter((c) => c.rarity >= floor).length;
    const order = Array.from({ length: size }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (const idx of order) {
      if (qualifying >= need) break;
      if (pull[idx].rarity >= floor) continue;
      pull[idx] = roll(floor);
      qualifying++;
    }
  }

  for (let i = pull.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pull[i], pull[j]] = [pull[j], pull[i]];
  }
  pull.sort((a, b) => a.rarity - b.rarity);
  return pull;
}
