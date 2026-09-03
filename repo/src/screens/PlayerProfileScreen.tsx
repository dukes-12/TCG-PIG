import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Avatar from '../components/Avatar';
import PigCard from '../components/PigCard';
import { CARDS, SECRET_RARITY_ID, TOTAL_CARDS } from '../data/catalog';
import { apiFetchProfile } from '../lib/api';
import { useAnimations } from '../lib/useAnimations';
import { useStore } from '../state/store';
import type { AvatarKey } from '../types';

/** Profil public d'un autre joueur — lecture seule. Accessible depuis
 *  l'onglet Amis ou depuis l'écran Échanges. Réutilise PigCard tel quel :
 *  ownedCount à 0 rend déjà la carte verrouillée (art + nom masqués).
 *
 *  Pastille "à demander" : posée sur les cartes que *lui* a et que *nous*
 *  n'avons pas — repère visuel direct pour savoir quoi lui proposer en
 *  échange sans comparer les deux collections à la main. */
export default function PlayerProfileScreen() {
  const { username } = useParams<{ username: string }>();
  const myOwned = useStore((s) => s.owned);
  const holoAnim = useAnimations();
  const [owned, setOwned] = useState<Record<string, number> | null>(null);
  const [openedCount, setOpenedCount] = useState(0);
  const [avatar, setAvatar] = useState<AvatarKey>('truffe-rose');
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(null);
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
        setAvatarPhoto(res.avatarPhoto);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur.'));
  }, [username]);

  const uniq = owned ? Object.keys(owned).filter((k) => owned[k] > 0).length : 0;

  return (
    <div className="screen">
      <div className="screen-inner" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {owned && <Avatar avatar={avatar} photo={avatarPhoto} size={44} boxShadow="var(--shadow-sm)" />}
        <h1 style={{ fontSize: 26, margin: 0, lineHeight: 1 }}>{username}</h1>
        {owned && (
          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, opacity: 0.5, paddingBottom: 3 }}>
            {uniq}/{TOTAL_CARDS} · {openedCount} sacs
          </span>
        )}
      </div>

      {error && <p style={{ padding: '0 18px', fontSize: 13, color: 'var(--color-accent-700)' }}>{error}</p>}

      {owned && (
        <>
          <p style={{ padding: '10px 18px 0', fontSize: 11.5, opacity: 0.55, textWrap: 'pretty' as const }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#2f5c9e', marginRight: 6 }} />
            Repère les cartes qu'{username} a et que tu n'as pas — de bonnes candidates pour un échange.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10, padding: '12px 18px 0' }}>
            {/* La carte secrète n'apparaît jamais ici, même comme case
                verrouillée — le serveur ne la renvoie déjà pas dans `owned`
                (voir functions/api/profile/[username].ts), mais l'exclure
                aussi de l'itération évite qu'une case en trop, toujours
                verrouillée, ne trahisse son existence. */}
            {CARDS.filter((c) => c.rarity !== SECRET_RARITY_ID)
              .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name))
              .map((card) => {
                const theirCount = owned[String(card.id)] || 0;
                const missing = theirCount > 0 && (myOwned[card.id] || 0) === 0;
                return (
                  <div key={card.id} style={{ position: 'relative', aspectRatio: '0.72', minWidth: 0 }}>
                    <PigCard card={card} holoAnim={holoAnim} ownedCount={theirCount} />
                    {missing && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 5,
                          right: 5,
                          width: 11,
                          height: 11,
                          borderRadius: '50%',
                          background: '#2f5c9e',
                          boxShadow: '0 0 0 2px var(--color-bg)',
                        }}
                        title="Il l'a, tu ne l'as pas"
                      />
                    )}
                  </div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}
