import { useEffect, useRef, useState } from 'react';
import PigCard from './PigCard';
import { cardById } from '../data/catalog';
import type { Battle, Camp, RoundEvent, TeamSlot } from '../lib/api';
import { CAMP_INFO, STANCE_INFO } from '../lib/battle';
import { useAnimations } from '../lib/useAnimations';

/** Retrouve la posture/holo d'une carte dans une équipe à partir de son id
 *  — le journal de combat (RoundEvent) ne référence les cartes que par id,
 *  jamais par index de slot (une carte-écran peut être détruite alors que
 *  d'autres, plus loin dans le tableau, sont encore debout). */
function findSlot(team: TeamSlot[], cardId: number): TeamSlot | null {
  return team.find((s) => s.cardId === cardId) ?? null;
}

/** Résultat d'un combat résolu — combat à PV, révélé PROGRESSIVEMENT tour
 *  par tour (pas tout d'un coup) : deux jauges de PV qui descendent au fil
 *  d'un journal de combat qui se remplit, plutôt qu'un score déjà là dès
 *  l'ouverture. Le résultat complet (`battle.result.rounds`) est toujours
 *  déjà calculé par le serveur (jamais recalculé côté client, voir
 *  functions/_lib/battle.ts) — cet overlay ne fait que le dérouler à son
 *  rythme, avec un bouton pour passer l'animation. Utilisé juste après
 *  avoir répondu à un défi et pour rouvrir un combat déjà terminé depuis
 *  l'historique (BattlesScreen) — même overlay dans les deux cas. */

/** Vitesse de révélation — plus rapide si le combat a beaucoup de tours,
 *  pour ne pas transformer un combat serré (PV élevés des deux côtés) en
 *  attente interminable. */
function roundDelayMs(totalRounds: number): number {
  if (totalRounds > 50) return 90;
  if (totalRounds > 25) return 160;
  return 320;
}

