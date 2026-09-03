import { useEffect, useState } from 'react';
import { RARITY_VISUALS } from '../data/rarityVisuals';
import type { RarityId } from '../types';

/** Effet de tirage pour les raretés Épique (4), Légendaire (5) et Mythique (6).
 *  Se déclenche au retournement de la carte : deux anneaux qui s'ouvrent, un
 *  flash, et une gerbe d'éclats projetés en cercle. Purement décoratif —
 *  `pointer-events: none`, et rien ne se joue si l'utilisateur·rice a demandé
 *  moins de mouvement (les keyframes sont neutralisées par la media query de
 *  `animations.css`). Le composant se remonte à chaque carte via sa `key`. */

const SHARD_COUNT = 14;

export default function RarePullFx({
  rarity,
  active,
  enabled = true,
}: {
  rarity: RarityId;
  /** true dès que la carte est face visible. */
  active: boolean;
  enabled?: boolean;
}) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => setDone(true), 1600);
    return () => clearTimeout(id);
  }, [active]);

  if (!enabled || !active || done || rarity < 4) return null;

  const glow = RARITY_VISUALS[rarity].glow;
  const shardColor = rarity === 4 ? '#e8d4ff' : rarity === 5 ? '#ffe9b0' : '#ffd98a';
  // Mythique : plus d'éclats, plus loin, un poil plus lent.
  const reach = rarity === 6 ? 230 : rarity === 5 ? 200 : 170;
  const count = rarity === 6 ? SHARD_COUNT + 6 : SHARD_COUNT;

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
      {/* flash central */}
      <div
        style={{
          position: 'absolute',
          width: 260,
          height: 260,
          borderRadius: '50%',
          background: `radial-gradient(circle,${glow},transparent 62%)`,
          animation: 'pigRareFlash .55s ease-out both',
        }}
      />

      {/* deux anneaux décalés */}
      {[0, 1].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 200,
            height: 200,
            borderRadius: '50%',
            boxShadow: `0 0 0 3px ${shardColor}`,
            opacity: 0,
            animation: `pigRareRing ${rarity === 6 ? 1.15 : 0.95}s cubic-bezier(.2,.7,.3,1) ${i * 0.18}s both`,
          }}
        />
      ))}

      {/* gerbe d'éclats */}
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * 360 + (i % 2 ? 8 : -8);
        const long = i % 3 === 0;
        return (
          <i
            key={i}
            style={{
              position: 'absolute',
              width: long ? 5 : 3.5,
              height: long ? 16 : 10,
              borderRadius: 999,
              background: shardColor,
              transform: `rotate(${angle}deg) translateY(0)`,
              // La distance parcourue est portée par la custom property, lue
              // par les keyframes — un seul jeu de keyframes pour tous les éclats.
              ['--pig-reach' as string]: `${long ? reach : reach * 0.78}px`,
              ['--pig-angle' as string]: `${angle}deg`,
              animation: `pigRareShard ${rarity === 6 ? 1.1 : 0.9}s cubic-bezier(.15,.75,.25,1) ${(i % 4) * 0.04}s both`,
            }}
          />
        );
      })}
    </div>
  );
}
