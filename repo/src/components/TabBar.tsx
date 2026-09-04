import { NavLink } from 'react-router-dom';
import { useStore } from '../state/store';
import { CollectionIcon, DupesIcon, FriendsIcon, OpenIcon, ProfileIcon, ShopIcon, TradeIcon } from './icons';

const TABS = [
  { to: '/collection', label: 'Collection', Icon: CollectionIcon },
  { to: '/shop', label: 'Boutique', Icon: ShopIcon },
  { to: '/open', label: 'Ouvrir', Icon: OpenIcon },
  { to: '/dupes', label: 'Doublons', Icon: DupesIcon },
  { to: '/trades', label: 'Échanges', Icon: TradeIcon },
  { to: '/friends', label: 'Amis', Icon: FriendsIcon },
  { to: '/profile', label: 'Profil', Icon: ProfileIcon },
];

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      style={{
        position: 'absolute',
        top: -4,
        right: -6,
        minWidth: 13,
        height: 13,
        borderRadius: 999,
        background: 'var(--color-accent)',
        color: 'var(--color-bg)',
        fontSize: 8,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 2px',
      }}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}

export default function TabBar() {
  // Pastilles visibles sans entrer dans l'onglet, comme MailboxButton dans
  // Profil (même compteur, deux endroits pour le voir) : messages non lus
  // sur Profil, propositions d'échange entrantes en attente sur Échanges.
  const mailboxUnread = useStore((s) => s.mailboxUnread);
  const tradesUnread = useStore((s) => s.tradesUnread);
  const badges: Partial<Record<string, number>> = { '/profile': mailboxUnread, '/trades': tradesUnread };

  return (
    <nav className="tab-bar">
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className="tab-btn"
          style={({ isActive }) => ({
            position: 'relative',
            color: isActive ? 'var(--color-accent)' : 'var(--color-neutral-600)',
            opacity: isActive ? 1 : 0.8,
          })}
        >
          <span style={{ position: 'relative' }}>
            <Icon />
            <Badge count={badges[to] ?? 0} />
          </span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
