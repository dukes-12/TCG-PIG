import { useAnimations } from '../lib/useAnimations';
import { useStore } from '../state/store';
import Snout from './Snout';

const wheelFace = (
  <div
    style={{
      width: 220,
      height: 220,
      borderRadius: '50%',
      background:
        'conic-gradient(#6c3fa0 0deg 60deg,#a678d8 60deg 120deg,#6c3fa0 120deg 180deg,#a678d8 180deg 240deg,#6c3fa0 240deg 300deg,#a678d8 300deg 360deg)',
      boxShadow: 'var(--shadow-lg)',
      border: '7px solid var(--color-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--color-bg)', boxShadow: 'var(--shadow-sm)' }} />
  </div>
);

/** Roue de la chance : la roue tourne pendant `spinning` (même famille
 *  visuelle que LotteryOverlay — suspense d'abord, résultat ensuite),
 *  gagné = un Sac de glands ajouté en poche, perdu = juste un message pour
 *  la peine. Pas de sous-écran de règles : le nombre d'essais restants
 *  suffit, affiché sur WheelBanner. */
export default function WheelOverlay() {
  const wheelState = useStore((s) => s.wheelState);
  const wheelWon = useStore((s) => s.wheelWon);
  const wheelSpins = useStore((s) => s.wheelSpins);
  const spinWheel = useStore((s) => s.spinWheel);
  const closeWheel = useStore((s) => s.closeWheel);
  const holoAnim = useAnimations();

  if (wheelState === 'idle') return null;

  if (wheelState === 'spinning') {
    return (
      <div className="overlay">
        <div style={{ position: 'relative' }}>
          {/* Pointeur fixe — ne tourne pas avec la roue. */}
          <div
            style={{
              position: 'absolute',
              top: -14,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: '16px solid var(--color-bg)',
              zIndex: 2,
            }}
          />
          <div style={{ animation: holoAnim ? 'pigWheelSpin .9s linear infinite' : 'none' }}>{wheelFace}</div>
        </div>
        <div style={{ marginTop: 22, fontFamily: 'var(--font-heading)', fontSize: 15, color: 'var(--color-bg)' }}>Ça tourne…</div>
      </div>
    );
  }

  return (
    <div className="overlay">
      <div style={{ width: 130, height: 130, animation: 'pigPop .3s ease both', position: 'relative' }}>
        {wheelWon ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'linear-gradient(160deg,#c3dba3,#5b7a3a)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Snout width={62} height={50} nostrilWidth={9} nostrilHeight={16} gap={9} bg="#ffd2b4" />
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'var(--color-neutral-300)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter: 'grayscale(1)',
            }}
          >
            <Snout width={62} height={50} nostrilWidth={9} nostrilHeight={16} gap={9} bg="#ffd2b4" />
          </div>
        )}
      </div>

      <div style={{ marginTop: 22, textAlign: 'center', color: 'var(--color-bg)', position: 'relative', zIndex: 2, maxWidth: 280 }}>
        <h2 style={{ fontSize: 23, margin: 0, color: 'var(--color-bg)', textWrap: 'balance' as const }}>
          {wheelWon ? 'Gagné !' : 'Rentre chez ta mère.'}
        </h2>
        <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 8, textWrap: 'pretty' as const }}>
          {wheelWon ? 'Un Sac de glands ajouté en poche.' : 'Perdu. Retente ta chance.'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 24, position: 'relative', zIndex: 2 }}>
        <button
          className="pressable"
          onClick={closeWheel}
          style={{
            border: 0,
            cursor: 'pointer',
            fontFamily: 'var(--font-heading)',
            fontSize: 14,
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            padding: '12px 24px',
            borderRadius: 999,
          }}
        >
          Fermer
        </button>
        <button
          className="pressable"
          disabled={wheelSpins <= 0}
          onClick={spinWheel}
          style={{
            border: 0,
            cursor: wheelSpins > 0 ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-heading)',
            fontSize: 14,
            background: wheelSpins > 0 ? '#6c3fa0' : 'var(--color-neutral-400)',
            color: wheelSpins > 0 ? '#fff6ef' : 'var(--color-neutral-600)',
            padding: '12px 24px',
            borderRadius: 999,
          }}
        >
          Retourner ({wheelSpins})
        </button>
      </div>
    </div>
  );
}
