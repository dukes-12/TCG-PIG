import type { CSSProperties } from 'react';
import type { Card, CardStyle } from '../types';

/** The card visual language: 6 rarities × 2 switchable directions
 *  (Collector foil / Sticker cartoon). Ported field-for-field from the
 *  `build()` method in Grouin - TCG Cochons.dc.html — see the handoff
 *  README's "Anatomie d'une carte" section for the written spec. Dead
 *  branches for the abandoned "Rétro 90s" direction were dropped. */

interface Skin {
  p: number;
  bg: string;
  inner: string;
  art: string;
  txt: string;
  sh: string;
  sheen?: boolean;
  /** Animated multi-stop foil background + floating particles (Légendaire, Mythique). */
  holoFoil?: boolean;
}

const SKIN: Skin[] = [
  { p: 1, bg: 'var(--color-neutral-400)', inner: 'var(--color-neutral-100)', art: 'var(--color-neutral-200)', txt: 'var(--color-text)', sh: 'none' },
  { p: 2, bg: 'linear-gradient(180deg,var(--color-accent-2-400),var(--color-accent-2-700))', inner: 'linear-gradient(180deg,#f4fce9,#e1eecc)', art: '#ccdbb2', txt: 'var(--color-accent-2-900)', sh: 'var(--shadow-sm)' },
  { p: 2.5, bg: 'linear-gradient(150deg,#f6a06b,#ffeacb 42%,#c67139)', inner: 'linear-gradient(180deg,#fff6ef,#ffe1d0)', art: '#ffc6a5', txt: 'var(--color-accent-900)', sh: '0 2px 12px rgba(198,113,57,.35)' },
  { p: 3, bg: 'linear-gradient(200deg,#8fa073,#2e2b25 46%,#56633f)', inner: 'radial-gradient(120% 80% at 50% 0%,#474238,#201e1d)', art: '#2e2b25', txt: '#f5ead8', sh: 'var(--shadow-md)', sheen: true },
  { p: 3.5, bg: 'linear-gradient(100deg,#f6a06b,#ffe1d0,#aebf92,#ffc6a5,#f6a06b)', inner: 'radial-gradient(130% 90% at 50% 0%,#5a3016,#201e1d 72%)', art: '#402310', txt: '#ffe1d0', sh: '0 6px 22px rgba(214,127,72,.5)', sheen: true, holoFoil: true },
  { p: 4, bg: 'linear-gradient(115deg,#8c6318,#ffe9b0 28%,#c99a3a 52%,#fff6d8 74%,#8c6318)', inner: 'radial-gradient(140% 100% at 50% 0%,#3a2c10,#141210 74%)', art: '#221b0e', txt: '#ffe9b0', sh: '0 8px 30px rgba(201,154,58,.6)', sheen: true, holoFoil: true },
];

export interface CardVisual {
  name: string;
  type: string;
  image: string;
  owned: boolean;
  locked: boolean;
  mini: boolean;
  shell: CSSProperties;
  inner: CSSProperties;
  artWrap: CSSProperties;
  namePlate: CSSProperties;
  metaRow: CSSProperties;
  typeStyle: CSSProperties;
  pipWrap: CSSProperties;
  pips: { style: CSSProperties }[];
  dots: { style: CSSProperties }[];
  sheen: boolean;
  sheenStyle: CSSProperties;
  lockStyle: CSSProperties;
}

export interface BuildCardOptions {
  big?: boolean;
  style?: CardStyle;
  holoAnim?: boolean;
  /** Force the card to render as owned regardless of ownedCount (pack reveal). */
  forceOwned?: boolean;
  ownedCount?: number;
}

