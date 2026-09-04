import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

interface TiltState {
  rx: number;
  ry: number;
  /** Position du pointeur dans la carte, en % (0-100). */
  mx: number;
  my: number;
  active: boolean;
}

const REST: TiltState = { rx: 0, ry: 0, mx: 50, my: 50, active: false };

/** Incline la carte au doigt/à la souris pour l'admirer. Pose aussi les
 *  propriétés CSS custom `--pointer-x`/`--pointer-y`/`--card-opacity` sur
 *  son wrapper — héritées sans prop drilling par le voile shine/glare que
 *  PigCard pose lui-même sur les cartes Épique+ et les holos (voir
 *  cardVisual.ts) : TiltCard n'a donc plus besoin de savoir si la carte
 *  qu'il enveloppe est holo, il fournit juste la position/l'intensité, le
 *  rendu holo lui-même vit entièrement dans PigCard.
 *
 *  Technique (rotation + voile pointeur) reprise de la « carte Pokémon
 *  holographique CSS » — poke-holo.simey.me,
 *  github.com/simeydotme/pokemon-cards-css — dont le composant Card.svelte
 *  pilote `--pointer-x`/`--pointer-y`/`--card-opacity`/`--rotate-x`/
 *  `--rotate-y` exactement de la même manière au pointermove, et dont
 *  `.card__shine`/`.card__glare` (public/css/cards/base.css +
 *  regular-holo.css) sont la source des deux calques qu'on reproduit dans
 *  cardVisual.ts. */
export default function TiltCard({ children, maxTilt = 18 }: { children: ReactNode; maxTilt?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState<TiltState>(REST);

  const update = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const py = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const ry = (px - 0.5) * 2 * maxTilt;
    const rx = -(py - 0.5) * 2 * maxTilt;
    setT({ rx, ry, mx: px * 100, my: py * 100, active: true });
  };

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    update(e.clientX, e.clientY);
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!t.active) return;
    update(e.clientX, e.clientY);
  };
  const reset = () => setT(REST);

  return (
    <div
      ref={ref}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={reset}
      onPointerCancel={reset}
      onPointerLeave={reset}
      style={{ width: '100%', height: '100%', perspective: 900, touchAction: 'none', cursor: 'grab' }}
    >
      <div
        style={
          {
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
            transform: `rotateX(${t.rx}deg) rotateY(${t.ry}deg) scale(${t.active ? 1.045 : 1})`,
            transition: t.active ? 'transform 60ms linear' : 'transform .6s cubic-bezier(.2,.8,.2,1)',
            '--pointer-x': `${t.mx}%`,
            '--pointer-y': `${t.my}%`,
            '--card-opacity': t.active ? 1 : 0,
          } as CSSProperties
        }
      >
        {children}
      </div>
    </div>
  );
}
