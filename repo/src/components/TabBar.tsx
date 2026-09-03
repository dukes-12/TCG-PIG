import { NavLink } from 'react-router-dom';
import { CollectionIcon, DupesIcon, OpenIcon, ProfileIcon, ShopIcon, TradeIcon } from './icons';

const TABS = [
  { to: '/collection', label: 'Collection', Icon: CollectionIcon },
  { to: '/shop', label: 'Boutique', Icon: ShopIcon },
  { to: '/open', label: 'Ouvrir', Icon: OpenIcon },
  { to: '/dupes', label: 'Doublons', Icon: DupesIcon },
  { to: '/trades', label: 'Échanges', Icon: TradeIcon },
  { to: '/profile', label: 'Profil', Icon: ProfileIcon },
];

export default function TabBar() {
  return (
    <nav className="tab-bar">
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className="tab-btn"
          style={({ isActive }) => ({
            color: isActive ? 'var(--color-accent)' : 'var(--color-neutral-600)',
            opacity: isActive ? 1 : 0.8,
          })}
        >
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
