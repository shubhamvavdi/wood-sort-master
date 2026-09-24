// adapters/ads.js — thin wrapper over GameHub SDK or a portal ad provider.
import GameHubSDK from '@gamehubsdk/gamehub-ad-sdk';

const ADS_ENABLED = import.meta.env.VITE_ADS_ENABLED !== 'false';
const GAMEHUB_GAME_ID = import.meta.env.VITE_GAMEHUB_GAME_ID;
const GAMEHUB_TEST_MODE = import.meta.env.VITE_GAMEHUB_TEST_MODE === 'true';
let gameHubReady = false;

export async function initializeAds() {
  if (!ADS_ENABLED || !GAMEHUB_GAME_ID) return;
  try {
    await GameHubSDK.init({
      gameId: GAMEHUB_GAME_ID,
      apiBaseUrl: import.meta.env.VITE_GAMEHUB_API_BASE_URL,
      apiKey: import.meta.env.VITE_GAMEHUB_PUBLIC_KEY,
      testMode: GAMEHUB_TEST_MODE,
      metadata: { game: 'wood-sort-master' }
    });
    gameHubReady = true;
  } catch (e) {
    console.warn('[Ads] GameHub SDK initialization failed', e);
  }
}

export const ads = {
  async showRewarded(opts) {
    if (ADS_ENABLED && gameHubReady) {
      let rewardGranted = false;
      try {
        const shown = await GameHubSDK.showRewardedAd({
          placementId: opts?.placement || 'bonus-coins',
          onReward: () => { rewardGranted = true; }
        });
        return { success: Boolean(shown && rewardGranted), reason: shown ? 'reward_not_granted' : 'ad_unavailable' };
      } catch (e) {
        return { success: false, reason: 'provider_error' };
      }
    }
    if (ADS_ENABLED && window.GamePortal && typeof window.GamePortal.showRewarded === 'function') {
      try { return await window.GamePortal.showRewarded(opts); }
      catch (e) { return { success: false, reason: 'provider_error' }; }
    }
    return { success: false, reason: 'provider_unavailable' };
  },
  async showInterstitial(opts) {
    if (ADS_ENABLED && gameHubReady) {
      try {
        const shown = await GameHubSDK.showInterstitial({ placementId: opts?.placement || 'level_complete' });
        return { success: Boolean(shown), reason: shown ? undefined : 'ad_unavailable' };
      } catch (e) {
        return { success: false, reason: 'provider_error' };
      }
    }
    if (ADS_ENABLED && window.GamePortal && typeof window.GamePortal.showInterstitial === 'function') {
      try { return await window.GamePortal.showInterstitial(opts); }
      catch (e) { return { success: false, reason: 'provider_error' }; }
    }
    return { success: false, reason: 'provider_unavailable' };
  }
};
