// i18n/translations.js
export const TRANSLATIONS = {
  en: { play: 'PLAY', level: 'Level', levels: 'LEVELS', dailyReward: 'DAILY REWARD', settings: 'SETTINGS',
        howToPlay: 'HOW TO PLAY', undo: 'Undo', restart: 'Restart', watchAd: 'Watch Ad', resetProgress: 'Reset Progress' },
  hi: { play: 'खेलें', level: 'लेवल', levels: 'लेवल्स', dailyReward: 'दैनिक इनाम', settings: 'सेटिंग्स',
        howToPlay: 'कैसे खेलें', undo: 'पूर्ववत करें', restart: 'फिर से शुरू करें', watchAd: 'विज्ञापन देखें', resetProgress: 'प्रगति रीसेट करें' },
  gu: { play: 'રમો', level: 'લેવલ', levels: 'લેવલ્સ', dailyReward: 'દૈનિક ઇનામ', settings: 'સેટિંગ્સ',
        howToPlay: 'કેવી રીતે રમવું', undo: 'પૂર્વવત્ કરો', restart: 'ફરી શરૂ કરો', watchAd: 'જાહેરાત જુઓ', resetProgress: 'પ્રગતિ રીસેટ કરો' }
};

export function applyLanguage(lang) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  document.documentElement.lang = lang;
}
