import type { CSSProperties } from 'react';

/** The pig snout emblem, drawn in CSS (no asset) — reused for the pack
 *  thumbnails, the sachet, the card back, the profile avatar and the
 *  card-art placeholder. Ported from Grouin - TCG Cochons.dc.html. */
export default function Snout({
  width,
  height,
  nostrilWidth,
  nostrilHeight,
  gap,
  bg = '#ffd2b4',
  nostrilColor = '#8c491a',
  boxShadow,
  style,
}: {
  width: number;
  height: number;
  nostrilWidth: number;
  nostrilHeight: number;
  gap: number;
  bg?: string;
  nostrilColor?: string;
  boxShadow?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: '50%',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap,
        boxShadow,
        flex: 'none',
        ...style,
      }}
    >
      <i style={{ width: nostrilWidth, height: nostrilHeight, borderRadius: '50%', background: nostrilColor, display: 'block' }} />
      <i style={{ width: nostrilWidth, height: nostrilHeight, borderRadius: '50%', background: nostrilColor, display: 'block' }} />
    </div>
  );
}
