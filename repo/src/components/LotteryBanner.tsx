import { LOTTERY_PRICE, useStore } from '../state/store';
import Snout from './Snout';

/** Loterie de la boutique : 1000 glands pour une carte garantie Épique ou
 *  mieux, une seule carte. Même gabarit de bandeau que FreeBoosterBanner /
 *  DailyBoosterBanner, doré pour la distinguer des sachets. */
export default function LotteryBanner() {
  const glands = useStore((s) => s.glands);
  const buyLottery = useStore((s) => s.buyLottery);
  const affordable = glands >= LOTTERY_PRICE;

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
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, lineHeight: 1.1 }}>Loterie</div>
        <div style={{ fontSize: 11.5, opacity: 0.65, marginTop: 4, textWrap: 'pretty' as const }}>
          Une carte garantie Épique ou mieux. Plus de chances de tomber sur du très rare.
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
            {LOTTERY_PRICE} glands
          </span>
        </div>
      </div>
      <button
        className="pressable"
        disabled={!affordable}
        onClick={buyLottery}
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
        Tenter
      </button>
    </div>
  );
}
