import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Avatar from '../components/Avatar';
import PigCard from '../components/PigCard';
import { CARDS, TOTAL_CARDS } from '../data/catalog';
import { apiFetchProfile } from '../lib/api';
import { useAnimations } from '../lib/useAnimations';
import type { AvatarKey } from '../types';

/** Profil public d'un autre joueur — lecture seule. Accessible depuis
 *  l'onglet Amis ou depuis l'écran Échanges. Réutilise PigCard tel quel :
 *  ownedCount à 0 rend déjà la carte verrouillée (art + nom masqués). */
export default function PlayerProfileScreen() {
  const { username } = useParams<{ username: string }>();
  const holoAnim = useAnimations();
  const [owned, setOwned] = useState<Record<string, number> | null>(null);
  const [openedCount, setOpenedCount] = useState(0);
  const [avatar, setAvatar] = useState<AvatarKey>('truffe-rose');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    setOwned(null);
    setError(null);
    apiFetchProfile(username)
      .then((res) => {
        setOwned(res.owned);
        setOpenedCount(res.openedCount);
        setAvatar(res.avatar as AvatarKey);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur.'));
  }, [username]);

  const uniq = owned ? Object.keys(owned).filter((k) => owned[k] > 0).length : 0;

  return (
    <div className="screen">
      <div className="screen-inner" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {owned && <Avatar avatar={avatar} size={44} boxShadow="var(--shadow-sm)" />}
        <h1 style={{ fontSize: 26, margin: 0, lineHeight: 1 }}>{username}</h1>
        {owned && (
          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, opacity: 0.5, paddingBottom: 3 }}>
            {uniq}/{TOTAL_CARDS} · {openedCount} sacs
          </span>
        )}
      </div>

      {error && <p style={{ padding: '0 18px', fontSize: 13, color: 'var(--color-accent-700)' }}>{error}</p>}

      {owned && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10, padding: '18px 18px 0' }}>
          {CARDS.slice()
            .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name))
            .map((card) => (
              <div key={card.id} style={{ aspectRatio: '0.72', minWidth: 0 }}>
                <PigCard card={card} holoAnim={holoAnim} ownedCount={owned[String(card.id)] || 0} />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
