import { useRef, useState } from 'react';
import Chip from './Chip';
import { BattleBoard, computeBoardInfo, HpBar } from './BattleBoard';
import { RoundCard } from './BattleLog';
import { cardById } from '../data/catalog';
import type { TeamSlot } from '../lib/api';
import { aliveDefenderIds, initBattle, stepBattle, type BattleState } from '../lib/battle';
import { useAnimations } from '../lib/useAnimations';

/** Combat "Défier un bot" — ciblage choisi EN DIRECT, un tour à la fois
 *  (voir IDEES_AMIS_COMBAT.md, douzième passage), contrairement au PvP
 *  (BattleResultOverlay) qui révèle un résultat déjà entièrement calculé.
 *  Ici, rien n'est précalculé : chaque tour, on demande au joueur quelle
 *  carte-écran adverse son attaquant du moment doit viser (une seule carte
 *  agit par tour — les 2 attaquants cyclent, voir stepBattle), on joue CE
 *  tour via `stepBattle` (mute l'état en place), on affiche le résultat
 *  sur le plateau, et on recommence — jusqu'à la victoire ou la défaite.
 *  Réutilise le même plateau/journal que BattleResultOverlay (BattleBoard
 *  .tsx / BattleLog.tsx), seule la façon dont les tours arrivent change. */
