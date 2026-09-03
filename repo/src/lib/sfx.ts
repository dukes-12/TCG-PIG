/**
 * Effets sonores — synthétisés par la Web Audio API, aucun fichier audio.
 *
 * Pourquoi synthétiser plutôt que livrer des .mp3 : rien à héberger, rien à
 * précharger, aucune licence à suivre, et le poids du bundle ne bouge pas.
 * Les sons sont courts et volontairement discrets ; la fanfare de tirage rare
 * est la seule à durer plus d'une demi-seconde.
 *
 * Deux règles imposées par les navigateurs :
 *   - un AudioContext ne démarre qu'après une interaction utilisateur, d'où
 *     `unlockSfx()` posé sur le premier `pointerdown` (voir plus bas, l'appel
 *     est auto-installé à l'import) ;
 *   - on crée UN seul contexte, jamais un par son.
 */

export type SfxName =
  | 'tear'      // le sachet qu'on déchire
  | 'flip'      // une carte qu'on retourne
  | 'common'    // révélation Commune → Rare
  | 'epic'      // révélation Épique
  | 'legendary' // révélation Légendaire
  | 'mythic'    // révélation Mythique
  | 'coin'      // achat
  | 'recycle';  // doublon recyclé

let ctx: AudioContext | null = null;
let enabled = true;
let master: GainNode | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    // Un compresseur en sortie tient lieu de limiteur : on peut donc pousser
    // le master sans craindre la saturation quand plusieurs voix se
    // superposent (la fanfare Mythique en empile six).
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.knee.value = 12;
    comp.ratio.value = 6;
    comp.attack.value = 0.004;
    comp.release.value = 0.15;
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(comp).connect(ctx.destination);
  }
  return ctx;
}

/** À appeler sur une interaction utilisateur — auto-installé plus bas. */
export function unlockSfx() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') void c.resume();
}

export function setSfxEnabled(on: boolean) {
  enabled = on;
  if (on) unlockSfx();
}

// ── briques ────────────────────────────────────────────────────

/** Une note : oscillateur + enveloppe attaque/chute. */
function tone(
  freq: number,
  start: number,
  dur: number,
  gain: number,
  type: OscillatorType = 'sine',
  glideTo?: number,
) {
  const c = ctx!;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, start + dur);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + Math.min(0.02, dur * 0.25));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(master!);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** Bruit blanc filtré — froissement, déchirure, souffle. */
function noise(start: number, dur: number, gain: number, from: number, to: number, q = 1) {
  const c = ctx!;
  const frames = Math.ceil(c.sampleRate * dur);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, start);
  filter.frequency.exponentialRampToValueAtTime(to, start + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + dur * 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(filter).connect(g).connect(master!);
  src.start(start);
  src.stop(start + dur + 0.02);
}

/** Un arpège — la base des révélations : plus la rareté monte, plus il est
 *  long, aigu et harmoniquement riche. */
function arpeggio(start: number, notes: number[], step: number, dur: number, gain: number, type: OscillatorType = 'triangle') {
  notes.forEach((f, i) => {
    tone(f, start + i * step, dur, gain, type);
    if (gain > 0.22) tone(f * 2, start + i * step, dur * 0.7, gain * 0.3, 'sine'); // octave, un peu de brillance
  });
}

// ── la palette ─────────────────────────────────────────────────

const RECIPES: Record<SfxName, (t: number) => void> = {
  // Papier qu'on arrache : bruit large qui descend, avec un petit à-coup.
  tear: (t) => {
    noise(t, 0.34, 0.55, 2600, 700, 0.7);
    noise(t + 0.05, 0.2, 0.34, 1400, 400, 1.2);
    tone(150, t + 0.02, 0.14, 0.2, 'sawtooth', 70);
  },

  // Carte qu'on retourne : souffle très court + clic mat.
  flip: (t) => {
    noise(t, 0.12, 0.3, 1800, 5200, 1.4);
    tone(320, t, 0.06, 0.16, 'square', 180);
  },

  // Commune → Rare : deux notes, discret, ne doit pas fatiguer.
  common: (t) => arpeggio(t, [523.25, 659.25], 0.07, 0.16, 0.2),

  // Épique : quatre notes montantes, timbre plus corsé.
  epic: (t) => {
    arpeggio(t, [440, 554.37, 659.25, 880], 0.075, 0.28, 0.26);
    noise(t, 0.3, 0.16, 3000, 900, 0.8);
  },

  // Légendaire : accord majeur complet + traîne brillante.
  legendary: (t) => {
    arpeggio(t, [523.25, 659.25, 783.99, 1046.5], 0.085, 0.42, 0.3);
    tone(1567.98, t + 0.34, 0.7, 0.18, 'sine');
    noise(t, 0.5, 0.18, 4000, 1200, 0.9);
  },

  // Mythique : la seule vraie fanfare — cloche grave, montée large, nappe.
  mythic: (t) => {
    tone(130.81, t, 1.4, 0.32, 'sine');
    arpeggio(t + 0.06, [392, 523.25, 659.25, 783.99, 1046.5], 0.095, 0.55, 0.32, 'triangle');
    tone(1975.53, t + 0.55, 1.1, 0.2, 'sine');
    tone(2637.02, t + 0.62, 0.9, 0.13, 'sine');
    noise(t + 0.04, 0.9, 0.2, 5200, 1400, 0.7);
  },

  // Achat : deux pièces qui s'entrechoquent.
  coin: (t) => {
    tone(1046.5, t, 0.1, 0.22, 'square');
    tone(1396.91, t + 0.055, 0.14, 0.19, 'square');
  },

  // Recyclage : petite cascade descendante.
  recycle: (t) => arpeggio(t, [880, 698.46, 587.33], 0.055, 0.14, 0.2, 'sine'),
};

/** Rareté (1-6) → son de révélation. */
export function revealSfx(rarity: number): SfxName {
  if (rarity >= 6) return 'mythic';
  if (rarity === 5) return 'legendary';
  if (rarity === 4) return 'epic';
  return 'common';
}

export function playSfx(name: SfxName) {
  if (!enabled) return;
  const c = ensureCtx();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  // +10 ms : laisse le temps au graphe d'être prêt, évite les clics.
  RECIPES[name](c.currentTime + 0.01);
}

if (typeof window !== 'undefined') {
  // Pas de `once` : selon le navigateur, le tout premier geste peut arriver
  // avant que le contexte existe, ou le contexte peut être re-suspendu
  // (onglet en arrière-plan, changement de sortie audio). On retente donc à
  // chaque geste tant qu'il n'est pas en `running` — no-op une fois débloqué.
  const onGesture = () => {
    unlockSfx();
    if (ctx && ctx.state === 'running') {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
    }
  };
  window.addEventListener('pointerdown', onGesture, { passive: true });
  window.addEventListener('keydown', onGesture);
}