export function buildCardVisual(card: Card, opts: BuildCardOptions = {}): CardVisual {
  const big = !!opts.big;
  const style = opts.style ?? 'Collector foil';
  const holoAnim = opts.holoAnim ?? true;
  const owned = opts.forceOwned || (opts.ownedCount ?? 0) > 0;
  const skin = SKIN[card.rarity - 1];

  const s = big
    ? { pad: 8, name: 18, type: 10, pip: 7 }
    : { pad: 4, name: 10, type: 7, pip: 4 };

  const toon = style === 'Sticker cartoon';
  const R1 = toon ? (big ? 30 : 18) : big ? 26 : 15;
  const R2 = R1 - (big ? 7 : 4);

  let outerPad: number = skin.p;
  let outerBg: string = skin.bg;
  let shellShadow: string = skin.sh;
  if (toon) {
    outerPad = big ? 7 : 4;
    outerBg = '#fffaf2';
    shellShadow = `0 ${big ? 8 : 4}px 0 ${card.rarity >= 4 ? 'rgba(46,43,37,.55)' : 'rgba(140,73,26,.35)'}`;
  }

  const shell: CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    padding: outerPad,
    borderRadius: R1,
    background: outerBg,
    boxShadow: shellShadow,
  };
  if (toon) {
    shell.border = `${big ? 3 : 2}px solid ${card.rarity >= 4 ? '#201e1d' : 'var(--color-accent-800)'}`;
  }
  if (skin.holoFoil && holoAnim && owned) {
    shell.backgroundSize = '300% 100%';
    if (!toon) shell.animation = 'pigHolo 5s linear infinite';
  }
  if (!owned) {
    shell.filter = 'grayscale(1)';
    shell.opacity = 0.4;
    shell.animation = 'none';
    shell.boxShadow = 'none';
  }

  const inner: CSSProperties = {
    position: 'relative',
    height: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    gap: big ? 6 : 3,
    padding: s.pad,
    borderRadius: R2,
    background: skin.inner,
    color: skin.txt,
  };

  const artWrap: CSSProperties = {
    position: 'relative',
    flex: 1,
    overflow: 'hidden',
    background: skin.art,
    borderRadius: toon ? R2 - (big ? 6 : 3) : R2 - (big ? 8 : 4),
  };
  if (toon) artWrap.boxShadow = `inset 0 0 0 ${big ? 3 : 2}px #fffaf2`;

  const namePlate: CSSProperties = {
    fontFamily: 'var(--font-heading)',
    fontSize: s.name,
    lineHeight: 1.06,
    textAlign: 'center',
    padding: big ? '2px 4px 0' : '1px 2px 0',
    color: skin.txt,
    overflow: 'hidden',
    textShadow: card.rarity >= 4 ? '0 1px 6px rgba(0,0,0,.5)' : 'none',
  };

  const metaRow: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    padding: big ? '0 3px 2px' : '0 3px 1px',
  };

  const typeStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
    fontSize: s.type,
    letterSpacing: '.06em',
    textTransform: 'uppercase',
    fontWeight: 700,
    opacity: 0.65,
    color: skin.txt,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const pipWrap: CSSProperties = { display: 'flex', flex: 'none', gap: big ? 3 : 1.5 };
  const pips = Array.from({ length: 6 }, (_, i) => {
    const filled = i + 1 <= card.rarity;
    return {
      style: filled
        ? ({ display: 'block', width: s.pip, height: s.pip, borderRadius: '50%', background: skin.txt, opacity: 0.9 } as CSSProperties)
        : ({ display: 'block', width: s.pip, height: s.pip, borderRadius: '50%', boxShadow: `inset 0 0 0 1px ${skin.txt}`, opacity: 0.28 } as CSSProperties),
    };
  });

  const dots =
    skin.holoFoil && owned
      ? [0, 1, 2].map((k) => ({
          style: {
            position: 'absolute',
            left: `${18 + k * 28}%`,
            bottom: '12%',
            width: big ? 6 : 3.5,
            height: big ? 6 : 3.5,
            borderRadius: '50%',
            background: card.rarity === 6 ? '#ffe9b0' : '#ffe1d0',
            animation: holoAnim ? `pigFloat ${2.4 + k * 0.6}s ease-in-out infinite` : 'none',
            opacity: 0.6,
          } as CSSProperties,
        }))
      : [];

  const sheen = !!skin.sheen && owned && holoAnim;
  const sheenStyle: CSSProperties = {
    position: 'absolute',
    top: '-20%',
    left: 0,
    width: '55%',
    height: '140%',
    pointerEvents: 'none',
    background: 'linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent)',
    animation: `pigShine ${card.rarity >= 5 ? 3.1 : 4.6}s ease-in-out infinite`,
  };

  const lockStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-heading)',
    fontSize: big ? 54 : 24,
    color: skin.txt,
    opacity: 0.3,
  };

  return {
    name: card.name,
    type: card.type,
    image: card.image,
    owned,
    locked: !owned,
    mini: !big,
    shell,
    inner,
    artWrap,
    namePlate,
    metaRow,
    typeStyle,
    pipWrap,
    pips,
    dots,
    sheen,
    sheenStyle,
    lockStyle,
  };
}
