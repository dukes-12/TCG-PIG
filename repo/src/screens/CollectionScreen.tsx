import { useMemo } from 'react';
import Chip from '../components/Chip';
import PigCard from '../components/PigCard';
import { CARDS, RARITIES, TOTAL_CARDS, TYPES } from '../data/catalog';
import { RARITY_VISUALS } from '../data/rarityVisuals';
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion';
import { useStore } from '../state/store';
import type { Card, RarityId } from '../types';

/** Ported from the "COLLECTION" block in Grouin - TCG Cochons.dc.html. */
export default function CollectionScreen() {
  const owned = useStore((s) => s.owned);
  const cardStyle = useStore((s) => s.cardStyle);
  const sort = useStore((s) => s.sort);
  const rarityFilter = useStore((s) => s.rarityFilter);
  const typeFilter = useStore((s) => s.typeFilter);
  const query = useStore((s) => s.query);
  const ownedOnly = useStore((s) => s.ownedOnly);
  const setSort = useStore((s) => s.setSort);
  const setRarityFilter = useStore((s) => s.setRarityFilter);
  const setTypeFilter = useStore((s) => s.setTypeFilter);
  const setQuery = useStore((s) => s.setQuery);
  const toggleOwnedOnly = useStore((s) => s.toggleOwnedOnly);
  const openDetail = useStore((s) => s.openDetail);
  const holoAnim = !usePrefersReducedMotion();

  const ownedIds = useMemo(() => Object.keys(owned).filter((k) => owned[Number(k)] > 0), [owned]);
  const uniq = ownedIds.length;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    let l = CARDS.filter(
      (c) =>
        (rarityFilter === 'all' || c.rarity === rarityFilter) &&
        (typeFilter === 'all' || c.type === typeFilter) &&
        (!q || c.name.toLowerCase().includes(q)) &&
        (!ownedOnly || (owned[c.id] || 0) > 0),
    );
    l = l.slice();
    if (sort === 'rarete') l.sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));
    if (sort === 'nom') l.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'type') l.sort((a, b) => a.type.localeCompare(b.type) || b.rarity - a.rarity);
    if (sort === 'nb') l.sort((a, b) => (owned[b.id] || 0) - (owned[a.id] || 0) || b.rarity - a.rarity);
    return l;
  }, [query, rarityFilter, typeFilter, ownedOnly, owned, sort]);

  return (
    <div className="screen">
      <div className="screen-inner">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <h1 style={{ fontSize: 30, margin: 0, lineHeight: 1 }}>Ma collection</h1>
          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, opacity: 0.5, paddingBottom: 4 }}>
            {uniq}/{TOTAL_CARDS}
          </span>
        </div>
        <div style={{ height: 7, borderRadius: 999, background: 'var(--color-neutral-300)', marginTop: 12, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${Math.round((uniq / TOTAL_CARDS) * 100)}%`,
              background: 'linear-gradient(90deg,var(--color-accent-2-500),var(--color-accent))',
              borderRadius: 999,
              transition: 'width .4s ease',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 5, padding: '16px 18px 0' }}>
        {RARITIES.map((r) => {
          const rTotal = CARDS.filter((c) => c.rarity === r.id).length;
          const rOwned = CARDS.filter((c) => c.rarity === r.id && (owned[c.id] || 0) > 0).length;
          return (
            <div
              key={r.id}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '9px 2px', borderRadius: 18, background: 'var(--color-surface)' }}
            >
              <i style={{ display: 'block', width: 7, height: 7, borderRadius: '50%', background: RARITY_VISUALS[r.id as RarityId].ink }} />
              <span style={{ fontSize: 7.2, letterSpacing: '.02em', textTransform: 'uppercase', opacity: 0.55, fontWeight: 700, textAlign: 'center', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                {RARITY_VISUALS[r.id as RarityId].short}
              </span>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 12, lineHeight: 1 }}>
                {rOwned}/{rTotal}
              </span>
            </div>
          );
        })}
      </div>

      <div className="screen-inner" style={{ paddingTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          className="input"
          placeholder="Chercher un cochon…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, background: 'var(--color-neutral-100)' }}
        />
        <button
          className="pressable"
          onClick={toggleOwnedOnly}
          style={{
            cursor: 'pointer',
            border: 0,
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: 11.5,
            padding: '9px 14px',
            borderRadius: 999,
            background: ownedOnly ? 'var(--color-accent-2-600)' : 'var(--color-neutral-200)',
            color: ownedOnly ? 'var(--color-bg)' : 'var(--color-text)',
            boxShadow: ownedOnly ? 'var(--shadow-sm)' : 'inset 0 0 0 1px var(--color-divider)',
          }}
        >
          {ownedOnly ? 'Possédées' : 'Toutes'}
        </button>
      </div>

      <div className="screen-inner" style={{ paddingTop: 14 }}>
        <div className="section-label" style={{ marginBottom: 7 }}>Trier</div>
        <div className="chip-row">
          {([
            ['rarete', 'Rareté'],
            ['nom', 'Nom'],
            ['type', 'Type'],
            ['nb', 'Quantité'],
          ] as const).map(([key, label]) => (
            <Chip key={key} label={label} active={sort === key} onClick={() => setSort(key)} />
          ))}
        </div>

        <div className="section-label" style={{ margin: '13px 0 7px' }}>Rareté</div>
        <div className="chip-row">
          <Chip label="Toutes" active={rarityFilter === 'all'} onClick={() => setRarityFilter('all')} />
          {RARITIES.map((r) => (
            <Chip key={r.id} label={r.name} active={rarityFilter === r.id} onClick={() => setRarityFilter(r.id as RarityId)} />
          ))}
        </div>

        <div className="section-label" style={{ margin: '13px 0 7px' }}>Type</div>
        <div className="chip-row">
          <Chip label="Tous" active={typeFilter === 'all'} onClick={() => setTypeFilter('all')} />
          {TYPES.map((t) => (
            <Chip key={t} label={t} active={typeFilter === t} onClick={() => setTypeFilter(t)} />
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, padding: '20px 18px 0' }}>
        {list.map((card: Card) => {
          const count = owned[card.id] || 0;
          return (
            <div
              key={card.id}
              className="pressable"
              onClick={() => openDetail(card.id)}
              style={{ position: 'relative', aspectRatio: '0.72', cursor: 'pointer' }}
            >
              <PigCard card={card} style={cardStyle} holoAnim={holoAnim} ownedCount={count} />
              {count > 1 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -4,
                    background: 'var(--color-neutral-900)',
                    color: 'var(--color-bg)',
                    fontSize: 9.5,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 999,
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  ×{count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {list.length === 0 && (
        <p style={{ textAlign: 'center', padding: '44px 34px', fontSize: 13, opacity: 0.5, textWrap: 'pretty' as const }}>
          Aucun cochon ne correspond. Enlève un filtre, ou va ouvrir un sac.
        </p>
      )}
    </div>
  );
}
