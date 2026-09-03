import { useState } from 'react';
import type { Card } from '../types';
import Snout from './Snout';

/** The card's art zone. Points at `<base>assets/cards/<id>.jpg` (from
 *  `cards.json`). Falls back to a styled placeholder if the file is
 *  missing — drop a correctly-named file in `public/assets/cards/` and it
 *  appears with no code changes.
 *
 *  Le chemin passe par `import.meta.env.BASE_URL` : un `src` absolu
 *  (`/assets/…`) casse dès que l'app n'est pas servie à la racine du
 *  domaine — GitHub Pages sert sous `/<repo>/`, et c'est la cause la plus
 *  fréquente de « toutes les cartes affichent le placeholder » alors que
 *  les fichiers sont bien commités. */
export default function CardArt({ card, mini }: { card: Card; mini: boolean }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Snout
          width={mini ? 26 : 58}
          height={mini ? 21 : 46}
          nostrilWidth={mini ? 4 : 9}
          nostrilHeight={mini ? 7 : 14}
          gap={mini ? 4 : 9}
          style={{ opacity: 0.3, background: 'currentColor' }}
          nostrilColor="rgba(0,0,0,.35)"
        />
      </div>
    );
  }

  // Single-file preview builds (see scripts/build-preview) inline art as data
  // URIs on window.__CARD_ART__ since a bundled single HTML file can't serve
  // /assets/*. Normal deploys never set this global, so this is a no-op.
  const inlineSrc = (window as unknown as { __CARD_ART__?: Record<string, string> }).__CARD_ART__?.[card.image];

  // `cards.json` stocke des chemins relatifs ("assets/cards/058.jpg") ; on
  // tolère un éventuel "/" en tête pour ne pas doubler le séparateur.
  const base = import.meta.env.BASE_URL || '/';
  const rel = card.image.replace(/^\/+/, '');
  const src = inlineSrc ?? `${base}${rel}`;

  return (
    <img
      src={src}
      alt={card.name}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
}
