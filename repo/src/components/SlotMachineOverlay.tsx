import { useEffect, useState } from 'react';
import { cardById } from '../data/catalog';
import { RARITY_VISUALS } from '../data/rarityVisuals';
import { useAnimations } from '../lib/useAnimations';
import { SLOT_BETS, SLOT_SYMBOLS, type SlotSymbol } from '../lib/slot';
import { useStore } from '../state/store';
import PigCard from './PigCard';

/** Machine à sous plein écran — remplace l'ancienne Loterie. 3 rouleaux
 *  s'arrêtent l'un après l'autre (gauche à droite, comme une vraie machine)
 *  sur la vraie réponse déjà tirée côté store (`slotResult`, posé dès le
 *  lancement — voir spinSlot) : chaque <Reel> défile au hasard puis se cale
 *  sur le bon symbole à son heure, purement pour le suspense visuel. */

// Délai d'arrêt de chaque rouleau — doit rester sous SLOT_SPIN_MS (1900ms
// dans store.ts) pour que les 3 soient déjà calés quand le store bascule
// en 'result'.
const STOP_DELAYS = [1000, 1400, 1800];
const CYCLE_MS = 80;

export default function SlotMachineOverlay() {
  const slotState = useStore((s) => s.slotState);
  const slotBet = useStore((s) => s.slotBet);
  const slotResult = useStore((s) => s.slotResult);
  const glands = useStore((s) => s.glands);
  const setSlotBet = useStore((s) => s.setSlotBet);
  const spinSlot = useStore((s) => s.spinSlot);
  const closeSlot = useStore((s) => s.closeSlot);
  const holoAnim = useAnimations();

  if (slotState === 'closed') return null;

  const spinning = slotState === 'spinning';
  const finished = slotState === 'result';
  const affordable = glands >= slotBet;
  const win = finished && !!slotResult?.win;

  return (
    <div className="overlay" onClick={!spinning ? closeSlot : undefined} style={{ flexDirection: 'column' }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '28px 24px',
          borderRadius: 30,
          background: 'linear-gradient(170deg,#3a2410,#1c1108)',
          boxShadow: 'var(--shadow-lg)',
          maxWidth: 360,
          width: '100%',
        }}
      >
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, color: '#ffe9b0' }}>🎰 Machine à sous</div>
        <div style={{ fontSize: 11.5, color: 'rgba(255,233,176,.6)', marginTop: 2 }}>{glands} glands</div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            marginTop: 20,
            padding: 14,
            borderRadius: 20,
            background: 'rgba(0,0,0,.35)',
            boxShadow: 'inset 0 0 0 2px #c99a3a',
          }}
        >
          {[0, 1, 2].map((i) => (
            <Reel key={i} spinning={spinning} finalSymbol={slotResult?.reels[i] ?? null} stopDelayMs={STOP_DELAYS[i]} holoAnim={holoAnim} />
          ))}
        </div>

        <div style={{ minHeight: 46, marginTop: 16, textAlign: 'center' }}>
          {finished && win && (
            <div style={{ animation: 'pigPop .35s ease both' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 19, color: '#ffe9b0' }}>
                🎉 +{slotResult!.payout} glands
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,233,176,.7)', marginTop: 2 }}>
                3 × {RARITY_VISUALS[slotResult!.reels[0].rarity].short} — mise ×{slotResult!.reels[0].multiplier}
              </div>
            </div>
          )}
          {finished && !win && <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)' }}>Perdu — retente ta chance !</div>}
          {spinning && <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)' }}>Ça tourne…</div>}
          {slotState === 'ready' && <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>Choisis ta mise et tire le levier.</div>}
        </div>

        {!spinning && (
          <div style={{ display: 'flex', gap: 7, marginTop: 4 }}>
            {SLOT_BETS.map((bet) => (
              <button
                key={bet}
                className="pressable"
                onClick={() => setSlotBet(bet)}
                disabled={glands < bet}
                style={{
                  border: 0,
                  cursor: glands < bet ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-heading)',
                  fontSize: 12,
                  padding: '7px 12px',
                  borderRadius: 999,
                  background: bet === slotBet ? '#c99a3a' : 'rgba(255,255,255,.1)',
                  color: bet === slotBet ? '#2b1a02' : glands < bet ? 'rgba(255,255,255,.3)' : '#ffe9b0',
                }}
              >
                {bet}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20, width: '100%' }}>
          <button
            className="pressable"
            onClick={closeSlot}
            disabled={spinning}
            style={{
              flex: 1,
              cursor: spinning ? 'not-allowed' : 'pointer',
              border: 0,
              fontFamily: 'var(--font-heading)',
              fontSize: 13,
              padding: '12px',
              borderRadius: 999,
              background: 'rgba(255,255,255,.12)',
              color: '#ffe9b0',
              opacity: spinning ? 0.4 : 1,
            }}
          >
            Fermer
          </button>
          <button
            className="pressable"
            onClick={spinSlot}
            disabled={spinning || !affordable}
            style={{
              flex: 2,
              cursor: spinning || !affordable ? 'not-allowed' : 'pointer',
              border: 0,
              fontFamily: 'var(--font-heading)',
              fontSize: 14,
              padding: '12px',
              borderRadius: 999,
              background: spinning || !affordable ? 'var(--color-neutral-400)' : '#c99a3a',
              color: spinning || !affordable ? 'var(--color-neutral-600)' : '#2b1a02',
            }}
          >
            {finished ? `Rejouer (${slotBet})` : `Tirer (${slotBet})`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Reel({
  spinning,
  finalSymbol,
  stopDelayMs,
  holoAnim,
}: {
  spinning: boolean;
  finalSymbol: SlotSymbol | null;
  stopDelayMs: number;
  holoAnim: boolean;
}) {
  const [display, setDisplay] = useState<SlotSymbol>(finalSymbol ?? SLOT_SYMBOLS[0]);
  const [locked, setLocked] = useState(!spinning);

  useEffect(() => {
    if (!spinning) {
      setLocked(true);
      if (finalSymbol) setDisplay(finalSymbol);
      return;
    }
    setLocked(false);
    const interval = setInterval(() => {
      setDisplay(SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]);
    }, CYCLE_MS);
    const stopTimer = setTimeout(() => {
      clearInterval(interval);
      setLocked(true);
      if (finalSymbol) setDisplay(finalSymbol);
    }, stopDelayMs);
    return () => {
      clearInterval(interval);
      clearTimeout(stopTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, finalSymbol]);

  const card = cardById(display.cardId);
  if (!card) return null;

  return (
    <div
      style={{
        width: 68,
        aspectRatio: '0.72',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: locked ? `0 0 0 3px ${RARITY_VISUALS[display.rarity].ink}` : '0 0 0 2px rgba(255,255,255,.15)',
        transition: 'box-shadow .2s ease',
      }}
    >
      <div key={locked ? `${display.cardId}-locked` : undefined} style={{ width: '100%', height: '100%', animation: locked ? 'pigPop .3s ease both' : 'none' }}>
        <PigCard card={card} holoAnim={holoAnim} ownedCount={1} isHolo={false} />
      </div>
    </div>
  );
}
