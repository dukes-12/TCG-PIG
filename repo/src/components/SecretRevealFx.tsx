import { useEffect, useState } from 'react';

/** Mise en scène de révélation pour la carte secrète — même principe que
 *  RarePullFx (rings + gerbe d'éclats), mais délibérément plus grande, plus
 *  longue (~4,5 s contre 1,6 s) et accompagnée d'un halo pulsant + d'un
 *  libellé qui arrive après coup. Se déclenche sur `active` (carte face
 *  visible), remonté à chaque carte via sa `key` dans OpenScreen. */

const SHARD_COUNT = 26;
const DURATION_MS = 4500;

export default function SecretRevealFx({ active, enabled = true }: { active: boolean; enabled?: boolean }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => setDone(true), DURATION_MS);
    return () => clearTimeout(id);
  }, [active]);

  if (!enabled || !active || done) return null;

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 3,
        overflow: 'visible',
      }}
    >
      {/* halo géant, pulse tout du long */}
      <div
        style={{
          position: 'absolute',
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: 'conic-gradient(rgba(255,217,138,.55),rgba(255,138,217,.55),rgba(138,217,255,.55),rgba(201,255,138,.55),rgba(255,217,138,.55))',
          filter: 'blur(10px)',
          animation: 'pigSecretHalo 2.6s ease-in-out infinite, pigSecretRainbow 4s linear infinite',
        }}
      />

      {/* trois anneaux décalés */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 220,
            height: 220,
            borderRadius: '50%',
            boxShadow: '0 0 0 3px #ffd98a',
            opacity: 0,
            animation: `pigSecretRing 1.7s cubic-bezier(.2,.7,.3,1) ${i * 0.5}s infinite`,
          }}
        />
      ))}

      {/* gerbe d'éclats dorés */}
      {Array.from({ length: SHARD_COUNT }, (_, i) => {
        const angle = (i / SHARD_COUNT) * 360 + (i % 2 ? 6 : -6);
        const long = i % 3 === 0;
        return (
          <i
            key={i}
            style={{
              position: 'absolute',
              width: long ? 6 : 4,
              height: long ? 20 : 12,
              borderRadius: 999,
              background: i % 2 ? '#ffd98a' : '#ff8ad9',
              transform: `rotate(${angle}deg) translateY(0)`,
              ['--pig-reach' as string]: `${long ? 300 : 230}px`,
              ['--pig-angle' as string]: `${angle}deg`,
              animation: `pigSecretShard 1.7s cubic-bezier(.15,.75,.25,1) ${(i % 6) * 0.09}s both`,
            }}
          />
        );
      })}

      {/* libellé, arrive une fois la gerbe posée */}
      <div
        style={{
          position: 'absolute',
          bottom: '6%',
          fontFamily: 'var(--font-heading)',
          fontSize: 13,
          letterSpacing: '.18em',
          textTransform: 'uppercase',
          color: '#ffe9ff',
          textShadow: '0 0 14px rgba(255,138,217,.9), 0 2px 6px rgba(0,0,0,.6)',
          animation: 'pigSecretLabel .5s ease 1.9s both',
        }}
      >
        ✦ Carte secrète ✦
      </div>
    </div>
  );
}