export default function LiveBattleOverlay({
  challengerTeam,
  opponentTeam,
  challengerUsername,
  opponentUsername,
  onClose,
}: {
  challengerTeam: TeamSlot[];
  opponentTeam: TeamSlot[];
  challengerUsername: string;
  opponentUsername: string;
  onClose: () => void;
}) {
  const holoAnim = useAnimations();
  const [battleState, setBattleState] = useState<BattleState>(() => initBattle(challengerTeam, opponentTeam));
  const [selectedTarget, setSelectedTarget] = useState<number | undefined>(undefined);
  const logRef = useRef<HTMLDivElement>(null);

  const finished = battleState.finished;
  const winner = battleState.winner;
  const iWon = winner === 'challenger';
  const tie = winner === 'tie';

  const nC = battleState.c.attackers.length || 1;
  const activeAttacker = !finished ? battleState.c.attackers[battleState.round % nC] : null;
  const activeAttackerCard = activeAttacker ? cardById(activeAttacker.cardId) : null;
  const aliveTargets = !finished ? aliveDefenderIds(battleState, 'challenger') : [];

  // Rejoue CE tour avec la cible choisie (ou l'automatique si aucune) —
  // mute battleState en place (stepBattle), puis force le re-rendu avec un
  // NOUVEL objet top-level (React ignore une mutation sur la même
  // référence). Défile jusqu'au dernier tour ajouté juste après.
  const playRound = () => {
    if (!activeAttacker || finished) return;
    stepBattle(battleState, selectedTarget !== undefined ? { [activeAttacker.cardId]: selectedTarget } : undefined);
    setBattleState({ ...battleState });
    setSelectedTarget(undefined);
    requestAnimationFrame(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }));
  };

  // Termine le combat d'un coup (ciblage automatique pour tous les tours
  // restants) — pour le joueur qui ne veut pas choisir à chaque tour.
  const finishAuto = () => {
    let guard = 0;
    while (!battleState.finished && guard++ < 1000) stepBattle(battleState);
    setBattleState({ ...battleState });
    setSelectedTarget(undefined);
  };

  const info = computeBoardInfo(battleState.rounds);
  const animKey = battleState.rounds.length;

  return (
    <div className="overlay" onClick={finished ? onClose : undefined} style={{ alignItems: 'stretch' }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          margin: 'auto 0',
          maxHeight: '85dvh',
          background: 'var(--color-bg)',
          borderRadius: 28,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          overscrollBehavior: 'contain',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ padding: '20px 20px 8px', flex: 'none', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, color: !finished ? 'var(--color-text)' : tie ? 'var(--color-text)' : iWon ? 'var(--color-accent-800)' : 'var(--color-neutral-600)' }}>
            {!finished ? 'Combat en direct…' : tie ? 'Égalité' : iWon ? 'Victoire ! 🐷' : 'Défaite'}
          </div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
            {challengerUsername} vs {opponentUsername}
          </div>
        </div>

        <div style={{ padding: '10px 20px 0', flex: 'none' }}>
          <HpBar
            label={opponentUsername}
            hp={battleState.hpO}
            maxHp={battleState.o.maxHp}
            align="left"
            hitKey={info.opponentPvHitNow ? animKey : null}
            floatText={info.opponentPvHitNow && info.last ? String(info.last.challengerDamage) : null}
          />
          <div style={{ height: 8 }} />
          <HpBar
            label={challengerUsername}
            hp={battleState.hpC}
            maxHp={battleState.c.maxHp}
            align="left"
            hitKey={info.challengerPvHitNow ? animKey : null}
            floatText={info.challengerPvHitNow && info.last ? String(info.last.opponentDamage) : null}
          />
        </div>

        <BattleBoard
          opponentTeam={opponentTeam}
          challengerTeam={challengerTeam}
          opponentDestroyed={info.opponentDestroyed}
          challengerDestroyed={info.challengerDestroyed}
          opponentTargetInfo={info.opponentTargetInfo}
          challengerTargetInfo={info.challengerTargetInfo}
          activeOpponentAttackerId={info.last?.opponentAttackerId ?? null}
          activeChallengerAttackerId={info.last?.challengerAttackerId ?? null}
          roundLabel={!finished ? `Tour ${battleState.round + 1}` : `${battleState.rounds.length} tours joués`}
          animKey={animKey}
          holoAnim={holoAnim}
        />

        <div
          ref={logRef}
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            padding: '4px 20px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {battleState.rounds.map((r) => (
            <RoundCard
              key={r.round}
              round={r}
              challengerTeam={challengerTeam}
              opponentTeam={opponentTeam}
              challengerUsername={challengerUsername}
              opponentUsername={opponentUsername}
              holoAnim={holoAnim}
            />
          ))}

          {finished && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.6, padding: '6px 4px 0' }}>
              <span>
                PV max : {battleState.c.maxHp}
                {battleState.c.synergy > 0 && ` (+${Math.round(battleState.c.synergy * 100)}% synergie)`}
              </span>
              <span>
                {battleState.o.synergy > 0 && `(+${Math.round(battleState.o.synergy * 100)}% synergie) `}
                {battleState.o.maxHp}
              </span>
            </div>
          )}
        </div>

        {/* Pied de page fixe, jamais tributaire du scroll (voir
            BattleResultOverlay pour le bug corrigé sur ce point). */}
        <div style={{ flex: 'none', padding: '8px 20px 18px' }}>
          {!finished && activeAttackerCard && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                ⚔️ {activeAttackerCard.name} attaque — vise :
              </div>
              {aliveTargets.length === 0 ? (
                <p style={{ fontSize: 11, opacity: 0.6, margin: 0 }}>Écran adverse déjà détruit — les PV sont visées directement.</p>
              ) : (
                <div className="chip-row">
                  <Chip label="Automatique" active={selectedTarget === undefined} onClick={() => setSelectedTarget(undefined)} />
                  {aliveTargets.map((cardId) => {
                    const card = cardById(cardId);
                    if (!card) return null;
                    return <Chip key={cardId} label={card.name} active={selectedTarget === cardId} onClick={() => setSelectedTarget(cardId)} />;
                  })}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {!finished && (
              <>
                <button
                  className="pressable"
                  onClick={playRound}
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
                  Jouer ce tour ▶
                </button>
                <button
                  className="pressable"
                  onClick={finishAuto}
                  title="Termine le combat d'un coup, ciblage automatique pour les tours restants"
                  style={{
                    flex: 'none',
                    cursor: 'pointer',
                    border: 0,
                    fontFamily: 'var(--font-heading)',
                    fontSize: 12,
                    padding: '12px 14px',
                    borderRadius: 999,
                    background: 'var(--color-neutral-200)',
                    color: 'var(--color-text)',
                  }}
                >
                  Terminer auto
                </button>
              </>
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
    </div>
  );
}
