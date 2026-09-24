// services/storage.js — safe localStorage wrapper. Never throws, never corrupts silently.
const PREFIX = 'wsm_';

export const storage = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(PREFIX + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) {
      console.warn('[storage] get failed for', key, e);
      return fallback;
    }
  },
  set(key, val) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(val));
      return true;
    } catch (e) {
      console.warn('[storage] set failed for', key, e);
      return false;
    }
  },
  remove(key) {
    try { localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ }
  },
  reset() {
    try {
      Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k));
    } catch (e) { /* ignore */ }
  }
};
