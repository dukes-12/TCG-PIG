import type { Card } from '../types';
import CardArt from './CardArt';

/** La carte secrète (rareté 7) — un seul exemplaire dans tout
 *  le jeu, 1 chance sur 6 000 000 par carte tirée (voir SECRET_CHANCE dans
 *  lib/draw.ts). Design entièrement à part : pas de skin partagé avec
 *  buildCardVisual (qui indexe `SKIN[rarity-1]`, calé sur les raretés 1-6).
 *  A désormais une vraie photo (comme les autres cartes, via CardArt) — les
 *  étoiles qui scintillent et le halo tournant restent par-dessus en
 *  décoration, pour garder l'identité "carte secrète" plutôt que de
 *  ressembler à une carte normale avec juste un cadre différent. Même
 *  signature de props que PigCard (plus `card`, nécessaire pour l'image) :
 *  c'est PigCard qui bascule ici quand `card.rarity === SECRET_RARITY_ID`,
 *  donc tous les écrans qui affichent déjà des cartes (collection,
 *  doublons, échanges, détail…) récupèrent ce rendu sans rien changer de
 *  leur côté.
 *
 *  Le cadre arc-en-ciel est une couche à part, *derrière* le contenu, pas
 *  un parent qui l'engloberait : `filter: hue-rotate` anime toute la
 *  branche DOM sur laquelle il est posé, texte et groin compris s'il était
 *  sur un ancêtre commun — en le réservant à cette couche isolée, seul
 *  l'anneau tourne en couleur, le reste de la carte reste net. */
export default function SecretCard({
  card,
  big = false,
  holoAnim = true,
  ownedCount = 0,
  forceOwned = false,
}: {
  card: Card;
  big?: boolean;
  holoAnim?: boolean;
  ownedCount?: number;
  forceOwned?: boolean;
}) {
  const owned = forceOwned || ownedCount > 0;
  const s = big ? { pad: 8, name: 17, type: 9.5, star: 15 } : { pad: 4, name: 9.5, type: 6.5, star: 9 };
  const R1 = big ? 26 : 15;
  const outerPad = big ? 6 : 3;
  const R2 = Math.max(4, R1 - outerPad);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: R1,
          background: owned
            ? 'conic-gradient(#ffd98a,#ff8ad9,#8ad9ff,#c9ff8a,#ffd98a)'
            : 'var(--color-neutral-400)',
          animation: owned && holoAnim ? 'pigSecretRainbow 3s linear infinite' : 'none',
          boxShadow: owned ? '0 8px 34px rgba(140,60,180,.5)' : 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: outerPad,
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: big ? 6 : 3,
          padding: s.pad,
          borderRadius: R2,
          background: owned ? 'radial-gradient(120% 100% at 50% 0%,#241a35,#05040a 78%)' : 'var(--color-neutral-100)',
          color: owned ? '#ffe9ff' : 'var(--color-text)',
          filter: owned ? 'none' : 'grayscale(1)',
          opacity: owned ? 1 : 0.4,
        }}
      >
        <div
          style={{
            position: 'relative',
            flex: 1,
            overflow: 'hidden',
            borderRadius: Math.max(3, R2 - (big ? 8 : 4)),
            background: owned ? '#0a0714' : 'var(--color-neutral-200)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {owned ? (
            <>
              {/* La photo — comme les autres cartes (CardArt lit
                  card.image), avant décorative uniquement (Snout) faute
                  de fichier. Les étoiles/halo restent par-dessus : sans
                  eux la carte ressemblerait juste à une carte normale
                  avec un cadre différent. */}
              <CardArt card={card} mini={!big} />
              {/* halo tournant, en `screen` pour ajouter de la lumière sur
                  la photo plutôt que de la ternir — même astuce de couche
                  isolée que la rotation de couleur de l'anneau. */}
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  width: '140%',
                  height: '140%',
                  borderRadius: '50%',
                  background: 'conic-gradient(rgba(255,138,217,.35),rgba(138,217,255,.35),rgba(255,217,138,.35),rgba(255,138,217,.35))',
                  // rotation à plat déjà définie pour la Roue de la chance (WheelOverlay) — réutilisée ici.
                  animation: holoAnim ? 'pigWheelSpin 6s linear infinite' : 'none',
                  filter: 'blur(6px)',
                  mixBlendMode: 'screen',
                }}
              />
              {/* étoiles qui scintillent, semées à des positions fixes */}
              {STAR_POSITIONS.map((p, i) => (
                <i
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: p.size,
                    height: p.size,
                    borderRadius: '50%',
                    background: '#fff6ef',
                    boxShadow: '0 0 4px 1px rgba(255,246,239,.9)',
                    animation: holoAnim ? `pigSecretTwinkle ${2.2 + (i % 4) * 0.5}s ease-in-out ${i * 0.13}s infinite` : 'none',
                  }}
                />
              ))}
            </>
          ) : (
            <div
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: big ? 54 : 24,
                color: 'var(--color-text)',
                opacity: 0.3,
              }}
            >
              ?
            </div>
          )}
        </div>

        <div
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: s.name,
            lineHeight: 1.06,
            textAlign: 'center',
            padding: big ? '2px 4px 0' : '1px 2px 0',
            overflow: 'hidden',
            textShadow: owned ? '0 0 12px rgba(255,217,138,.75)' : 'none',
          }}
        >
          {owned ? card.name : '???'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, padding: big ? '0 3px 2px' : '0 3px 1px' }}>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: s.type,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              fontWeight: 700,
              opacity: 0.75,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Secrète
          </span>
          <span style={{ fontSize: s.star, lineHeight: 1, color: '#ffd98a', textShadow: owned ? '0 0 8px rgba(255,217,138,.9)' : 'none' }}>★</span>
        </div>

        {owned && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '-20%',
              left: 0,
              width: '55%',
              height: '140%',
              pointerEvents: 'none',
              background: 'linear-gradient(100deg,transparent,rgba(255,255,255,.5),transparent)',
              animation: holoAnim ? 'pigShine 2.6s ease-in-out infinite' : 'none',
            }}
          />
        )}
      </div>
    </div>
  );
}

const STAR_POSITIONS = [
  { x: 14, y: 18, size: 2 },
  { x: 82, y: 24, size: 1.5 },
  { x: 26, y: 72, size: 1.5 },
  { x: 70, y: 78, size: 2 },
  { x: 50, y: 12, size: 1.5 },
  { x: 90, y: 60, size: 1.5 },
  { x: 10, y: 55, size: 1.5 },
  { x: 60, y: 90, size: 1.5 },
];
