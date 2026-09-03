import { useAnimations } from '../lib/useAnimations';
import { useStore } from '../state/store';
import type { AnimationPref } from '../types';

const OPTIONS: { key: AnimationPref; label: string; note: string }[] = [
  { key: 'auto', label: 'Auto', note: 'suit le réglage système' },
  { key: 'on', label: 'Activées', note: 'foil, reflets et effets de tirage' },
  { key: 'off', label: 'Coupées', note: 'aucune animation décorative' },
];

/** Profil → Animations. Nécessaire parce que beaucoup d'environnements
 *  rapportent `prefers-reduced-motion: reduce` sans que le joueur l'ait
 *  demandé (Windows avec « Afficher les animations » décoché, VM, navigateur
 *  en Codespaces) : en `auto` le jeu paraît alors cassé — pas de foil, pas
 *  d'effet sur les tirages rares. */
export default function AnimationPicker() {
  const pref = useStore((s) => s.animPref);
  const setAnimPref = useStore((s) => s.setAnimPref);
  const active = useAnimations();

  return (
    <div className="screen-inner" style={{ paddingTop: 22 }}>
      <div className="section-label" style={{ marginBottom: 7 }}>Animations</div>
      <div className="chip-row">
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            className="pressable"
            onClick={() => setAnimPref(o.key)}
            style={{
              cursor: 'pointer',
              border: 0,
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: 11.5,
              padding: '6px 13px',
              borderRadius: 999,
              whiteSpace: 'nowrap',
              background: pref === o.key ? 'var(--color-accent)' : 'var(--color-neutral-200)',
              color: pref === o.key ? 'var(--color-bg)' : 'var(--color-text)',
              boxShadow: pref === o.key ? 'var(--shadow-sm)' : 'inset 0 0 0 1px var(--color-divider)',
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 11, opacity: 0.55, margin: '9px 0 0', textWrap: 'pretty' as const }}>
        {OPTIONS.find((o) => o.key === pref)?.note}
        {pref === 'auto' && !active ? ' — ton système demande moins de mouvement, les effets sont donc coupés.' : ''}
      </p>
    </div>
  );
}
