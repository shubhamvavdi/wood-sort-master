// services/audio.js — Web Audio API tones only. No external/copyrighted sound files.
import { player } from '../game/player.js';

const TONES = {
  click: [520, .05], select: [660, .07], move: [440, .12], invalid: [180, .18],
  hint: [740, .15], booster: [880, .2], win: [988, .35], star: [1200, .12], button: [500, .05]
};

let ctx = null;
let musicNode = null;

function ensureCtx() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { console.warn('[audio] AudioContext unavailable', e); }
  }
  return ctx;
}

export const AudioManager = {
  play(name) {
    if (!player.settings.sound) return;
    const c = ensureCtx();
    if (!c) return;
    try {
      const [freq, dur] = TONES[name] || [500, .08];
      const o = c.createOscillator(), g = c.createGain();
      o.type = name === 'invalid' ? 'sawtooth' : 'sine';
      o.frequency.value = freq;
      o.connect(g); g.connect(c.destination);
      g.gain.setValueAtTime(.15, c.currentTime);
      g.gain.exponentialRampToValueAtTime(.001, c.currentTime + dur);
      o.start(); o.stop(c.currentTime + dur);
    } catch (e) { /* fail silently, never crash gameplay */ }
  },
  setMusic(on) {
    const c = ensureCtx();
    if (!c) return;
    if (on && player.settings.music && !musicNode) {
      try {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = 220; g.gain.value = .02;
        o.connect(g); g.connect(c.destination); o.start();
        musicNode = { o, g };
      } catch (e) { /* ignore */ }
    } else if (!on && musicNode) {
      try { musicNode.o.stop(); } catch (e) { /* ignore */ }
      musicNode = null;
    }
  }
};

export function vibrate(pattern) {
  if (player.settings.vibration && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch (e) { /* unsupported, ignore */ }
  }
}
