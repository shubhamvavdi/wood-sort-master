// game/engine.js — framework-independent core rules. No DOM access here.
export const CAPACITY = 4;
export const COLOR_ORDER = ['red','blue','green','yellow','purple','orange','cyan','pink','lime','brown'];
export const BALL_COLORS = {
  red:'#E85B5B', blue:'#5C8FE8', green:'#63B879', yellow:'#E8C85B', purple:'#9B6BE8',
  orange:'#E8954F', cyan:'#58C7C7', pink:'#E875A8', lime:'#9BD65B', brown:'#A9744F'
};

/** @typedef {string[]} Tube */
/** @typedef {{from:number, to:number}} Move */

export function cloneTubes(tubes) { return tubes.map(t => t.slice()); }

export function topColor(tube) { return tube.length ? tube[tube.length - 1] : null; }

export function isValidMove(tubes, from, to) {
  if (from === to) return false;
  const src = tubes[from], dst = tubes[to];
  if (!src.length) return false;
  if (dst.length >= CAPACITY) return false;
  if (dst.length === 0) return true;
  return topColor(dst) === topColor(src);
}

export function pourAmount(tubes, from, to) {
  const src = tubes[from], dst = tubes[to];
  const c = topColor(src);
  let n = 0;
  for (let i = src.length - 1; i >= 0 && src[i] === c; i--) n++;
  return Math.min(n, CAPACITY - dst.length);
}

export function applyMove(tubes, from, to) {
  const n = pourAmount(tubes, from, to);
  for (let i = 0; i < n; i++) tubes[to].push(tubes[from].pop());
  return n;
}

export function getValidMoves(tubes) {
  const moves = [];
  for (let i = 0; i < tubes.length; i++) {
    for (let j = 0; j < tubes.length; j++) {
      if (isValidMove(tubes, i, j)) moves.push([i, j]);
    }
  }
  return moves;
}

export function isWon(tubes) {
  return tubes.every(t => t.length === 0 || (t.length === CAPACITY && t.every(b => b === t[0])));
}

export function stateKey(tubes) { return tubes.map(t => t.join('')).join('|'); }
