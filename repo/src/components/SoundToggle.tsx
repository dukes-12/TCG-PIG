import { useEffect } from 'react';
import { setSfxEnabled } from '../lib/sfx';
import { useStore } from '../state/store';

/** Profil → Son. Un simple interrupteur : les effets sont synthétisés
 *  (voir src/lib/sfx.ts), il n'y a donc rien à télécharger et aucun réglage
 *  de volume par son à exposer. */
export default function SoundToggle() {
  const soundOn = useStore((s) => s.soundOn);
  const setSoundOn = useStore((s) => s.setSoundOn);

  // Garde le module audio en phase avec l'état persisté, y compris au chargement.
  useEffect(() => {
    setSfxEnabled(soundOn);
  }, [soundOn]);

  return (
    <div className="screen-inner" style={{ paddingTop: 22 }}>
      <div className="section-label" style={{ marginBottom: 7 }}>Son</div>
      <button
        className="pressable"
        onClick={() => setSoundOn(!soundOn)}
        style={{
          cursor: 'pointer',
          border: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          textAlign: 'left',
          padding: '12px 14px',
          borderRadius: 26,
          background: 'var(--color-surface)',
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text)',
        }}
      >
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 15, display: 'block' }}>
            Effets sonores
          </span>
          <span style={{ fontSize: 11, opacity: 0.6 }}>
            {soundOn ? 'Déchirure, retournement, fanfares de rareté' : 'Coupés'}
          </span>
        </span>
        <span
          aria-hidden
          style={{
            flex: 'none',
            width: 46,
            height: 26,
            borderRadius: 999,
            padding: 3,
            boxSizing: 'border-box',
            background: soundOn ? 'var(--color-accent)' : 'var(--color-neutral-400)',
            transition: 'background .2s ease',
          }}
        >
          <span
            style={{
              display: 'block',
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'var(--color-bg)',
              transform: soundOn ? 'translateX(20px)' : 'translateX(0)',
              transition: 'transform .2s cubic-bezier(.3,.7,.2,1)',
              boxShadow: 'var(--shadow-sm)',
            }}
          />
        </span>
      </button>
    </div>
  );
}
