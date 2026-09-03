import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimationPicker from '../components/AnimationPicker';
import CardBackPicker from '../components/CardBackPicker';
import SoundToggle from '../components/SoundToggle';
import PigCard from '../components/PigCard';
import Snout from '../components/Snout';
import { CARDS, RARITIES, TOTAL_CARDS, rarityById } from '../data/catalog';
import { RARITY_VISUALS } from '../data/rarityVisuals';
import { useAnimations } from '../lib/useAnimations';
import { apiFetchPlayers } from '../lib/api';
import { useStore } from '../state/store';
import type { RarityId } from '../types';

/** Ported from the "PROFIL" block in Grouin - TCG Cochons.dc.html.
 *  Deux ajouts pour les comptes : le pseudo actif + déconnexion, et la
 *  liste des autres joueurs pour aller voir leur collection (leur profil
 *  est la seule façon de la consulter — pas de classement, pas d'annuaire
 *  affichant les cartes directement). */
export default function ProfileScreen() {
  const account = useStore((s) => s.account);
  const owned = useStore((s) => s.owned);
  const glands = useStore((s) => s.glands);
  const openedCount = useStore((s) => s.openedCount);
  const openDetail = useStore((s) => s.openDetail);
  const logout = useStore((s) => s.logout);
  const holoAnim = useAnimations();
  const navigate = useNavigate();

  const [players, setPlayers] = useState<string[]>([]);
  useEffect(() => {
    apiFetchPlayers().then((r) => setPlayers(r.players)).catch(() => {});
  }, []);

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
      <div className="screen-inner" style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <h1 style={{ fontSize: 30, margin: 0, lineHeight: 1 }}>Profil</h1>
        <button
          onClick={logout}
          style={{ marginLeft: 'auto', border: 0, background: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, opacity: 0.5, paddingBottom: 4 }}
        >
          Se déconnecter
        </button>
      </div>

      <div className="screen-inner" style={{ paddingTop: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
        <Snout width={74} height={74} nostrilWidth={12} nostrilHeight={19} gap={11} bg="linear-gradient(160deg,#ffd2b4,#f6a06b)" boxShadow="var(--shadow-md)" />
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, lineHeight: 1.1 }}>{account}</div>
          <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 4 }}>{rank}</div>
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
        <div className="section-label" style={{ marginBottom: 8 }}>Voir la collection d'un ami</div>
        {players.length === 0 ? (
          <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>Personne d'autre n'a encore de compte.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {players.map((p) => (
              <button
                key={p}
                className="pressable"
                onClick={() => navigate(`/players/${p}`)}
                style={{
                  cursor: 'pointer',
                  border: 0,
                  fontFamily: 'var(--font-body)',
                  fontSize: 12.5,
                  padding: '9px 14px',
                  borderRadius: 999,
                  background: 'var(--color-neutral-100)',
                  color: 'var(--color-text)',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      <CardBackPicker />

      <AnimationPicker />

      <SoundToggle />

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

      <div className="screen-inner" style={{ paddingTop: 22, paddingBottom: 12 }}>
        <div className="section-label" style={{ marginBottom: 11 }}>Meilleure trouvaille</div>
        <div
          className="pressable"
          onClick={() => openDetail(best.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 28, background: 'var(--color-surface)', cursor: 'pointer' }}
        >
          <div style={{ width: 74, height: 104, flex: 'none' }}>
            <PigCard card={best} holoAnim={holoAnim} ownedCount={owned[best.id] || 0} />
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
