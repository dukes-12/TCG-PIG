import PigCard from './PigCard';
import { cardById } from '../data/catalog';
import type { Camp, RoundEvent, TeamSlot } from '../lib/api';
import { CAMP_INFO, STANCE_INFO } from '../lib/battle';

/** Le journal détaillé (texte) d'un combat — un `RoundCard` par tour joué,
 *  partagé entre `BattleResultOverlay` (PvP) et `LiveBattleOverlay` (bot).
 *  Voir BattleBoard.tsx pour le plateau visuel ; ce fichier ne fait que
 *  détailler chaque tour en dessous. */

/** Retrouve la posture/holo d'une carte dans une équipe à partir de son id
 *  — le journal de combat (RoundEvent) ne référence les cartes que par id,
 *  jamais par index de slot (une carte-écran peut être détruite alors que
 *  d'autres, plus loin dans le tableau, sont encore debout). */
function findSlot(team: TeamSlot[], cardId: number): TeamSlot | null {
  return team.find((s) => s.cardId === cardId) ?? null;
}

/** Un tour = deux attaques simultanées, chacune vers l'écran adverse (une
 *  carte-écran précise, encore debout) ou, l'écran une fois percé, vers les
 *  PV adverses directement. Affichées l'une sous l'autre plutôt que
 *  côte-à-côte (comme dans l'ancien modèle symétrique "carte i contre carte
 *  i") car les deux attaques n'ont plus forcément la même cible. */
export function RoundCard({
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
