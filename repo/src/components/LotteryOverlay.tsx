import { rarityById } from '../data/catalog';
import { RARITY_VISUALS } from '../data/rarityVisuals';
import { useAnimations } from '../lib/useAnimations';
import { LOTTERY_PRICE, useStore } from '../state/store';
import type { RarityId } from '../types';
import CardBack from './CardBack';
import PigCard from './PigCard';

/** Écran plein cadre de la loterie : la carte tourne pendant `spinning`
 *  (suspense), puis se pose face visible sur `result`. Même famille visuelle
 *  que CardDetailOverlay (classe `.overlay`), garde le dos choisi par le
 *  joueur pour rester cohérent avec l'ouverture de sachet normale. */
export default function LotteryOverlay() {
  const lotteryState = useStore((s) => s.lotteryState);
  const lotteryCard = useStore((s) => s.lotteryCard);
  const lotteryIsNew = useStore((s) => s.lotteryIsNew);
  const owned = useStore((s) => s.owned);
  const cardBack = useStore((s) => s.cardBack);
  const glands = useStore((s) => s.glands);
  const buyLottery = useStore((s) => s.buyLottery);
  const closeLottery = useStore((s) => s.closeLottery);
  const holoAnim = useAnimations();

  if (lotteryState === 'idle') return null;

  if (lotteryState === 'spinning') {
    return (
      <div className="overlay">
        <div style={{ width: 238, height: 332, perspective: '1100px' }}>
          <div
            style={{
              width: '100%',
              height: '100%',
              animation: holoAnim ? 'pigSpin .7s linear infinite' : 'none',
            }}
          >
            <CardBack skin={cardBack} width={238} height={332} style={{ boxShadow: 'var(--shadow-lg)' }} />
          </div>
        </div>
        <div style={{ marginTop: 22, fontFamily: 'var(--font-heading)', fontSize: 15, color: 'var(--color-bg)' }}>Tirage en cours…</div>
      </div>
    );
  }

  if (!lotteryCard) return null;
  const rarity = rarityById(lotteryCard.rarity);
  const visual = RARITY_VISUALS[lotteryCard.rarity as RarityId];
  const count = owned[lotteryCard.id] || 0;
  const affordable = glands >= LOTTERY_PRICE;

  return (
    <div className="overlay">
      <div
        style={{
          position: 'absolute',
          width: 340,
          height: 340,
          borderRadius: '50%',
          pointerEvents: 'none',
          background: `radial-gradient(circle,${visual.glow},transparent 68%)`,
          opacity: 0.8,
          animation: holoAnim ? 'pigGlow 2.6s ease-in-out infinite' : 'none',
        }}
      />
      <div style={{ width: 238, height: 332, animation: 'pigPop .3s ease both', position: 'relative', zIndex: 2 }}>
        <PigCard card={lotteryCard} big forceOwned holoAnim={holoAnim} ownedCount={count} />
        {lotteryIsNew && (
          <span
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '.1em',
              padding: '4px 9px',
              borderRadius: 999,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            NOUVEAU
          </span>
        )}
        {count > 1 && (
          <span
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              background: 'var(--color-neutral-900)',
              color: 'var(--color-bg)',
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 999,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            ×{count}
          </span>
        )}
      </div>
      <div style={{ marginTop: 22, textAlign: 'center', color: 'var(--color-bg)', position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', opacity: 0.7 }}>{rarity.name}</div>
        <h2 style={{ fontSize: 25, margin: '7px 0 0', color: 'var(--color-bg)', textWrap: 'balance' as const }}>{lotteryCard.name}</h2>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 7 }}>{lotteryCard.type}</div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 24, position: 'relative', zIndex: 2 }}>
        <button
          className="pressable"
          onClick={closeLottery}
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
          disabled={!affordable}
          onClick={buyLottery}
          style={{
            border: 0,
            cursor: affordable ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-heading)',
            fontSize: 14,
            background: affordable ? '#c99a3a' : 'var(--color-neutral-400)',
            color: affordable ? '#2b1a02' : 'var(--color-neutral-600)',
            padding: '12px 24px',
            borderRadius: 999,
          }}
        >
          Rejouer ({LOTTERY_PRICE})
        </button>
      </div>
    </div>
  );
}
