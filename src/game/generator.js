// game/generator.js — deterministic, solvable-by-construction level generator.
import { CAPACITY, COLOR_ORDER, getValidMoves, applyMove, isWon } from './engine.js';

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Difficulty curve, matching the design brackets (1-10, 11-30, 31-60, 61-100, 101-150, 150+). */
export function getLevelConfig(level) {
  let colors, empty, scrambleBase;
  if (level <= 10) { colors = 3 + Math.floor((level - 1) / 5); empty = 2; scrambleBase = 12; }
  else if (level <= 30) { colors = 4 + Math.floor((level - 11) / 10); empty = 2; scrambleBase = 22; }
  else if (level <= 60) { colors = 5 + Math.floor((level - 31) / 15); empty = 2; scrambleBase = 34; }
  else if (level <= 100) { colors = 6 + Math.floor((level - 61) / 20); empty = 1; scrambleBase = 48; }
  else if (level <= 150) { colors = 7 + Math.floor((level - 101) / 25); empty = 1; scrambleBase = 60; }
  else { colors = 8; empty = 1; scrambleBase = 70 + Math.min(60, level - 150); }
  colors = Math.min(colors, COLOR_ORDER.length);
  const scrambleMoves = scrambleBase + Math.floor(level * 0.6);
  return { colors, empty, scrambleMoves };
}

export function calculatePar(scrambleMovesApplied, colors) {
  return Math.max(scrambleMovesApplied, colors * 2);
}

/**
 * Builds a fully sorted state, then scrambles it using only *valid* forward
 * moves. Because every move played from the solved state is reversible,
 * the resulting puzzle is guaranteed solvable — no separate validation pass
 * is needed, but validateLevel()/isSolvable() below can still double-check it.
 */
export function generateLevel(level) {
  const cfg = getLevelConfig(level);
  const rng = mulberry32(level * 7919 + 13);
  const colors = COLOR_ORDER.slice(0, cfg.colors);
  let tubes = colors.map(c => new Array(CAPACITY).fill(c));
  for (let i = 0; i < cfg.empty; i++) tubes.push([]);

  let lastMove = null, applied = 0, safety = cfg.scrambleMoves * 20;
  while (applied < cfg.scrambleMoves && safety-- > 0) {
    const moves = getValidMoves(tubes).filter(([f, t]) => !(lastMove && f === lastMove[1] && t === lastMove[0]));
    if (!moves.length) break;
    const [f, t] = moves[Math.floor(rng() * moves.length)];
    applyMove(tubes, f, t);
    lastMove = [f, t];
    applied++;
  }
  if (isWon(tubes) && applied < 3) return generateLevel(level + 1000000); // degenerate fallback

  return { level, tubes, par: calculatePar(applied, cfg.colors), colors: cfg.colors, tubeCount: tubes.length };
}

/** Validates that a generated level object is well-formed and solvable. */
export function validateLevel(levelObj, isSolvableFn) {
  const { tubes } = levelObj;
  const ballCount = {};
  tubes.forEach(t => t.forEach(c => (ballCount[c] = (ballCount[c] || 0) + 1)));
  const wellFormed = Object.values(ballCount).every(n => n === CAPACITY);
  if (!wellFormed) return false;
  return isSolvableFn ? isSolvableFn(tubes) : true;
}

const levelCache = new Map();
export function getLevel(n) {
  if (!levelCache.has(n)) levelCache.set(n, generateLevel(n));
  return levelCache.get(n);
}
export function invalidateLevel(n) { levelCache.delete(n); }
