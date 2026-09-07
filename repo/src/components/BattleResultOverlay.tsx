import { useCallback, useEffect, useRef, useState } from 'react';
import { BattleBoard, computeBoardInfo, HpBar } from './BattleBoard';
import BattleCardStats from './BattleCardStats';
import { RoundCard } from './BattleLog';
import type { Battle, TeamSlot } from '../lib/api';
import { useAnimations } from '../lib/useAnimations';
import { useBattleFullscreen } from '../lib/useBattleFullscreen';

/** Résultat d'un combat PvP déjà résolu côté serveur — révélé
 *  PROGRESSIVEMENT tour par tour (pas tout d'un coup) : le plateau et le
 *  journal se remplissent au fil d'un minuteur, plutôt qu'un score déjà là
 *  dès l'ouverture. Le résultat complet (`battle.result.rounds`) est
 *  toujours déjà calculé par le serveur (jamais recalculé côté client,
 *  voir functions/_lib/battle.ts) — cet overlay ne fait que le dérouler à
 *  son rythme, avec un bouton pour passer l'animation. Utilisé juste après
 *  avoir répondu à un défi et pour rouvrir un combat déjà terminé depuis
 *  l'historique (BattlesScreen) — même overlay dans les deux cas.
 *
 *  Le mode "Défier un bot" (ciblage choisi en direct, tour par tour) a son
 *  propre overlay, `LiveBattleOverlay` : PAS de résultat précalculé à
 *  révéler là-bas, les tours sont joués un par un en vrai. Voir BattleBoard
 *  .tsx / BattleLog.tsx pour les morceaux partagés entre les deux. */

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
  useBattleFullscreen();
  const result = battle.result;
  const rounds = result?.rounds ?? [];
  const [revealed, setRevealed] = useState(0);
  // Fiche d'une carte, ouverte en la touchant sur le plateau — comme en
  // combat contre un bot (LiveBattleOverlay). Ici c'est le seul rôle de la
  // touche : un combat PvP est déjà joué, il n'y a plus rien à décider.
  const [statsFor, setStatsFor] = useState<{ slot: TeamSlot; side: 'challenger' | 'opponent' } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  // Référence stable — `setStatsFor` l'est déjà (identité garantie par
  // React), donc `[]` suffit : voir LiveBattleOverlay pour pourquoi ça
  // compte (le memo de BoardSlot sur BattleBoard.tsx).
  const handleCardClick = useCallback((slot: TeamSlot, side: 'challenger' | 'opponent') => setStatsFor({ slot, side }), []);

  useEffect(() => {
    if (!result || revealed >= rounds.length) return;
    const id = setTimeout(() => setRevealed((n) => n + 1), roundDelayMs(rounds.length));
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, rounds.length]);

  // Volontairement PAS de défilement auto vers le bas du journal : le
  // plateau vit maintenant DANS cette même zone défilante, le pousser hors
  // de vue à chaque tour révélé serait absurde — c'est justement ce qu'on
  // regarde pendant la révélation. Le journal détaillé reste consultable
  // en défilant soi-même.

  if (!result || !battle.opponentTeam) return null;

  const iAmChallenger = battle.challengerUsername === myUsername;
  const finished = revealed >= rounds.length;
  const hpC = revealed > 0 ? rounds[revealed - 1].challengerHp : result.challengerMaxHp;
  const hpO = revealed > 0 ? rounds[revealed - 1].opponentHp : result.opponentMaxHp;
  const winner = finished ? result.winner : null;
  const iWon = winner !== null && (winner === 'challenger') === iAmChallenger;
  const tie = winner === 'tie';

  // Dérivé uniquement des tours déjà révélés, jamais du résultat complet à
  // l'avance : une carte-écran détruite au tour 7 reste debout sur le
  // plateau tant qu'on n'a pas révélé ce tour-là.
  const info = computeBoardInfo(rounds.slice(0, revealed));

  return (
    <div className="overlay overlay-battle" style={{ alignItems: 'stretch' }}>
      <div
        className="battle-fullscreen-panel"
        style={{
          // `relative` : la fiche d'une carte se pose en `absolute; inset: 0`
          // par-dessus CE modal, le combat restant visible derrière.
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          // Empêche un geste démarré ici (hors du journal défilant, par ex.
          // sur le plateau) de faire rebondir toute la page derrière.
          overscrollBehavior: 'contain',
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
            hitKey={info.opponentPvHitNow ? revealed : null}
            floatText={info.opponentPvHitNow && info.last ? String(info.last.challengerDamage) : null}
          />
          <div style={{ height: 8 }} />
          <HpBar
            label={battle.challengerUsername}
            hp={hpC}
            maxHp={result.challengerMaxHp}
            align="left"
            hitKey={info.challengerPvHitNow ? revealed : null}
            floatText={info.challengerPvHitNow && info.last ? String(info.last.opponentDamage) : null}
          />
        </div>

        {/* Plateau ET journal dans la MÊME zone défilante (`flex: 1 1 auto`
            + `minHeight: 0`, seule partie compressible) : tout le reste —
            en-tête, jauges de PV, pied de page — est en `flex: none`, donc
            incompressible. Le plateau agrandi fait à lui seul ~420px : le
            laisser incompressible lui aussi éjectait le pied de page hors
            du modal (`overflow: hidden`), donc hors d'atteinte, sur tout
            écran un peu court — le bouton tombait pile sur la barre de
            menu, d'où le bug remonté (vidéo). */}
        <div
          ref={logRef}
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            // Défensif iOS Safari : sans ça, un geste qui démarre sur cette
            // zone peut faire "rebondir" toute la page (l'overlay entier,
            // en `position: absolute`) au lieu de faire défiler CE
            // conteneur — `overscrollBehavior: contain` empêche le
            // défilement de se propager au parent une fois arrivé en haut/
            // bas, `WebkitOverflowScrolling: touch` force le défilement
            // avec inertie sur les anciens moteurs iOS qui, sans ça, ne
            // traitent parfois pas cette zone comme défilable au toucher.
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            padding: '0 0 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <BattleBoard
            opponentTeam={battle.opponentTeam}
            challengerTeam={battle.challengerTeam}
            opponentDestroyed={info.opponentDestroyed}
            challengerDestroyed={info.challengerDestroyed}
            opponentTargetInfo={info.opponentTargetInfo}
            challengerTargetInfo={info.challengerTargetInfo}
            activeOpponentAttackerId={info.last?.opponentAttackerId ?? null}
            activeChallengerAttackerId={info.last?.challengerAttackerId ?? null}
            roundLabel={info.last ? `Tour ${info.last.round + 1}` : 'En attente…'}
            animKey={revealed}
            onCardClick={handleCardClick}
          />

          <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
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

        {statsFor && (
          <BattleCardStats
            slot={statsFor.slot}
            ownerName={statsFor.side === 'challenger' ? battle.challengerUsername : battle.opponentUsername}
            // Pas de durabilité en PvP : le détail des points d'écran restants
            // n'est pas dans le résultat renvoyé par le serveur, et le
            // recalculer ici risquerait d'annoncer un chiffre en désaccord
            // avec le combat réellement joué. Le plateau montre déjà les
            // écrans brisés (grisés + 💥).
            durability={null}
            isDestroyed={(statsFor.side === 'challenger' ? info.challengerDestroyed : info.opponentDestroyed).has(statsFor.slot.cardId)}
            onClose={() => setStatsFor(null)}
          />
        )}
      </div>
    </div>
  );
}
