import { useEffect, useRef, useState } from 'react';
import PigCard from './PigCard';
import { cardById } from '../data/catalog';
import type { Battle, Camp, RoundEvent, Stance } from '../lib/api';
import { CAMP_INFO, STANCE_INFO } from '../lib/battle';
import { useAnimations } from '../lib/useAnimations';

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

  return (
    <div className="overlay" onClick={finished ? onClose : undefined} style={{ alignItems: 'stretch' }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          margin: 'auto 0',
          maxHeight: '85vh',
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
          <HpBar label={battle.challengerUsername} hp={hpC} maxHp={result.challengerMaxHp} align="left" />
          <div style={{ height: 8 }} />
          <HpBar label={battle.opponentUsername} hp={hpO} maxHp={result.opponentMaxHp} align="left" />
        </div>

        <div ref={logRef} style={{ overflowY: 'auto', padding: '14px 20px 20px', display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          {rounds.slice(0, revealed).map((r) => {
            const cCard = cardById(r.challengerCardId);
            const oCard = cardById(r.opponentCardId);
            if (!cCard || !oCard) return null;
            return (
              <RoundRow
                key={r.round}
                round={r}
                challengerCard={cCard}
                opponentCard={oCard}
                challengerHolo={battle.challengerTeam[r.slot]?.holo ?? false}
                opponentHolo={battle.opponentTeam![r.slot]?.holo ?? false}
                challengerStance={battle.challengerTeam[r.slot]?.stance ?? 'attaque'}
                opponentStance={battle.opponentTeam![r.slot]?.stance ?? 'attaque'}
                holoAnim={holoAnim}
              />
            );
          })}

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

          <div style={{ display: 'flex', gap: 8, marginTop: 8, position: 'sticky', bottom: 0, background: 'var(--color-bg)', paddingTop: 4 }}>
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
    </div>
  );
}

function HpBar({ label, hp, maxHp, align }: { label: string; hp: number; maxHp: number; align: 'left' | 'right' }) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
  const color = pct > 50 ? 'var(--color-accent-2)' : pct > 20 ? 'var(--color-accent)' : '#c0503f';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, opacity: 0.65, marginBottom: 3, textAlign: align }}>
        <span style={{ fontWeight: 700 }}>{label}</span>
        <span>
          {hp} / {maxHp} PV
        </span>
      </div>
      <div style={{ height: 9, borderRadius: 999, background: 'var(--color-neutral-200)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999, transition: 'width .3s ease, background .3s ease' }} />
      </div>
    </div>
  );
}

function RoundRow({
  round,
  challengerCard,
  opponentCard,
  challengerHolo,
  opponentHolo,
  challengerStance,
  opponentStance,
  holoAnim,
}: {
  round: RoundEvent;
  challengerCard: ReturnType<typeof cardById>;
  opponentCard: ReturnType<typeof cardById>;
  challengerHolo: boolean;
  opponentHolo: boolean;
  challengerStance: Stance;
  opponentStance: Stance;
  holoAnim: boolean;
}) {
  if (!challengerCard || !opponentCard) return null;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 16,
        background: 'var(--color-surface)',
        animation: 'pigRise .25s ease both',
      }}
    >
      <RoundSide
        card={challengerCard}
        holo={challengerHolo}
        stance={challengerStance}
        atk={round.challengerAtk}
        def={round.challengerDef}
        damage={round.challengerDamage}
        camp={round.challengerCamp}
        campAdvantage={round.challengerCampAdvantage}
        momentum={round.challengerMomentum}
        holoAnim={holoAnim}
        align="left"
      />
      <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.4 }}>T{round.round + 1}</span>
      <RoundSide
        card={opponentCard}
        holo={opponentHolo}
        stance={opponentStance}
        atk={round.opponentAtk}
        def={round.opponentDef}
        damage={round.opponentDamage}
        camp={round.opponentCamp}
        campAdvantage={round.opponentCampAdvantage}
        momentum={round.opponentMomentum}
        holoAnim={holoAnim}
        align="right"
      />
    </div>
  );
}

function RoundSide({
  card,
  holo,
  stance,
  atk,
  def,
  damage,
  camp,
  campAdvantage,
  momentum,
  holoAnim,
  align,
}: {
  card: ReturnType<typeof cardById>;
  holo: boolean;
  stance: Stance;
  atk: number;
  def: number;
  damage: number;
  camp: Camp | null;
  campAdvantage: boolean;
  momentum: boolean;
  holoAnim: boolean;
  align: 'left' | 'right';
}) {
  if (!card) return null;
  const campInfo = camp ? CAMP_INFO[camp] : null;
  const stanceInfo = STANCE_INFO[stance];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
      <div style={{ width: 32, aspectRatio: '0.72', flex: 'none', borderRadius: 8, position: 'relative' }}>
        <PigCard card={card} holoAnim={holoAnim} ownedCount={1} isHolo={holo} />
        {campAdvantage && (
          <span title="Avantage de camp" style={{ position: 'absolute', top: -4, [align === 'right' ? 'left' : 'right']: -4, fontSize: 11 }}>
            💫
          </span>
        )}
      </div>
      <div style={{ minWidth: 0, textAlign: align }}>
        <div style={{ fontSize: 10, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
        <div style={{ fontSize: 9.5, opacity: 0.55, display: 'flex', alignItems: 'center', gap: 4, justifyContent: align === 'right' ? 'flex-end' : 'flex-start', flexWrap: 'wrap' }}>
          {campInfo && <span title={campInfo.label}>{campInfo.icon}</span>}
          <span title={`Posture : ${stanceInfo.label}`}>{stanceInfo.icon}</span>
          <span title="Attaque">⚔️{atk}</span>
          <span title="Défense">🛡️{def}</span>
          {momentum && <span title="Lancée : bonus d'attaque">🔥</span>}
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-accent-800)' }}>-{damage} PV</div>
      </div>
    </div>
  );
}
