import type { CSSProperties } from 'react';
import type { Card } from '../types';

/** The card visual language: 6 rarities, one direction (Collector foil).
 *  La direction « Sticker cartoon » a été retirée — le jeu ne garde que le
 *  foil, il n'y a donc plus de réglage de style côté joueur.
 *
 *  Palette : Rare = bleu, Épique = violet, Mythique = noir + or + violet.
 *  Les valeurs sont les mêmes que `frame`/`surf`/`art`/`ink` dans
 *  `src/data/rarities.ts` — garder les deux en phase. */

interface Skin {
  p: number;
  bg: string;
  inner: string;
  art: string;
  txt: string;
  sh: string;
  sheen?: boolean;
  /** Animated multi-stop foil background (Légendaire, Mythique). */
  holoFoil?: boolean;
}

const SKIN: Skin[] = [
  { p: 1, bg: 'var(--color-neutral-400)', inner: 'var(--color-neutral-100)', art: 'var(--color-neutral-200)', txt: 'var(--color-text)', sh: 'none' },
  { p: 2, bg: 'linear-gradient(180deg,var(--color-accent-2-400),var(--color-accent-2-700))', inner: 'linear-gradient(180deg,#f4fce9,#e1eecc)', art: '#ccdbb2', txt: 'var(--color-accent-2-900)', sh: 'var(--shadow-sm)' },
  { p: 2.5, bg: 'linear-gradient(150deg,#5b8fd6,#d9ecff 45%,#2f5c9e)', inner: 'linear-gradient(180deg,#f2f8ff,#d8e8fb)', art: '#b6d2f0', txt: '#1c3866', sh: '0 2px 12px rgba(47,92,158,.35)' },
  { p: 3, bg: 'linear-gradient(200deg,#a678d8,#2a1145 48%,#6c3fa0)', inner: 'radial-gradient(120% 85% at 50% 0%,#4a2673,#1e0c33)', art: '#33184f', txt: '#e8d4ff', sh: '0 4px 16px rgba(59,29,94,.45)', sheen: true },
  { p: 3.5, bg: 'linear-gradient(115deg,#8c6318,#ffe9b0 26%,#c99a3a 52%,#fff6d8 76%,#8c6318)', inner: 'linear-gradient(180deg,#fff8e2,#f0d9a0)', art: '#e9c877', txt: '#4a3410', sh: '0 6px 22px rgba(201,154,58,.5)', sheen: true, holoFoil: true },
  { p: 4, bg: 'linear-gradient(115deg,#0d0b12,#6c3fa0 18%,#ffd98a 42%,#3b1d5e 64%,#c99a3a 82%,#0d0b12)', inner: 'radial-gradient(130% 95% at 50% 0%,#2c1745,#0b0910 78%)', art: '#180f26', txt: '#ffd98a', sh: '0 8px 30px rgba(108,63,160,.6)', sheen: true, holoFoil: true },
];

/** Rareté à surface sombre → texte clair, ombres portées plus profondes. */
const isDark = (rarity: number) => rarity === 4 || rarity === 6;

export interface CardVisual {
  name: string;
  type: string;
  image: string;
  owned: boolean;
  locked: boolean;
  mini: boolean;
  holo: boolean;
  shell: CSSProperties;
  inner: CSSProperties;
  artWrap: CSSProperties;
  namePlate: CSSProperties;
  metaRow: CSSProperties;
  typeStyle: CSSProperties;
  pipWrap: CSSProperties;
  pips: { style: CSSProperties }[];
  /** Voile métallique (Épique, Légendaire, Mythique, et version holo,
   *  quelle que soit sa rareté) — remplace l'ancien reflet qui balayait la
   *  carte, sur toutes les cartes qui l'avaient. */
  chrome: boolean;
  chromeStyle: CSSProperties;
  chromeTopStyle: CSSProperties;
  /** Paillettes — réservées à la version holo, voir plus bas. */
  glitter: boolean;
  glitterStyle: CSSProperties;
  lockStyle: CSSProperties;
}