export default function BattleResultOverlay({ battle, myUsername, onClose }: { battle: Battle; myUsername: string; onClose: () => void }) {
  const holoAnim = useAnimations();
  const result = battle.result;
  const rounds = result?.rounds ?? [];
  const [revealed, setRevealed] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!result || revealed >= rounds.length) return;
    const id = setTimeout(() => setRevealed((n) => n + 1), roundDelayMs(rounds.length));
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, rounds.length]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [revealed]);

  if (!result || !battle.opponentTeam) return null;

  const iAmChallenger = battle.challengerUsername === myUsername;
  const finished = revealed >= rounds.length;
  const last: RoundEvent | undefined = rounds[revealed - 1];
  const hpC = last ? last.challengerHp : result.challengerMaxHp;
  const hpO = last ? last.opponentHp : result.opponentMaxHp;
  const winner = finished ? result.winner : null;
  const iWon = winner !== null && (winner === 'challenger') === iAmChallenger;
  const tie = winner === 'tie';

  // ── État du plateau (voir BattleBoard plus bas) — dérivé uniquement des
  // tours déjà révélés, jamais du résultat complet à l'avance : une
  // carte-écran détruite au tour 7 reste debout sur le plateau tant qu'on
  // n'a pas révélé ce tour-là.
  const revealedRounds = rounds.slice(0, revealed);
  const challengerDestroyed = new Set<number>();
  const opponentDestroyed = new Set<number>();
  for (const r of revealedRounds) {
    if (r.opponentTargetDestroyed && r.opponentTargetCardId !== null) challengerDestroyed.add(r.opponentTargetCardId);
    if (r.challengerTargetDestroyed && r.challengerTargetCardId !== null) opponentDestroyed.add(r.challengerTargetCardId);
  }
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
  const challengerPvHitNow = !!last && last.opponentTargetCardId === null;
  const opponentPvHitNow = !!last && last.challengerTargetCardId === null;

  return (
    <div className="overlay" onClick={finished ? onClose : undefined} style={{ alignItems: 'stretch' }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          margin: 'auto 0',
          // `dvh` (hauteur de viewport DYNAMIQUE) tient compte de la barre
          // d'adresse/outils du navigateur mobile, contrairement à `vh`
          // (basé sur le viewport le plus grand possible, barre cachée) —
          // sans ça, sur un téléphone où la barre est visible, le modal
          // pouvait dépasser la zone réellement visible, avec le bouton
          // "Fermer" hors d'atteinte (voir aussi : bouton sorti du journal
          // défilant plus bas, pour ne plus jamais dépendre du scroll).
          maxHeight: '85dvh',
          background: 'var(--color-bg)',
          borderRadius: 28,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ padding: '20px 20px 8px', flex: 'none', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, color: !finished ? 'var(--color-text)' : tie ? 'var(--color-text)' : iWon ? 'var(--color-accent-800)' : 'var(--color-neutral-600)' }}>
            {!finished ? 'Combat en cours…' : tie ? 'Égalité' : iWon ? 'Victoire ! 🐷' : 'Défaite'}
          </div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
            {battle.challengerUsername} vs {battle.opponentUsername}
          </div>
        </div>

        <div style={{ padding: '10px 20px 0', flex: 'none' }}>
          <HpBar
            label={battle.opponentUsername}
            hp={hpO}
            maxHp={result.opponentMaxHp}
            align="left"
            hitKey={opponentPvHitNow ? revealed : null}
            floatText={opponentPvHitNow && last ? String(last.challengerDamage) : null}
          />
          <div style={{ height: 8 }} />
          <HpBar
            label={battle.challengerUsername}
            hp={hpC}
            maxHp={result.challengerMaxHp}
            align="left"
            hitKey={challengerPvHitNow ? revealed : null}
            floatText={challengerPvHitNow && last ? String(last.opponentDamage) : null}
          />
        </div>

        <BattleBoard
          opponentTeam={battle.opponentTeam}
          challengerTeam={battle.challengerTeam}
          opponentDestroyed={opponentDestroyed}
          challengerDestroyed={challengerDestroyed}
          opponentTargetInfo={opponentTargetInfo}
          challengerTargetInfo={challengerTargetInfo}
          activeOpponentAttackerId={last?.opponentAttackerId ?? null}
          activeChallengerAttackerId={last?.challengerAttackerId ?? null}
          roundLabel={last ? `Tour ${last.round + 1}` : 'En attente…'}
          revealed={revealed}
          holoAnim={holoAnim}
        />

        {/* `flex: 1 1 auto` + `minHeight: 0` — sans ça, un flex-item avec
            overflow ne se laisse pas comprimer sous la taille de son
            contenu par le reste de la colonne (le plateau au-dessus a
            grandi, voir passage précédent) : c'est ce qui laissait le
            bouton "Fermer" ci-dessous inatteignable sur certains
            téléphones, plateau + journal dépassant la hauteur réellement
            visible sans aucun moyen d'y faire défiler. */}
        <div ref={logRef} style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '4px 20px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rounds.slice(0, revealed).map((r) => (
            <RoundCard
              key={r.round}
              round={r}
              challengerTeam={battle.challengerTeam}
              opponentTeam={battle.opponentTeam!}
              challengerUsername={battle.challengerUsername}
              opponentUsername={battle.opponentUsername}
              holoAnim={holoAnim}
            />
          ))}

          {finished && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.6, padding: '6px 4px 0' }}>
              <span>
                PV max : {result.challengerMaxHp}
                {result.challengerSynergyBonus > 0 && ` (+${Math.round(result.challengerSynergyBonus * 100)}% synergie)`}
              </span>
              <span>
                {result.opponentSynergyBonus > 0 && `(+${Math.round(result.opponentSynergyBonus * 100)}% synergie) `}
                {result.opponentMaxHp}
              </span>
            </div>
          )}
        </div>

        {/* Hors du journal défilant, désormais toujours visible (voir
            commentaire ci-dessus) — plus jamais tributaire du scroll. */}
        <div style={{ flex: 'none', display: 'flex', gap: 8, padding: '8px 20px 18px' }}>
          {!finished && (
            <button
              className="pressable"
              onClick={() => setRevealed(rounds.length)}
              style={{
                flex: 1,
                cursor: 'pointer',
                border: 0,
                fontFamily: 'var(--font-heading)',
                fontSize: 13,
                padding: '11px',
                borderRadius: 999,
                background: 'var(--color-neutral-200)',
                color: 'var(--color-text)',
              }}
            >
              Passer
            </button>
          )}
          {finished && (
            <button
              className="pressable"
              onClick={onClose}
              style={{
                flex: 1,
                cursor: 'pointer',
                border: 0,
                fontFamily: 'var(--font-heading)',
                fontSize: 14,
                padding: '12px',
                borderRadius: 999,
                background: 'var(--color-accent)',
                color: 'var(--color-bg)',
              }}
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function HpBar({
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

interface HitInfo {
  damage: number;
  destroyed: boolean;
  blocked: boolean;
  crit: boolean;
}

/** Aspect carte (largeur/hauteur), identique partout dans l'app. */
const CARD_ASPECT = 0.72;

/** Le plateau — les 5 cartes de chaque équipe, toujours visibles dans
 *  l'ordre où elles ont été alignées (façon plateau Yu-Gi-Oh) : les 3
 *  cartes en Défense forment un écran à l'HORIZONTALE (façon "position
 *  défense"), les 2 cartes en Attaque restent à la verticale, DERRIÈRE cet
 *  écran (plus loin du centre du plateau). Contrairement au journal en
 *  dessous (qui défile), ce plateau ne montre que l'état ACTUEL : une
 *  carte-écran détruite s'assombrit et reste à sa place (façon "cimetière
 *  visible"), la carte en Attaque qui vient d'agir s'élance vers le centre,
 *  sa cible tressaute, se brise ou s'entoure d'un halo bleu si bloquée —
 *  une seule fois par tour révélé (voir animations.css). */
function BattleBoard({
  opponentTeam,
  challengerTeam,
  opponentDestroyed,
  challengerDestroyed,
  opponentTargetInfo,
  challengerTargetInfo,
  activeOpponentAttackerId,
  activeChallengerAttackerId,
  roundLabel,
  revealed,
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
  revealed: number;
  holoAnim: boolean;
}) {
  const rowProps = (destroyed: Set<number>, targetInfo: Record<number, HitInfo>, activeAttackerId: number | null, lunge: 'battle-lunge-down' | 'battle-lunge-up') => ({
    destroyed,
    targetInfo,
    activeAttackerId,
    lunge,
    revealed,
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
  revealed,
  holoAnim,
}: {
  team: TeamSlot[];
  rotated: boolean;
  cardW: number;
  destroyed: Set<number>;
  targetInfo: Record<number, HitInfo>;
  activeAttackerId: number | null;
  lunge: 'battle-lunge-down' | 'battle-lunge-up';
  revealed: number;
  holoAnim: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: 7, justifyContent: 'center' }}>
      {team.map((slot) => {
        const hit = targetInfo[slot.cardId];
        const isActiveAttacker = slot.stance === 'attaque' && slot.cardId === activeAttackerId;
        let animClass: string | undefined;
        let animKey: string;
        if (isActiveAttacker) {
          animClass = lunge;
          animKey = `atk-${revealed}-${slot.cardId}`;
        } else if (hit) {
          animClass = hit.blocked ? 'battle-block-flash' : hit.destroyed ? 'battle-break' : 'battle-shake';
          animKey = `hit-${revealed}-${slot.cardId}`;
        } else {
          animKey = `static-${slot.cardId}`;
        }
        return (
          <BoardSlot
            key={slot.cardId}
            slot={slot}
            rotated={rotated}
            cardW={cardW}
            isDestroyed={destroyed.has(slot.cardId)}
            animClass={animClass}
            animKey={animKey}
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

/** Un tour = deux attaques simultanées, chacune vers l'écran adverse (une
 *  carte-écran précise, encore debout) ou, l'écran une fois percé, vers les
 *  PV adverses directement. Affichées l'une sous l'autre plutôt que
 *  côte-à-côte (comme dans l'ancien modèle symétrique "carte i contre carte
 *  i") car les deux attaques n'ont plus forcément la même cible. */
function RoundCard({
  round,
  challengerTeam,
  opponentTeam,
  challengerUsername,
  opponentUsername,
  holoAnim,
}: {
  round: RoundEvent;
  challengerTeam: TeamSlot[];
  opponentTeam: TeamSlot[];
  challengerUsername: string;
  opponentUsername: string;
  holoAnim: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        padding: '8px 10px',
        borderRadius: 16,
        background: 'var(--color-surface)',
        animation: 'pigRise .25s ease both',
      }}
    >
      <div style={{ fontSize: 9, fontWeight: 700, opacity: 0.4, textAlign: 'center' }}>T{round.round + 1}</div>
      <AttackLine
        attackerSlot={findSlot(challengerTeam, round.challengerAttackerId)}
        targetSlot={round.challengerTargetCardId !== null ? findSlot(opponentTeam, round.challengerTargetCardId) : null}
        targetOwnerName={opponentUsername}
        targetDestroyed={round.challengerTargetDestroyed}
        atk={round.challengerAtk}
        damage={round.challengerDamage}
        camp={round.challengerCamp}
        campAdvantage={round.challengerCampAdvantage}
        momentum={round.challengerMomentum}
        desperation={round.challengerDesperation}
        crit={round.challengerCrit}
        blocked={round.challengerBlocked}
        holoAnim={holoAnim}
      />
      <AttackLine
        attackerSlot={findSlot(opponentTeam, round.opponentAttackerId)}
        targetSlot={round.opponentTargetCardId !== null ? findSlot(challengerTeam, round.opponentTargetCardId) : null}
        targetOwnerName={challengerUsername}
        targetDestroyed={round.opponentTargetDestroyed}
        atk={round.opponentAtk}
        damage={round.opponentDamage}
        camp={round.opponentCamp}
        campAdvantage={round.opponentCampAdvantage}
        momentum={round.opponentMomentum}
        desperation={round.opponentDesperation}
        crit={round.opponentCrit}
        blocked={round.opponentBlocked}
        holoAnim={holoAnim}
      />
    </div>
  );
}

/** Une attaque : l'attaquant (à gauche) vise soit une carte-écran adverse
 *  précise (au centre, avec un badge "détruite" si c'est le coup de grâce),
 *  soit — écran adverse déjà percé — les PV adverses directement (icône
 *  cœur). Les dégâts et les icônes de bonus sont à droite. */
function AttackLine({
  attackerSlot,
  targetSlot,
  targetOwnerName,
  targetDestroyed,
  atk,
  damage,
  camp,
  campAdvantage,
  momentum,
  desperation,
  crit,
  blocked,
  holoAnim,
}: {
  attackerSlot: TeamSlot | null;
  targetSlot: TeamSlot | null;
  targetOwnerName: string;
  targetDestroyed: boolean;
  atk: number;
  damage: number;
  camp: Camp | null;
  campAdvantage: boolean;
  momentum: boolean;
  desperation: boolean;
  crit: boolean;
  blocked: boolean;
  holoAnim: boolean;
}) {
  const attackerCard = attackerSlot ? cardById(attackerSlot.cardId) : null;
  const targetCard = targetSlot ? cardById(targetSlot.cardId) : null;
  if (!attackerCard) return null;
  const campInfo = camp ? CAMP_INFO[camp] : null;
  const stanceInfo = STANCE_INFO[attackerSlot!.stance];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 26, aspectRatio: '0.72', flex: 'none', borderRadius: 7, position: 'relative' }}>
        <PigCard card={attackerCard} holoAnim={holoAnim} ownedCount={1} isHolo={attackerSlot!.holo} />
        {campAdvantage && (
          <span title="Avantage de camp" style={{ position: 'absolute', top: -4, right: -4, fontSize: 10 }}>
            💫
          </span>
        )}
      </div>
      <div style={{ minWidth: 0, flex: '1 1 auto' }}>
        <div style={{ fontSize: 9.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attackerCard.name}</div>
        <div style={{ fontSize: 9, opacity: 0.55, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {campInfo && <span title={campInfo.label}>{campInfo.icon}</span>}
          <span title={`Posture : ${stanceInfo.label}`}>{stanceInfo.icon}</span>
          <span title="Attaque">⚔️{atk}</span>
          {momentum && <span title="Lancée : bonus d'attaque (PV adverses touchés au tour précédent)">🔥</span>}
          {desperation && <span title="Sursaut du désespoir : bonus d'attaque sous 25% de PV">💢</span>}
        </div>
      </div>
      <span style={{ fontSize: 12, opacity: 0.35, flex: 'none' }}>→</span>
      <div style={{ width: 22, flex: 'none', textAlign: 'center' }}>
        {targetCard ? (
          <div style={{ width: 22, aspectRatio: '0.72', borderRadius: 6, position: 'relative', margin: '0 auto' }}>
            <PigCard card={targetCard} holoAnim={holoAnim} ownedCount={1} isHolo={targetSlot!.holo} />
          </div>
        ) : (
          <span title={`PV de ${targetOwnerName} visés directement`} style={{ fontSize: 16 }}>
            ❤️
          </span>
        )}
      </div>
      <div style={{ minWidth: 46, textAlign: 'right', flex: 'none' }}>
        {targetDestroyed && (
          <div style={{ fontSize: 9, fontWeight: 700, opacity: 0.6 }} title="Carte-écran détruite">
            💥 brisée
          </div>
        )}
        {blocked ? (
          <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.6 }}>🚫 Bloqué</div>
        ) : (
          <div style={{ fontSize: 11, fontWeight: 800, color: crit ? '#c0503f' : 'var(--color-accent-800)' }}>
            {crit && '🎯 '}-{damage}
          </div>
        )}
      </div>
    </div>
  );
}
