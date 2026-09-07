import PigCard from './PigCard';
import { cardById } from '../data/catalog';
import type { RoundEvent, TeamSlot } from '../lib/api';
import { STANCE_INFO } from '../lib/battle';

/** Le plateau de combat — partagé entre `BattleResultOverlay` (PvP,
 *  résultat déjà calculé côté serveur, révélé progressivement tour par
 *  tour via un minuteur) et `LiveBattleOverlay` (Défier un bot, un tour à
 *  la fois, ciblage choisi en direct — voir IDEES_AMIS_COMBAT.md, douzième
 *  passage). Les deux affichent le même plateau et la même jauge de PV ;
 *  seule la façon dont les tours arrivent (minuteur vs clic du joueur)
 *  diffère, d'où ce fichier séparé plutôt que deux copies. */

export interface HitInfo {
  damage: number;
  destroyed: boolean;
  blocked: boolean;
  crit: boolean;
}

/** Dérive l'état du plateau à partir des tours DÉJÀ JOUÉS (jamais du
 *  résultat complet à l'avance côté PvP — voir l'appelant) : cartes-écran
 *  détruites jusqu'ici, et détail du DERNIER tour (pour l'animer). */
export function computeBoardInfo(rounds: RoundEvent[]) {
  const challengerDestroyed = new Set<number>();
  const opponentDestroyed = new Set<number>();
  for (const r of rounds) {
    if (r.opponentTargetDestroyed && r.opponentTargetCardId !== null) challengerDestroyed.add(r.opponentTargetCardId);
    if (r.challengerTargetDestroyed && r.challengerTargetCardId !== null) opponentDestroyed.add(r.challengerTargetCardId);
  }
  const last = rounds[rounds.length - 1];
  const challengerTargetInfo: Record<number, HitInfo> = {};
  const opponentTargetInfo: Record<number, HitInfo> = {};
  if (last) {
    if (last.opponentTargetCardId !== null) {
      challengerTargetInfo[last.opponentTargetCardId] = { damage: last.opponentDamage, destroyed: last.opponentTargetDestroyed, blocked: last.opponentBlocked, crit: last.opponentCrit };
    }
    if (last.challengerTargetCardId !== null) {
      opponentTargetInfo[last.challengerTargetCardId] = { damage: last.challengerDamage, destroyed: last.challengerTargetDestroyed, blocked: last.challengerBlocked, crit: last.challengerCrit };
    }
  }
  return {
    last,
    challengerDestroyed,
    opponentDestroyed,
    challengerTargetInfo,
    opponentTargetInfo,
    challengerPvHitNow: !!last && last.opponentTargetCardId === null,
    opponentPvHitNow: !!last && last.challengerTargetCardId === null,
  };
}

export function HpBar({
  label,
  hp,
  maxHp,
  align,
  hitKey,
  floatText,
}: {
  label: string;
  hp: number;
  maxHp: number;
  align: 'left' | 'right';
  /** Change à chaque tour où ces PV encaissent un coup direct (écran déjà
   *  percé) — remonte l'élément pour rejouer le flash une seule fois. */
  hitKey?: number | null;
  floatText?: string | null;
}) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
  const color = pct > 50 ? 'var(--color-accent-2)' : pct > 20 ? 'var(--color-accent)' : '#c0503f';
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, opacity: 0.65, marginBottom: 3, textAlign: align }}>
        <span style={{ fontWeight: 700 }}>{label}</span>
        <span>
          {hp} / {maxHp} PV
        </span>
      </div>
      <div key={hitKey ?? 'still'} className={hitKey != null ? 'battle-pv-flash' : undefined} style={{ height: 9, borderRadius: 999, background: 'var(--color-neutral-200)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999, transition: 'width .3s ease, background .3s ease' }} />
      </div>
      {hitKey != null && floatText && (
        <div
          key={`${hitKey}-float`}
          className="battle-float"
          style={{ position: 'absolute', right: 0, top: -2, fontSize: 12, fontWeight: 800, color: '#c0503f', pointerEvents: 'none' }}
        >
          ❤️ -{floatText}
        </div>
      )}
    </div>
  );
}

/** Aspect carte (largeur/hauteur), identique partout dans l'app. */
const CARD_ASPECT = 0.72;

