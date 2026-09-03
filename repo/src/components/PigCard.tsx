import { SECRET_RARITY_ID } from '../data/catalog';
import { buildCardVisual } from '../lib/cardVisual';
import type { Card } from '../types';
import CardArt from './CardArt';
import SecretCard from './SecretCard';

/** Renders one card: shell (rarity identity — gradient/shadow/animation)
 *  → inner (surface) → artWrap / namePlate / metaRow, plus optional
 *  ornaments (sheen, floating particles). Une seule direction visuelle
 *  (Collector foil) : la prop `style` a disparu avec le retrait de la
 *  direction cartoon.
 *
 *  La carte secrète (rareté 7) n'a pas de skin dans buildCardVisual — la
 *  table `SKIN` n'a que 6 entrées (raretés 1-6), y indexer avec 7
 *  planterait. On bascule donc vers SecretCard *avant* d'appeler
 *  buildCardVisual : chaque écran qui affiche déjà des cartes (collection,
 *  doublons, échanges, détail, révélation…) récupère le bon rendu sans
 *  rien changer de son côté. */
export default function PigCard({
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
  if (card.rarity === SECRET_RARITY_ID) {
    return <SecretCard big={big} holoAnim={holoAnim} ownedCount={ownedCount} forceOwned={forceOwned} />;
  }

  const d = buildCardVisual(card, { big, holoAnim, ownedCount, forceOwned });

  return (
    <div style={d.shell}>
      <div style={d.inner}>
        <div style={d.artWrap}>
          {d.owned ? <CardArt card={card} mini={!big} /> : <div style={d.lockStyle}>?</div>}
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
