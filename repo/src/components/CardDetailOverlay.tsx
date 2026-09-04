import { SECRET_RARITY_ID, cardById, rarityById } from '../data/catalog';
import { RARITY_VISUALS } from '../data/rarityVisuals';
import { useAnimations } from '../lib/useAnimations';
import { useStore } from '../state/store';
import PigCard from './PigCard';
import TiltCard from './TiltCard';

/** Card detail overlay — triggered by tapping any card anywhere in the app.
 *  Ported from the "DÉTAIL" block in Grouin - TCG Cochons.dc.html.
 *  Une seule direction visuelle (Collector foil) : plus de prop `style`.
 *
 *  C'est l'écran "on s'arrête sur cette carte en particulier" — celui où
 *  incliner la carte au doigt pour l'admirer (TiltCard) fait sens ; pas
 *  branché sur les vignettes minuscules de la grille (Collection), où le
 *  geste de pointeur sert déjà à ouvrir ce détail. */
export default function CardDetailOverlay() {
  const detailId = useStore((s) => s.detail);
  const owned = useStore((s) => s.owned);
  const ownedHolo = useStore((s) => s.ownedHolo);
  const closeDetail = useStore((s) => s.closeDetail);
  const holoAnim = useAnimations();

  if (detailId == null) return null;
  const card = cardById(detailId);
  if (!card) return null;

  const rarity = rarityById(card.rarity);
  const visual = RARITY_VISUALS[card.rarity];
  const count = owned[card.id] || 0;
  const holoCount = ownedHolo[card.id] || 0;
  const isSecret = card.rarity === SECRET_RARITY_ID;
  const meta = isSecret
    ? count > 0
      ? '1 sur 1 — pièce unique, ne se recycle pas'
      : 'Existe quelque part. 1 chance sur 6 000 000 par carte tirée.'
    : count > 0
      ? `${card.type} · ${count} exemplaire${count > 1 ? 's' : ''}${holoCount > 0 ? ` (dont ${holoCount} holo)` : ''} · ${rarity.recycleValue} glands`
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
        <TiltCard>
          <PigCard card={card} big holoAnim={holoAnim} ownedCount={count} isHolo={holoCount > 0} />
        </TiltCard>
      </div>
      <div style={{ marginTop: 22, textAlign: 'center', color: 'var(--color-bg)', position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', opacity: 0.7 }}>{rarity.name}</div>
        <h2 style={{ fontSize: 25, margin: '7px 0 0', color: 'var(--color-bg)', textWrap: 'balance' as const }}>{count > 0 ? card.name : '???'}</h2>
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
