import { cardById, rarityById } from '../data/catalog';
import { RARITY_VISUALS } from '../data/rarityVisuals';
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion';
import { useStore } from '../state/store';
import PigCard from './PigCard';

/** Card detail overlay — triggered by tapping any card anywhere in the app.
 *  Ported from the "DÉTAIL" block in Grouin - TCG Cochons.dc.html. */
export default function CardDetailOverlay() {
  const detailId = useStore((s) => s.detail);
  const owned = useStore((s) => s.owned);
  const cardStyle = useStore((s) => s.cardStyle);
  const closeDetail = useStore((s) => s.closeDetail);
  const holoAnim = !usePrefersReducedMotion();

  if (detailId == null) return null;
  const card = cardById(detailId);
  if (!card) return null;

  const rarity = rarityById(card.rarity);
  const visual = RARITY_VISUALS[card.rarity];
  const count = owned[card.id] || 0;
  const meta =
    count > 0
      ? `${card.type} · ${count} exemplaire${count > 1 ? 's' : ''} · ${rarity.recycleValue} glands`
      : `${card.type} · pas encore trouvée`;

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
        }}
      />
      <div style={{ width: 238, height: 332, animation: 'pigPop .3s ease both', position: 'relative', zIndex: 2 }}>
        <PigCard card={card} big style={cardStyle} holoAnim={holoAnim} ownedCount={count} />
      </div>
      <div style={{ marginTop: 22, textAlign: 'center', color: 'var(--color-bg)', position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', opacity: 0.7 }}>{rarity.name}</div>
        <h2 style={{ fontSize: 25, margin: '7px 0 0', color: 'var(--color-bg)', textWrap: 'balance' as const }}>{card.name}</h2>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 7 }}>{meta}</div>
      </div>
      <button
        className="pressable"
        onClick={closeDetail}
        style={{
          marginTop: 24,
          position: 'relative',
          zIndex: 2,
          border: 0,
          cursor: 'pointer',
          fontFamily: 'var(--font-heading)',
          fontSize: 14,
          background: 'var(--color-bg)',
          color: 'var(--color-text)',
          padding: '12px 28px',
          borderRadius: 999,
        }}
      >
        Fermer
      </button>
    </div>
  );
}
