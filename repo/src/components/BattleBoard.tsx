import { memo } from 'react';
import PigCard from './PigCard';
import { cardById } from '../data/catalog';
import type { RoundEvent, TeamSlot } from '../lib/api';
import { STANCE_INFO } from '../lib/battle';
import { categoryAbilityFor } from '../lib/categoryAbilities';

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
  // Mise en scène (voir IDEES_AMIS_COMBAT.md, dix-septième passage) : rien
  // ici n'affecte l'issue du combat, tout est dérivé après coup des tours
  // déjà joués — un flourish pour le tour affiché, plus deux stats de fin
  // de partie (série en cours, MVP), calculées à chaque appel mais bon
  // marché (au plus une quarantaine de tours).
  //
  // Capacité active : elle se déclenche à la TOUTE PREMIÈRE action de son
  // attaquant — donc si le tour affiché est le premier où CET attaquant
  // apparaît dans `rounds`, c'est exactement ce tour-là qui l'a fait agir.
  let flourish: string | null = null;
  if (last) {
    const firstForChallenger = !rounds.slice(0, -1).some((r) => r.challengerAttackerId === last.challengerAttackerId);
    const firstForOpponent = !rounds.slice(0, -1).some((r) => r.opponentAttackerId === last.opponentAttackerId);
    const activeAttackerId = firstForChallenger ? last.challengerAttackerId : firstForOpponent ? last.opponentAttackerId : null;
    const activeCard = activeAttackerId !== null ? cardById(activeAttackerId) : null;
    if (activeCard) {
      const ability = categoryAbilityFor(activeCard.type);
      flourish = `${ability.icon} ${activeCard.name} déclenche ${ability.activeLabel} !`;
    } else if (last.challengerCampAdvantage || last.opponentCampAdvantage) {
      // Un flourish de repli plus discret quand il n'y a pas de capacité à
      // annoncer ce tour-ci, pour que l'avantage de camp — jusqu'ici
      // silencieux — se voie aussi à l'écran, pas seulement dans le
      // journal détaillé plus bas.
      const advCard = cardById(last.challengerCampAdvantage ? last.challengerAttackerId : last.opponentAttackerId);
      if (advCard) flourish = `💫 ${advCard.name} a l'avantage de camp !`;
    }
  }

  // Série en cours : coups d'affilée non bloqués, jusqu'au tour affiché
  // (remise à 0 dès qu'un coup est bloqué) — juste pour le frisson, aucun
  // effet sur les dégâts.
  let challengerCombo = 0;
  let opponentCombo = 0;
  for (const r of rounds) {
    challengerCombo = r.challengerBlocked ? 0 : challengerCombo + 1;
    opponentCombo = r.opponentBlocked ? 0 : opponentCombo + 1;
  }

  // MVP : la carte (des deux équipes confondues) qui a infligé le plus de
  // dégâts cumulés sur tout le combat — affiché seulement une fois terminé
  // par l'appelant, calculé ici dans la foulée des autres statistiques.
  const dmgByCard = new Map<number, number>();
  for (const r of rounds) {
    dmgByCard.set(r.challengerAttackerId, (dmgByCard.get(r.challengerAttackerId) ?? 0) + r.challengerDamage);
    dmgByCard.set(r.opponentAttackerId, (dmgByCard.get(r.opponentAttackerId) ?? 0) + r.opponentDamage);
  }
  let mvpCardId: number | null = null;
  let mvpDamage = 0;
  for (const [cardId, dmg] of dmgByCard) {
    if (dmg > mvpDamage) {
      mvpDamage = dmg;
      mvpCardId = cardId;
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
    flourish,
    challengerCombo,
    opponentCombo,
    mvpCardId,
    mvpDamage,
  };
}

