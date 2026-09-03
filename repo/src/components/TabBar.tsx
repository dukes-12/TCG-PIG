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

export default function TabBar() {
  // Pastille sur Profil : visible sans y entrer, comme MailboxButton dedans —
  // même compteur, deux endroits pour le voir.
  const mailboxUnread = useStore((s) => s.mailboxUnread);

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
            {to === '/profile' && mailboxUnread > 0 && (
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
                {mailboxUnread > 9 ? '9+' : mailboxUnread}
              </span>
            )}
          </span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
