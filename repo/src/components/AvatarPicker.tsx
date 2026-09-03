import { AVATARS } from '../data/avatars';
import { useStore } from '../state/store';
import Avatar from './Avatar';

/** Profil → Photo de profil : tous les avatars sont débloqués d'office,
 *  contrairement aux dos de carte (CardBackPicker) — pas de prix à afficher. */
export default function AvatarPicker() {
  const avatar = useStore((s) => s.avatar);
  const setAvatar = useStore((s) => s.setAvatar);

  return (
    <div style={{ padding: '22px 18px 0' }}>
      <div className="section-label" style={{ marginBottom: 11 }}>Photo de profil</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {AVATARS.map((a) => {
          const active = avatar === a.key;
          return (
            <button
              key={a.key}
              className="pressable"
              onClick={() => setAvatar(a.key)}
              title={a.name}
              style={{
                cursor: 'pointer',
                border: 0,
                background: 'transparent',
                padding: 4,
                borderRadius: '50%',
                boxShadow: active ? '0 0 0 3px var(--color-accent)' : '0 0 0 1px var(--color-divider)',
              }}
            >
              <Avatar avatar={a.key} size={52} boxShadow="none" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
