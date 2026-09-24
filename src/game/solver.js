// game/solver.js — capped BFS solver, used for level validation and hints.
import { cloneTubes, getValidMoves, applyMove, isWon, stateKey } from './engine.js';

/**
 * @param {import('./engine.js').Tube[]} tubes
 * @param {number} [cap] max states to explore before giving up
 * @returns {import('./engine.js').Move[] | null} move list, or null if not found within cap
 */
export function solvePuzzle(tubes, cap = 25000) {
  const start = cloneTubes(tubes);
  if (isWon(start)) return [];
  const visited = new Set([stateKey(start)]);
  let queue = [{ tubes: start, path: [] }];
  let explored = 0;

  while (queue.length && explored < cap) {
    const next = [];
    for (const node of queue) {
      explored++;
      for (const [f, t] of getValidMoves(node.tubes)) {
        const nt = cloneTubes(node.tubes);
        applyMove(nt, f, t);
        const key = stateKey(nt);
        if (visited.has(key)) continue;
        visited.add(key);
        const path = node.path.concat([{ from: f, to: t }]);
        if (isWon(nt)) return path;
        next.push({ tubes: nt, path });
      }
      if (explored >= cap) break;
    }
    queue = next;
    if (!queue.length) break;
  }
  return null;
}

/** Used by the level generator/tests to guarantee a level is solvable before shipping it. */
export function isSolvable(tubes, cap = 40000) {
  return solvePuzzle(tubes, cap) !== null;
}
