import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FREE_BOOSTER_MAX, useStore } from '../state/store';
import { formatCountdown } from '../lib/formatCountdown';
import Snout from './Snout';

/** A free "Sac de glands" every hour, stacking up to 3 — separate from the
 *  purchasable stock below. Not part of the original design spec. */
export default function FreeBoosterBanner() {
  const freeBoosters = useStore((s) => s.freeBoosters);
  const nextFreeBoosterAt = useStore((s) => s.nextFreeBoosterAt);
  const claimFreeBooster = useStore((s) => s.claimFreeBooster);
  const navigate = useNavigate();

  // Local re-render tick for the live countdown — doesn't touch the store.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const full = freeBoosters >= FREE_BOOSTER_MAX;
  const subtitle = full
    ? 'Stock plein — ouvre-en un pour relancer le compteur.'
    : nextFreeBoosterAt == null
      ? 'Prochain sac gratuit bientôt.'
      : `Prochain sac gratuit dans ${formatCountdown(nextFreeBoosterAt - Date.now())}.`;

  return (
    <div
      style={{
        display: 'flex',
        gap: 13,
        alignItems: 'center',
        padding: 13,
        borderRadius: 30,
        background: 'var(--color-surface)',
        boxShadow: 'inset 0 0 0 2px var(--color-accent-2-500)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 66,
          height: 88,
          flex: 'none',
          borderRadius: 20,
          background: 'linear-gradient(160deg,#f6a06b,#8c491a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <Snout width={34} height={27} nostrilWidth={5} nostrilHeight={9} gap={5} />
        {freeBoosters > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              background: 'var(--color-accent-2-600)',
              color: 'var(--color-bg)',
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 999,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            ×{freeBoosters}
          </span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, lineHeight: 1.1 }}>Sac gratuit</div>
        <div style={{ fontSize: 11.5, opacity: 0.65, marginTop: 4, textWrap: 'pretty' as const }}>{subtitle}</div>
      </div>
      <button
        className="pressable"
        disabled={freeBoosters <= 0}
        onClick={() => {
          claimFreeBooster();
          navigate('/open');
        }}
        style={{
          cursor: freeBoosters > 0 ? 'pointer' : 'not-allowed',
          border: 0,
          fontFamily: 'var(--font-heading)',
          fontSize: 12,
          padding: '8px 14px',
          borderRadius: 999,
          background: freeBoosters > 0 ? 'var(--color-accent-2-600)' : 'var(--color-neutral-300)',
          color: freeBoosters > 0 ? 'var(--color-bg)' : 'var(--color-neutral-600)',
        }}
      >
        Ouvrir
      </button>
    </div>
  );
}
