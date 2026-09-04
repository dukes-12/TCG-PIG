import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSqlOverlay from '../components/AdminSqlOverlay';
import AnimationPicker from '../components/AnimationPicker';
import AuthScreen from './AuthScreen';
import Avatar from '../components/Avatar';
import AvatarPicker from '../components/AvatarPicker';
import CardBackPicker from '../components/CardBackPicker';
import MailboxButton from '../components/MailboxButton';
import MailboxOverlay from '../components/MailboxOverlay';
import SoundToggle from '../components/SoundToggle';
import PigCard from '../components/PigCard';
import { CARDS, RARITIES, SECRET_CARD, SECRET_RARITY_ID, TOTAL_CARDS, rarityById } from '../data/catalog';
import { RARITY_VISUALS } from '../data/rarityVisuals';
import { useAnimations } from '../lib/useAnimations';
import { useStore } from '../state/store';
import type { RarityId } from '../types';

/** Ported from the "PROFIL" block in Grouin - TCG Cochons.dc.html.
 *  Ajouts pour les comptes : le pseudo actif + déconnexion, l'avatar (voir
 *  AvatarPicker plus bas). La liste des autres joueurs a déménagé dans son
 *  propre onglet Amis — voir FriendsScreen. */
export default function ProfileScreen() {
  const account = useStore((s) => s.account);
  const owned = useStore((s) => s.owned);
  const glands = useStore((s) => s.glands);
  const openedCount = useStore((s) => s.openedCount);
  const avatar = useStore((s) => s.avatar);
  const avatarPhoto = useStore((s) => s.avatarPhoto);
  const mailboxUnread = useStore((s) => s.mailboxUnread);
  const openDetail = useStore((s) => s.openDetail);
  const logout = useStore((s) => s.logout);
  const debugTriggerSecret = useStore((s) => s.debugTriggerSecret);
  const holoAnim = useAnimations();
  const navigate = useNavigate();
  const [mailboxOpen, setMailboxOpen] = useState(false);
  const [sqlOpen, setSqlOpen] = useState(false);

  const ownedIds = useMemo(() => Object.keys(owned).filter((k) => owned[Number(k)] > 0).map(Number), [owned]);
  // Complétion : la carte secrète ne compte pas dedans (comme TOTAL_CARDS),
  // sinon "uniq/TOTAL_CARDS" peut dépasser 100 % pour qui l'a trouvée.
  const uniq = useMemo(() => ownedIds.filter((id) => id !== SECRET_CARD?.id).length, [ownedIds]);
  // Tant qu'elle n'a jamais été tirée, aucune trace d'elle dans l'interface
  // — même pas une ligne "Secrète 0/1" dans la complétion par rareté.
  const hasSecret = !!SECRET_CARD && (owned[SECRET_CARD.id] || 0) > 0;

  const best = useMemo(() => {
    // Ici en revanche on la laisse concourir — "meilleure trouvaille" sur
    // son propre profil, personne d'autre ne le voit, c'est le bon endroit
    // pour s'en vanter.
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
        {account && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => navigate('/battles')}
              aria-label="Combats"
              style={{ border: 0, background: 'none', cursor: 'pointer', fontSize: 19, opacity: 0.75, padding: 4, lineHeight: 1 }}
            >
              ⚔️
            </button>
            <MailboxButton unread={mailboxUnread} onClick={() => setMailboxOpen(true)} />
            <button
              onClick={logout}
              style={{ border: 0, background: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, opacity: 0.5, paddingBottom: 4 }}
            >
              Se déconnecter
            </button>
          </div>
        )}
      </div>

      {mailboxOpen && <MailboxOverlay onClose={() => setMailboxOpen(false)} />}
      {sqlOpen && <AdminSqlOverlay onClose={() => setSqlOpen(false)} />}

      {/* Outil de test — visible seulement sur ce compte précis, pas un vrai
          contrôle d'accès pour "Voir la carte secrète" (juste une condition
          côté client, contournable en devtools par qui saurait la
          chercher) : rejoue la vraie séquence de révélation avec la carte
          secrète comme seul tirage, sans toucher au stock de sacs réel —
          voir debugTriggerSecret dans store.ts. "Requêtes SQL" en revanche
          est un vrai pouvoir serveur (SQL sur la base de production) : le
          masquage ici n'est qu'un raccourci, chaque route est revérifiée
          par requireAdmin côté serveur (voir functions/_lib/auth.ts). */}
      {account === 'Dukes' && (
        <div className="screen-inner" style={{ paddingTop: 16 }}>
          <div
            style={{
              boxSizing: 'border-box',
              padding: '12px 15px',
              borderRadius: 22,
              background: 'var(--color-surface)',
              border: '1.5px dashed var(--color-accent-500)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>🔧</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14 }}>Outils de test</div>
                <div style={{ fontSize: 10.5, opacity: 0.6, marginTop: 2 }}>Visible seulement sur ce compte.</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="pressable"
                onClick={() => {
                  debugTriggerSecret();
                  navigate('/open');
                }}
                style={{
                  cursor: 'pointer',
                  border: 0,
                  fontFamily: 'var(--font-heading)',
                  fontSize: 11.5,
                  padding: '9px 14px',
                  borderRadius: 999,
                  background: 'var(--color-accent)',
                  color: 'var(--color-bg)',
                  whiteSpace: 'nowrap',
                }}
              >
                Voir la carte secrète
              </button>
              <button
                className="pressable"
                onClick={() => setSqlOpen(true)}
                style={{
                  cursor: 'pointer',
                  border: '1.5px solid var(--color-accent-500)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: 11.5,
                  padding: '9px 14px',
                  borderRadius: 999,
                  background: 'none',
                  color: 'var(--color-text)',
                  whiteSpace: 'nowrap',
                }}
              >
                Requêtes SQL
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="screen-inner" style={{ paddingTop: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
        <Avatar avatar={avatar} photo={avatarPhoto} size={74} />
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, lineHeight: 1.1 }}>{account ?? 'Éleveur Grouik'}</div>
          <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 4 }}>{account ? rank : 'Pas encore connecté'}</div>
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

      <div className="screen-inner" style={{ paddingTop: 20 }}>{!account && <AuthScreen />}</div>

      <AvatarPicker />

      <CardBackPicker />

      <AnimationPicker />

      <SoundToggle />

      <div className="screen-inner" style={{ paddingTop: 20 }}>
        <div className="section-label" style={{ marginBottom: 11 }}>Complétion par rareté</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {RARITIES.filter((r) => r.id !== SECRET_RARITY_ID || hasSecret).map((r) => {
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

      {uniq > 0 && (
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
      )}
    </div>
  );
}
