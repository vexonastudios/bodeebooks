import './fix-webm-duration.js';

const LIMIT = 60, MAX_BYTES = 2 * 1024 * 1024;
export async function finalizeVoiceRecording(blob, durationMs) {
  if (!blob.size || blob.size > MAX_BYTES) throw Error('Record a voice message up to 60 seconds and 2 MB.');
  const mime = blob.type.split(';')[0];
  if (mime === 'audio/webm') return window.ysFixWebmDuration(blob, durationMs, { logger: false });
  if (['audio/ogg', 'audio/wav', 'audio/mpeg'].includes(mime)) return blob;
  // Safari can record AAC/MP4. Convert once on the parent's device to a small
  // mono WAV accepted by every child, without paying for server transcoding.
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    if (!decoded.duration || decoded.duration > LIMIT + 1) throw Error('Record a voice message of up to 60 seconds.');
    const count = Math.min(LIMIT * 16000, Math.ceil(decoded.duration * 16000));
    const offline = new OfflineAudioContext(1, count, 16000), source = offline.createBufferSource();
    source.buffer = decoded; source.connect(offline.destination); source.start();
    const samples = (await offline.startRendering()).getChannelData(0);
    const bytes = new ArrayBuffer(44 + count * 2), view = new DataView(bytes);
    const text = (at, value) => [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
    text(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    text(36, 'data'); view.setUint32(40, count * 2, true);
    for (let i = 0; i < count; i++) { const sample = Math.max(-1, Math.min(1, samples[i])); view.setInt16(44 + i * 2, sample * (sample < 0 ? 32768 : 32767), true); }
    return new Blob([bytes], { type: 'audio/wav' });
  } finally { await context.close(); }
}

export function createVoiceRecorder({ onChange, beforeRecord = async () => {} }) {
  let version = 0, recorder = null, stream = null, timer = null;
  let state = { phase: 'idle', seconds: 0, blob: null, url: null, error: '' };
  const emit = patch => { state = { ...state, ...patch }; onChange(state); };
  function release() { clearInterval(timer); timer = null; stream?.getTracks().forEach(track => track.stop()); stream = null; }
  function cancel() {
    version++; const old = recorder; recorder = null;
    if (old?.state === 'recording') old.stop(); release();
    if (state.url) URL.revokeObjectURL(state.url);
    emit({ phase: 'idle', seconds: 0, blob: null, url: null, error: '' });
  }
  async function start() {
    if (['requesting', 'recording', 'finishing'].includes(state.phase)) return;
    cancel(); const attempt = version; emit({ phase: 'requesting' });
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw Error('This browser cannot record audio. Attach an audio file instead.');
      await beforeRecord();
      if (attempt !== version) return;
      const acquired = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (attempt !== version) { acquired.getTracks().forEach(track => track.stop()); return; }
      stream = acquired;
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      const captured = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 64000 });
      recorder = captured; const chunks = [], started = performance.now(); let stoppedAt = 0;
      captured.addEventListener('dataavailable', event => { if (event.data.size) chunks.push(event.data); });
      captured.addEventListener('error', () => { if (attempt === version) { cancel(); emit({ error: 'Recording failed. Check microphone access and try again.' }); } });
      captured.addEventListener('stop', async () => {
        if (attempt !== version) return;
        release(); emit({ phase: 'finishing' });
        try {
          const duration = Math.min(LIMIT * 1000, (stoppedAt || performance.now()) - started);
          const blob = await finalizeVoiceRecording(new Blob(chunks, { type: captured.mimeType }), duration);
          if (attempt !== version) return;
          emit({ phase: 'ready', blob, url: URL.createObjectURL(blob), seconds: Math.max(1, Math.round(duration / 1000)) });
        } catch (error) { if (attempt === version) { cancel(); emit({ error: error.message }); } }
      }, { once: true });
      captured.stopVoice = () => { if (captured.state === 'recording') { stoppedAt = performance.now(); captured.stop(); } };
      captured.start(); emit({ phase: 'recording' });
      timer = setInterval(() => { const seconds = Math.floor((performance.now() - started) / 1000); emit({ seconds: Math.min(LIMIT, seconds) }); if (seconds >= LIMIT) captured.stopVoice(); }, 200);
    } catch (error) {
      if (attempt !== version) return;
      cancel(); emit({ error: error.name === 'NotAllowedError' ? 'Allow microphone access for BodeeGuard in your browser, then try again.' : error.message });
    }
  }
  return { start, stop: () => recorder?.stopVoice(), cancel, state: () => state };
}
