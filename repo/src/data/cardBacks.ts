import type { CardBackKey } from '../types';

/** Les dos de carte. `sceau` est débloqué d'office ; les trois autres
 *  s'achètent en glands dans Profil → Dos de carte.
 *  Références de design : 3a (sceau), 2c (souille), 2d (déco), 3c (nuit). */
export interface CardBackSkin {
  key: CardBackKey;
  name: string;
  /** 0 = débloqué d'office. */
  price: number;
  /** Fond de la carte. */
  bg: string;
  /** Encre du mot-marque et des filets. */
  ink: string;
  /** Couleur du groin dans le médaillon. */
  snoutBg: string;
  /** Couleur des naseaux. */
  nostril: string;
  /** Fond du médaillon. */
  medallion: string;
  /** Anneau autour du médaillon (0 = aucun). */
  ring: string;
  /** Sous-titre sous le mot-marque (facultatif). */
  tagline?: string;
  /** Décor de fond propre au dos. */
  pattern: 'guilloche' | 'ripples' | 'rays' | 'none';
}

export const CARD_BACKS: CardBackSkin[] = [
  {
    key: 'sceau',
    name: 'Sceau guilloché',
    price: 0,
    bg: 'radial-gradient(120% 100% at 50% 8%,#d67f48,#8c491a 58%,#402310)',
    ink: '#ffe9b0',
    snoutBg: '#b2622d',
    nostril: '#ffe1d0',
    medallion: 'linear-gradient(180deg,#fff6ef,#ffe1d0)',
    ring: 'linear-gradient(140deg,#fff6d8,#c99a3a)',
    tagline: 'série un',
    pattern: 'guilloche',
  },
  {
    key: 'souille',
    name: 'Souille',
    price: 400,
    bg: 'repeating-radial-gradient(circle at 50% 46%,#643312 0 11px,#8c491a 11px 24px)',
    ink: '#fff6ef',
    snoutBg: '#fff6ef',
    nostril: '#8c491a',
    medallion: 'linear-gradient(160deg,#ffd2b4,#f6a06b)',
    ring: 'rgba(255,242,235,.2)',
    pattern: 'ripples',
  },
  {
    key: 'deco',
    name: 'Déco',
    price: 650,
    bg: '#201e1d',
    ink: '#ffe9b0',
    snoutBg: '#c99a3a',
    nostril: '#4a3410',
    medallion: '#fff8e2',
    ring: '#8c6318',
    tagline: 'cartes à collectionner',
    pattern: 'rays',
  },
  {
    key: 'nuit',
    name: 'Nuit violette',
    price: 900,
    bg: 'radial-gradient(120% 100% at 50% 10%,#6c3fa0,#3b1d5e 60%,#160a24)',
    ink: '#ffd98a',
    snoutBg: '#ffd98a',
    nostril: '#43206d',
    medallion: 'linear-gradient(170deg,#43206d,#160a24)',
    ring: 'linear-gradient(140deg,#ffe9b0,#c99a3a)',
    tagline: 'édition mythique',
    pattern: 'rays',
  },
];

export const DEFAULT_CARD_BACK: CardBackKey = 'sceau';

export const cardBackByKey = (key: CardBackKey): CardBackSkin =>
  CARD_BACKS.find((b) => b.key === key) ?? CARD_BACKS[0];
