import { useState } from 'react';
import type { Card } from '../types';
import Snout from './Snout';

/** The card's art zone. Points at `/assets/cards/<id>.jpg` (from
 *  `cards.json`, already production-ready per the handoff). Until real
 *  art is dropped into `public/assets/cards/`, it falls back to a
 *  styled placeholder (the surrounding artWrap already carries a
 *  rarity-tinted background) instead of a broken-image icon — drop a
 *  correctly-named file in and it appears with no code changes. */
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

  return (
    <img
      src={inlineSrc ?? `/${card.image}`}
      alt={card.name}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
}
