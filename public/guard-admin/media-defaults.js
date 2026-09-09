(function exposeMediaDefaults(root) {
  const defaults = Object.freeze({
    video: Object.freeze({ dailyMinutes: 20, legacyDailyMinutes: 60 }),
    music: Object.freeze({ dailyMinutes: 60, legacyDailyMinutes: 90 }),
    audiobook: Object.freeze({ dailyMinutes: 120, legacyDailyMinutes: 180 }),
    reward: Object.freeze({ dailyMinutes: 30 }),
    familyGame: Object.freeze({ dailyMinutes: 30 }),
    requireSchoolCompletion: true
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = defaults;
  }
  if (root) {
    root.BODEE_MEDIA_DEFAULTS = defaults;
  }
})(typeof window !== 'undefined' ? window : null);
