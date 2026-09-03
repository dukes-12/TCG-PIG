import { CARDS, cardsOfRarity, type Card } from './cards';
import { RARITIES, type RarityId } from './rarities';

export type PackKey = 'basic' | 'foire' | 'doree';

export interface Pack {
  key: PackKey;
  name: string;
  price: number;
  cards: number;
  /** Rareté minimale garantie dans le pack (null = aucune garantie). */
  guaranteedFloor: RarityId | null;
  subtitle: string;
  /** Fond du visuel de booster. */
  bg: string;
}

export const PACKS: Pack[] = [
  { key: 'basic', name: 'Sachet Chipo',       price: 100, cards: 5, guaranteedFloor: null, subtitle: '5 cartes · standard',
    bg: 'linear-gradient(168deg,#d67f48,#8c491a 62%,#5a2f11)' },
  { key: 'foire', name: 'Caisse de la Foire', price: 260, cards: 5, guaranteedFloor: 3,    subtitle: '5 cartes · 1 rare garantie',
    bg: 'linear-gradient(180deg,#e0cba6,#c9ae84)' },
  { key: 'doree', name: 'Cageot de la Ferme', price: 640, cards: 5, guaranteedFloor: 4,    subtitle: '5 cartes · 1 épique garantie',
    bg: 'linear-gradient(180deg,#3f4a2d,#232a17)' }
];

export const packByKey = (k: PackKey) => PACKS.find(p => p.key === k)!;

/** Tire une carte. `floor` force une rareté minimale. */
export function roll(floor: RarityId | 0 = 0, rng: () => number = Math.random): Card {
  const x = rng() * 100;
  let acc = 0;
  let rarity: RarityId = 1;
  for (const r of RARITIES) {
    acc += r.weight;
    if (x < acc) { rarity = r.id; break; }
  }
  if (floor && rarity < floor) rarity = floor;
  const pool = cardsOfRarity(rarity);
  return pool[Math.floor(rng() * pool.length)];
}

/**
 * Ouvre un pack. Les doublons dans un même pack sont autorisés.
 * La garantie est appliquée sur la dernière carte, avec filet de sécurité.
 */
export function openPack(pack: Pack, rng: () => number = Math.random): Card[] {
  const pull = Array.from({ length: pack.cards }, (_, i) =>
    roll(i === pack.cards - 1 ? (pack.guaranteedFloor ?? 0) : 0, rng));
  if (pack.guaranteedFloor && !pull.some(c => c.rarity >= pack.guaranteedFloor!)) {
    pull[pull.length - 1] = roll(pack.guaranteedFloor, rng);
  }
  return pull;
}

// ── dos de carte ──────────────────────────────────────────────
export interface CardBackSkin {
  key: string;
  name: string;
  /** 0 = débloqué d'office. */
  price: number;
  bg: string;
  ink: string;
}

export const CARD_BACKS: CardBackSkin[] = [
  { key: 'sceau',   name: 'Sceau guilloché', price: 0,
    bg: 'radial-gradient(120% 100% at 50% 8%,#d67f48,#8c491a 58%,#402310)', ink: '#ffe9b0' },
  { key: 'souille', name: 'Souille',         price: 400,
    bg: 'repeating-radial-gradient(circle at 50% 46%,#643312 0 9px,#8c491a 9px 20px)', ink: '#fff6ef' },
  { key: 'deco',    name: 'Déco',            price: 650,
    bg: '#201e1d', ink: '#ffe9b0' },
  { key: 'nuit',    name: 'Nuit violette',   price: 900,
    bg: 'radial-gradient(120% 100% at 50% 10%,#6c3fa0,#3b1d5e 60%,#160a24)', ink: '#ffd98a' }
];

// ── recyclage des doublons ────────────────────────────────────
export function recycleGain(card: Card, count: number): number {
  if (count < 2) return 0;
  return RARITIES[card.rarity - 1].recycleValue * (count - 1);
}

export const totalCards = CARDS.length;
