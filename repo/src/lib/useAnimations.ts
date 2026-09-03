import { useEffect } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
import { useStore } from '../state/store';

/**
 * Faut-il jouer les animations décoratives (foil, reflet, particules, effet
 * de tirage rare) ?
 *
 * Trois états, réglables dans Profil :
 *   - `auto` (défaut) — suit le réglage système `prefers-reduced-motion`.
 *   - `on`   — force les animations, même si le système demande moins de
 *              mouvement. Beaucoup d'environnements (Windows avec « Afficher
 *              les animations » décoché, VM, Codespaces) rapportent `reduce`
 *              sans que le joueur l'ait vraiment demandé : sans cette
 *              option, le jeu paraît cassé — aucun foil, aucun effet.
 *   - `off`  — coupe tout.
 *
 * Pose aussi la classe `anim-forced` sur `<html>` : `animations.css` neutralise
 * les animations sous `prefers-reduced-motion` avec `!important`, ce que le
 * JavaScript seul ne peut pas contredire.
 */
export function useAnimations(): boolean {
  const pref = useStore((s) => s.animPref);
  const systemReduced = usePrefersReducedMotion();
  const on = pref === 'on' ? true : pref === 'off' ? false : !systemReduced;

  useEffect(() => {
    document.documentElement.classList.toggle('anim-forced', pref === 'on');
  }, [pref]);

  return on;
}
