import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Chip from '../components/Chip';
import PigCard from '../components/PigCard';
import { CARDS, RARITIES, SECRET_CARD, SECRET_RARITY_ID, TOTAL_CARDS } from '../data/catalog';
import { useAnimations } from '../lib/useAnimations';
import { HOLO_CHANCE, useStore } from '../state/store';
import type { Card, RarityId } from '../types';

/** Sous-collection des cartes holo — reprise du même sac de composants que
 *  CollectionScreen (grille, Chip, filtres) mais volontairement plus légère
 *  et avec son propre état de recherche/filtre en local (pas dans le store
 *  global) : croiser les filtres des deux écrans aurait été surprenant —
 *  taper une recherche ici ne doit pas se répercuter sur "Ma collection".
 *  La densité de grille, elle, reste un réglage global partagé (gridCols). */
export default function HoloCollectionScreen() {
  const owned = useStore((s) => s.owned);
  const ownedHolo = useStore((s) => s.ownedHolo);
  const gridCols = useStore((s) => s.gridCols);
  const openDetail = useStore((s) => s.openDetail);
  const holoAnim = useAnimations();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [rarityFilter, setRarityFilter] = useState<RarityId | 'all'>('all');

  // La carte secrète n'est jamais tirée en holo (voir HOLO_CHANCE dans
  // state/store.ts) — le filtre est là par cohérence avec le reste du code,
  // pas parce que le cas peut vraiment se produire. `ownedHolo` est indexé
  // par id de *carte* : comparer à `SECRET_CARD?.id` (pas `SECRET_RARITY_ID`,
  // un id de *rareté* — bug corrigé ici, il excluait à tort toute carte
  // dont l'id vaut 1-7, ex. Piggin Biebers, du compteur "X/183").
  const holoIds = useMemo(
    () => Object.keys(ownedHolo).filter((k) => ownedHolo[Number(k)] > 0 && Number(k) !== SECRET_CARD?.id),
    [ownedHolo],
  );
  const uniq = holoIds.length;

  const rarities = useMemo(() => RARITIES.filter((r) => r.id !== SECRET_RARITY_ID), []);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CARDS.filter(
      (c) =>
        c.rarity !== SECRET_RARITY_ID &&
        (ownedHolo[c.id] || 0) > 0 &&
        (rarityFilter === 'all' || c.rarity === rarityFilter) &&
        (!q || c.name.toLowerCase().includes(q)),
    ).sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));
  }, [ownedHolo, rarityFilter, query]);

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
          Chaque carte tirée a 1 chance sur {holoPercent} de sortir en holo, quelle que soit sa rareté.
        </p>
      </div>

      <div className="screen-inner" style={{ paddingTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          className="input"
          placeholder="Chercher un cochon holo…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, minWidth: 0, background: 'var(--color-neutral-100)' }}
        />
      </div>

      {uniq > 0 && (
        <div className="screen-inner" style={{ paddingTop: 14 }}>
          <div className="section-label" style={{ marginBottom: 7 }}>Rareté</div>
          <div className="chip-row">
            <Chip label="Toutes" active={rarityFilter === 'all'} onClick={() => setRarityFilter('all')} />
            {rarities.map((r) => (
              <Chip key={r.id} label={r.name} active={rarityFilter === r.id} onClick={() => setRarityFilter(r.id as RarityId)} />
            ))}
          </div>
        </div>
      )}

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
              <PigCard card={card} holoAnim={holoAnim} ownedCount={owned[card.id] || 0} isHolo />
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
          {uniq === 0
            ? `Pas encore de carte holo. Ouvre des sacs — ${holoPercent} tirages en moyenne pour la première.`
            : 'Aucune carte holo ne correspond. Enlève un filtre.'}
        </p>
      )}
    </div>
  );
}
