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

/** Incline la carte au doigt/à la souris pour l'admirer — rotation 3D
 *  pilotée par pointer event, plus un reflet blanc discret qui suit le
 *  point de contact, sur toutes les cartes.
 *
 *  Le voile arc-en-ciel/chrome des cartes Épique+ et holo ne vit plus ici :
 *  il est posé par PigCard lui-même (voir cardVisual.ts, `chromeStyle`),
 *  qui a son propre habillage indépendant de l'inclinaison — TiltCard
 *  n'a donc plus besoin de savoir si la carte qu'il enveloppe est holo ou
 *  non ; il fournissait avant sa propre version de ce voile en plus,
 *  ce qui doublait le reflet sur les holos (l'un statique/CSS via
 *  cardVisual, l'autre ici en color-dodge) — retiré pour n'en garder
 *  qu'un seul, plus lisible. */
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

  const vars = {
    '--mx': `${t.mx}%`,
    '--my': `${t.my}%`,
  } as CSSProperties;

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
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${t.rx}deg) rotateY(${t.ry}deg) scale(${t.active ? 1.045 : 1})`,
          transition: t.active ? 'transform 60ms linear' : 'transform .6s cubic-bezier(.2,.8,.2,1)',
          ...vars,
        }}
      >
        {children}

        {/* Reflet blanc — sur toutes les cartes, discret : layer isolée
            par-dessus, jamais derrière (sinon recouverte par le shell
            opaque). */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 26,
            pointerEvents: 'none',
            opacity: t.active ? 0.35 : 0,
            transition: 'opacity .3s ease',
            background: 'radial-gradient(circle at var(--mx) var(--my),rgba(255,255,255,.9),transparent 45%)',
            mixBlendMode: 'overlay',
          }}
        />
      </div>
    </div>
  );
}
