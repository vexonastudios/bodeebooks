// Suggestions only. The parent must click; the message body never selects a child or API path.
const MEDIA = Object.freeze([
  { kind: 'audiobook', label: 'Audiobooks', route: 'audiobooks', icon: 'headphones', words: /\b(?:audio[ -]?books?|audible)\b/ },
  { kind: 'video', label: 'Videos', route: 'video', icon: 'video', words: /\b(?:videos?|youtube|movies?)\b/ },
  { kind: 'music', label: 'Music', route: 'music', icon: 'music', words: /\b(?:music|songs?)\b/ }
]);

export function requestedMessageMedia(body) {
  if (typeof body !== 'string') return [];
  const clauses = body.toLowerCase().replace(/[’‘]/g, "'").split(/[.!?;\n]+/);
  const requested = clauses.filter(clause => {
    // Avoid suggestions for a refusal, a past event, or a request for more minutes.
    if (/\b(?:don't|dont|do not|didn't|didnt|did not|never|stop|no need|not to)\b/.test(clause)) return false;
    return /\b(?:unlock|unblock|enable)\b/.test(clause) || /\bturn\b.{0,35}\bon\b/.test(clause);
  });
  return MEDIA.filter(media => requested.some(clause => media.words.test(clause))).map(media => media.kind);
}

export function createMessageMediaActions({ request, getStudents }) {
  // Keep a lost-response retry tied to the same write, even after switching chats.
  const receipts = new Map();
  const findStudent = id => getStudents().find(student => student.id === id && !student.archived_at);
  function attach({ message, studentId, canAct }) {
    const student = findStudent(studentId);
    const kinds = message.sender === 'child' && message.id && student ? requestedMessageMedia(message.body) : [];
    if (!kinds.length) return null;
    const node = document.createElement('div'); node.className = 'cloud-message-media-actions';
    const context = document.createElement('span'); context.className = 'cloud-message-media-context';
    context.textContent = `For ${student.name} · Today`;
    node.append(context);
    const listeners = [];
    for (const kind of kinds) {
      const media = MEDIA.find(item => item.kind === kind);
      const key = JSON.stringify([new Date().toDateString(), studentId, message.id, kind]);
      if (!receipts.has(key)) receipts.set(key, { phase: 'ready', requestId: null, error: '', listeners: new Set() });
      const state = receipts.get(key);
      const row = document.createElement('div'); row.className = 'cloud-message-media-action'; row.dataset.media = kind;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'cloud-message-media-unlock';
      const icon = document.createElement('i'); icon.dataset.lucide = media.icon; icon.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span'); button.append(icon, label);
      button.title = 'Bypass school and schedule requirements for today. Daily time limits still apply.';
      const status = document.createElement('span'); status.className = 'cloud-message-media-status';
      status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
      const draw = () => {
        const busy = state.phase === 'saving', saved = state.phase === 'saved';
        button.disabled = busy || saved || !findStudent(studentId);
        button.setAttribute('aria-busy', String(busy)); row.dataset.state = state.phase;
        label.textContent = busy ? 'Unlocking…' : saved ? `${media.label} unlock saved` : `${state.phase === 'error' ? 'Retry unlock: ' : 'Unlock '}${media.label}`;
        button.setAttribute('aria-label', `${label.textContent} for ${student.name} today`);
        status.textContent = saved ? 'Saved for today. Applies on their next sync.' : state.error;
      };
      button.addEventListener('click', async () => {
        if (state.phase === 'saving' || state.phase === 'saved' || !findStudent(studentId) || !canAct()) return;
        state.phase = 'saving'; state.error = '';
        const update = () => state.listeners.forEach(listener => listener());
        update();
        try {
          state.requestId ||= crypto.randomUUID();
          const result = await request('media', { path: `/api/${media.route}/quick-control`, method: 'POST', requestId: state.requestId,
            body: { student_id: studentId, operation: 'override', unlocked: true } });
          if (result?.status !== 200 || result.body?.success !== true || result.body?.unlocked !== true) throw new Error('The unlock could not be confirmed.');
          state.phase = 'saved';
        } catch (error) {
          state.phase = 'error'; state.error = `${error.message || 'The unlock could not be confirmed.'} Tap to retry.`;
        }
        update();
      });
      state.listeners.add(draw); listeners.push(() => state.listeners.delete(draw)); draw();
      row.append(button, status); node.append(row);
    }
    const hint = document.createElement('span'); hint.className = 'cloud-message-media-hint';
    hint.textContent = 'Daily time limits still apply.'; node.append(hint);
    return { node, dispose: () => listeners.forEach(remove => remove()) };
  }
  return { attach };
}