export function HpBar({
  label,
  hp,
  maxHp,
  align,
  hitKey,
  floatText,
  targetable,
  onClick,
  combo = 0,
}: {
  label: string;
  hp: number;
  maxHp: number;
  align: 'left' | 'right';
  /** Change à chaque tour où ces PV encaissent un coup direct (écran déjà
   *  percé) — remonte l'élément pour rejouer le flash une seule fois. */
  hitKey?: number | null;
  floatText?: string | null;
  /** Ciblable à cet instant : l'écran adverse est percé, donc c'est LA
   *  jauge qu'on touche pour attaquer (il n'y a plus de carte à viser). */
  targetable?: boolean;
  onClick?: () => void;
  /** Coups d'affilée sans blocage (voir `computeBoardInfo`) — juste pour
   *  le frisson, affiché seulement à partir de 3 pour ne pas encombrer les
   *  premiers tours d'un badge qui ne dit encore rien. */
  combo?: number;
}) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
  const color = pct > 50 ? 'var(--color-accent-2)' : pct > 20 ? 'var(--color-accent)' : '#c0503f';
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      title={onClick ? 'Attaquer directement les points de vie' : undefined}
      style={{
        position: 'relative',
        display: 'block',
        width: '100%',
        padding: targetable ? 6 : 0,
        margin: targetable ? -6 : 0,
        border: 0,
        background: 'none',
        font: 'inherit',
        color: 'inherit',
        textAlign: 'inherit',
        borderRadius: 12,
        cursor: onClick ? 'pointer' : 'default',
      }}
      className={targetable ? 'battle-targetable' : undefined}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, opacity: 0.65, marginBottom: 3, textAlign: align }}>
        <span style={{ fontWeight: 700 }}>
          {label}
          {combo >= 3 && (
            <span key={combo} style={{ marginLeft: 5, color: 'var(--color-accent-800)', animation: 'pigPop .25s ease both' }}>
              🔥×{combo}
            </span>
          )}
        </span>
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
      {targetable && (
        <span style={{ position: 'absolute', right: -2, top: -10, fontSize: 13, pointerEvents: 'none' }}>🎯</span>
      )}
    </Wrapper>
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
  flourish,
  animKey,
  onCardClick,
  playableAttackerId = null,
  targetableIds,
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
  /** Une ligne de mise en scène pour le tour affiché — capacité active
   *  déclenchée ou, à défaut, avantage de camp (voir `computeBoardInfo`).
   *  `null`/absent = rien à annoncer ce tour-ci, juste `roundLabel`. */
  flourish?: string | null;
  /** Change à chaque tour joué/révélé — sert à rejouer les animations une
   *  seule fois par tour (remonte l'élément concerné). */
  animKey: number;
  /** Touche une carte du plateau — sert à la fois à consulter ses stats et,
   *  en combat en direct, à lancer l'attaque puis choisir la cible (voir
   *  LiveBattleOverlay). Absent = plateau purement décoratif. */
  onCardClick?: (slot: TeamSlot, side: 'challenger' | 'opponent') => void;
  /** Ma carte en Attaque dont c'est le tour : halo qui respire pour dire
   *  « touche-moi ». Cherchée uniquement dans l'équipe du challenger. */
  playableAttackerId?: number | null;
  /** Cartes adverses ciblables à cet instant : halo rouge qui pulse.
   *  Cherchées uniquement dans l'équipe adverse. */
  targetableIds?: Set<number>;
}) {
  const rowProps = (
    destroyed: Set<number>,
    targetInfo: Record<number, HitInfo>,
    activeAttackerId: number | null,
    lunge: 'battle-lunge-down' | 'battle-lunge-up',
    side: 'challenger' | 'opponent',
  ) => ({
    destroyed,
    targetInfo,
    activeAttackerId,
    lunge,
    animKey,
    side,
    onCardClick,
    playableAttackerId,
    targetableIds,
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
      <TeamRow team={opponentTeam.filter((s) => s.stance === 'attaque')} rotated={false} cardW={ATTACK_CARD_W} {...rowProps(opponentDestroyed, opponentTargetInfo, activeOpponentAttackerId, 'battle-lunge-down', 'opponent')} />
      {/* Écran de défense de l'adversaire — à l'horizontale, plus proche du centre. */}
      <TeamRow team={opponentTeam.filter((s) => s.stance === 'defense')} rotated cardW={DEFENSE_CARD_W} {...rowProps(opponentDestroyed, opponentTargetInfo, activeOpponentAttackerId, 'battle-lunge-down', 'opponent')} />
      <div style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, opacity: 0.35, letterSpacing: '.06em', textTransform: 'uppercase', margin: '2px 0' }}>{roundLabel}</div>
      {/* Flourish du tour (capacité active / avantage de camp) — un `key` sur
          animKey rejoue le pop une seule fois par tour (même animation que
          l'ouverture d'une carte, voir animations.css, pigPop). */}
      {flourish && (
        <div
          key={`flourish-${animKey}`}
          style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-accent-800)', margin: '-2px 0 2px', animation: 'pigPop .3s ease both' }}
        >
          {flourish}
        </div>
      )}
      {/* Écran de défense du challenger — à l'horizontale, plus proche du centre. */}
      <TeamRow team={challengerTeam.filter((s) => s.stance === 'defense')} rotated cardW={DEFENSE_CARD_W} {...rowProps(challengerDestroyed, challengerTargetInfo, activeChallengerAttackerId, 'battle-lunge-up', 'challenger')} />
      {/* Attaque du challenger — la plus loin du centre (derrière son écran). */}
      <TeamRow team={challengerTeam.filter((s) => s.stance === 'attaque')} rotated={false} cardW={ATTACK_CARD_W} {...rowProps(challengerDestroyed, challengerTargetInfo, activeChallengerAttackerId, 'battle-lunge-up', 'challenger')} />
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
  side,
  onCardClick,
  playableAttackerId,
  targetableIds,
}: {
  team: TeamSlot[];
  rotated: boolean;
  cardW: number;
  destroyed: Set<number>;
  targetInfo: Record<number, HitInfo>;
  activeAttackerId: number | null;
  lunge: 'battle-lunge-down' | 'battle-lunge-up';
  animKey: number;
  side: 'challenger' | 'opponent';
  onCardClick?: (slot: TeamSlot, side: 'challenger' | 'opponent') => void;
  playableAttackerId?: number | null;
  targetableIds?: Set<number>;
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
            side={side}
            rotated={rotated}
            cardW={cardW}
            isDestroyed={destroyed.has(slot.cardId)}
            animClass={animClass}
            animKey={slotAnimKey}
            hit={hit}
            onCardClick={onCardClick}
            // Le camp compte autant que l'identifiant : les deux équipes
            // piochent dans le même catalogue, la même carte peut donc être
            // alignée des deux côtés — sans ce test, toucher SA carte
            // allumait aussi son sosie en face.
            isPlayable={side === 'challenger' && playableAttackerId != null && slot.cardId === playableAttackerId}
            isTargetable={side === 'opponent' && !!targetableIds?.has(slot.cardId)}
          />
        );
      })}
    </div>
  );
}

