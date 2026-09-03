import { useEffect, useState } from 'react';
import { formatCountdown } from '../lib/formatCountdown';
import { WHEEL_SPINS_MAX, useStore } from '../state/store';
import Snout from './Snout';

/** Roue de la chance : 3 essais gratuits par jour, un Sac de glands à la
 *  clé. Même gabarit que FreeBoosterBanner, en violet pour la distinguer
 *  des sachets et de la Loterie (dorée). */
export default function WheelBanner() {
  const wheelSpins = useStore((s) => s.wheelSpins);
  const nextWheelResetAt = useStore((s) => s.nextWheelResetAt);
  const spinWheel = useStore((s) => s.spinWheel);

  // Tick local pour le compte à rebours — ne touche pas au store.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const empty = wheelSpins <= 0;
  const subtitle = empty
    ? nextWheelResetAt == null
      ? 'Prochains essais bientôt.'
      : `Prochains essais dans ${formatCountdown(nextWheelResetAt - Date.now())}.`
    : `${wheelSpins}/${WHEEL_SPINS_MAX} essais — un Sac de glands à la clé.`;

  return (
    <div
      style={{
        display: 'flex',
        gap: 13,
        alignItems: 'center',
        padding: 13,
        borderRadius: 30,
        background: 'var(--color-surface)',
        boxShadow: 'inset 0 0 0 2px #6c3fa0',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 66,
          height: 88,
          flex: 'none',
          borderRadius: 20,
          background: 'conic-gradient(#6c3fa0 0deg 90deg,#a678d8 90deg 180deg,#6c3fa0 180deg 270deg,#a678d8 270deg 360deg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <Snout width={30} height={24} nostrilWidth={4.5} nostrilHeight={8} gap={4.5} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, lineHeight: 1.1 }}>Roue de la chance</div>
        <div style={{ fontSize: 11.5, opacity: 0.65, marginTop: 4, textWrap: 'pretty' as const }}>{subtitle}</div>
      </div>
      <button
        className="pressable"
        disabled={empty}
        onClick={spinWheel}
        style={{
          cursor: empty ? 'not-allowed' : 'pointer',
          border: 0,
          fontFamily: 'var(--font-heading)',
          fontSize: 12,
          padding: '8px 14px',
          borderRadius: 999,
          background: empty ? 'var(--color-neutral-300)' : '#6c3fa0',
          color: empty ? 'var(--color-neutral-600)' : '#fff6ef',
        }}
      >
        Tourner
      </button>
    </div>
  );
}
