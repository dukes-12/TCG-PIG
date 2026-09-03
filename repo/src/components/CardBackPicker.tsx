import CardBack from './CardBack';
import { CARD_BACKS } from '../data/cardBacks';
import { useStore } from '../state/store';

/** Profil → Dos de carte : choisir le dos actif, acheter les autres. */
export default function CardBackPicker() {
  const cardBack = useStore((s) => s.cardBack);
  const unlockedBacks = useStore((s) => s.unlockedBacks);
  const glands = useStore((s) => s.glands);
  const setCardBack = useStore((s) => s.setCardBack);
  const buyCardBack = useStore((s) => s.buyCardBack);

  return (
    <div style={{ padding: '22px 18px 0' }}>
      <div className="section-label" style={{ marginBottom: 11 }}>Dos de carte</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
        {CARD_BACKS.map((b) => {
          const unlocked = unlockedBacks.includes(b.key);
          const active = cardBack === b.key;
          const affordable = glands >= b.price;
          return (
            <div key={b.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                className="pressable"
                onClick={() => (unlocked ? setCardBack(b.key) : buyCardBack(b.key))}
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  borderRadius: 26,
                  padding: 4,
                  background: active ? 'var(--color-accent)' : 'transparent',
                  boxShadow: active ? 'var(--shadow-sm)' : 'inset 0 0 0 1px var(--color-divider)',
                }}
              >
                <CardBack
                  skin={b.key}
                  width={140}
                  style={{
                    filter: unlocked ? 'none' : 'grayscale(.7)',
                    opacity: unlocked ? 1 : 0.55,
                  }}
                />
                {!unlocked && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      background: 'var(--color-neutral-900)',
                      color: 'var(--color-bg)',
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '.08em',
                      padding: '4px 10px',
                      borderRadius: 999,
                      opacity: affordable ? 1 : 0.6,
                    }}
                  >
                    {b.price} glands
                  </span>
                )}
                {active && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      left: 12,
                      background: 'var(--color-bg)',
                      color: 'var(--color-text)',
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      padding: '4px 10px',
                      borderRadius: 999,
                    }}
                  >
                    Actif
                  </span>
                )}
              </div>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14 }}>{b.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
