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
  // Le plus qu'on puisse réellement ouvrir d'un coup : plafonné à la fois
  // par MAX_OPEN_QTY (limite technique de la révélation groupée) et par le
  // stock — utile quand le stock tombe entre deux paliers fixes (ex. 2 ou
  // 4 en poche, aucune puce ×1/×3/×5 ne les couvre exactement).
  const maxQty = Math.min(MAX_OPEN_QTY, inPocket);

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
      {/* "Max" toujours affichée, même quand elle fait doublon avec ×5 (cas
          le plus courant dès que le stock dépasse MAX_OPEN_QTY) : la cacher
          dans ce cas-là revenait à ne JAMAIS la montrer pour qui a un gros
          stock — exactement l'inverse de "un bouton pour ouvrir le max"
          toujours au même endroit, sans avoir à remarquer que ×5 fait déjà
          l'affaire. Utile seule (pas de raccourci fixe) dès que le stock
          tombe entre deux paliers — 2 ou 4 en poche, par exemple. */}
      <button
        className="pressable"
        onClick={() => setOpenQty(maxQty)}
        style={{
          flex: 1,
          minWidth: 0,
          cursor: 'pointer',
          border: 0,
          padding: '9px 4px',
          borderRadius: 999,
          fontFamily: 'var(--font-heading)',
          fontSize: 13,
          background: openQty === maxQty ? 'var(--color-accent)' : 'transparent',
          color: openQty === maxQty ? 'var(--color-bg)' : 'var(--color-text)',
          boxShadow: openQty === maxQty ? 'none' : 'inset 0 0 0 1px var(--color-divider)',
        }}
      >
        Max
      </button>
    </div>
  );
}
