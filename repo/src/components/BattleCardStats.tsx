import PigCard from './PigCard';
import { cardById, rarityById } from '../data/catalog';
import type { TeamSlot } from '../lib/api';
import { CAMP_BEATS, CAMP_INFO, DEFENDER_DURABILITY_MULT, STANCE_INFO, campOf, cardStats, cardStatsWithStance } from '../lib/battle';

/** Fiche d'une carte pendant un combat, ouverte en touchant la carte sur le
 *  plateau. Volontairement différente de `CardDetailOverlay` (la fiche de
 *  collection, qui parle d'exemplaires possédés) : ici seul compte ce qui
 *  sert AU COMBAT — ATTAQUE et DÉFENSE telles qu'ajustées par la posture,
 *  camp, et pour une carte-écran sa durabilité restante. */
export default function BattleCardStats({
  slot,
  ownerName,
  durability,
  isDestroyed,
  onClose,
}: {
  slot: TeamSlot;
  ownerName: string;
  /** Durabilité restante/max — seulement pour une carte en Défense, voir
   *  `defenderDurability` (lib/battle.ts). */
  durability: { current: number; max: number } | null;
  isDestroyed: boolean;
  onClose: () => void;
}) {
  const card = cardById(slot.cardId);
  if (!card) return null;
  const rarity = rarityById(card.rarity);
  const camp = campOf(slot.cardId);
  const stanceInfo = STANCE_INFO[slot.stance];
  const base = cardStats(slot.cardId, slot.holo);
  const withStance = cardStatsWithStance(slot.cardId, slot.holo, slot.stance);
  const durabilityPct = durability && durability.max > 0 ? Math.max(0, Math.min(100, (durability.current / durability.max) * 100)) : 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        background: 'rgba(32, 30, 29, .55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-bg)',
          borderRadius: 22,
          boxShadow: 'var(--shadow-lg)',
          padding: 16,
          width: '100%',
          maxWidth: 300,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 74, aspectRatio: '0.72', flex: 'none', position: 'relative', opacity: isDestroyed ? 0.45 : 1, filter: isDestroyed ? 'grayscale(1)' : 'none' }}>
            <PigCard card={card} holoAnim={false} ownedCount={1} isHolo={slot.holo} />
          </div>
          <div style={{ minWidth: 0, flex: '1 1 auto' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15, lineHeight: 1.15 }}>{card.name}</div>
            <div style={{ fontSize: 10.5, opacity: 0.6, marginTop: 3 }}>
              {rarity?.name ?? '—'}
              {slot.holo && ' · ✨ Holo'}
            </div>
            <div style={{ fontSize: 10.5, opacity: 0.6, marginTop: 2 }}>{card.type}</div>
            <div style={{ fontSize: 11, marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span title={`Posture : ${stanceInfo.label}`}>
                {stanceInfo.icon} {stanceInfo.label}
              </span>
              {camp && (
                // « ✊ Fiction bat ✌️ » : le camp ne sert qu'à une chose en
                // combat (+50% d'ATTAQUE contre le camp qu'il domine), autant
                // afficher directement lequel plutôt que le seul nom.
                <span title={`Camp : ${CAMP_INFO[camp].label} (${CAMP_INFO[camp].rps}) — bat ${CAMP_INFO[CAMP_BEATS[camp]].label} (${CAMP_INFO[CAMP_BEATS[camp]].rps})`}>
                  {CAMP_INFO[camp].icon} {CAMP_INFO[camp].label} <span style={{ opacity: 0.55 }}>bat {CAMP_INFO[CAMP_BEATS[camp]].icon}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <StatBox
            label="Attaque"
            icon="⚔️"
            value={withStance?.atk ?? 0}
            base={base?.atk ?? 0}
            tint="var(--color-accent-200)"
            ink="var(--color-accent-800)"
          />
          <StatBox
            label="Défense"
            icon="🛡️"
            value={withStance?.def ?? 0}
            base={base?.def ?? 0}
            tint="var(--color-accent-2-200)"
            ink="var(--color-accent-2-800)"
          />
        </div>

        {durability && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, opacity: 0.65, marginBottom: 3 }}>
              <span style={{ fontWeight: 700 }}>{isDestroyed ? '💥 Carte-écran brisée' : 'Durabilité de l\'écran'}</span>
              <span>
                {fmtDurability(Math.max(0, durability.current), durability.max)} / {fmtDurability(durability.max, durability.max)}
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'var(--color-neutral-200)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${durabilityPct}%`,
                  borderRadius: 999,
                  background: durabilityPct > 50 ? 'var(--color-accent-2)' : durabilityPct > 20 ? 'var(--color-accent)' : '#c0503f',
                  transition: 'width .3s ease',
                }}
              />
            </div>
            {/* Le calcul, écrit noir sur blanc : sinon « 9,5 » sort de nulle
                part et on ne voit pas qu'améliorer la DÉFENSE (ou passer la
                carte en posture Défense) épaissit directement l'écran. */}
            <div style={{ fontSize: 9.5, opacity: 0.5, marginTop: 4 }}>
              = DÉFENSE {withStance?.def ?? 0} × {String(DEFENDER_DURABILITY_MULT).replace('.', ',')} · chaque coup encaissé la fait baisser, à 0 l'écran se brise
            </div>
          </div>
        )}

        <div style={{ fontSize: 10, opacity: 0.45 }}>Équipe de {ownerName}</div>

        <button
          className="pressable"
          onClick={onClose}
          style={{
            cursor: 'pointer',
            border: 0,
            fontFamily: 'var(--font-heading)',
            fontSize: 13,
            padding: '10px',
            borderRadius: 999,
            background: 'var(--color-neutral-200)',
            color: 'var(--color-text)',
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

/** La durabilité d'un écran vaut DEF × 0.5 (voir DEFENDER_DURABILITY_MULT) :
 *  sur une carte commune elle tombe sous 1, et tout arrondir à l'entier
 *  affichait « 1 / 1 » pour un écran qui vaut en réalité un demi-point et
 *  cède au premier coup. Une décimale sous 10, entier au-delà. */
function fmtDurability(v: number, max: number): string {
  return max < 10 ? String(Math.round(v * 10) / 10) : String(Math.round(v));
}

/** Une stat, avec la valeur DE COMBAT (posture appliquée) en grand et la
 *  valeur de base en dessous quand la posture la modifie — sinon on ne sait
 *  pas d'où sort le chiffre affiché sur le plateau. */
function StatBox({ label, icon, value, base, tint, ink }: { label: string; icon: string; value: number; base: number; tint: string; ink: string }) {
  const delta = value - base;
  return (
    <div style={{ flex: 1, background: tint, borderRadius: 14, padding: '8px 10px' }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, opacity: 0.7, color: ink, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, color: ink, lineHeight: 1.1 }}>
        {icon} {value}
      </div>
      {delta !== 0 && (
        <div style={{ fontSize: 9.5, opacity: 0.65, color: ink }}>
          base {base} · {delta > 0 ? '+' : ''}
          {delta} posture
        </div>
      )}
    </div>
  );
}
