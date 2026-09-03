import { useState } from 'react';
import Snout from '../components/Snout';
import { useStore } from '../state/store';

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 15,
  padding: '13px 16px',
  borderRadius: 16,
  border: 0,
  background: 'var(--color-neutral-100)',
  color: 'var(--color-text)',
  width: '100%',
  boxSizing: 'border-box',
};

/** Écran bloquant tant qu'aucune session n'est active — le jeu est
 *  désormais lié à un compte (pseudo + code à 4 chiffres) pour permettre la
 *  synchronisation entre appareils et les échanges avec les autres joueurs.
 *  À l'inscription, la collection déjà présente sur cet appareil (si elle
 *  existe) est envoyée au serveur comme point de départ du compte. */
export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const login = useStore((s) => s.login);
  const register = useStore((s) => s.register);

  const submit = async () => {
    setError(null);
    if (username.trim().length < 2) return setError('Pseudo trop court.');
    if (!/^\d{4}$/.test(pin)) return setError('Le code fait 4 chiffres.');
    setBusy(true);
    try {
      if (mode === 'login') await login(username.trim(), pin);
      else await register(username.trim(), pin);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 22,
        padding: '32px 24px',
        background: 'var(--color-bg)',
      }}
    >
      <Snout width={84} height={68} nostrilWidth={13} nostrilHeight={21} gap={13} bg="linear-gradient(160deg,#ffd2b4,#f6a06b)" boxShadow="var(--shadow-md)" />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 26 }}>Grouin</div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
          {mode === 'login' ? 'Retrouve ta collection' : 'Crée ton compte d’éleveur'}
        </div>
      </div>

      <div style={{ display: 'flex', width: '100%', maxWidth: 320, borderRadius: 999, background: 'var(--color-neutral-200)', padding: 3 }}>
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: 1,
              cursor: 'pointer',
              border: 0,
              padding: '9px 0',
              borderRadius: 999,
              fontFamily: 'var(--font-heading)',
              fontSize: 13,
              background: mode === m ? 'var(--color-bg)' : 'transparent',
              boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
              color: 'var(--color-text)',
            }}
          >
            {m === 'login' ? 'Se connecter' : 'Créer un compte'}
          </button>
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          style={inputStyle}
          placeholder="Pseudo"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          maxLength={20}
        />
        <input
          style={{ ...inputStyle, letterSpacing: '.4em', textAlign: 'center', fontFamily: 'var(--font-heading)' }}
          placeholder="0000"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          inputMode="numeric"
          maxLength={4}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
        {error && <div style={{ fontSize: 12, color: 'var(--color-accent-700)', textAlign: 'center' }}>{error}</div>}
        <button
          className="pressable"
          onClick={submit}
          disabled={busy}
          style={{
            cursor: busy ? 'default' : 'pointer',
            border: 0,
            marginTop: 6,
            fontFamily: 'var(--font-heading)',
            fontSize: 16,
            padding: '14px',
            borderRadius: 999,
            background: 'var(--color-accent)',
            color: 'var(--color-bg)',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? '…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
        </button>
        {mode === 'register' && (
          <p style={{ fontSize: 11, opacity: 0.55, textAlign: 'center', margin: 0, textWrap: 'pretty' as const }}>
            Ta collection sur cet appareil (si tu en as déjà une) sera reprise dans ton nouveau compte.
          </p>
        )}
      </div>
    </div>
  );
}
