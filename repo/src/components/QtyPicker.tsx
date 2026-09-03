import { MAX_OPEN_QTY, useStore } from '../state/store';

/** Combien de sacs du type actif déchirer d'un coup — voir startTear/
 *  beginTear. Une puce par palier jusqu'à MAX_OPEN_QTY, désactivée si le
 *  stock n'en a pas assez. */
export default function QtyPicker() {
  const activePack = useStore((s) => s.activePack);
  const stock = useStore((s) => s.stock);
  const openQty = useStore((s) => s.openQty);
  const setOpenQty = useStore((s) => s.setOpenQty);

  const inPocket = stock[activePack] || 0;
  const options = [1, 3, 5].filter((n) => n <= MAX_OPEN_QTY);

  if (inPocket <= 1) return null; // rien à choisir avec 0 ou 1 sac en poche

  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
      {options.map((n) => {
        const disabled = n > inPocket;
        const active = openQty === n;
        return (
          <button
            key={n}
            className="pressable"
            disabled={disabled}
            onClick={() => setOpenQty(n)}
            style={{
              flex: 1,
              minWidth: 0,
              cursor: disabled ? 'not-allowed' : 'pointer',
              border: 0,
              padding: '9px 4px',
              borderRadius: 999,
              fontFamily: 'var(--font-heading)',
              fontSize: 13,
              background: active ? 'var(--color-accent)' : 'transparent',
              color: active ? 'var(--color-bg)' : 'var(--color-text)',
              boxShadow: active ? 'none' : 'inset 0 0 0 1px var(--color-divider)',
              opacity: disabled ? 0.4 : 1,
            }}
          >
            ×{n}
          </button>
        );
      })}
    </div>
  );
}
