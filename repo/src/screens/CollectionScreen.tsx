import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Chip from '../components/Chip';
import PigCard from '../components/PigCard';
import { CARDS, RARITIES, SECRET_CARD, SECRET_RARITY_ID, TOTAL_CARDS, TYPES } from '../data/catalog';
import { RARITY_VISUALS } from '../data/rarityVisuals';
import { useAnimations } from '../lib/useAnimations';
import { useStore } from '../state/store';
import type { Card, GridCols, RarityId } from '../types';

/** Ported from the "COLLECTION" block in Grouin - TCG Cochons.dc.html.
 *  Deux ajouts par rapport au portage initial : la densité de grille est
 *  réglable (2, 3 ou 4 cartes de front, persistée), et le badge de doublon
 *  est posé *dans* la carte — en débord il était rogné par
 *  `overflow-x: hidden` sur `.screen`, ce qui donnait des cartes visuellement
 *  tronquées sur la colonne de droite. */
export default function CollectionScreen() {
  const owned = useStore((s) => s.owned);
  const ownedHolo = useStore((s) => s.ownedHolo);
  const sort = useStore((s) => s.sort);
  const rarityFilter = useStore((s) => s.rarityFilter);
  const typeFilter = useStore((s) => s.typeFilter);
  const query = useStore((s) => s.query);
  const ownedOnly = useStore((s) => s.ownedOnly);
  const gridCols = useStore((s) => s.gridCols);
  const setSort = useStore((s) => s.setSort);
  const setRarityFilter = useStore((s) => s.setRarityFilter);
  const setTypeFilter = useStore((s) => s.setTypeFilter);
  const setQuery = useStore((s) => s.setQuery);
  const setGridCols = useStore((s) => s.setGridCols);
  const toggleOwnedOnly = useStore((s) => s.toggleOwnedOnly);
  const openDetail = useStore((s) => s.openDetail);
  const holoAnim = useAnimations();
  const navigate = useNavigate();

  // La carte secrète ne compte pas dans "cartes uniques" — comme
  // TOTAL_CARDS, c'est un bonus caché, pas un objectif de complétion.
  const ownedIds = useMemo(
    () => Object.keys(owned).filter((k) => owned[Number(k)] > 0 && Number(k) !== SECRET_CARD?.id),
    [owned],
  );
  const uniq = ownedIds.length;
  const holoUniq = useMemo(() => Object.keys(ownedHolo).filter((k) => ownedHolo[Number(k)] > 0).length, [ownedHolo]);

  // Tant qu'elle n'a jamais été tirée, la carte secrète n'existe nulle
  // part dans l'interface — pas de case verrouillée, pas de filtre, pas de
  // pastille de complétion. Elle n'apparaît qu'une fois vraiment possédée.
  const hasSecret = !!SECRET_CARD && (owned[SECRET_CARD.id] || 0) > 0;
  const visibleRarities = useMemo(() => RARITIES.filter((r) => r.id !== SECRET_RARITY_ID || hasSecret), [hasSecret]);
  const visibleTypes = useMemo(() => TYPES.filter((t) => t !== SECRET_CARD?.type || hasSecret), [hasSecret]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    let l = CARDS.filter(
      (c) =>
        (c.rarity !== SECRET_RARITY_ID || hasSecret) &&
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

    // Toujours en dernier, quel que soit le tri — jamais mêlée aux autres
    // cartes même quand elle est possédée.
    const secretIdx = l.findIndex((c) => c.rarity === SECRET_RARITY_ID);
    if (secretIdx !== -1) l.push(...l.splice(secretIdx, 1));

    return l;
  }, [query, rarityFilter, typeFilter, ownedOnly, owned, sort, hasSecret]);

  // En 4 de front la carte fait ~90 px : on resserre la gouttière pour ne pas
  // rogner davantage, et on garde le grand format pour 2 de front.
  const gap = gridCols === 4 ? 7 : gridCols === 3 ? 10 : 14;

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
        {visibleRarities.map((r) => {
          const rTotal = CARDS.filter((c) => c.rarity === r.id).length;
          const rOwned = CARDS.filter((c) => c.rarity === r.id && (owned[c.id] || 0) > 0).length;
          return (
            <div
              key={r.id}
              style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '9px 2px', borderRadius: 18, background: 'var(--color-surface)' }}
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

      <div className="screen-inner" style={{ paddingTop: 14 }}>
        <button
          className="pressable"
          onClick={() => navigate('/collection/holo')}
          style={{
            width: '100%',
            cursor: 'pointer',
            border: 0,
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '13px 16px',
            borderRadius: 22,
            background: 'linear-gradient(90deg,rgba(92,242,154,.16),rgba(79,195,255,.16),rgba(160,107,255,.16))',
            boxShadow: 'inset 0 0 0 1.5px rgba(160,107,255,.35)',
          }}
        >
          <span style={{ fontSize: 20 }}>✨</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontFamily: 'var(--font-heading)', fontSize: 14 }}>Collection holo</span>
            <span style={{ display: 'block', fontSize: 10.5, opacity: 0.6, marginTop: 2 }}>{holoUniq} carte{holoUniq !== 1 ? 's' : ''} en version holo</span>
          </span>
          <span style={{ fontSize: 16, opacity: 0.5 }}>›</span>
        </button>
      </div>

      <div className="screen-inner" style={{ paddingTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          className="input"
          placeholder="Chercher un cochon…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, minWidth: 0, background: 'var(--color-neutral-100)' }}
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

        <div className="section-label" style={{ margin: '13px 0 7px' }}>Affichage</div>
        <div className="chip-row">
          {([2, 3, 4] as GridCols[]).map((n) => (
            <Chip key={n} label={`${n} de front`} active={gridCols === n} onClick={() => setGridCols(n)} />
          ))}
        </div>

        <div className="section-label" style={{ margin: '13px 0 7px' }}>Rareté</div>
        <div className="chip-row">
          <Chip label="Toutes" active={rarityFilter === 'all'} onClick={() => setRarityFilter('all')} />
          {visibleRarities.map((r) => (
            <Chip key={r.id} label={r.name} active={rarityFilter === r.id} onClick={() => setRarityFilter(r.id as RarityId)} />
          ))}
        </div>

        <div className="section-label" style={{ margin: '13px 0 7px' }}>Type</div>
        <div className="chip-row">
          <Chip label="Tous" active={typeFilter === 'all'} onClick={() => setTypeFilter('all')} />
          {visibleTypes.map((t) => (
            <Chip key={t} label={t} active={typeFilter === t} onClick={() => setTypeFilter(t)} />
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridCols},minmax(0,1fr))`,
          gap,
          padding: '20px 18px 0',
        }}
      >
        {list.map((card: Card) => {
          const count = owned[card.id] || 0;
          return (
            <div
              key={card.id}
              className="pressable"
              onClick={() => openDetail(card.id)}
              style={{ position: 'relative', aspectRatio: '0.72', cursor: 'pointer', minWidth: 0 }}
            >
              <PigCard card={card} holoAnim={holoAnim} ownedCount={count} />
              {count > 1 && (
                <span
                  style={{
                    // Badge *à l'intérieur* de la carte : en débord (top:-5,
                    // right:-4) il se faisait rogner par overflow-x: hidden.
                    position: 'absolute',
                    top: 5,
                    right: 5,
                    background: 'var(--color-neutral-900)',
                    color: 'var(--color-bg)',
                    fontSize: gridCols === 4 ? 8.5 : 9.5,
                    fontWeight: 700,
                    padding: '2px 6px',
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
