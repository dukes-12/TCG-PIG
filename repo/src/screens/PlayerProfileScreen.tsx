import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Avatar from '../components/Avatar';
import Chip from '../components/Chip';
import PigCard from '../components/PigCard';
import { CARDS, SECRET_RARITY_ID, TOTAL_CARDS } from '../data/catalog';
import { apiFetchProfile } from '../lib/api';
import { useAnimations } from '../lib/useAnimations';
import { useStore } from '../state/store';
import type { AvatarKey } from '../types';

type Tab = 'classique' | 'holo';

/** Profil public d'un autre joueur — lecture seule. Accessible depuis
 *  l'onglet Amis ou depuis l'écran Échanges. Réutilise PigCard tel quel :
 *  ownedCount à 0 rend déjà la carte verrouillée (art + nom masqués).
 *
 *  Deux collections à voir, comme chez soi (Collection / Collection holo)
 *  — `owned` et `ownedHolo` sont indépendantes (voir HOLO_CHANCE dans
 *  state/store.ts), un onglet bascule entre les deux plutôt que de tout
 *  afficher en même temps (déjà dense avec ~275 cartes).
 *
 *  Pastille "à demander" : posée sur les cartes que *lui* a et que *nous*
 *  n'avons pas, dans l'onglet actif — repère visuel direct pour savoir
 *  quoi lui proposer en échange sans comparer les deux collections à la
 *  main. Les échanges ne portent que sur `owned` (voir TradesScreen), la
 *  pastille sur l'onglet holo n'est donc qu'un repère, pas une offre
 *  d'échange possible pour cette carte-là. */
export default function PlayerProfileScreen() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const myOwned = useStore((s) => s.owned);
  const myOwnedHolo = useStore((s) => s.ownedHolo);
  const holoAnim = useAnimations();
  const [tab, setTab] = useState<Tab>('classique');
  const [owned, setOwned] = useState<Record<string, number> | null>(null);
  const [ownedHolo, setOwnedHolo] = useState<Record<string, number>>({});
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
        setOwnedHolo(res.ownedHolo ?? {});
        setOpenedCount(res.openedCount);
        setAvatar(res.avatar as AvatarKey);
        setAvatarPhoto(res.avatarPhoto);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur.'));
  }, [username]);

  // `?? {}` : rend `active` toujours défini (pas de garde à répéter plus
  // bas), `owned` reste seul indicateur de "chargé" pour le reste de
  // l'écran.
  const active = (tab === 'holo' ? ownedHolo : owned) ?? {};
  const myActive = tab === 'holo' ? myOwnedHolo : myOwned;
  const uniq = Object.keys(active).filter((k) => active[k] > 0).length;
  const uniqHolo = useMemo(() => Object.keys(ownedHolo).filter((k) => ownedHolo[k] > 0).length, [ownedHolo]);

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
          <div className="screen-inner" style={{ paddingTop: 12 }}>
            <button
              className="pressable"
              onClick={() => navigate(`/battles?vs=${encodeURIComponent(username ?? '')}`)}
              style={{
                cursor: 'pointer',
                border: 0,
                fontFamily: 'var(--font-heading)',
                fontSize: 12,
                padding: '9px 16px',
                borderRadius: 999,
                background: 'var(--color-accent)',
                color: 'var(--color-bg)',
              }}
            >
              ⚔️ Défier
            </button>
          </div>

          <div className="screen-inner" style={{ paddingTop: 14 }}>
            <div className="chip-row">
              <Chip label="Classique" active={tab === 'classique'} onClick={() => setTab('classique')} />
              <Chip label={`Holo ✨ ${uniqHolo > 0 ? `(${uniqHolo})` : ''}`.trim()} active={tab === 'holo'} onClick={() => setTab('holo')} />
            </div>
          </div>

          <p style={{ padding: '10px 18px 0', fontSize: 11.5, opacity: 0.55, textWrap: 'pretty' as const }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#2f5c9e', marginRight: 6 }} />
            {tab === 'holo'
              ? `Les versions holo qu'${username} a et que tu n'as pas — la collection holo est indépendante, hors échanges.`
              : `Repère les cartes qu'${username} a et que tu n'as pas — de bonnes candidates pour un échange.`}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10, padding: '12px 18px 0' }}>
            {/* La carte secrète n'apparaît jamais ici, même comme case
                verrouillée — le serveur ne la renvoie déjà pas dans
                `owned`/`ownedHolo` (voir functions/api/profile/[username].ts),
                mais l'exclure aussi de l'itération évite qu'une case en
                trop, toujours verrouillée, ne trahisse son existence. */}
            {CARDS.filter((c) => c.rarity !== SECRET_RARITY_ID)
              .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name))
              .map((card) => {
                const theirCount = active[String(card.id)] || 0;
                const missing = theirCount > 0 && (myActive[card.id] || 0) === 0;
                return (
                  <div key={card.id} style={{ position: 'relative', aspectRatio: '0.72', minWidth: 0 }}>
                    <PigCard card={card} holoAnim={holoAnim} ownedCount={theirCount} isHolo={tab === 'holo'} />
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
