import { rarityById, type Rarity } from '../data/rarities';
import type { Card } from '../types';
// Les keyframes vivent dans src/styles/animations.css, déjà importé par
// main.tsx — pas d'import CSS local ici.

/**
 * Une carte Chipo. Trois habillages, six raretés, deux échelles.
 *
 *   <CardFace card={card} owned={owned[card.id] > 0} />            // grille
 *   <CardFace card={card} size="large" variant="medallion" />      // détail / révélation
 *
 * Le composant remplit son conteneur : lui donner un ratio (0.72) en grille,
 * ou une taille fixe (238 × 332) en grand format.
 */

export type CardVariant = 'foil' | 'cartoon' | 'medallion';

export interface CardFaceProps {
  card: Card;
  /** false → grisée, image masquée, « ? » à la place. */
  owned?: boolean;
  size?: 'mini' | 'large';
  variant?: CardVariant;
  /** Coupe holo, reflet et particules (perf / reduced-motion). */
  animate?: boolean;
  className?: string;
}

const SCALE = {
  mini:  { pad: 4, gap: 3,  name: 10,   type: 7,  pip: 4,   r1: 15, r2: 11, circle: 74,  frame: 2.5, lock: 24 },
  large: { pad: 9, gap: 7,  name: 15,   type: 8,  pip: 6,   r1: 26, r2: 20, circle: 162, frame: 4,   lock: 54 }
} as const;

type Scale = (typeof SCALE)[keyof typeof SCALE];

const px = (n: number) => `${n}px`;

function holo(r: Rarity, animate: boolean): React.CSSProperties {
  return r.holo && animate
    ? { backgroundSize: '300% 100%', animation: 'pigHolo 5s linear infinite' }
    : {};
}

function Pips({ r, s }: { r: Rarity; s: Scale }) {
  const color = r.ink;
  return (
    <span style={{ display: 'flex', flex: 'none', gap: px(s.pip * 0.55) }}>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <i
          key={i}
          style={{
            display: 'block', width: px(s.pip), height: px(s.pip), borderRadius: '50%',
            ...(i <= r.id
              ? { background: color, opacity: 0.92 }
              : { boxShadow: `inset 0 0 0 1.2px ${color}`, opacity: 0.3 })
          }}
        />
      ))}
    </span>
  );
}

function Sheen({ r }: { r: Rarity }) {
  return (
    <div
      style={{
        position: 'absolute', top: '-20%', left: 0, width: '55%', height: '140%', pointerEvents: 'none',
        background: `linear-gradient(100deg,transparent,rgba(255,255,255,${r.id === 6 ? 0.38 : 0.45}),transparent)`,
        animation: `pigShine ${r.id >= 5 ? 3.1 : 4.6}s ease-in-out infinite`
      }}
    />
  );
}

function Sparks({ r, animate, bottom }: { r: Rarity; animate: boolean; bottom: string }) {
  if (!r.spark) return null;
  return (
    <>
      {[0, 1, 2].map(k => (
        <i
          key={k}
          style={{
            position: 'absolute', left: `${18 + k * 28}%`, bottom, width: 6, height: 6, borderRadius: '50%',
            background: r.spark, opacity: 0.6,
            animation: animate ? `pigFloat ${2.4 + k * 0.6}s ease-in-out infinite` : 'none'
          }}
        />
      ))}
    </>
  );
}

function Corners({ r, s }: { r: Rarity; s: Scale }) {
  if (!r.corners) return null;
  const d = s === SCALE.large ? 10 : 5;
  const off = s === SCALE.large ? 9 : 4;
  const fill = r.id === 6
    ? 'linear-gradient(140deg,#fff6d8,#c99a3a)'
    : 'linear-gradient(140deg,#fff6d8,#8c6318)';
  return (
    <>
      {(['top left', 'top right', 'bottom left', 'bottom right'] as const).map(pos => {
        const [v, h] = pos.split(' ') as ['top' | 'bottom', 'left' | 'right'];
        return (
          <i
            key={pos}
            style={{
              position: 'absolute', width: d, height: d, borderRadius: '50%', background: fill,
              boxShadow: '0 0 0 1px rgba(255,255,255,.55)', [v]: off, [h]: off
            } as React.CSSProperties}
          />
        );
      })}
    </>
  );
}

function Art({ card, owned, r, s, radius, circle }: {
  card: Card; owned: boolean; r: Rarity; s: Scale; radius: number | string; circle?: boolean;
}) {
  return (
    <div
      style={{
        position: 'relative', overflow: 'hidden', background: r.art,
        borderRadius: circle ? '50%' : radius,
        ...(circle
          ? {
              width: px(s.circle), height: px(s.circle), flex: 'none', zIndex: 2,
              boxShadow: `0 0 0 ${r.dark ? 4 : 5}px ${r.dark ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.75)'}`
            }
          : { flex: 1 })
      }}
    >
      {owned ? (
        <img
          src={card.image}
          alt={card.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-heading)', fontSize: px(s.lock), color: r.ink, opacity: 0.3
          }}
        >
          ?
        </div>
      )}
    </div>
  );
}

