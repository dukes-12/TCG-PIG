import { buildCardVisual } from '../lib/cardVisual';
import type { Card, CardStyle } from '../types';
import CardArt from './CardArt';

/** Renders one card: shell (rarity identity — gradient/border/shadow/animation)
 *  → inner (surface) → artWrap / namePlate / metaRow, plus optional ornaments
 *  (sheen, floating particles). Ported from PigCard.dc.html — the jeweled
 *  corner studs from the original spec were dropped, they overlapped the
 *  name/type text on mini cards. */
export default function PigCard({
  card,
  big = false,
  style,
  holoAnim = true,
  ownedCount = 0,
  forceOwned = false,
}: {
  card: Card;
  big?: boolean;
  style: CardStyle;
  holoAnim?: boolean;
  ownedCount?: number;
  forceOwned?: boolean;
}) {
  const d = buildCardVisual(card, { big, style, holoAnim, ownedCount, forceOwned });

  return (
    <div style={d.shell}>
      <div style={d.inner}>
        <div style={d.artWrap}>
          {d.owned ? (
            <CardArt card={card} mini={!big} />
          ) : (
            <div style={d.lockStyle}>?</div>
          )}
          {d.dots.map((dot, i) => (
            <i key={i} style={dot.style} />
          ))}
        </div>
        <div style={d.namePlate}>{d.name}</div>
        <div style={d.metaRow}>
          <span style={d.typeStyle}>{d.type}</span>
          <span style={d.pipWrap}>
            {d.pips.map((p, i) => (
              <i key={i} style={p.style} />
            ))}
          </span>
        </div>
        {d.sheen && <div style={d.sheenStyle} />}
      </div>
    </div>
  );
}
