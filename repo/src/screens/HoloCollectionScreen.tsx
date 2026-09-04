import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Chip from '../components/Chip';
import PigCard from '../components/PigCard';
import { CARDS, RARITIES, SECRET_RARITY_ID, TOTAL_CARDS, TYPES } from '../data/catalog';
import { RARITY_VISUALS } from '../data/rarityVisuals';
import { useAnimations } from '../lib/useAnimations';
import { HOLO_CHANCE, useStore } from '../state/store';
import type { Card, GridCols, RarityId, SortKey } from '../types';

/** Sous-collection des cartes holo — une deuxième collection à part
 *  entière à compléter, avec exactement le même écran que "Ma collection"
 *  (mêmes filtres, même grille, même logique d'affichage verrouillé/
 *  possédé) mais scopée sur `ownedHolo` au lieu de `owned` : les deux sont
 *  des collections *indépendantes* (voir HOLO_CHANCE dans state/store.ts)
 *  — un tirage holo ne compte jamais comme "possédé" ici sous sa forme
 *  classique, et inversement.
 *
 *  État de tri/recherche/filtre en local (pas dans le store global) :
 *  croiser les filtres des deux écrans aurait été surprenant — changer le
 *  tri ici ne doit pas se répercuter sur "Ma collection". La densité de
 *  grille (gridCols), elle, reste un réglage global partagé — c'est une
 *  préférence d'affichage, pas un filtre de collection. */
export default function HoloCollectionScreen() {
  const ownedHolo = useStore((s) => s.ownedHolo);
  const gridCols = useStore((s) => s.gridCols);
  const setGridCols = useStore((s) => s.setGridCols);
  const openDetail = useStore((s) => s.openDetail);
  const holoAnim = useAnimations();
  const navigate = useNavigate();

  const [sort, setSort] = useState<SortKey>('rarete');
  const [rarityFilter, setRarityFilter] = useState<RarityId | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string | 'all'>('all');
  const [query, setQuery] = useState('');
  const [ownedOnly, setOwnedOnly] = useState(false);

  // La carte secrète n'est jamais tirée en holo (voir HOLO_CHANCE) — comme
  // TOTAL_CARDS, exclue par cohérence avec le reste du code plutôt que
  // parce que le cas peut vraiment se produire.
  const holoIds = useMemo(
    () => Object.keys(ownedHolo).filter((k) => ownedHolo[Number(k)] > 0 && Number(k) !== SECRET_RARITY_ID),
    [ownedHolo],
  );
  const uniq = holoIds.length;

  const rarities = useMemo(() => RARITIES.filter((r) => r.id !== SECRET_RARITY_ID), []);
  const types = useMemo(() => TYPES.filter((t) => t !== 'Mystère'), []);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    let l = CARDS.filter(
      (c) =>
        c.rarity !== SECRET_RARITY_ID &&
        (rarityFilter === 'all' || c.rarity === rarityFilter) &&
        (typeFilter === 'all' || c.type === typeFilter) &&
        (!q || c.name.toLowerCase().includes(q)) &&
        (!ownedOnly || (ownedHolo[c.id] || 0) > 0),
    );
    l = l.slice();
    if (sort === 'rarete') l.sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));
    if (sort === 'nom') l.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'type') l.sort((a, b) => a.type.localeCompare(b.type) || b.rarity - a.rarity);
    if (sort === 'nb') l.sort((a, b) => (ownedHolo[b.id] || 0) - (ownedHolo[a.id] || 0) || b.rarity - a.rarity);
    return l;
  }, [query, rarityFilter, typeFilter, ownedOnly, ownedHolo, sort]);

  const gap = gridCols === 4 ? 7 : gridCols === 3 ? 10 : 14;
  const holoPercent = Math.round(1 / HOLO_CHANCE);

  return (
    <div className="screen">
      <div className="screen-inner">
        <button
          className="pressable"
          onClick={() => navigate('/collection')}
          style={{
            border: 0,
            background: 'none',
            cursor: 'pointer',
            padding: 0,
            fontSize: 11.5,
            fontWeight: 700,
            opacity: 0.55,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          ← Collection
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 8 }}>
          <h1 style={{ fontSize: 30, margin: 0, lineHeight: 1 }}>Collection holo ✨</h1>
          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, opacity: 0.5, paddingBottom: 4 }}>
            {uniq}/{TOTAL_CARDS}
          </span>
        </div>
        <div style={{ height: 7, borderRadius: 999, background: 'var(--color-neutral-300)', marginTop: 12, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${Math.round((uniq / TOTAL_CARDS) * 100)}%`,
              background: 'linear-gradient(90deg,#5cf29a,#4fc3ff,#a06bff)',
              borderRadius: 999,
              transition: 'width .4s ease',
            }}
          />
        </div>
        <p style={{ fontSize: 11.5, opacity: 0.55, margin: '9px 0 0', textWrap: 'pretty' as const }}>
          Chaque carte tirée a 1 chance sur {holoPercent} de sortir en holo, quelle que soit sa rareté — une collection à
          part, séparée de la classique.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 5, padding: '16px 18px 0' }}>
        {rarities.map((r) => {
          const rTotal = CARDS.filter((c) => c.rarity === r.id).length;
          const rOwned = CARDS.filter((c) => c.rarity === r.id && (ownedHolo[c.id] || 0) > 0).length;
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

      <div className="screen-inner" style={{ paddingTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          className="input"
          placeholder="Chercher un cochon holo…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, minWidth: 0, background: 'var(--color-neutral-100)' }}
        />
        <button
          className="pressable"
          onClick={() => setOwnedOnly((v) => !v)}
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
          {rarities.map((r) => (
            <Chip key={r.id} label={r.name} active={rarityFilter === r.id} onClick={() => setRarityFilter(r.id as RarityId)} />
          ))}
        </div>

        <div className="section-label" style={{ margin: '13px 0 7px' }}>Type</div>
        <div className="chip-row">
          <Chip label="Tous" active={typeFilter === 'all'} onClick={() => setTypeFilter('all')} />
          {types.map((t) => (
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
          const holoCount = ownedHolo[card.id] || 0;
          return (
            <div
              key={card.id}
              className="pressable"
              onClick={() => openDetail(card.id)}
              style={{ position: 'relative', aspectRatio: '0.72', cursor: 'pointer', minWidth: 0 }}
            >
              <PigCard card={card} holoAnim={holoAnim} ownedCount={holoCount} isHolo />
              {holoCount > 1 && (
                <span
                  style={{
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
                  ✨×{holoCount}
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
