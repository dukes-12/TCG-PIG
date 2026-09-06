import { useEffect, useState } from 'react';

/** Petit effet de tirage pour signaler une carte HOLO (voir HOLO_CHANCE dans
 *  store.ts — orthogonal à la rareté, peut tomber sur n'importe quelle carte
 *  hors secrète, même Commune). Volontairement plus discret que
 *  RarePullFx/SecretRevealFx, dont il n'a pas vocation à prendre la place :
 *  un halo prismatique qui pulse une fois, un anneau, trois étincelles —
 *  pas de gerbe, pas de libellé. Sur une carte à la fois rare et holo, les
 *  deux effets se jouent en même temps (RarePullFx gère déjà `!isSecret`,
 *  et holo/secrète sont mutuellement exclusifs côté tirage). Se déclenche
 *  au retournement (`active`), remonté à chaque carte via sa `key` dans
 *  OpenScreen. */

const DURATION_MS = 1300;
// Même palette que le badge "✨ Holo" (OpenScreen) — un seul endroit visuel
// à reconnaître pour "c'est une holo".
const SPARK_COLORS = ['#5cf29a', '#4fc3ff', '#a06bff'];

export default function HoloPullFx({ active, enabled = true }: { active: boolean; enabled?: boolean }) {
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
      }}
    >
      {/* halo prismatique, un seul pulse */}
      <div
        style={{
          position: 'absolute',
          width: 270,
          height: 270,
          borderRadius: '50%',
          background: 'conic-gradient(from 0deg, #5cf29a, #4fc3ff, #a06bff, #5cf29a)',
          filter: 'blur(14px)',
          animation: 'pigHoloHalo 1.3s ease-out both',
        }}
      />

      {/* anneau unique */}
      <div
        style={{
          position: 'absolute',
          width: 210,
          height: 210,
          borderRadius: '50%',
          boxShadow: '0 0 0 2.5px #d8ecff',
          opacity: 0,
          animation: 'pigHoloRing 1s cubic-bezier(.2,.7,.3,1) .1s both',
        }}
      />

      {/* trois étincelles, une par couleur de la palette holo */}
      {[0, 1, 2].map((i) => (
        <i
          key={i}
          style={{
            position: 'absolute',
            top: `${18 + i * 30}%`,
            left: i === 0 ? '12%' : i === 1 ? '80%' : '18%',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: SPARK_COLORS[i],
            boxShadow: `0 0 8px ${SPARK_COLORS[i]}`,
            animation: `pigSecretTwinkle .9s ease-in-out ${i * 0.15}s 1`,
          }}
        />
      ))}
    </div>
  );
}
