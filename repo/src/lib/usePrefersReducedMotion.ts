import { useEffect, useState } from 'react';

/** Tracks the OS/browser reduced-motion preference so the app can turn off
 *  the decorative foil/sheen/particle loops (CSS already freezes iteration
 *  via animations.css, this additionally skips setting `animation` at all). */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
