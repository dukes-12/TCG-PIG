import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DAILY_GRANT_AMOUNT, useStore } from '../state/store';
import { formatCountdown } from '../lib/formatCountdown';
import Snout from './Snout';

/** Le versement quotidien : trois sachets ajoutés à la poche chaque jour.
 *  Remplace l'ancien « sac gratuit toutes les heures » — les sachets ne sont
 *  plus une réserve à part, ils tombent directement dans le stock, donc ce
 *  bandeau n'a rien à réclamer : il annonce, et renvoie vers l'ouverture. */
export default function DailyBoosterBanner() {
  const nextDailyGrantAt = useStore((s) => s.nextDailyGrantAt);
  const stock = useStore((s) => s.stock);
  const navigate = useNavigate();

  // Tick local pour le compte à rebours — ne touche pas au store.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const inPocket = stock.basic || 0;
  const subtitle =
    nextDailyGrantAt == null
      ? `${DAILY_GRANT_AMOUNT} sachets offerts chaque jour.`
      : `Prochains ${DAILY_GRANT_AMOUNT} sachets dans ${formatCountdown(nextDailyGrantAt - Date.now())}.`;

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
        {inPocket > 0 && (
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
            ×{inPocket}
          </span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, lineHeight: 1.1 }}>Sachets du jour</div>
        <div style={{ fontSize: 11.5, opacity: 0.65, marginTop: 4, textWrap: 'pretty' as const }}>{subtitle}</div>
      </div>
      <button
        className="pressable"
        disabled={inPocket <= 0}
        onClick={() => navigate('/open')}
        style={{
          cursor: inPocket > 0 ? 'pointer' : 'not-allowed',
          border: 0,
          fontFamily: 'var(--font-heading)',
          fontSize: 12,
          padding: '8px 14px',
          borderRadius: 999,
          background: inPocket > 0 ? 'var(--color-accent-2-600)' : 'var(--color-neutral-300)',
          color: inPocket > 0 ? 'var(--color-bg)' : 'var(--color-neutral-600)',
        }}
      >
        Ouvrir
      </button>
    </div>
  );
}
