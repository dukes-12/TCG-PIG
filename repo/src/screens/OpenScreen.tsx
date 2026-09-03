import type { PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import CardBack from '../components/CardBack';
import PackPicker from '../components/PackPicker';
import PigCard from '../components/PigCard';
import QtyPicker from '../components/QtyPicker';
import RarePullFx from '../components/RarePullFx';
import SecretRevealFx from '../components/SecretRevealFx';
import Snout from '../components/Snout';
import { CARDS, RARITIES, SECRET_RARITY_ID, packByKey, rarityById } from '../data/catalog';
import { RARITY_VISUALS } from '../data/rarityVisuals';
import { PACK_VISUALS } from '../data/packVisuals';
import { useAnimations } from '../lib/useAnimations';
import { useRevealed } from '../lib/useRevealed';
import { useStore } from '../state/store';
import type { RarityId } from '../types';

const openBtnStyle = {
  width: '100%',
  marginTop: 16,
  cursor: 'pointer' as const,
  border: 0,
  fontFamily: 'var(--font-heading)',
  fontSize: 16,
  padding: '14px',
  borderRadius: 999,
  background: 'var(--color-accent)',
  color: 'var(--color-bg)',
  boxShadow: 'var(--shadow-sm)',
};

const ghostBtnStyle = {
  width: '100%',
  marginTop: 9,
  cursor: 'pointer' as const,
  border: 0,
  fontFamily: 'var(--font-heading)',
  fontSize: 15,
  padding: '13px',
  borderRadius: 999,
  background: 'transparent',
  color: 'var(--color-text)',
  boxShadow: 'inset 0 0 0 1px var(--color-divider)',
};

/** Ported from the "OUVERTURE" block in Grouin - TCG Cochons.dc.html —
 *  the idle → tearing → reveal → summary state machine.
 *
 *  Deux points importants sur la révélation :
 *
 *  - La face cachée est le **dos choisi par le joueur** (`CardBack`), plus
 *    un dos en dur.
 *  - Tous les effets de rareté (halo coloré, gerbe d'éclats, sursaut) sont
 *    branchés sur `revealed`, pas sur `flipped`. `flipped` passe à `true` au
 *    *début* du flip, qui dure 620 ms : les effets se jouaient donc pendant
 *    que le dos était encore face au joueur, ce qui spoilait la rareté avant
 *    même de voir la carte. */
export default function OpenScreen() {
  const activePackKey = useStore((s) => s.activePack);
  const packState = useStore((s) => s.packState);
  const stock = useStore((s) => s.stock);
  const pull = useStore((s) => s.pull);
  const pullIndex = useStore((s) => s.pullIndex);
  const flipped = useStore((s) => s.flipped);
  const dragX = useStore((s) => s.dragX);
  const dragging = useStore((s) => s.dragging);
  const isNew = useStore((s) => s.isNew);
  const owned = useStore((s) => s.owned);
  const cardBack = useStore((s) => s.cardBack);
  const openQty = useStore((s) => s.openQty);
  const startTear = useStore((s) => s.startTear);
  const revealAll = useStore((s) => s.revealAll);
  const nextReveal = useStore((s) => s.nextReveal);
  const dragStart = useStore((s) => s.dragStart);
  const dragMove = useStore((s) => s.dragMove);
  const dragEnd = useStore((s) => s.dragEnd);
  const openDetail = useStore((s) => s.openDetail);
  const holoAnim = useAnimations();
  const navigate = useNavigate();

  // true seulement quand la carte est réellement face visible.
  const revealed = useRevealed(flipped);

  const pack = packByKey(activePackKey);
  const visual = PACK_VISUALS[pack.key];
  const inPocket = stock[pack.key] || 0;

  const tearOrShop = () => {
    if (inPocket <= 0) navigate('/shop');
    else startTear();
  };
  const qtyToOpen = Math.max(1, Math.min(openQty, inPocket || 1));
  const tearLabel = inPocket > 0 ? `Déchirer ${qtyToOpen} sac${qtyToOpen > 1 ? 's' : ''}` : 'Aller en boutique';

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      {packState === 'idle' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 18px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <h1 style={{ fontSize: 30, margin: 0, lineHeight: 1 }}>{pack.name}</h1>
            <span style={{ marginLeft: 'auto', paddingBottom: 4, fontSize: 12, fontWeight: 700, opacity: 0.5 }}>{inPocket} en poche</span>
          </div>
          <p style={{ fontSize: 13, opacity: 0.6, margin: '10px 0 0', maxWidth: 270, textWrap: 'pretty' as const }}>
            {visual.desc} Touche le sac pour le déchirer, puis touche ou glisse pour révéler carte par carte.
          </p>

          <PackPicker />
          <QtyPicker />

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', minHeight: 260 }}>
            <div
              className="pressable"
              onClick={tearOrShop}
              style={{
                position: 'relative',
                width: 214,
                height: 286,
                borderRadius: 34,
                background: visual.bg,
                boxShadow: 'var(--shadow-lg)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                animation: 'pigBreathe 4.5s ease-in-out infinite',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 24,
                  background: 'repeating-linear-gradient(90deg,rgba(245,234,216,.85) 0 9px,transparent 9px 18px)',
                  opacity: 0.45,
                }}
              />
              <Snout width={98} height={80} nostrilWidth={15} nostrilHeight={24} gap={15} boxShadow="inset 0 -7px 14px rgba(140,73,26,.35)" />
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 27, color: '#fff6ef', marginTop: 18, textAlign: 'center', lineHeight: 1 }}>CHIPO</div>
              <div style={{ fontSize: 9, letterSpacing: '.26em', textTransform: 'uppercase', color: '#ffd2b4', marginTop: 9 }}>{pack.subtitle}</div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 46, background: 'linear-gradient(0deg,rgba(64,35,16,.45),transparent)' }} />
            </div>
          </div>

          <button className="pressable" onClick={tearOrShop} style={openBtnStyle}>
            {tearLabel}
          </button>

          <div style={{ marginTop: 16, padding: '14px 18px', borderRadius: 26, background: 'var(--color-surface)' }}>
            <div className="section-label" style={{ marginBottom: 9 }}>Chances par carte</div>
            {/* La carte secrète (poids 0) n'est pas dans cette table pondérée —
                elle a son propre jet indépendant (voir SECRET_CHANCE), pas
                une ligne "0 %" ici qui donnerait l'impression, à tort,
                qu'elle est totalement impossible à tirer. */}
            {RARITIES.filter((r) => r.weight > 0).map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '3px 0' }}>
                <i style={{ display: 'block', width: 9, height: 9, borderRadius: '50%', background: RARITY_VISUALS[r.id as RarityId].ink }} />
                <span style={{ fontSize: 12, flex: 1 }}>{r.name}</span>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 12, opacity: 0.65 }}>{r.weight}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {packState === 'tearing' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              width: 230,
              height: 230,
              borderRadius: '50%',
              background: 'radial-gradient(circle,rgba(246,160,107,.9),transparent 70%)',
              animation: 'pigBurst .7s ease-out both',
            }}
          />
          <div
            style={{
              position: 'relative',
              width: 214,
              height: 286,
              borderRadius: 34,
              background: visual.bg,
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pigTear .68s cubic-bezier(.4,0,.3,1) both',
            }}
          >
            <Snout width={98} height={80} nostrilWidth={15} nostrilHeight={24} gap={15} />
          </div>
        </div>
      )}

      {packState === 'reveal' && (() => {
        const card = pull[pullIndex] || CARDS[0];
        const rarity = rarityById(card.rarity);
        const isSecret = card.rarity === SECRET_RARITY_ID;
        const glow = isSecret ? 'rgba(255,138,217,.75)' : RARITY_VISUALS[card.rarity as RarityId].glow;
        const onDown = (e: ReactPointerEvent) => dragStart(e.clientX);
        const onMove = (e: ReactPointerEvent) => dragMove(e.clientX);
        const onUp = () => dragEnd();
        const isRare = card.rarity >= 4;
        return (
          <div
            onClick={nextReveal}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              padding: '0 18px',
              touchAction: 'none',
              userSelect: 'none',
            }}
          >
            {/* Halo de rareté — sur `revealed`, sinon il colore le dos et
                annonce la rareté avant le retournement. */}
            <div
              style={{
                position: 'absolute',
                width: isSecret ? 420 : 320,
                height: isSecret ? 420 : 320,
                borderRadius: '50%',
                background: `radial-gradient(circle,${glow},transparent 68%)`,
                animation: revealed
                  ? isSecret
                    ? 'pigSecretHalo 2.6s ease-in-out infinite, pigSecretRainbow 4s linear infinite'
                    : card.rarity >= 3
                      ? 'pigGlow 2.6s ease-in-out infinite'
                      : 'none'
                  : 'none',
                opacity: revealed ? (card.rarity >= 3 ? 1 : 0.35) : 0,
                transition: 'opacity .5s ease',
                pointerEvents: 'none',
              }}
            />
            <div style={{ position: 'absolute', top: 4, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
              {pull.map((_, i) => (
                <i
                  key={i}
                  style={{
                    display: 'block',
                    width: i === pullIndex ? 20 : 7,
                    height: 7,
                    borderRadius: 999,
                    background: i <= pullIndex ? 'var(--color-accent)' : 'var(--color-neutral-400)',
                    transition: 'width .25s ease',
                  }}
                />
              ))}
            </div>
            {/* Hauteur fixe toujours présente : la pastille elle-même
                n'apparaît qu'au retournement (`revealed`), mais réserver
                l'espace tout du long évite que la carte ne saute d'une
                position à l'autre au moment où elle apparaît/disparaît. */}
            <div style={{ height: 30, marginBottom: 12, position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {revealed && (
                <div
                  key={`newbadge-${pullIndex}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '7px 15px',
                    borderRadius: 999,
                    fontFamily: 'var(--font-heading)',
                    fontSize: 12,
                    letterSpacing: '.03em',
                    animation: 'pigPop .4s ease both',
                    ...(isNew[card.id]
                      ? { background: 'var(--color-accent)', color: 'var(--color-bg)', boxShadow: '0 4px 16px rgba(220,120,60,.4)' }
                      : { background: 'var(--color-neutral-300)', color: 'var(--color-neutral-700)' }),
                  }}
                >
                  {isNew[card.id] ? '✦ Nouvelle carte' : 'Doublon'}
                </div>
              )}
            </div>

            <div
              key={pullIndex}
              style={{
                width: 238,
                height: 332,
                perspective: '1100px',
                transform: `translateX(${dragX}px) rotate(${dragX / 26}deg)`,
                transition: dragging ? 'none' : 'transform .3s ease',
                position: 'relative',
                zIndex: 2,
                animation: revealed && isRare && holoAnim ? 'pigRareKick .5s ease-out both' : undefined,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  transformStyle: 'preserve-3d',
                  transform: flipped ? 'rotateY(0deg)' : 'rotateY(180deg)',
                  transition: 'transform .62s cubic-bezier(.3,.7,.2,1)',
                  willChange: 'transform',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backfaceVisibility: 'hidden',
                    // translateZ sépare physiquement les deux faces : le tri
                    // de profondeur ne repose plus sur le seul backface-culling,
                    // que Chrome rate quand une face contient des couches
                    // promues (le foil animé de la Mythique) — sa lueur
                    // traversait alors le dos.
                    transform: 'rotateY(180deg) translateZ(1px)',
                    transformStyle: 'flat',
                    isolation: 'isolate',
                    borderRadius: 26,
                    overflow: 'hidden',
                  }}
                >
                  <CardBack skin={cardBack} width={238} height={332} style={{ boxShadow: 'var(--shadow-lg)' }} />
                </div>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backfaceVisibility: 'hidden',
                    transform: 'translateZ(1px)',
                    transformStyle: 'flat',
                    isolation: 'isolate',
                    borderRadius: 26,
                    overflow: 'hidden',
                  }}
                >
                  {/* holoAnim conditionné à `revealed` : face cachée, le foil
                      et le reflet ne tournent pas — rien à laisser filtrer. */}
                  <PigCard card={card} big forceOwned holoAnim={holoAnim && revealed} />
                </div>
              </div>
            </div>

            {/* Gerbe d'éclats — remontée à chaque carte grâce à la key. La
                carte secrète a sa propre mise en scène (SecretRevealFx),
                donc on désactive celle-ci pour ne pas jouer les deux à la
                fois : `active` retombe à false plutôt que de laisser
                RarePullFx se fier seul à son test `rarity < 4`. */}
            <RarePullFx key={`fx-${pullIndex}`} rarity={card.rarity} active={revealed && !isSecret} enabled={holoAnim} />
            <SecretRevealFx key={`sfx-${pullIndex}`} active={revealed && isSecret} enabled={holoAnim} />

            <div
              style={{
                marginTop: 22,
                fontFamily: 'var(--font-heading)',
                fontSize: 15,
                opacity: revealed ? 1 : 0.45,
                transition: 'opacity .3s ease',
                position: 'relative',
                zIndex: 2,
              }}
            >
              {revealed ? `${rarity.name} · ${card.type}` : `Carte ${pullIndex + 1} sur ${pull.length}`}
            </div>
            <div style={{ fontSize: 11, opacity: 0.4, marginTop: 7 }}>
              {flipped ? (pullIndex < pull.length - 1 ? 'Glisse ou touche pour la suivante' : 'Glisse pour voir le butin') : 'Touche pour retourner'}
            </div>

            {/* Utile surtout après une ouverture groupée (QtyPicker) — flipper
                10, 15, 25 cartes une par une devient vite fastidieux. Les
                cartes sont déjà résolues (owned/isNew), sauter la mise en
                scène ne change rien au résultat. */}
            {pull.length > 1 && (
              <button
                className="pressable"
                onClick={(e) => {
                  e.stopPropagation();
                  revealAll();
                }}
                style={{
                  marginTop: 18,
                  position: 'relative',
                  zIndex: 2,
                  cursor: 'pointer',
                  border: 0,
                  background: 'none',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  fontSize: 11.5,
                  opacity: 0.5,
                  textDecoration: 'underline',
                  padding: 6,
                }}
              >
                Tout révéler
              </button>
            )}
          </div>
        );
      })()}

      {packState === 'summary' && (() => {
        const bestRarity = pull.length ? Math.max(...pull.map((c) => c.rarity)) : 1;
        const newCount = Object.keys(isNew).length;
        return (
          <div style={{ flex: 1, padding: '8px 18px 0', animation: 'pigRise .4s ease both' }}>
            <h1 style={{ fontSize: 30, margin: 0, lineHeight: 1 }}>Ton butin</h1>
            <p style={{ fontSize: 13, opacity: 0.6, margin: '10px 0 18px' }}>
              {pull.length} cartes · {newCount} nouvelle{newCount !== 1 ? 's' : ''} · meilleure : {rarityById(bestRarity).name}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
              {pull.map((card, i) => {
                const count = owned[card.id] || 0;
                return (
                  <div
                    key={`${card.id}-${i}`}
                    className="pressable"
                    onClick={() => openDetail(card.id)}
                    style={{ position: 'relative', aspectRatio: '0.72', cursor: 'pointer', minWidth: 0 }}
                  >
                    <PigCard card={card} holoAnim={holoAnim} ownedCount={count} />
                    {/* Badges posés *dans* la carte : en débord ils étaient
                        rognés par overflow-x: hidden sur .screen. */}
                    {isNew[card.id] && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 5,
                          left: 5,
                          background: 'var(--color-accent)',
                          color: 'var(--color-bg)',
                          fontSize: 7.5,
                          fontWeight: 700,
                          letterSpacing: '.1em',
                          padding: '3px 6px',
                          borderRadius: 999,
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        NOUVEAU
                      </span>
                    )}
                    {count > 1 && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 5,
                          right: 5,
                          background: 'var(--color-neutral-900)',
                          color: 'var(--color-bg)',
                          fontSize: 9.5,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 999,
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        ×{count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <button className="pressable" onClick={tearOrShop} style={openBtnStyle}>
              {tearLabel}
            </button>
            <button className="pressable" onClick={() => navigate('/collection')} style={ghostBtnStyle}>
              Voir la collection
            </button>
          </div>
        );
      })()}
    </div>
  );
}
