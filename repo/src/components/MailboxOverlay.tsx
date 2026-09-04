import { useStore } from '../state/store';

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** La boîte aux lettres — pensée pour les cadeaux manuels envoyés via la
 *  console D1 (voir ADMIN.md) : le joueur voit *pourquoi* son solde a
 *  changé, pas juste un chiffre qui bouge. Les messages restent surlignés
 *  "non lu" tant que l'overlay est ouvert (pour qu'on voie ce qui est
 *  nouveau) et ne sont marqués lus qu'à la fermeture. */
export default function MailboxOverlay({ onClose }: { onClose: () => void }) {
  const mailbox = useStore((s) => s.mailbox);
  const markMailboxRead = useStore((s) => s.markMailboxRead);

  const close = () => {
    const unreadIds = mailbox.filter((m) => m.read_at == null).map((m) => m.id);
    if (unreadIds.length > 0) markMailboxRead(unreadIds);
    onClose();
  };

  return (
    <div className="overlay" onClick={close} style={{ alignItems: 'stretch' }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          margin: 'auto 0',
          maxHeight: '78vh',
          background: 'var(--color-bg)',
          borderRadius: 28,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ padding: '18px 20px 12px', display: 'flex', alignItems: 'center', flex: 'none' }}>
          <h2 style={{ fontSize: 19, margin: 0 }}>Boîte aux lettres</h2>
          <button
            className="pressable"
            onClick={close}
            aria-label="Fermer"
            style={{ marginLeft: 'auto', border: 0, background: 'none', cursor: 'pointer', fontSize: 18, opacity: 0.5, padding: 4 }}
          >
            ✕
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 9 }}>
          {mailbox.length === 0 ? (
            <p style={{ fontSize: 12.5, opacity: 0.5, textAlign: 'center', padding: '18px 0', margin: 0 }}>Rien pour l'instant.</p>
          ) : (
            mailbox.map((m) => (
              <div
                key={m.id}
                style={{
                  padding: '12px 14px',
                  borderRadius: 18,
                  background: m.read_at == null ? 'var(--color-accent-200)' : 'var(--color-surface)',
                }}
              >
                <div style={{ fontSize: 13, lineHeight: 1.4 }}>{m.message}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
                  {m.glands > 0 && (
                    <span
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 12,
                        color: 'var(--color-accent-800)',
                        background: 'var(--color-bg)',
                        padding: '3px 9px',
                        borderRadius: 999,
                      }}
                    >
                      +{m.glands} glands
                    </span>
                  )}
                  <span style={{ fontSize: 10.5, opacity: 0.5, marginLeft: 'auto' }}>{formatDate(m.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