/** Les 5 cartes de chaque équipe, toujours visibles dans l'ordre où elles
 *  ont été alignées (façon plateau Yu-Gi-Oh) : les 3 cartes en Défense
 *  forment un écran à l'HORIZONTALE (façon "position défense"), les 2
 *  cartes en Attaque restent à la verticale, DERRIÈRE cet écran (plus loin
 *  du centre du plateau). Ne montre que l'état ACTUEL (dérivé des tours
 *  déjà joués, voir `computeBoardInfo`) : une carte-écran détruite
 *  s'assombrit et reste à sa place (façon "cimetière visible"), la carte
 *  en Attaque qui vient d'agir s'élance vers le centre, sa cible tressaute,
 *  se brise ou s'entoure d'un halo bleu si bloquée — une seule fois par
 *  tour joué/révélé (voir animations.css). */
export function BattleBoard({
  opponentTeam,
  challengerTeam,
  opponentDestroyed,
  challengerDestroyed,
  opponentTargetInfo,
  challengerTargetInfo,
  activeOpponentAttackerId,
  activeChallengerAttackerId,
  roundLabel,
  animKey,
  holoAnim,
}: {
  opponentTeam: TeamSlot[];
  challengerTeam: TeamSlot[];
  opponentDestroyed: Set<number>;
  challengerDestroyed: Set<number>;
  opponentTargetInfo: Record<number, HitInfo>;
  challengerTargetInfo: Record<number, HitInfo>;
  activeOpponentAttackerId: number | null;
  activeChallengerAttackerId: number | null;
  roundLabel: string;
  /** Change à chaque tour joué/révélé — sert à rejouer les animations une
   *  seule fois par tour (remonte l'élément concerné). */
  animKey: number;
  holoAnim: boolean;
}) {
  const rowProps = (destroyed: Set<number>, targetInfo: Record<number, HitInfo>, activeAttackerId: number | null, lunge: 'battle-lunge-down' | 'battle-lunge-up') => ({
    destroyed,
    targetInfo,
    activeAttackerId,
    lunge,
    animKey,
    holoAnim,
  });
  // Cartes en Attaque un peu plus grandes que celles en Défense : la rangée
  // Défense doit loger 3 cartes tournées à l'horizontale côte à côte (donc
  // leur largeur visuelle = la hauteur de la carte) sans provoquer de
  // défilement horizontal sur un téléphone étroit, alors que la rangée
  // Attaque n'en a que 2 — beaucoup plus de marge.
  const DEFENSE_CARD_W = 70;
  const ATTACK_CARD_W = 84;
  return (
    <div style={{ padding: '10px 10px 4px', flex: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Attaque de l'adversaire — la plus loin du centre (derrière son écran). */}
      <TeamRow team={opponentTeam.filter((s) => s.stance === 'attaque')} rotated={false} cardW={ATTACK_CARD_W} {...rowProps(opponentDestroyed, opponentTargetInfo, activeOpponentAttackerId, 'battle-lunge-down')} />
      {/* Écran de défense de l'adversaire — à l'horizontale, plus proche du centre. */}
      <TeamRow team={opponentTeam.filter((s) => s.stance === 'defense')} rotated cardW={DEFENSE_CARD_W} {...rowProps(opponentDestroyed, opponentTargetInfo, activeOpponentAttackerId, 'battle-lunge-down')} />
      <div style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, opacity: 0.35, letterSpacing: '.06em', textTransform: 'uppercase', margin: '2px 0' }}>{roundLabel}</div>
      {/* Écran de défense du challenger — à l'horizontale, plus proche du centre. */}
      <TeamRow team={challengerTeam.filter((s) => s.stance === 'defense')} rotated cardW={DEFENSE_CARD_W} {...rowProps(challengerDestroyed, challengerTargetInfo, activeChallengerAttackerId, 'battle-lunge-up')} />
      {/* Attaque du challenger — la plus loin du centre (derrière son écran). */}
      <TeamRow team={challengerTeam.filter((s) => s.stance === 'attaque')} rotated={false} cardW={ATTACK_CARD_W} {...rowProps(challengerDestroyed, challengerTargetInfo, activeChallengerAttackerId, 'battle-lunge-up')} />
    </div>
  );
}