export function CardFace({
  card,
  owned = true,
  size = 'mini',
  variant = 'foil',
  animate = true,
  className
}: CardFaceProps) {
  const r = rarityById(card.rarity);
  const s = SCALE[size];
  const fx = animate && owned;

  const lockedShell: React.CSSProperties = owned
    ? {}
    : { filter: 'grayscale(1)', opacity: 0.4, animation: 'none', boxShadow: 'none' };

  const shadow =
    r.id >= 5 ? '0 8px 26px rgba(140,99,24,.35)' : r.id >= 3 ? 'var(--shadow-md, 0 3px 10px rgba(46,43,37,.16))' : 'var(--shadow-sm, 0 1px 2px rgba(46,43,37,.14))';

  const nameStyle: React.CSSProperties = {
    fontFamily: 'var(--font-heading)', fontSize: px(s.name), lineHeight: 1.06, textAlign: 'center',
    textWrap: 'balance', overflow: 'hidden'
  };

  const typeStyle: React.CSSProperties = {
    flex: 1, minWidth: 0, fontSize: px(s.type), fontWeight: 700, letterSpacing: '.08em',
    textTransform: 'uppercase', opacity: 0.65, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
  };

  // ── médaillon : cadre extérieur seulement sur les raretés sombres, ──
  //    le texte reste toujours sur une surface opaque.
  if (variant === 'medallion') {
    return (
      <div
        className={['pig-card', className].filter(Boolean).join(' ')}
        style={{
          position: 'relative', width: '100%', height: '100%', boxSizing: 'border-box',
          borderRadius: px(s.r1 + 6), overflow: 'hidden',
          padding: r.id >= 4 ? s.frame : 0,
          background: r.id >= 4 ? r.frame : 'transparent',
          boxShadow: shadow,
          ...holo(r, fx), ...lockedShell
        }}
      >
        <div
          style={{
            position: 'relative', height: '100%', boxSizing: 'border-box', overflow: 'hidden',
            borderRadius: px(s.r1 + 2), background: r.surf, color: r.ink,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(s.gap + 1),
            padding: `${px(s.pad + 2)} ${px(s.pad + 3)} ${px(s.pad + 3)}`
          }}
        >
          <Art card={card} owned={owned} r={r} s={s} radius="50%" circle />
          <div style={{ ...nameStyle, marginTop: 'auto', zIndex: 2 }}>{card.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: px(s.gap + 1), zIndex: 2 }}>
            <span style={{ ...typeStyle, flex: 'none', letterSpacing: '.12em', opacity: 0.6 }}>{card.type}</span>
            <Pips r={r} s={s} />
          </div>
          {r.sheen && fx && <Sheen r={r} />}
        </div>
      </div>
    );
  }

  // ── cartoon : contour blanc, bordure d'encre, ombre dure ──
  if (variant === 'cartoon') {
    const bw = r.id >= 5 ? 4 : r.id >= 3 ? 3.5 : 3;
    return (
      <div
        className={['pig-card', className].filter(Boolean).join(' ')}
        style={{
          position: 'relative', width: '100%', height: '100%', boxSizing: 'border-box',
          padding: px(s.pad + 3), borderRadius: px(s.r1 + 15), background: '#fffaf2',
          border: `${bw}px solid ${r.toonInk}`,
          boxShadow: `0 ${size === 'large' ? 8 : 4}px 0 ${r.dark || r.id >= 5 ? 'rgba(32,30,29,.5)' : 'rgba(140,73,26,.32)'}`,
          ...lockedShell
        }}
      >
        <div
          style={{
            position: 'relative', height: '100%', boxSizing: 'border-box', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', gap: px(s.gap + 1),
            padding: px(s.pad + 3), borderRadius: px(s.r2 + 11), background: r.surf, color: r.ink
          }}
        >
          <Art card={card} owned={owned} r={r} s={s} radius={s.r2 + 6} />
          <div
            style={{
              ...nameStyle, background: r.band, color: r.bandInk,
              padding: `${px(s.pad + 1)} ${px(s.pad + 5)}`, borderRadius: 999
            }}
          >
            {card.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '0 3px 1px' }}>
            <span style={typeStyle}>{card.type}</span>
            <Pips r={r} s={s} />
          </div>
          <Sparks r={r} animate={fx} bottom="10%" />
        </div>
      </div>
    );
  }

  // ── foil (défaut) : le cadre porte la rareté ──
  return (
    <div
      className={['pig-card', className].filter(Boolean).join(' ')}
      style={{
        position: 'relative', width: '100%', height: '100%', boxSizing: 'border-box',
        padding: px(2.6 + r.id * 0.4), borderRadius: px(s.r1), background: r.frame,
        boxShadow: shadow, ...holo(r, fx), ...lockedShell
      }}
    >
      <div
        style={{
          position: 'relative', height: '100%', boxSizing: 'border-box', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', gap: px(s.gap),
          padding: px(s.pad), borderRadius: px(s.r2), background: r.surf, color: r.ink
        }}
      >
        <Art card={card} owned={owned} r={r} s={s} radius={s.r2 - 6} />
        <div style={{ ...nameStyle, textShadow: r.dark ? '0 1px 6px rgba(0,0,0,.55)' : 'none' }}>
          {card.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '0 3px 1px' }}>
          <span style={typeStyle}>{card.type}</span>
          <Pips r={r} s={s} />
        </div>
        <Sparks r={r} animate={fx} bottom="11%" />
        <Corners r={r} s={s} />
        {r.sheen && fx && <Sheen r={r} />}
      </div>
    </div>
  );
}

export default CardFace;
