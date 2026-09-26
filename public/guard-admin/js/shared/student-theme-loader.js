(function loadStudentTheme() {
  const allowedThemes = new Set(['default', 'pink', 'teal', 'dark-green', 'orange', 'purple', 'aurora', 'crimson', 'sunset-gold']);
  const value = new URLSearchParams(window.location.search).get('theme') || new URLSearchParams(window.location.hash.slice(1)).get('theme') || 'theme-default';
  const requestedTheme = value.startsWith('theme-') ? value.slice(6) : value;
  const theme = allowedThemes.has(requestedTheme) ? requestedTheme : 'default';
  [...document.documentElement.classList]
    .filter(className => className.startsWith('theme-'))
    .forEach(className => document.documentElement.classList.remove(className));
  document.documentElement.classList.add(`theme-${theme}`);

  document.documentElement.dataset.studentTheme = theme;
  document.documentElement.dataset.themeActivity = '';
  const assetRoot = new URL('../../', document.currentScript.src);
  if (!document.getElementById('student-theme-styles')) {
    const link = document.createElement('link');
    link.id = 'student-theme-styles';
    link.rel = 'stylesheet';
    link.href = new URL('css/kiosk/themes.css', assetRoot).href;
    document.head.appendChild(link);
  }

  if (!document.getElementById('student-theme-surfaces')) {
    const link = document.createElement('link');
    link.id = 'student-theme-surfaces'; link.rel = 'stylesheet';
    link.href = new URL('css/cloud-student-theme.css', assetRoot).href;
    document.head.appendChild(link);
  }

  // Every internal student surface shares this loader, so it is also the
  // reliable last line of defense against background sound during Family
  // Watch or a computer lock. Pausing preserves the exact resume position.
  window.addEventListener('message', event => {
    if (event.source !== window.parent) return;
    if (!['FAMILY_WATCH_PAUSE', 'BODEEGUARD_COMPUTER_LOCK'].includes(event.data?.type)) return;
    document.querySelectorAll('audio, video').forEach(media => {
      try { media.pause(); } catch (_) {}
    });
    const pauseCommand = JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] });
    document.querySelectorAll('iframe').forEach(frame => {
      try { frame.contentWindow?.postMessage(pauseCommand, '*'); } catch (_) {}
    });
  });
})();
