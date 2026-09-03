/** Raretés Chipo — palette définitive (bleu Rare, violet Épique, noir/or/violet Mythique). */

export type RarityId = 1 | 2 | 3 | 4 | 5 | 6;

export interface Rarity {
  id: RarityId;
  key: 'commune' | 'peu_commune' | 'rare' | 'epique' | 'legendaire' | 'mythique';
  name: string;
  short: string;
  roman: string;
  /** Probabilité par carte tirée, en %. Total = 100. */
  weight: number;
  /** Glands gagnés par exemplaire en trop au recyclage. */
  recycleValue: number;

  // ── habillage ────────────────────────────────────────────────
  /** Cadre extérieur (dégradé métal / holo). */
  frame: string;
  /** Surface intérieure, derrière le texte. Toujours opaque. */
  surf: string;
  /** Fond de la zone image. */
  art: string;
  /** Couleur du texte sur `surf`. */
  ink: string;
  /** Bandeau / pastille de nom. */
  band: string;
  /** Texte sur `band`. */
  bandInk: string;
  /** Bordure d'encre de la variante cartoon. */
  toonInk: string;
  /** Halo derrière la carte (détail, révélation de pack). */
  glow: string;
  /** Surface sombre → ombres portées et texte clair. */
  dark?: boolean;
  /** Reflet animé. */
  sheen?: boolean;
  /** Dégradé de cadre animé. */
  holo?: boolean;
  /** Coins sertis. */
  corners?: boolean;
  /** Couleur des particules flottantes, si la rareté en a. */
  spark?: string;
}

export const RARITIES: Rarity[] = [
  {
    id: 1, key: 'commune', name: 'Commune', short: 'Com.', roman: 'I',
    weight: 44, recycleValue: 8,
    frame: 'linear-gradient(160deg,#dcd3c4,#a19786)',
    surf: '#f9f4ed',
    art: '#eee7db',
    ink: '#2e2b25',
    band: '#645c50',
    bandInk: '#f9f4ed',
    toonInk: '#82796a',
    glow: 'rgba(161,151,134,.55)'
  },
  {
    id: 2, key: 'peu_commune', name: 'Peu commune', short: 'Peu c.', roman: 'II',
    weight: 28, recycleValue: 22,
    frame: 'linear-gradient(160deg,#aebf92,#56633f)',
    surf: 'linear-gradient(180deg,#f6fdea,#e1eecc)',
    art: '#ccdbb2',
    ink: '#272e1b',
    band: '#56633f',
    bandInk: '#f0fae1',
    toonInk: '#56633f',
    glow: 'rgba(143,160,115,.6)'
  },
  {
    id: 3, key: 'rare', name: 'Rare', short: 'Rare', roman: 'III',
    weight: 17, recycleValue: 60,
    frame: 'linear-gradient(150deg,#5b8fd6,#d9ecff 45%,#2f5c9e)',
    surf: 'linear-gradient(180deg,#f2f8ff,#d8e8fb)',
    art: '#b6d2f0',
    ink: '#1c3866',
    band: '#2f5c9e',
    bandInk: '#eaf3ff',
    toonInk: '#2f5c9e',
    glow: 'rgba(91,143,214,.75)'
  },
  {
    id: 4, key: 'epique', name: 'Épique', short: 'Épique', roman: 'IV',
    weight: 8, recycleValue: 160,
    frame: 'linear-gradient(200deg,#a678d8,#2a1145 48%,#6c3fa0)',
    surf: 'radial-gradient(120% 85% at 50% 0%,#4a2673,#1e0c33)',
    art: '#33184f',
    ink: '#e8d4ff',
    band: '#6c3fa0',
    bandInk: '#f3e6ff',
    toonInk: '#3b1d5e',
    glow: 'rgba(122,73,180,.85)',
    dark: true,
    sheen: true
  },
  {
    id: 5, key: 'legendaire', name: 'Légendaire', short: 'Légend.', roman: 'V',
    weight: 2.5, recycleValue: 450,
    frame: 'linear-gradient(115deg,#8c6318,#ffe9b0 26%,#c99a3a 52%,#fff6d8 76%,#8c6318)',
    surf: 'linear-gradient(180deg,#fff8e2,#f0d9a0)',
    art: '#e9c877',
    ink: '#4a3410',
    band: '#8c6318',
    bandInk: '#ffe9b0',
    toonInk: '#8c6318',
    glow: 'rgba(255,215,130,1)',
    sheen: true,
    holo: true,
    corners: true,
    spark: '#8c6318'
  },
  {
    id: 6, key: 'mythique', name: 'Mythique', short: 'Myth.', roman: 'VI',
    weight: 0.5, recycleValue: 1500,
    frame: 'linear-gradient(115deg,#0d0b12,#6c3fa0 18%,#ffd98a 42%,#3b1d5e 64%,#c99a3a 82%,#0d0b12)',
    surf: 'radial-gradient(130% 95% at 50% 0%,#2c1745,#0b0910 78%)',
    art: '#180f26',
    ink: '#ffd98a',
    band: '#6c3fa0',
    bandInk: '#ffe9b0',
    toonInk: '#43206d',
    glow: 'rgba(255,217,138,1)',
    dark: true,
    sheen: true,
    holo: true,
    corners: true,
    spark: '#ffd98a'
  }
];

export const rarityById = (id: RarityId): Rarity => RARITIES[id - 1];

/** Somme des poids — doit valoir 100. Utile en test. */
export const totalWeight = () => RARITIES.reduce((s, r) => s + r.weight, 0);
