import PigCard from './PigCard';
import { cardById } from '../data/catalog';
import type { Battle, Camp } from '../lib/api';
import { CAMP_INFO } from '../lib/battle';
import { useAnimations } from '../lib/useAnimations';

/** Résultat d'un combat résolu — les deux équipes, duel par duel, et le
 *  vainqueur final. Utilisé juste après avoir répondu à un défi (résultat
 *  tout frais) et pour rouvrir un combat déjà terminé depuis l'historique
 *  (BattlesScreen) — même overlay dans les deux cas, `battle.result` est
 *  toujours déjà là (jamais recalculé côté client, voir functions/_lib/
 *  battle.ts). */
export default function BattleResultOverlay({ battle, myUsername, onClose }: { battle: Battle; myUsername: string; onClose: () => void }) {
  const holoAnim = useAnimations();
  const result = battle.result;
  if (!result || !battle.opponentTeam) return null;

  const iAmChallenger = battle.challengerUsername === myUsername;
  const iWon = (result.winner === 'challenger') === iAmChallenger;
  const tie = result.winner === 'tie';

  return (
    <div className="overlay" onClick={onClose} style={{ alignItems: 'stretch' }}>
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
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, color: tie ? 'var(--color-text)' : iWon ? 'var(--color-accent-800)' : 'var(--color-neutral-600)' }}>
            {tie ? 'Égalité' : iWon ? 'Victoire ! 🐷' : 'Défaite'}
          </div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
            {battle.challengerUsername} {result.challengerRoundsWon} – {result.opponentRoundsWon} {battle.opponentUsername}
          </div>
        </div>

        <div style={{ overflowY: 'auto', padding: '10px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {result.duels.map((d) => {
            const cCard = cardById(d.challengerCardId);
            const oCard = cardById(d.opponentCardId);
            if (!cCard || !oCard) return null;
            const cTeam = battle.challengerTeam[d.slot];
            const oTeam = battle.opponentTeam![d.slot];
            return (
              <div
                key={d.slot}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 18,
                  background: 'var(--color-surface)',
                }}
              >
                <DuelSide
                  card={cCard}
                  holo={cTeam?.holo ?? false}
                  power={d.challengerPower}
                  won={d.winner === 'challenger'}
                  camp={d.challengerCamp}
                  campAdvantage={d.challengerCampAdvantage}
                  momentum={d.challengerMomentum}
                  holoAnim={holoAnim}
                  align="left"
                />
                <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.4 }}>VS</span>
                <DuelSide
                  card={oCard}
                  holo={oTeam?.holo ?? false}
                  power={d.opponentPower}
                  won={d.winner === 'opponent'}
                  camp={d.opponentCamp}
                  campAdvantage={d.opponentCampAdvantage}
                  momentum={d.opponentMomentum}
                  holoAnim={holoAnim}
                  align="right"
                />
              </div>
            );
          })}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.6, padding: '4px 4px 0' }}>
            <span>
              Puissance totale : {result.challengerTotalPower}
              {result.challengerSynergyBonus > 0 && ` (+${Math.round(result.challengerSynergyBonus * 100)}% synergie)`}
            </span>
            <span>
              {result.opponentSynergyBonus > 0 && `(+${Math.round(result.opponentSynergyBonus * 100)}% synergie) `}
              {result.opponentTotalPower}
            </span>
          </div>

          <button
            className="pressable"
            onClick={onClose}
            style={{
              marginTop: 8,
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
        </div>
      </div>
    </div>
  );
}

function DuelSide({
  card,
  holo,
  power,
  won,
  camp,
  campAdvantage,
  momentum,
  holoAnim,
  align,
}: {
  card: ReturnType<typeof cardById>;
  holo: boolean;
  power: number;
  won: boolean;
  camp: Camp | null;
  campAdvantage: boolean;
  momentum: boolean;
  holoAnim: boolean;
  align: 'left' | 'right';
}) {
  if (!card) return null;
  const campInfo = camp ? CAMP_INFO[camp] : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
      <div
        style={{
          width: 40,
          aspectRatio: '0.72',
          flex: 'none',
          borderRadius: 10,
          boxShadow: won ? '0 0 0 2px var(--color-accent)' : 'none',
          position: 'relative',
        }}
      >
        <PigCard card={card} holoAnim={holoAnim} ownedCount={1} isHolo={holo} />
        {campAdvantage && (
          <span
            title="Avantage de camp"
            style={{ position: 'absolute', top: -4, [align === 'right' ? 'left' : 'right']: -4, fontSize: 13 }}
          >
            ⚔️
          </span>
        )}
      </div>
      <div style={{ minWidth: 0, textAlign: align }}>
        <div style={{ fontSize: 11, fontWeight: won ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
        <div style={{ fontSize: 10, opacity: 0.55, display: 'flex', alignItems: 'center', gap: 4, justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
          {campInfo && <span title={campInfo.label}>{campInfo.icon}</span>}
          <span>{power} pts</span>
          {momentum && <span title="Lancée : bonus de puissance">🔥</span>}
        </div>
      </div>
    </div>
  );
}
