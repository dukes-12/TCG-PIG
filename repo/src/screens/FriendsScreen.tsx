import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { apiFetchFriends } from '../lib/api';
import { useStore } from '../state/store';
import type { AvatarKey } from '../types';
import AuthScreen from './AuthScreen';

interface FriendRow {
  username: string;
  avatar: AvatarKey;
  avatarPhoto: string | null;
}

/** Onglet Amis — remplace le petit bloc "Voir la collection d'un ami" qui
 *  vivait dans Profil. Même mécanique (liste des comptes, tap → fiche en
 *  lecture seule via /players/:username), promue en écran à part avec
 *  l'avatar de chacun. Toujours pas de vraie relation d'amitié (demande /
 *  acceptation) : comme avant, "ami" veut dire "un autre compte sur ce
 *  jeu" — voir IDEES_AMIS_COMBAT.md pour la suite envisagée. */
export default function FriendsScreen() {
  const account = useStore((s) => s.account);
  const navigate = useNavigate();
  const [players, setPlayers] = useState<FriendRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!account) return;
    setLoaded(false);
    apiFetchFriends()
      .then((r) => setPlayers(r.players as FriendRow[]))
      .catch(() => setPlayers([]))
      .finally(() => setLoaded(true));
  }, [account]);

  return (
    <div className="screen">
      <div className="screen-inner">
        <h1 style={{ fontSize: 30, margin: 0, lineHeight: 1 }}>Amis</h1>
        <p style={{ fontSize: 13, opacity: 0.6, margin: '10px 0 0', textWrap: 'pretty' as const }}>
          Va voir la collection des autres éleveurs. Comme dans la tienne, leurs cochons pas encore trouvés restent masqués.
        </p>
      </div>

      <div className="screen-inner" style={{ paddingTop: 18 }}>
        {!account ? (
          <AuthScreen />
        ) : !loaded ? (
          <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>Chargement…</p>
        ) : players.length === 0 ? (
          <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>Personne d'autre n'a encore de compte.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {players.map((p) => (
              <button
                key={p.username}
                className="pressable"
                onClick={() => navigate(`/players/${p.username}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  border: 0,
                  width: '100%',
                  textAlign: 'left',
                  fontFamily: 'var(--font-body)',
                  padding: '10px 14px',
                  borderRadius: 24,
                  background: 'var(--color-surface)',
                }}
              >
                <Avatar avatar={p.avatar} photo={p.avatarPhoto} size={44} boxShadow="var(--shadow-sm)" />
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 15, color: 'var(--color-text)' }}>{p.username}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
