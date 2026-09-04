import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

/** Incline la carte au doigt (ou à la souris) pour l'admirer sous tous les
 *  angles — demandé pour l'écran de détail (CardDetailOverlay), qui est
 *  déjà l'endroit où l'on "s'arrête" sur une carte en particulier.
 *
 *  Deux pièces : une rotation 3D (rotateX/rotateY) qui suit le point de
 *  contact par rapport au centre de la carte, et un reflet spéculaire — un
 *  halo blanc radial posé en `mixBlendMode: overlay`, positionné via des
 *  propriétés CSS custom (`--tilt-px`/`--tilt-py`, héritées sans prop
 *  drilling) au même point de contact. Relâcher (pointerup/leave/cancel)
 *  ramène la carte à plat avec une transition plus lente que le suivi du
 *  doigt (60 ms en mouvement, 500 ms au retour) pour un geste net qui
 *  retombe en douceur plutôt que de sauter. */
export default function TiltCard({ children, maxTilt = 16 }: { children: ReactNode; maxTilt?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, px: 50, py: 50, active: false });

  const update = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const py = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    const ry = ((px - 50) / 50) * maxTilt;
    const rx = -((py - 50) / 50) * maxTilt;
    setTilt({ rx, ry, px, py, active: true });
  };

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    update(e.clientX, e.clientY);
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!tilt.active) return;
    update(e.clientX, e.clientY);
  };
  const reset = () => setTilt({ rx: 0, ry: 0, px: 50, py: 50, active: false });

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
            position: 'relative',
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
            transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${tilt.active ? 1.045 : 1})`,
            transition: tilt.active ? 'transform 60ms linear' : 'transform .5s cubic-bezier(.2,.8,.2,1)',
            '--tilt-px': `${tilt.px}%`,
            '--tilt-py': `${tilt.py}%`,
          } as CSSProperties
        }
      >
        {children}
        {/* Reflet spéculaire — layer isolée par-dessus la carte, jamais
            derrière : sinon elle se ferait recouvrir par le shell opaque. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 26,
            pointerEvents: 'none',
            opacity: tilt.active ? 0.5 : 0,
            transition: 'opacity .3s ease',
            background: 'radial-gradient(circle at var(--tilt-px) var(--tilt-py),rgba(255,255,255,.9),transparent 45%)',
            mixBlendMode: 'overlay',
          }}
        />
      </div>
    </div>
  );
}
