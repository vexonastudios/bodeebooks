/* global YT */
(() => {
  'use strict';
  const options = new URLSearchParams(location.hash.slice(1));
  const videoId = options.get('video'), start = Math.min(43200,Math.max(0,Number(options.get('start')) || 0));
  const status = document.getElementById('player-status'), feedback = document.getElementById('seek-feedback');
  let player = null, ready = false, ended = false, playing = false, feedbackTimer = null;
  function report() {
    if (!ready || !player) return;
    if (player.getVideoData?.().video_id && player.getVideoData().video_id !== videoId) {
      window.bodeeVideo?.report({ position: 0, duration: 0, ended: false, playing: false });
      ready = false; player.destroy(); status.textContent = 'Choose the next video from your approved BodeeGuard library.'; return;
    }
    const duration = Math.min(43200,Math.max(0,Math.floor(player.getDuration() || 0)));
    window.bodeeVideo?.report({ position: Math.min(duration,Math.max(0,Math.floor(player.getCurrentTime() || 0))), duration, ended, playing });
  }
  function seek(delta) {
    if (!ready || ended) return;
    player.seekTo(Math.max(0,Math.min(player.getDuration() || 0,(player.getCurrentTime() || 0)+delta)),true);
    feedback.textContent = delta < 0 ? '↶ 5 seconds' : '5 seconds ↷';
    clearTimeout(feedbackTimer); feedbackTimer = setTimeout(() => { feedback.textContent = ''; },1200);
    report();
  }
  document.getElementById('seek-back').addEventListener('click',() => seek(-5));
  document.getElementById('seek-forward').addEventListener('click',() => seek(5));
  window.bodeeVideo?.onSeek(seek);
  // In Electron, before-input-event handles keys even while the YouTube iframe
  // is focused. Browser previews use these buttons or the player's own keys.
  if (!window.bodeeVideo) document.addEventListener('keydown',event => {
    if (['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); seek(event.key === 'ArrowLeft' ? -5 : 5); }
  });
  window.bodeeVideo?.onStatus(message => { document.getElementById('save-status').textContent = message; });
  document.addEventListener('visibilitychange',() => { if (document.hidden && ready) { playing = false; player.pauseVideo(); report(); } });
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId || '')) { status.textContent = 'Open a video from your approved learning library.'; return; }
  window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player('youtube-player', { host: 'https://www.youtube-nocookie.com', width: '100%', height: '100%', videoId,
      playerVars: { origin: location.origin, playsinline: 1, rel: 0, start: Math.floor(start), autoplay: 0 },
      events: {
        onReady: () => { ready = true; status.textContent = 'Press Play to watch. Left and right arrows skip 5 seconds in the child app.'; report(); },
        onStateChange: event => {
          playing = event.data === 1;
          ended = event.data === 0;
          if (ended) {
            report(); ready = false; player.destroy();
            status.textContent = 'Video ended. You can watch it again or return to your library.';
            document.getElementById('replay').hidden = false;
          } else report();
        },
        onError: event => {
          playing = false; report();
          const messages = { 100: 'This video was removed or made private. Ask your parent to check the link.', 101: 'The owner does not allow this video in an embedded player.', 150: 'The owner does not allow this video in an embedded player.', 153: 'YouTube could not recognize this player. Close it and try again; tell your parent if it repeats.' };
          status.textContent = messages[event.data] || 'YouTube could not play this video. Check your connection and ask your parent to preview the link.';
          ready = false; player.destroy();
        }
      }
    });
  };
  document.getElementById('replay').addEventListener('click',() => { options.set('start','0'); location.hash = options.toString(); location.reload(); });
  const tag = document.createElement('script'); tag.src = 'https://www.youtube.com/iframe_api';
  tag.onerror = () => { status.textContent = 'YouTube could not connect. Check the internet connection and reopen this video.'; };
  document.head.append(tag);
  setTimeout(() => { if (!ready && !ended) status.textContent = 'Still waiting for YouTube. If no player appears, check the internet connection and reopen this video.'; },15000);
  setInterval(report,1000);
})();
