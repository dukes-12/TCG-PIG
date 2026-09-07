import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BattleBoard, computeBoardInfo, HpBar } from './BattleBoard';
import BattleCardStats from './BattleCardStats';
import { RoundCard } from './BattleLog';
import { cardById } from '../data/catalog';
import type { TeamSlot } from '../lib/api';
import { aliveDefenderIds, defenderDurability, hasActiveFired, initBattle, stepBattle, type BattleState } from '../lib/battle';
import { useAnimations } from '../lib/useAnimations';
import { useBattleFullscreen } from '../lib/useBattleFullscreen';

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
  useBattleFullscreen();
  const [battleState, setBattleState] = useState<BattleState>(() => initBattle(challengerTeam, opponentTeam));
  // Deux temps par tour : on touche SA carte en Attaque ("idle" → "targeting"),
  // puis la cible ("targeting" → le tour se joue). Toucher n'importe quelle
  // autre carte ouvre sa fiche de stats, à tout moment.
  const [phase, setPhase] = useState<'idle' | 'targeting'>('idle');
  const [statsFor, setStatsFor] = useState<{ slot: TeamSlot; side: 'challenger' | 'opponent' } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const finished = battleState.finished;
  const winner = battleState.winner;
  const iWon = winner === 'challenger';
  const tie = winner === 'tie';

  const nC = battleState.c.attackers.length || 1;
  const activeAttacker = !finished ? battleState.c.attackers[battleState.round % nC] : null;
  const activeAttackerCard = activeAttacker ? cardById(activeAttacker.cardId) : null;
  const aliveTargets = !finished ? aliveDefenderIds(battleState, 'challenger') : [];
  // Écran adverse entièrement brisé : il n'y a plus de carte à toucher, la
  // seule cible restante est la jauge de PV — c'est donc elle qui devient
  // touchable pendant le ciblage (sinon le joueur resterait coincé en phase
  // "targeting" sans rien de cliquable).
  const pvTargetable = !finished && phase === 'targeting' && aliveTargets.length === 0;

  // Rejoue CE tour sur la cible touchée (ou l'automatique si `target` est
  // absent) — mute battleState en place (stepBattle), puis force le re-rendu
  // avec un NOUVEL objet top-level (React ignore une mutation sur la même
  // référence).
  const playRound = (target?: number) => {
    if (!activeAttacker || finished) return;
    stepBattle(battleState, target !== undefined ? { [activeAttacker.cardId]: target } : undefined);
    setBattleState({ ...battleState });
    setPhase('idle');
    // Volontairement PAS de défilement auto vers le bas : le plateau est
    // maintenant DANS la zone défilante (voir plus bas), le pousser hors de
    // vue à chaque tour serait absurde — c'est justement ce qu'on regarde.
  };

  // Touche sur une carte du plateau. Le même geste sert à deux choses, d'où
  // l'ordre de priorité : ce qui fait AVANCER le combat d'abord (lancer
  // l'attaque, choisir la cible), la fiche de stats sinon.
  const handleCardClick = (slot: TeamSlot, side: 'challenger' | 'opponent') => {
    if (!finished && activeAttacker) {
      // Sa propre carte en Attaque du moment : lance (ou annule) le ciblage.
      if (side === 'challenger' && slot.cardId === activeAttacker.cardId) {
        setPhase((p) => (p === 'targeting' ? 'idle' : 'targeting'));
        return;
      }
      // Une cible valide pendant le ciblage : le tour se joue.
      if (phase === 'targeting' && side === 'opponent' && aliveTargets.includes(slot.cardId)) {
        playRound(slot.cardId);
        return;
      }
    }
    setStatsFor({ slot, side });
  };
  // `BoardSlot` (BattleBoard.tsx) est mémoïsé pour ne repeindre que les
  // cartes dont l'état a vraiment changé à chaque tour — sur un plateau de
  // 10 cartes, sans ça chaque clic redessinait tout, ce qui se sentait
  // mou. Mais `handleCardClick` ci-dessus se redéfinit à CHAQUE rendu (il
  // ferme sur `activeAttacker`/`phase`/`aliveTargets`), donc le passer tel
  // quel casserait ce memo pour les 10 cartes à la fois — l'indirection par
  // ref donne à `BattleBoard` une référence de fonction stable qui délègue
  // toujours à la dernière version, sans jamais changer d'identité.
  const handleCardClickRef = useRef(handleCardClick);
  handleCardClickRef.current = handleCardClick;
  const stableHandleCardClick = useCallback((slot: TeamSlot, side: 'challenger' | 'opponent') => handleCardClickRef.current(slot, side), []);

  // Termine le combat d'un coup (ciblage automatique pour tous les tours
  // restants) — pour le joueur qui ne veut pas choisir à chaque tour.
  const finishAuto = () => {
    let guard = 0;
    while (!battleState.finished && guard++ < 1000) stepBattle(battleState);
    setBattleState({ ...battleState });
    setPhase('idle');
  };

  // Le plateau vit DANS la zone défilante, avec le journal qui s'allonge en
  // dessous : au bout de quelques tours, un joueur descendu lire le journal a
  // le plateau — donc sa carte qui pulse, et les cibles — hors de l'écran, et
  // le combat a l'air bloqué. À chaque nouveau tour on le ramène en vue, mais
  // seulement s'il n'y est plus : sinon on volerait le défilement à chaque
  // coup pour rien. Mesuré en coordonnées écran (getBoundingClientRect) et
  // pas en offsetTop, la zone défilante n'étant pas `position: relative`.
  useEffect(() => {
    const log = logRef.current;
    const board = boardRef.current;
    if (!log || !board || battleState.finished) return;
    const lr = log.getBoundingClientRect();
    const br = board.getBoundingClientRect();
    const visible = br.bottom > lr.top + 60 && br.top < lr.bottom - 40;
    if (!visible) log.scrollTo({ top: Math.max(0, log.scrollTop + (br.top - lr.top) - 8), behavior: 'smooth' });
  }, [battleState.round, battleState.finished]);

  // Sans ce memo, ouvrir/fermer la fiche de stats ou juste passer en
  // ciblage (qui ne touchent aucun tour) recalculaient quand même
  // `computeBoardInfo` et fabriquaient de nouveaux Set/objets à chaque fois
  // — inutile, et ça défait un peu le memo de BoardSlot plus bas (chaque
  // objet `hit` redevient une référence neuve même quand rien n'a changé).
  // `.rounds` est la MÊME référence de tableau d'un rendu à l'autre (mutée
  // en place par stepBattle) : la lister comme dépendance ferait recalculer
  // à chaque rendu, exactement ce que ce memo évite. `.length` est le
  // signal qui compte réellement.
  const info = useMemo(
    () => computeBoardInfo(battleState.rounds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [battleState.rounds.length],
  );
  const animKey = battleState.rounds.length;
  const targetableIds = useMemo(
    () => (phase === 'targeting' ? new Set(aliveTargets) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, aliveTargets.join(',')],
  );
  const statsDestroyed = statsFor
    ? (statsFor.side === 'challenger' ? info.challengerDestroyed : info.opponentDestroyed).has(statsFor.slot.cardId)
    : false;

  return (
    <div className="overlay overlay-battle" style={{ alignItems: 'stretch' }}>
      <div
        className="battle-fullscreen-panel"
        style={{
          // `relative` : la fiche de stats d'une carte (BattleCardStats) se
          // pose en `absolute; inset: 0` par-dessus CE modal, pas par-dessus
          // toute la page — le combat reste visible en fond, on referme et on
          // continue son tour.
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          overscrollBehavior: 'contain',
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
            // Écran adverse percé : plus aucune carte à viser, c'est la
            // jauge elle-même qu'on touche pour porter le coup.
            targetable={pvTargetable}
            onClick={pvTargetable ? () => playRound() : undefined}
            combo={info.opponentCombo}
          />
          <div style={{ height: 8 }} />
          <HpBar
            label={challengerUsername}
            hp={battleState.hpC}
            maxHp={battleState.c.maxHp}
            align="left"
            hitKey={info.challengerPvHitNow ? animKey : null}
            floatText={info.challengerPvHitNow && info.last ? String(info.last.opponentDamage) : null}
            combo={info.challengerCombo}
          />
        </div>

        {/* Plateau ET journal dans la MÊME zone défilante : tout ce qui est
            au-dessus (en-tête, PV) et en dessous (pied de page) reste en
            `flex: none`, donc incompressible. Le plateau agrandi fait à lui
            seul ~420px : le laisser incompressible lui aussi éjectait le
            pied de page hors du modal (`overflow: hidden`), donc hors
            d'atteinte, sur tout écran un peu court — le bouton se retrouvait
            pile sur la barre de menu, d'où le bug remonté. */}
        <div
          ref={logRef}
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            padding: '0 0 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div ref={boardRef}>
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
            flourish={info.flourish}
            animKey={animKey}
            onCardClick={stableHandleCardClick}
            // Le halo reste allumé PENDANT le ciblage : c'est la même carte
            // qu'on retouche pour annuler (voir handleCardClick).
            playableAttackerId={!finished && activeAttacker ? activeAttacker.cardId : null}
            targetableIds={targetableIds}
          />
          </div>

          <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
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
              <>
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
                {info.mvpCardId !== null && (
                  <div style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 700, padding: '4px 4px 0', color: 'var(--color-accent-800)' }}>
                    🏆 MVP : {cardById(info.mvpCardId)?.name} — {info.mvpDamage} dégâts infligés
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Pied de page fixe, jamais tributaire du scroll (voir
            BattleResultOverlay pour le bug corrigé sur ce point). */}
        <div style={{ flex: 'none', padding: '8px 20px 18px' }}>
          {/* Consigne du moment — le combat se joue en touchant les cartes du
              plateau, plus via une liste de boutons ici. */}
          {!finished && activeAttackerCard && (
            <div style={{ marginBottom: 10, fontSize: 11.5, lineHeight: 1.35 }}>
              {phase === 'idle' ? (
                <span>
                  À toi de jouer — touche <strong>👆 {activeAttackerCard.name}</strong> sur le plateau pour attaquer.
                </span>
              ) : pvTargetable ? (
                <span>
                  <strong>Choisis ta cible :</strong> l'écran adverse est percé, touche la{' '}
                  <strong>jauge de PV 🎯</strong> de {opponentUsername}.
                </span>
              ) : (
                <span>
                  <strong>Choisis ta cible :</strong> touche une carte-écran adverse 🎯 (ou retouche{' '}
                  {activeAttackerCard.name} pour annuler).
                </span>
              )}
              <div style={{ opacity: 0.5, marginTop: 3, fontSize: 10.5 }}>Touche n'importe quelle autre carte pour voir ses stats.</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {!finished && (
              <>
                {phase === 'targeting' && (
                  <button
                    className="pressable"
                    onClick={() => setPhase('idle')}
                    style={{
                      flex: 1,
                      cursor: 'pointer',
                      border: 0,
                      fontFamily: 'var(--font-heading)',
                      fontSize: 13,
                      padding: '12px',
                      borderRadius: 999,
                      background: 'var(--color-neutral-200)',
                      color: 'var(--color-text)',
                    }}
                  >
                    Annuler le ciblage
                  </button>
                )}
                <button
                  className="pressable"
                  onClick={finishAuto}
                  title="Termine le combat d'un coup, ciblage automatique pour les tours restants"
                  style={{
                    flex: phase === 'targeting' ? 'none' : 1,
                    cursor: 'pointer',
                    border: 0,
                    fontFamily: 'var(--font-heading)',
                    fontSize: 13,
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

        {statsFor && (
          <BattleCardStats
            slot={statsFor.slot}
            ownerName={statsFor.side === 'challenger' ? challengerUsername : opponentUsername}
            durability={defenderDurability(battleState, statsFor.side, statsFor.slot.cardId)}
            isDestroyed={statsDestroyed}
            activeUsed={hasActiveFired(battleState, statsFor.side, statsFor.slot.cardId)}
            onClose={() => setStatsFor(null)}
          />
        )}
      </div>
    </div>
  );
}