/** Mémoïsé : sur un plateau de 10 cartes, un clic ne change JAMAIS l'état de
 *  toutes à la fois (au pire 1 jouable + 3 ciblables) — sans ce memo,
 *  chaque tour recalcule et repeint les 10 `PigCard` (dégradés, ombres)
 *  même pour celles dont rien n'a changé, ce qui se sentait comme un clic
 *  mou sur un téléphone modeste. Toutes les props reçues sont déjà réduites
 *  à des primitives ou des références stables par `TeamRow` (`hit` reste un
 *  objet mais n'existe que pour LA carte visée du dernier tour, `undefined`
 *  partout ailleurs — donc stable pour les 9 autres), donc la comparaison
 *  superficielle par défaut suffit ; `onCardClick` doit rester une
 *  référence stable d'un rendu à l'autre côté appelant (voir le `useRef` +
 *  `useCallback` dans LiveBattleOverlay) sinon ce memo ne sert à rien. */
const BoardSlot = memo(function BoardSlot({
  slot,
  side,
  rotated,
  cardW,
  isDestroyed,
  animClass,
  animKey,
  hit,
  onCardClick,
  isPlayable,
  isTargetable,
}: {
  slot: TeamSlot;
  side: 'challenger' | 'opponent';
  rotated: boolean;
  cardW: number;
  isDestroyed: boolean;
  animClass: string | undefined;
  animKey: string;
  hit: HitInfo | undefined;
  onCardClick?: (slot: TeamSlot, side: 'challenger' | 'opponent') => void;
  /** Ma carte en Attaque dont c'est le tour — halo qui respire. */
  isPlayable?: boolean;
  /** Cible possible pour l'attaque en cours — halo rouge qui pulse. */
  isTargetable?: boolean;
}) {
  const card = cardById(slot.cardId);
  if (!card) return null;
  const stanceInfo = STANCE_INFO[slot.stance];
  const ring = slot.stance === 'attaque' ? 'var(--color-accent-500)' : 'var(--color-accent-2-500)';
  const cardH = cardW / CARD_ASPECT;
  const footprintW = rotated ? cardH : cardW;
  const footprintH = rotated ? cardW : cardH;
  // Bouton quand c'est interactif (au clavier aussi, et pas juste une div
  // qui réagit à la souris) ; simple div sinon, pour le PvP décoratif.
  const onClick = onCardClick ? () => onCardClick(slot, side) : undefined;
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      // Le même bouton fait trois choses selon le moment du tour — l'infobulle
      // le dit, plutôt que de laisser deviner ce qu'une touche va déclencher.
      title={
        !onClick
          ? undefined
          : isTargetable
            ? 'Attaquer cette carte'
            : isPlayable
              ? "Ta carte qui attaque : touche pour lancer l'attaque, retouche pour annuler"
              : 'Voir les stats de la carte'
      }
      style={{
        position: 'relative',
        width: footprintW,
        flex: 'none',
        padding: 0,
        border: 0,
        background: 'none',
        font: 'inherit',
        color: 'inherit',
        textAlign: 'inherit',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
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
          className={isTargetable ? 'battle-targetable' : isPlayable ? 'battle-playable' : undefined}
          style={{
            position: 'absolute',
            width: cardW,
            height: cardH,
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) ${rotated ? 'rotate(90deg)' : ''}`,
            // Le halo pulsant (classe ci-dessus) remplace le liseré fixe de
            // posture tant qu'il dure — sinon les deux box-shadow se
            // marchent dessus.
            boxShadow: isTargetable || isPlayable ? undefined : `0 0 0 2px ${ring}`,
            borderRadius: 15,
          }}
        >
          {/* `holoAnim` figé à `false` ici, sans tenir compte du réglage du
              joueur : le dégradé qui balaie une carte (voile Épique+, foil
              holo) tourne en continu par `background-position` — une
              animation qui REPEINT à chaque frame, pas juste compositée par
              le GPU. Multipliée par les 10 cartes du plateau pendant un
              combat où l'on tape sans arrêt, elle rentre en concurrence avec
              le rendu du clic lui-même et le fait sentir mou. La carte reste
              identifiable (même dégradé, juste figé) ; seul le journal en
              dessous (BattleLog, bien plus petit et jamais touché pendant
              qu'on joue) garde encore le mouvement. */}
          <PigCard card={card} holoAnim={false} ownedCount={1} isHolo={slot.holo} />
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
      {/* Pastille au-dessus de la carte : le halo qui pulse se remarque en
          mouvement, mais d'un coup d'œil immobile les cartes en Attaque ont
          déjà toutes le même liseré — sans repère explicite on ne sait pas
          laquelle toucher. 👆 = « c'est toi qui joues », 🎯 = « visable ». */}
      {(isTargetable || isPlayable) && (
        <span style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', fontSize: 14, zIndex: 3, pointerEvents: 'none' }}>
          {isTargetable ? '🎯' : '👆'}
        </span>
      )}
    </Wrapper>
  );
});
