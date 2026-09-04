import { MailIcon } from './icons';

/** Icône enveloppe + pastille de notif (1, 2, …) — voir MailboxOverlay.
 *  N'affiche le badge que s'il y a des messages non lus. */
export default function MailboxButton({ unread, onClick }: { unread: number; onClick: () => void }) {
  return (
    <button
      className="pressable"
      onClick={onClick}
      aria-label="Boîte aux lettres"
      style={{
        position: 'relative',
        border: 0,
        background: 'none',
        cursor: 'pointer',
        color: 'var(--color-text)',
        opacity: 0.75,
        padding: 4,
        display: 'flex',
      }}
    >
      <MailIcon />
      {unread > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -3,
            right: -5,
            minWidth: 16,
            height: 16,
            borderRadius: 999,
            background: 'var(--color-accent)',
            color: 'var(--color-bg)',
            fontSize: 9.5,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}
