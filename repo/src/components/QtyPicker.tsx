import { MAX_OPEN_QTY, useStore } from '../state/store';

/** Combien de sacs du type actif déchirer d'un coup — voir startTear/
 *  beginTear. Une puce par palier jusqu'à MAX_OPEN_QTY (animée carte par
 *  carte), désactivée si le stock n'en a pas assez, plus une puce "Max"
 *  sans plafond qui vise tout le stock — voir son commentaire ci-dessous. */
export default function QtyPicker() {
  const activePack = useStore((s) => s.activePack);
  const stock = useStore((s) => s.stock);
  const openQty = useStore((s) => s.openQty);
  const setOpenQty = useStore((s) => s.setOpenQty);

  const inPocket = stock[activePack] || 0;
  const options = [1, 3, 5].filter((n) => n <= MAX_OPEN_QTY);
  // Le vrai maximum : tout le stock, sans plafond — pas seulement
  // MAX_OPEN_QTY. Utile aussi bien quand le stock tombe entre deux paliers
  // fixes (2 ou 4 en poche) que quand il le dépasse largement : au-delà de
  // MAX_OPEN_QTY, beginTear (state/store.ts) saute la révélation carte par
  // carte et va droit à l'écran butin en grille — seule la mise en scène
  // change, pas la quantité réellement ouverte.
  const maxQty = Math.max(1, inPocket);

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
      {/* "Max" toujours affichée, même quand elle coïncide avec ×5 (stock
          exactement à 5) : la cacher dans ce cas-là revenait à ne JAMAIS la
          montrer pour qui a un gros stock — exactement l'inverse de "un
          bouton pour ouvrir le max" toujours au même endroit. Dès que le
          stock dépasse MAX_OPEN_QTY, c'est la SEULE façon d'ouvrir tout
          d'un coup : ×1/×3/×5 restent plafonnées, "Max" ne l'est pas. */}
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