function TeamRow({
  team,
  rotated,
  cardW,
  destroyed,
  targetInfo,
  activeAttackerId,
  lunge,
  animKey,
  holoAnim,
}: {
  team: TeamSlot[];
  rotated: boolean;
  cardW: number;
  destroyed: Set<number>;
  targetInfo: Record<number, HitInfo>;
  activeAttackerId: number | null;
  lunge: 'battle-lunge-down' | 'battle-lunge-up';
  animKey: number;
  holoAnim: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: 7, justifyContent: 'center' }}>
      {team.map((slot) => {
        const hit = targetInfo[slot.cardId];
        const isActiveAttacker = slot.stance === 'attaque' && slot.cardId === activeAttackerId;
        let animClass: string | undefined;
        let slotAnimKey: string;
        if (isActiveAttacker) {
          animClass = lunge;
          slotAnimKey = `atk-${animKey}-${slot.cardId}`;
        } else if (hit) {
          animClass = hit.blocked ? 'battle-block-flash' : hit.destroyed ? 'battle-break' : 'battle-shake';
          slotAnimKey = `hit-${animKey}-${slot.cardId}`;
        } else {
          slotAnimKey = `static-${slot.cardId}`;
        }
        return (
          <BoardSlot
            key={slot.cardId}
            slot={slot}
            rotated={rotated}
            cardW={cardW}
            isDestroyed={destroyed.has(slot.cardId)}
            animClass={animClass}
            animKey={slotAnimKey}
            hit={hit}
            holoAnim={holoAnim}
          />
        );
      })}
    </div>
  );
}

function BoardSlot({
  slot,
  rotated,
  cardW,
  isDestroyed,
  animClass,
  animKey,
  hit,
  holoAnim,
}: {
  slot: TeamSlot;
  rotated: boolean;
  cardW: number;
  isDestroyed: boolean;
  animClass: string | undefined;
  animKey: string;
  hit: HitInfo | undefined;
  holoAnim: boolean;
}) {
  const card = cardById(slot.cardId);
  if (!card) return null;
  const stanceInfo = STANCE_INFO[slot.stance];
  const ring = slot.stance === 'attaque' ? 'var(--color-accent-500)' : 'var(--color-accent-2-500)';
  const cardH = cardW / CARD_ASPECT;
  const footprintW = rotated ? cardH : cardW;
  const footprintH = rotated ? cardW : cardH;
  return (
    <div style={{ position: 'relative', width: footprintW, flex: 'none' }}>
      <div
        key={animKey}
        className={animClass}
        style={{
          width: footprintW,
          height: footprintH,
          position: 'relative',
          opacity: isDestroyed ? 0.4 : 1,
          filter: isDestroyed ? 'grayscale(1)' : 'none',
          transition: 'opacity .4s ease, filter .4s ease',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: cardW,
            height: cardH,
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) ${rotated ? 'rotate(90deg)' : ''}`,
            boxShadow: `0 0 0 2px ${ring}`,
            borderRadius: 15,
          }}
        >
          <PigCard card={card} holoAnim={holoAnim} ownedCount={1} isHolo={slot.holo} />
        </div>
        <span
          title={`Posture : ${stanceInfo.label}`}
          style={{ position: 'absolute', bottom: -3, right: -3, fontSize: 13, background: 'var(--color-bg)', borderRadius: '50%', lineHeight: 1, padding: 2, boxShadow: 'var(--shadow-sm)', zIndex: 1 }}
        >
          {stanceInfo.icon}
        </span>
        {isDestroyed && (
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, zIndex: 1 }}>💥</span>
        )}
      </div>
      {hit && (
        <div
          key={`${animKey}-float`}
          className="battle-float"
          style={{
            position: 'absolute',
            top: -8,
            left: '50%',
            fontSize: 12.5,
            fontWeight: 800,
            whiteSpace: 'nowrap',
            color: hit.crit ? '#c0503f' : hit.blocked ? 'var(--color-text)' : 'var(--color-accent-800)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          {hit.blocked ? '🚫' : `${hit.crit ? '🎯 ' : ''}-${hit.damage}`}
        </div>
      )}
    </div>
  );
}
