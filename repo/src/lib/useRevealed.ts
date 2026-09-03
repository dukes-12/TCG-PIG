import { useEffect, useState } from 'react';

/**
 * Renvoie `value` mais retardé de `delay` ms quand il passe à `true` —
 * immédiat quand il repasse à `false`.
 *
 * Sert à ne déclencher les effets de rareté (halo coloré, gerbe d'éclats,
 * sursaut de la carte) qu'une fois la carte réellement retournée. `flipped`
 * passe à `true` au *début* du flip, qui dure 620 ms : brancher les effets
 * dessus les faisait jouer alors que le dos est encore face au joueur, ce
 * qui spoile la rareté avant de voir la carte.
 */
export function useRevealed(flipped: boolean, delay = 520): boolean {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!flipped) {
      setRevealed(false);
      return;
    }
    const id = setTimeout(() => setRevealed(true), delay);
    return () => clearTimeout(id);
  }, [flipped, delay]);

  return revealed;
}
