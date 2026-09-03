import type { CSSProperties } from 'react';
import { cardBackByKey } from '../data/cardBacks';
import type { CardBackKey } from '../types';

/** Le dos d'une carte, sur la marque CHIPO. Quatre habillages (voir
 *  `data/cardBacks.ts`), une seule géométrie, mise à l'échelle par `width`.
 *  Utilisé par la face cachée pendant la révélation de pack et par le
 *  sélecteur de dos dans Profil. */
export default function CardBack({
  skin,
  width = 238,
  height,
  style,
}: {
  skin: CardBackKey;
  width?: number;
  /** Par défaut : ratio 238 × 332 de la carte. */
  height?: number;
  style?: CSSProperties;
}) {
  const b = cardBackByKey(skin);
  const h = height ?? Math.round((width * 332) / 238);
  // Tout est exprimé en fraction de la largeur de référence (238 px), donc
  // le dos reste juste en vignette (60 px) comme en plein écran.
  const k = width / 238;
  const px = (n: number) => Math.round(n * k * 100) / 100;

  return (
    <div
      style={{
        position: 'relative',
        width,
        height: h,
        borderRadius: px(28),
        overflow: 'hidden',
        background: b.bg,
        boxShadow: 'var(--shadow-md)',
        ...style,
      }}
    >
      {b.pattern === 'guilloche' && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            width: px(420),
            height: px(420),
            background:
              'repeating-conic-gradient(from 0deg at 50% 50%,rgba(255,233,176,.5) 0 .7deg,transparent .7deg 3.4deg)',
            opacity: 0.5,
          }}
        />
      )}
      {b.pattern === 'rays' && (
        <>
          <div
            style={{
              position: 'absolute',
              top: px(-70),
              left: '50%',
              transform: 'translateX(-50%)',
              width: px(420),
              height: px(420),
              background:
                b.key === 'nuit'
                  ? 'repeating-conic-gradient(from 0deg at 50% 50%,rgba(255,217,138,.4) 0 4deg,transparent 4deg 10deg)'
                  : 'repeating-conic-gradient(from 0deg at 50% 50%,#c99a3a 0 5deg,transparent 5deg 11deg)',
              opacity: b.key === 'nuit' ? 0.55 : 0.85,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(circle at 50% 32%,transparent 28%,${
                b.key === 'nuit' ? 'rgba(22,10,36,.85)' : 'rgba(32,30,29,.9)'
              } 76%)`,
            }}
          />
        </>
      )}
      {b.pattern === 'ripples' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 46%,transparent 40%,rgba(38,20,8,.55))',
          }}
        />
      )}

      {/* double filet intérieur */}
      <div
        style={{
          position: 'absolute',
          inset: px(9),
          borderRadius: px(20),
          boxShadow: `inset 0 0 0 ${Math.max(1, px(1.5))}px ${b.ink}80`,
        }}
      />

      {/* médaillon au groin */}
      <div
        style={{
          position: 'absolute',
          top: b.pattern === 'ripples' ? '46%' : px(58),
          left: '50%',
          transform: b.pattern === 'ripples' ? 'translate(-50%,-50%)' : 'translateX(-50%)',
          width: px(116),
          height: px(116),
          borderRadius: '50%',
          background: b.ring,
          padding: px(5),
          boxSizing: 'border-box',
          boxShadow: `0 ${px(6)}px ${px(18)}px rgba(0,0,0,.4)`,
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: '50%',
            background: b.medallion,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: px(60),
              height: px(48),
              borderRadius: '50%',
              background: b.snoutBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: px(11),
            }}
          >
            <i style={{ display: 'block', width: px(10), height: px(16), borderRadius: '50%', background: b.nostril }} />
            <i style={{ display: 'block', width: px(10), height: px(16), borderRadius: '50%', background: b.nostril }} />
          </div>
        </div>
      </div>

      {/* mot-marque */}
      <div style={{ position: 'absolute', bottom: px(b.tagline ? 52 : 34), left: 0, right: 0, textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: px(28),
            color: b.ink,
            letterSpacing: '.1em',
            lineHeight: 1,
            textShadow: '0 2px 8px rgba(0,0,0,.45)',
          }}
        >
          CHIPO
        </div>
        {b.tagline && (
          <>
            <div style={{ height: Math.max(1, px(1.5)), background: `${b.ink}99`, margin: `${px(12)}px ${px(52)}px ${px(10)}px` }} />
            <div
              style={{
                fontSize: px(7),
                fontWeight: 700,
                letterSpacing: '.34em',
                textTransform: 'uppercase',
                color: b.ink,
                opacity: 0.85,
              }}
            >
              {b.tagline}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
