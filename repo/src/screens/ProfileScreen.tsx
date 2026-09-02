import { useMemo } from 'react';
import Chip from '../components/Chip';
import PigCard from '../components/PigCard';
import Snout from '../components/Snout';
import { CARDS, RARITIES, TOTAL_CARDS, rarityById } from '../data/catalog';
import { RARITY_VISUALS } from '../data/rarityVisuals';
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion';
import { useStore } from '../state/store';
import type { CardStyle, RarityId } from '../types';

/** Ported from the "PROFIL" block in Grouin - TCG Cochons.dc.html. The
 *  "Style des cartes" section is new: the prototype's two card directions
 *  were a design-time tweak, here they're a real user-facing setting. */
export default function ProfileScreen() {
  const owned = useStore((s) => s.owned);
  const glands = useStore((s) => s.glands);
  const openedCount = useStore((s) => s.openedCount);
  const cardStyle = useStore((s) => s.cardStyle);
  const setCardStyle = useStore((s) => s.setCardStyle);
  const openDetail = useStore((s) => s.openDetail);
  const holoAnim = !usePrefersReducedMotion();

  const ownedIds = useMemo(() => Object.keys(owned).filter((k) => owned[Number(k)] > 0).map(Number), [owned]);
  const uniq = ownedIds.length;

  const best = useMemo(() => {
    const candidates = ownedIds.map((id) => CARDS.find((c) => c.id === id)!).sort((a, b) => b.rarity - a.rarity);
    return candidates[0] || CARDS[0];
  }, [ownedIds]);

  const rank = uniq >= TOTAL_CARDS ? 'Grand Maître Truffier' : uniq > TOTAL_CARDS * 0.6 ? 'Éleveur confirmé' : 'Apprenti fermier';

  const stats = [
    { val: `${uniq}/${TOTAL_CARDS}`, label: 'Cartes uniques' },
    { val: `${Math.round((uniq / TOTAL_CARDS) * 100)}%`, label: 'Complétion' },
    { val: String(openedCount), label: 'Sacs ouverts' },
    { val: String(glands), label: 'Glands' },
  ];

  return (
    <div className="screen">
      <div className="screen-inner">
        <h1 style={{ fontSize: 30, margin: 0, lineHeight: 1 }}>Profil</h1>
      </div>

      <div className="screen-inner" style={{ paddingTop: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
        <Snout width={74} height={74} nostrilWidth={12} nostrilHeight={19} gap={11} bg="linear-gradient(160deg,#ffd2b4,#f6a06b)" boxShadow="var(--shadow-md)" />
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, lineHeight: 1.1 }}>Éleveur Grouik</div>
          <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 4 }}>{rank}</div>
        </div>
      </div>

      <div className="screen-inner" style={{ paddingTop: 20 }}>
        <div className="section-label" style={{ marginBottom: 9 }}>Style des cartes</div>
        <div className="chip-row">
          {(['Sticker cartoon', 'Collector foil'] as CardStyle[]).map((opt) => (
            <Chip key={opt} label={opt} active={cardStyle === opt} onClick={() => setCardStyle(opt)} />
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, padding: '20px 18px 0' }}>
        {stats.map((s) => (
          <div key={s.label} style={{ padding: '14px 16px', borderRadius: 26, background: 'var(--color-surface)' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 26, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase', opacity: 0.55, fontWeight: 700, marginTop: 5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="screen-inner" style={{ paddingTop: 20 }}>
        <div className="section-label" style={{ marginBottom: 11 }}>Complétion par rareté</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {RARITIES.map((r) => {
            const t = CARDS.filter((c) => c.rarity === r.id).length;
            const o = CARDS.filter((c) => c.rarity === r.id && (owned[c.id] || 0) > 0).length;
            const ink = RARITY_VISUALS[r.id as RarityId].ink;
            return (
              <div key={r.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, marginBottom: 5 }}>
                  <i style={{ display: 'block', width: 8, height: 8, borderRadius: '50%', background: ink }} />
                  <span style={{ flex: 1, fontWeight: 600 }}>{r.name}</span>
                  <span style={{ opacity: 0.55 }}>
                    {o}/{t}
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: 'var(--color-neutral-300)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round((o / t) * 100)}%`, background: ink, borderRadius: 999, transition: 'width .4s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="screen-inner" style={{ paddingTop: 22 }}>
        <div className="section-label" style={{ marginBottom: 11 }}>Meilleure trouvaille</div>
        <div
          className="pressable"
          onClick={() => openDetail(best.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 28, background: 'var(--color-surface)', cursor: 'pointer' }}
        >
          <div style={{ width: 74, height: 104, flex: 'none' }}>
            <PigCard card={best} style={cardStyle} holoAnim={holoAnim} ownedCount={owned[best.id] || 0} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, lineHeight: 1.15 }}>{best.name}</div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 5 }}>
              {rarityById(best.rarity).name} · {best.type} · ×{owned[best.id] || 1}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
