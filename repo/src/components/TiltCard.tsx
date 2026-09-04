import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

interface TiltState {
  rx: number;
  ry: number;
  /** Position du pointeur dans la carte, en % (0-100). */
  mx: number;
  my: number;
  /** Distance au centre, normalisée 0 (centre) → 1 (coin). */
  distance: number;
  active: boolean;
}

const REST: TiltState = { rx: 0, ry: 0, mx: 50, my: 50, distance: 0, active: false };

/** Incline la carte au doigt/à la souris pour l'admirer, et pour les holos
 *  fait courir un vrai reflet arc-en-ciel dessus qui suit le point de
 *  contact — technique reprise de la « carte Pokémon holographique CSS »
 *  popularisée sur CodePen (inclinaison pilotée par pointer event + calques
 *  de dégradés en `mix-blend-mode: color-dodge`/`overlay`, décalés par les
 *  mêmes coordonnées de pointeur que la rotation). C'est explicitement
 *  l'inspiration demandée (codepen.io/konstantindenerz/pen/XWPpvpg) —
 *  cette URL précise n'a pas pu être ouverte depuis cet environnement
 *  (codepen.io est bloqué par le proxy réseau), donc réimplémentée depuis
 *  la référence publique dont ce type de pen dérive presque toujours,
 *  plutôt que copiée trait pour trait.
 *
 *  Toutes les cartes ont la rotation 3D + un reflet blanc discret ; seules
 *  les holos (`holo`) reçoivent en plus le voile à bandes arc-en-ciel. */
export default function TiltCard({ children, holo = false, maxTilt = 18 }: { children: ReactNode; holo?: boolean; maxTilt?: number }) {
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
    // Pythagore normalisé par la distance centre→coin (√0.5) : 0 au milieu,
    // ~1 dans les coins — sert à faire flamber le voile holo davantage sur
    // les bords, comme une vraie carte à effet arc-en-ciel qu'on penche.
    const distance = Math.min(1, Math.hypot(px - 0.5, py - 0.5) / 0.707);
    setT({ rx, ry, mx: px * 100, my: py * 100, distance, active: true });
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

        {/* Voile holo — bandes arc-en-ciel qui se décalent avec le
            pointeur (background-position sur --mx/--my, comme la
            référence), fondues en `color-dodge` pour un vrai effet foil
            plutôt qu'un calque de couleur plat. Opacité volontairement
            modeste (max ~0.4) : un `color-dodge` plein pot écrase le
            visuel de la carte et le texte en dessous — ici il doit rester
            un reflet qui court sur l'illustration, pas la remplacer.
            Présent même sans toucher (ambiance), un peu plus marqué en
            interaction et vers les bords. */}
        {holo && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 26,
              pointerEvents: 'none',
              mixBlendMode: 'color-dodge',
              opacity: (t.active ? 0.26 : 0.14) + t.distance * 0.14,
              transition: 'opacity .3s ease',
              backgroundImage:
                'repeating-linear-gradient(115deg,#ff5f6d 0%,#ffc93c 10%,#5cf29a 20%,#4fc3ff 30%,#a06bff 40%,#ff5fc7 50%,#ff5f6d 60%)',
              backgroundSize: '300% 300%',
              backgroundPosition: 'var(--mx) var(--my)',
              filter: 'brightness(.55) contrast(1.15)',
            }}
          />
        )}
      </div>
    </div>
  );
}
