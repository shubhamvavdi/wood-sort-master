// adapters/gamePortalAdapter.js — no SDK is hard-coded. If a portal injects
// window.GamePortal (e.g. Poki, CrazyGames, etc.) before this loads, we call
// into it; otherwise every method is a safe no-op so the game runs standalone.
function call(method, ...args) {
  if (window.GamePortal && typeof window.GamePortal[method] === 'function') {
    try { window.GamePortal[method](...args); } catch (e) { console.warn(`[GamePortalAdapter] ${method} failed`, e); }
  }
}

export const GamePortalAdapter = {
  initialize: () => call('initialize'),
  gameStart: () => call('gameStart'),
  gameplayStart: () => call('gameplayStart'),
  gameplayStop: () => call('gameplayStop'),
  levelComplete: (data) => call('levelComplete', data),
  gameOver: (data) => call('gameOver', data),
  showAd: () => call('showAd'),
  hideAd: () => call('hideAd')
};
