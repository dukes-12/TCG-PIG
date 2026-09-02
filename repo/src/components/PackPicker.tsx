import { PACKS } from '../data/catalog';
import { PACK_VISUALS } from '../data/packVisuals';
import { useStore } from '../state/store';
import type { PackKey } from '../types';

/** Lets you switch which pack the Ouvrir screen is showing without going
 *  back to the Boutique — one pill per pack in stock. Not part of the
 *  original design spec. */
export default function PackPicker() {
  const activePack = useStore((s) => s.activePack);
  const stock = useStore((s) => s.stock);
  const selectPackForOpening = useStore((s) => s.selectPackForOpening);

  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
      {PACKS.map((pk) => {
        const count = stock[pk.key as PackKey] || 0;
        const active = pk.key === activePack;
        const disabled = count <= 0;
        return (
          <button
            key={pk.key}
            className="pressable"
            disabled={disabled}
            onClick={() => selectPackForOpening(pk.key as PackKey)}
            style={{
              flex: 1,
              minWidth: 0,
              cursor: disabled ? 'not-allowed' : 'pointer',
              border: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
              padding: '9px 4px',
              borderRadius: 18,
              background: active ? 'var(--color-surface)' : 'transparent',
              boxShadow: active ? 'inset 0 0 0 2px var(--color-accent)' : 'inset 0 0 0 1px var(--color-divider)',
              opacity: disabled ? 0.4 : 1,
            }}
          >
            <i style={{ display: 'block', width: 22, height: 22, borderRadius: 8, background: PACK_VISUALS[pk.key as PackKey].bg }} />
            <span style={{ fontSize: 9, fontWeight: 700, textAlign: 'center', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
              {pk.name}
            </span>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 11, opacity: 0.6 }}>×{count}</span>
          </button>
        );
      })}
    </div>
  );
}
