// game/player.js — PlayerProgress state + persistence.
import { storage } from '../services/storage.js';

export function defaultPlayer() {
  return {
    currentLevel: 1,
    unlockedLevels: 1,
    stars: {},
    coins: 500,
    settings: { sound: true, music: false, vibration: true },
    daily: { lastClaim: null, day: 0 },
    tutorialCompleted: false,
    hintsUsedTotal: 0,
    language: 'en'
  };
}

export const player = Object.assign(defaultPlayer(), storage.get('player', {}));

export function savePlayer() { storage.set('player', player); }

export function resetPlayer() {
  storage.reset();
  Object.assign(player, defaultPlayer());
  savePlayer();
}
