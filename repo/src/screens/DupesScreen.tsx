import GlandsPill from '../components/GlandsPill';
import PigCard from '../components/PigCard';
import { CARDS, SECRET_RARITY_ID, rarityById } from '../data/catalog';
import { useAnimations } from '../lib/useAnimations';
import { HOLO_RECYCLE_MULTIPLIER, useStore } from '../state/store';

/** Ported from the "DOUBLONS" block in Grouin - TCG Cochons.dc.html.
 *  Une seule direction visuelle (Collector foil) : plus de prop `style`.
 *
 *  Les doublons holo ont leur propre section, plus bas : `owned` et
 *  `ownedHolo` sont deux collections indépendantes (voir HOLO_CHANCE dans
 *  state/store.ts), donc les deux listes ci-dessous ne se croisent jamais
 *  — recycler l'une ne touche jamais l'autre. */
export default function DupesScreen() {
  const owned = useStore((s) => s.owned);
  const ownedHolo = useStore((s) => s.ownedHolo);
  const glands = useStore((s) => s.glands);
  const openDetail = useStore((s) => s.openDetail);
  const recycle = useStore((s) => s.recycle);
  const recycleHolo = useStore((s) => s.recycleHolo);
  const holoAnim = useAnimations();

  // La carte secrète ne se recycle jamais, même en cas de double exemplaire
  // (1 chance sur 6 000 000 deux fois — en pratique jamais, mais on ne
  // laisse pas la possibilité) : c'est une pièce unique à garder, pas une
  // source de glands.
  const dupeList = CARDS.filter((c) => c.rarity !== SECRET_RARITY_ID && (owned[c.id] || 0) > 1).sort((a, b) => b.rarity - a.rarity);

  const holoDupeList = CARDS.filter((c) => c.rarity !== SECRET_RARITY_ID && (ownedHolo[c.id] || 0) > 1).sort((a, b) => b.rarity - a.rarity);

  return (
    <div className="screen">
      <div className="screen-inner" style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <h1 style={{ fontSize: 30, margin: 0, lineHeight: 1 }}>Doublons</h1>
        <GlandsPill glands={glands} />
      </div>
      <p style={{ padding: '0 18px', fontSize: 13, opacity: 0.6, margin: '10px 0 0', textWrap: 'pretty' as const }}>
        {dupeList.length > 0
          ? 'Recycle tes exemplaires en trop contre des glands. Tu gardes toujours un exemplaire.'
          : 'Recycle tes exemplaires en trop contre des glands.'}
      </p>

      {dupeList.length > 0 ? (
        <div className="screen-inner" style={{ paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dupeList.map((card) => {
            const n = owned[card.id];
            const extra = n - 1;
            const rarity = rarityById(card.rarity);
            const gain = rarity.recycleValue * extra;
            return (
              <div key={card.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 26, background: 'var(--color-surface)' }}>
                <div className="pressable" onClick={() => openDetail(card.id)} style={{ width: 60, height: 84, flex: 'none', cursor: 'pointer' }}>
                  <PigCard card={card} holoAnim={holoAnim} ownedCount={n} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15, lineHeight: 1.15 }}>{card.name}</div>
                  <div style={{ fontSize: 10.5, opacity: 0.6, marginTop: 3 }}>
                    {rarity.name} · {card.type}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: 'var(--color-neutral-200)', color: 'var(--color-neutral-800)' }}>
                      ×{n} — {extra} en trop
                    </span>
                  </div>
                </div>
                <button
                  className="pressable"
                  onClick={() => recycle(card.id)}
                  style={{ cursor: 'pointer', border: 0, fontFamily: 'var(--font-heading)', fontSize: 12, padding: '8px 14px', borderRadius: 999, background: 'var(--color-accent-2-600)', color: 'var(--color-bg)' }}
                >
                  +{gain}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ textAlign: 'center', padding: '50px 34px', fontSize: 13, opacity: 0.5, textWrap: 'pretty' as const }}>
          Pas un seul doublon. Ouvre des sacs — ça viendra.
        </p>
      )}

      {/* Doublons holo — section à part, avec sa propre valeur (×HOLO_RECYCLE_MULTIPLIER).
          N'apparaît que si le joueur a au moins 2 exemplaires holo de la même carte. */}
      {holoDupeList.length > 0 && (
        <div className="screen-inner" style={{ paddingTop: 26 }}>
          <div className="section-label" style={{ marginBottom: 11 }}>Doublons holo ✨</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {holoDupeList.map((card) => {
              const holoN = ownedHolo[card.id];
              const extra = holoN - 1;
              const rarity = rarityById(card.rarity);
              const gain = rarity.recycleValue * HOLO_RECYCLE_MULTIPLIER * extra;
              return (
                <div key={card.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 26, background: 'var(--color-surface)', boxShadow: 'inset 0 0 0 1.5px rgba(160,107,255,.35)' }}>
                  <div className="pressable" onClick={() => openDetail(card.id)} style={{ width: 60, height: 84, flex: 'none', cursor: 'pointer' }}>
                    <PigCard card={card} holoAnim={holoAnim} ownedCount={holoN} isHolo />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15, lineHeight: 1.15 }}>{card.name}</div>
                    <div style={{ fontSize: 10.5, opacity: 0.6, marginTop: 3 }}>
                      {rarity.name} · {card.type}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: 'var(--color-neutral-200)', color: 'var(--color-neutral-800)' }}>
                        ✨×{holoN} — {extra} en trop
                      </span>
                    </div>
                  </div>
                  <button
                    className="pressable"
                    onClick={() => recycleHolo(card.id)}
                    style={{ cursor: 'pointer', border: 0, fontFamily: 'var(--font-heading)', fontSize: 12, padding: '8px 14px', borderRadius: 999, background: 'linear-gradient(90deg,#5cf29a,#4fc3ff,#a06bff)', color: '#161022' }}
                  >
                    +{gain}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