export interface BuildCardOptions {
  big?: boolean;
  holoAnim?: boolean;
  /** Force the card to render as owned regardless of ownedCount (pack reveal). */
  forceOwned?: boolean;
  ownedCount?: number;
  /** Version holo de cette carte (voir HOLO_CHANCE dans state/store.ts) —
   *  remplace le fond de la rareté par un dégradé arc-en-ciel animé, quelle
   *  que soit la rareté, et reçoit le même voile chrome que les paliers
   *  Épique+. N'a d'effet que si la carte est possédée. */
  isHolo?: boolean;
}

export function buildCardVisual(card: Card, opts: BuildCardOptions = {}): CardVisual {
  const big = !!opts.big;
  const holoAnim = opts.holoAnim ?? true;
  const owned = opts.forceOwned || (opts.ownedCount ?? 0) > 0;
  const holo = !!opts.isHolo && owned;
  const skin = SKIN[card.rarity - 1];
  const dark = isDark(card.rarity);

  const s = big
    ? { pad: 8, name: 18, type: 10, pip: 7 }
    : { pad: 4, name: 10, type: 7, pip: 4 };

  const R1 = big ? 26 : 15;

  // Épaisseur du cadre. `skin.p` (1 → 4) était appliqué tel quel aux deux
  // échelles : en grand format un liseré de 1 à 4 px se perdait, et surtout
  // le rayon intérieur était calculé indépendamment (R1 - 7 / R1 - 4), donc
  // l'anneau paraissait beaucoup plus fin dans les coins que sur les côtés.
  // On épaissit le cadre en grand format et on dérive le rayon intérieur du
  // padding — seule façon d'obtenir un anneau d'épaisseur constante.
  const outerPad = big ? Math.round(skin.p * 2.4) : Math.max(2, Math.round(skin.p * 1.2));
  const R2 = Math.max(4, R1 - outerPad);

  const shell: CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    padding: outerPad,
    borderRadius: R1,
    background: skin.bg,
    boxShadow: skin.sh,
  };
  if (skin.holoFoil && holoAnim && owned) {
    shell.backgroundSize = '300% 100%';
    shell.animation = 'pigHolo 5s linear infinite';
  }
  // La version holo l'emporte sur le skin de base, quelle que soit la
  // rareté — même une carte Commune holo tourne en arc-en-ciel. Réutilise
  // le même mécanisme (`background-position` + `pigHolo`) que le foil des
  // raretés hautes, avec un dégradé bien plus large et saturé pour rester
  // reconnaissable même sans l'animation (holoAnim coupé).
  if (holo) {
    shell.background = 'linear-gradient(115deg,#ff5f6d,#ffc93c 16%,#5cf29a 33%,#4fc3ff 50%,#a06bff 66%,#ff5fc7 83%,#ff5f6d)';
    shell.backgroundSize = '300% 100%';
    if (holoAnim) shell.animation = 'pigHolo 3.2s linear infinite';
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
    borderRadius: Math.max(3, R2 - (big ? 8 : 4)),
  };

  const namePlate: CSSProperties = {
    fontFamily: 'var(--font-heading)',
    fontSize: s.name,
    lineHeight: 1.06,
    textAlign: 'center',
    padding: big ? '2px 4px 0' : '1px 2px 0',
    color: skin.txt,
    overflow: 'hidden',
    textShadow: dark ? '0 1px 6px rgba(0,0,0,.5)' : 'none',
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

  // Voile métallique — remplace l'ancien reflet qui balayait les cartes
  // Épique/Légendaire/Mythique et la version holo (« pas très beau »). Un
  // dégradé large dont on anime la position, plutôt qu'une bande qui
  // traverse : ça se lit comme du métal brossé qui ondule, pas comme un
  // flash qui passe. L'alpha est directement dans les arrêts du dégradé
  // (pas d'opacité globale ni de mix-blend-mode) : un premier essai en
  // `mix-blend-mode: overlay` disparaissait presque sur les fonds très
  // sombres (Mythique) — l'overlay écrase vers le noir sur un fond déjà
  // proche du noir. Un second calque, fixe, imite le reflet du haut d'une
  // vraie surface chromée.
  //
  // Même teinte neutre (marine → gris → argent) pour Épique+ ET la version
  // holo — un essai précédent teintait le chrome lui-même en arc-en-ciel
  // pour les holos, mais l'effet holographique doit rester sur la carte
  // (le cadre, déjà en dégradé arc-en-ciel animé plus haut), pas sur ce
  // voile : le chrome n'est qu'une fine touche de brillance par-dessus.
  // D'où une opacité nettement plus basse sur les holos — sinon le métal
  // neutre écrase les couleurs du cadre au lieu de simplement les faire
  // briller.
  const chrome = (!!skin.sheen || holo) && owned && holoAnim;
  const chromeOpacity = holo ? 0.22 : 1;
  const chromeStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    borderRadius: R2,
    backgroundImage:
      'linear-gradient(135deg,rgba(20,20,40,.15) 0%,rgba(130,130,160,.25) 20%,rgba(255,255,255,.42) 40%,rgba(130,130,160,.25) 60%,rgba(20,20,40,.15) 80%,rgba(130,130,160,.25) 100%)',
    backgroundSize: '200% 200%',
    animation: 'pigChrome 3s ease infinite',
    opacity: chromeOpacity,
  };
  const chromeTopStyle: CSSProperties = {
    position: 'absolute',
    inset: 2,
    pointerEvents: 'none',
    borderRadius: Math.max(2, R2 - 2),
    background: 'linear-gradient(180deg,rgba(255,255,255,.25) 0%,transparent 50%)',
    opacity: chromeOpacity,
  };

  // Paillettes — inspiré de la carte "CSS Holo card effect" de nycos62
  // (codepen.io/nycos62/pen/PoaKZjL, inaccessible depuis cet environnement
  // — codepen.io est bloqué comme précédemment, réimplémenté depuis la
  // famille de techniques "holo card CSS" à laquelle ce genre de pen
  // appartient généralement : une texture de points tuilée, teintée par le
  // dégradé arc-en-ciel via `background-blend-mode`, plutôt que des points
  // qui flottent individuellement — cette dernière approche (les "3 points
  // qui bougent") a déjà été retirée ailleurs, pas question d'y revenir
  // sous une autre forme. Suit le pointeur (--mx/--my, posées par
  // TiltCard ; repli à 50%/50% hors contexte interactif) pour un vrai
  // miroitement qui répond au geste, comme les cartes holo qu'on penche
  // sous la lumière. Réservé à la version holo — le chrome neutre
  // d'Épique+ n'a pas de paillettes.
  const glitter = holo && owned && holoAnim;
  const glitterStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    borderRadius: R2,
    backgroundImage: [
      'radial-gradient(circle at 1px 1px,rgba(255,255,255,.95) 1px,transparent 0)',
      'linear-gradient(115deg,#ff5f6d,#ffc93c 16%,#5cf29a 33%,#4fc3ff 50%,#a06bff 66%,#ff5fc7 83%,#ff5f6d)',
    ].join(','),
    backgroundSize: '6px 6px, 250% 250%',
    backgroundBlendMode: 'overlay',
    backgroundPosition: 'var(--mx, 50%) var(--my, 50%), var(--mx, 50%) var(--my, 50%)',
    mixBlendMode: 'color-dodge',
    opacity: 0.3,
  } as CSSProperties;

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
    // Cochon jamais trouvé → le nom reste un mystère, comme l'illustration
    // (déjà masquée par `owned` ci-dessus, voir artWrap dans PigCard.tsx).
    // Vaut aussi bien dans notre collection que dans celle d'un ami
    // (PlayerProfileScreen réutilise ce même composant).
    name: owned ? card.name : '???',
    type: card.type,
    image: card.image,
    owned,
    locked: !owned,
    mini: !big,
    holo,
    shell,
    inner,
    artWrap,
    namePlate,
    metaRow,
    typeStyle,
    pipWrap,
    pips,
    chrome,
    chromeStyle,
    chromeTopStyle,
    glitter,
    glitterStyle,
    lockStyle,
  };
}
