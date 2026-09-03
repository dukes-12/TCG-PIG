import type { RarityId } from './rarities';

export const CARD_TYPES = [
  'Super-héros',
  'Dictateurs',
  'Politiques',
  'Métiers',
  'Hors catégorie'
] as const;

export type CardType = (typeof CARD_TYPES)[number];

export interface Card {
  id: number;
  name: string;
  type: CardType;
  rarity: RarityId;
  /** Servi depuis public/ — remplacer par le vrai visuel. */
  image: string;
}

const img = (id: number) => `assets/cards/${String(id).padStart(3, '0')}.jpg`;

export const CARDS: Card[] = [
  { id: 1,  name: 'Porc-Éclair',                type: 'Super-héros',    rarity: 1, image: img(1) },
  { id: 2,  name: 'Capitaine Lardon',           type: 'Super-héros',    rarity: 1, image: img(2) },
  { id: 3,  name: 'Sergent Bouseux',            type: 'Dictateurs',     rarity: 1, image: img(3) },
  { id: 4,  name: 'Conseiller Grouik',          type: 'Politiques',     rarity: 1, image: img(4) },
  { id: 5,  name: 'Plombier Groin',             type: 'Métiers',        rarity: 1, image: img(5) },
  { id: 6,  name: 'Boulanger Bacon',            type: 'Métiers',        rarity: 1, image: img(6) },
  { id: 7,  name: 'Barista Truffe',             type: 'Métiers',        rarity: 1, image: img(7) },
  { id: 8,  name: 'Cochon Facteur',             type: 'Métiers',        rarity: 1, image: img(8) },
  { id: 9,  name: 'Flaque du Matin',            type: 'Hors catégorie', rarity: 1, image: img(9) },
  { id: 10, name: 'La Truie Invisible',         type: 'Super-héros',    rarity: 2, image: img(10) },
  { id: 11, name: 'Groin de Fer',               type: 'Super-héros',    rarity: 2, image: img(11) },
  { id: 12, name: 'Colonel Saucisson',          type: 'Dictateurs',     rarity: 2, image: img(12) },
  { id: 13, name: 'Sénateur Bacon',             type: 'Politiques',     rarity: 2, image: img(13) },
  { id: 14, name: 'Députée Truffe',             type: 'Politiques',     rarity: 2, image: img(14) },
  { id: 15, name: 'Docteur Lardon',             type: 'Métiers',        rarity: 2, image: img(15) },
  { id: 16, name: 'Pompier Porcinet',           type: 'Métiers',        rarity: 2, image: img(16) },
  { id: 17, name: 'Super Groin',                type: 'Super-héros',    rarity: 3, image: img(17) },
  { id: 18, name: 'Généralissime Bouseux',      type: 'Dictateurs',     rarity: 3, image: img(18) },
  { id: 19, name: 'Le Tyran de la Soue',        type: 'Dictateurs',     rarity: 3, image: img(19) },
  { id: 20, name: 'Candidat Groin 2028',        type: 'Politiques',     rarity: 3, image: img(20) },
  { id: 21, name: 'Maître Notaire Jambon',      type: 'Métiers',        rarity: 3, image: img(21) },
  { id: 22, name: 'Cochon-Man',                 type: 'Super-héros',    rarity: 4, image: img(22) },
  { id: 23, name: 'Chef Suprême Groin Iᵉʳ',     type: 'Dictateurs',     rarity: 4, image: img(23) },
  { id: 24, name: 'Madame la Présidente Truie', type: 'Politiques',     rarity: 4, image: img(24) },
  { id: 25, name: 'Cochon Quantique',           type: 'Hors catégorie', rarity: 4, image: img(25) },
  { id: 26, name: 'Aurore, Première Truie',     type: 'Hors catégorie', rarity: 5, image: img(26) },
  { id: 27, name: "Le Grand Sanglier d'Or",     type: 'Hors catégorie', rarity: 5, image: img(27) },
  { id: 28, name: 'Cochon OG',                  type: 'Hors catégorie', rarity: 6, image: img(28) }
];

export const cardById = (id: number) => CARDS.find(c => c.id === id);
export const cardsOfRarity = (r: RarityId) => CARDS.filter(c => c.rarity === r);

// ── tri de la collection ──────────────────────────────────────
export type SortKey = 'rarete' | 'nom' | 'type' | 'nb';

export function sortCards(list: Card[], sort: SortKey, owned: Record<number, number>): Card[] {
  const copy = list.slice();
  switch (sort) {
    case 'nom':  return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'type': return copy.sort((a, b) => a.type.localeCompare(b.type) || b.rarity - a.rarity);
    case 'nb':   return copy.sort((a, b) => (owned[b.id] ?? 0) - (owned[a.id] ?? 0) || b.rarity - a.rarity);
    default:     return copy.sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));
  }
}

export interface CollectionFilters {
  rarity: RarityId | 'all';
  type: CardType | 'all';
  query: string;
  ownedOnly: boolean;
}

export function filterCards(filters: CollectionFilters, owned: Record<number, number>): Card[] {
  const q = filters.query.trim().toLowerCase();
  return CARDS.filter(c =>
    (filters.rarity === 'all' || c.rarity === filters.rarity) &&
    (filters.type === 'all' || c.type === filters.type) &&
    (!q || c.name.toLowerCase().includes(q)) &&
    (!filters.ownedOnly || (owned[c.id] ?? 0) > 0));
}
