import { useEffect } from 'react';

/** Pose la classe `battle-active` sur `<html>` tant que le composant qui
 *  appelle ce hook reste monté — retirée automatiquement au démontage.
 *  `animations.css`/`app.css` s'en servent pour cacher la barre de menu
 *  pendant un combat plein écran (voir `.overlay-battle` dans app.css) :
 *  même mécanique que `anim-forced` dans useAnimations.ts, une classe sur
 *  `<html>` plutôt qu'un state à faire remonter jusqu'à App.tsx pour un
 *  besoin purement visuel et local à l'écran de combat.
 *
 *  Utilisé par LiveBattleOverlay ET BattleResultOverlay : les deux sont des
 *  arbres React DIFFÉRENTS (jamais montés en même temps dans ce jeu — on ne
 *  peut pas être dans deux combats à la fois), donc un compteur n'est pas
 *  nécessaire ; si un jour ça change, passer à un compteur de montages
 *  plutôt que remettre `false` sans condition au démontage. */
export function useBattleFullscreen(): void {
  useEffect(() => {
    document.documentElement.classList.add('battle-active');
    return () => document.documentElement.classList.remove('battle-active');
  }, []);
}
