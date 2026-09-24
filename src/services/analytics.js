// services/analytics.js — console adapter by default. Swap the `emit` function
// for a real provider later; never include personal information in event payloads.
const ENABLED = import.meta.env.VITE_ANALYTICS_ENABLED !== 'false';

function emit(event, data) {
  if (!ENABLED) return;
  try { console.log('[analytics]', event, data || {}); } catch (e) { /* ignore */ }
}

export const analytics = {
  track(event, data) { emit(event, data); }
};
