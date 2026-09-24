# Wood Sort Master

A relaxing, original color-sorting puzzle game (Vite + vanilla JS ES modules — no framework, no build-heavy dependencies).

## 1. Install
```bash
npm install
```

## 2. Development
```bash
npm run dev
```
Opens a local dev server with hot reload.

## 3. Production build
```bash
npm run build
npm run preview   # serve the dist/ build locally to sanity-check it
```
Output goes to `dist/` — a fully static bundle (`base: './'` in `vite.config.js`), so it can be dropped into any static host or game portal without a server.

## 4. Architecture
```
src/
  main.js                 UI layer: DOM wiring, screens, modals, render loop
  style.css                theme (CSS variables), responsive layout
  game/
    engine.js              pure rules: move validation, pouring, win check
    solver.js               capped BFS solver (solvePuzzle / isSolvable)
    generator.js            deterministic, solvable-by-construction levels
    player.js                PlayerProgress state + persistence
  services/
    storage.js               safe localStorage wrapper (get/set/remove/reset)
    audio.js                  Web Audio API tones + vibration (no sound files)
    analytics.js              console adapter for game events
  adapters/
    gamePortalAdapter.js      no-op unless window.GamePortal exists
    ads.js                    rewarded/interstitial ad wrapper, honest failure
  i18n/
    translations.js           en / hi / gu strings + applyLanguage()
```
Game logic (`game/`) has no DOM access, so it's testable and portable to a different UI layer later.

## 5. Level generation
Each level is generated deterministically from its number (`game/generator.js`): a fully sorted state is built, then scrambled using only *valid* forward moves. Because those moves are reversible, every generated level is solvable by construction — there's no separate "reject and retry" validation pass needed, though `isSolvable()` in `game/solver.js` can double-check any level on demand (used by the debug panel's "Solve current level" button). Difficulty (colors, tube count, scramble depth) scales by level number in five brackets (1–10 easy → 101–150+ hard), matching the original design brief.

## 6. SDK / game-portal integration
`adapters/gamePortalAdapter.js` calls into `window.GamePortal` if a host page injects it (e.g. embedding on a portal that provides that global) and is a safe no-op otherwise — the game runs standalone with no external SDK required. No specific third-party SDK is hard-coded.

## 7. Ads integration
`adapters/ads.js` exposes `showRewarded()` / `showInterstitial()`. If no `window.GamePortal` ad provider is present, it returns `{ success:false, reason:'provider_unavailable' }` — **it never fabricates a successful ad reward.** Wire a real network's SDK by having it set `window.GamePortal.showRewarded` before this script runs, or edit `ads.js` directly once you have real credentials.

GameHub Ad SDK support is included through `@gamehubsdk/gamehub-ad-sdk`. Configure the public client values in `.env`:
```
VITE_GAMEHUB_GAME_ID=your_public_game_id
VITE_GAMEHUB_API_BASE_URL=https://your-gamehub-api.example.com
VITE_GAMEHUB_PUBLIC_KEY=your_public_game_key
VITE_GAMEHUB_TEST_MODE=false
```
The SDK is initialized only when `VITE_GAMEHUB_GAME_ID` is present. Without it, the existing `window.GamePortal` adapter remains available. Never put private server secrets in `VITE_*` variables.

## 8. Analytics integration
`services/analytics.js` logs events to the console by default (`game_loaded`, `level_started`, `level_completed`, `undo_used`, `hint_used`, `booster_used`, `daily_reward_claimed`, `tutorial_started/completed`, `session_started/ended`, `rewarded_ad_completed/unavailable`). Replace the body of `emit()` with a real provider call when you have one. No personal information is collected.

## 9. Deployment
Static output (`dist/`) works on Vercel, Netlify, Cloudflare Pages, GitHub Pages, or any static host / HTML5 game portal. No server-side code is required.

## 10. Environment variables
Copy `.env.example` to `.env` and adjust:
```
VITE_GAME_NAME=Wood Sort Master
VITE_GAME_VERSION=1.0.0
VITE_ANALYTICS_ENABLED=true
VITE_ADS_ENABLED=true
```
Never put secret API keys in `VITE_*` variables — anything prefixed `VITE_` is bundled into client-side code and is publicly visible.

## 11. Debug mode
Append `?debug=1` to the URL to show a small on-screen panel with the current level state, a "Solve current level" button (runs the BFS solver), "Regenerate level", and "Reset progress". It never appears without that query param.

## 12. Troubleshooting
- **Blank page after `npm run build` + host**: check `vite.config.js` `base` matches your deploy path (`'./'` works for most static hosts).
- **No sound**: browsers block audio until a user gesture; the game unlocks audio/music on the first click, by design.
- **Progress not saving**: some browsers block `localStorage` in private/incognito mode — `services/storage.js` fails safely in that case rather than crashing, but nothing persists across reloads there.

## Scope notes
This is a Vite + vanilla-JS implementation, not a Next.js/TypeScript project — no automated test suite or additional language packs beyond en/hi/gu are included yet. The module boundaries above (`game/`, `services/`, `adapters/`) are deliberately kept clean so either could be added later without touching the others.
