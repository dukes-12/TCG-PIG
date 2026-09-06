import { SLOT_BETS } from '../lib/slot';
import { useStore } from '../state/store';
import Snout from './Snout';

/** Machine à sous de la boutique — remplace l'ancienne Loterie. Même
 *  gabarit de bandeau que FreeBoosterBanner/DailyBoosterBanner, doré pour
 *  rester dans la même famille visuelle que l'ancienne. */
export default function SlotMachineBanner() {
  const glands = useStore((s) => s.glands);
  const slotBet = useStore((s) => s.slotBet);
  const openSlot = useStore((s) => s.openSlot);
  const affordable = glands >= slotBet;

  return (
    <div
      style={{
        display: 'flex',
        gap: 13,
        alignItems: 'center',
        padding: 13,
        borderRadius: 30,
        background: 'var(--color-surface)',
        boxShadow: 'inset 0 0 0 2px #c99a3a',
      }}
    >
      <div
        style={{
          width: 66,
          height: 88,
          flex: 'none',
          borderRadius: 20,
          background: 'linear-gradient(160deg,#ffe9b0,#c99a3a 55%,#43206d)',
          backgroundSize: '300% 100%',
          animation: 'pigHolo 3.4s linear infinite',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <Snout width={34} height={27} nostrilWidth={5} nostrilHeight={9} gap={5} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, lineHeight: 1.1 }}>Machine à sous</div>
        <div style={{ fontSize: 11.5, opacity: 0.65, marginTop: 4, textWrap: 'pretty' as const }}>
          3 rouleaux de cochons. Aligne 3 fois le même pour multiplier ta mise — plus il est rare, plus gros le lot.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 13,
              color: '#8c6318',
              background: '#ffe9b0',
              padding: '3px 10px',
              borderRadius: 999,
            }}
          >
            dès {SLOT_BETS[0]} glands
          </span>
        </div>
      </div>
      <button
        className="pressable"
        disabled={!affordable}
        onClick={openSlot}
        style={{
          cursor: affordable ? 'pointer' : 'not-allowed',
          border: 0,
          fontFamily: 'var(--font-heading)',
          fontSize: 12,
          padding: '8px 14px',
          borderRadius: 999,
          background: affordable ? '#c99a3a' : 'var(--color-neutral-300)',
          color: affordable ? '#2b1a02' : 'var(--color-neutral-600)',
        }}
      >
        Jouer
      </button>
    </div>
  );
}
