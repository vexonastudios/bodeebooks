// Shared family room controls. No LAN fetches, client-authoritative moves or
// background game polling when this room is closed/hidden.
export function setupCloudGames({ root, request, parent = false }) {
  let active = false, room = null, selected = null, square = null, timer = null, loading = false, busy = false;
  let generation = 0, failures = 0, fresh = false, pending = null, settingsOpen = false;
  function node(tag, text = '', className = '') { const n = document.createElement(tag); n.textContent = text; n.className = className; return n; }
  function button(text, click, disabled = false) { const b = node('button', text, 'btn btn-secondary'); b.type = 'button'; b.disabled = disabled; b.addEventListener('click', click); return b; }
  const status = node('p', 'Open the family room to connect.', 'cloud-note'); status.setAttribute('role','status');
  const controls = node('div', '', 'cloud-game-actions');
  const content = node('div', '', 'cloud-game-layout');
  const formArea = node('div');
  root.append(controls, status, formArea, content);
  function note(text) { status.textContent = text; }
  function controlsView() {
    controls.replaceChildren(button('Refresh', refresh, loading || busy || !active));
    if (pending) controls.append(button('Retry the same action', () => send(pending), busy || !active));
  }
  async function send(input) {
    if (busy || loading) return;
    const ticket = generation;
    busy = true; fresh = false; pending = input; render();
    try {
      await request('action', input);
      if (ticket !== generation) return;
      pending = null; square = null; note('Saved. Refreshing the match…');
    } catch (error) {
      if (ticket !== generation) return;
      if (error.status >= 400 && error.status < 500 && ![408,429].includes(error.status)) pending = null;
      note(`${error.message} ${pending ? 'The response is uncertain. Retry the same action; it will not be applied twice.' : 'Refresh to see the current match.'}`);
    } finally {
      busy = false;
      if (ticket === generation) { if (!pending) await refresh(); else render(); }
    }
  }
  function act(action, match, extra = {}) {
    if (!fresh || pending || busy || loading) return;
    return send({ id: crypto.randomUUID(), action, matchId: match?.id || crypto.randomUUID(), ...(match ? { revision: match.revision } : {}), ...extra });
  }
  function openSettings(child) {
    settingsOpen = true; formArea.replaceChildren();
    const form = node('form', '', 'cloud-game-settings');
    form.append(node('h3', `${child.name} — Family Games`));
    const field = (label, name, type, value) => {
      const wrap = node('label', label), input = document.createElement('input'); input.name = name; input.type = type;
      if (type === 'checkbox') input.checked = value; else input.value = value;
      wrap.append(input); form.append(wrap); return input;
    };
    field('Enable family games', 'enabled', 'checkbox', child.settings.enabled);
    const minutes = field('Daily minutes (0–240)', 'dailyMinutes', 'number', child.settings.dailyMinutes); minutes.min = '0'; minutes.max = '240'; minutes.required = true;
    field('Require assigned school-time goals', 'requireSchool', 'checkbox', child.settings.requireSchool);
    field('Unlock school requirement today only', 'unlock', 'checkbox', child.settings.unlockDate === room.date);
    field('Opens', 'start', 'time', child.settings.start).required = true;
    field('Closes (blank means midnight)', 'end', 'time', child.settings.end === '24:00' ? '' : child.settings.end);
    const days = node('fieldset'); days.append(node('legend','Allowed days'));
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach((day,index) => { const label = node('label', day), check = document.createElement('input'); check.type = 'checkbox'; check.name = 'day'; check.value = index; check.checked = child.settings.days.includes(index); label.append(check); days.append(label); });
    form.append(days, node('p', `Times use ${room.timeZone}. School goals are received active time, not verified quiz completion. Disabling access pauses matches without deleting them.`, 'cloud-note'));
    const save = node('button','Save settings','btn btn-primary'); save.type = 'submit';
    const cancel = button('Close settings', () => { formArea.replaceChildren(); settingsOpen = false; });
    const message = node('p'); message.setAttribute('role','status'); form.append(save,cancel,message);
    form.addEventListener('submit', async event => {
      event.preventDefault(); save.disabled = true; cancel.disabled = true;
      const values = new FormData(form);
      const settings = { enabled: values.has('enabled'), requireSchool: values.has('requireSchool'), dailyMinutes: Number(values.get('dailyMinutes')), start: values.get('start'), end: values.get('end') || '24:00', days: values.getAll('day').map(Number), unlockDate: values.has('unlock') ? room.date : null };
      try { await request('settings', { studentId: child.id, revision: child.revision, settings }); formArea.replaceChildren(); settingsOpen = false; await refresh(); }
      catch (error) { message.textContent = error.message; }
      finally { save.disabled = false; cancel.disabled = false; }
    });
    formArea.append(form);
  }
  function render() {
    const focusedSquare = content.contains(document.activeElement) && document.activeElement.classList.contains('cloud-checkers-square') ? document.activeElement.getAttribute('aria-label')?.split(' ')[0] : null;
    controlsView();
    if (!room) { content.replaceChildren(); return; }
    const people = node('section', '', 'cloud-panel'); people.append(node('h3', parent ? 'Family game access' : 'Your family'));
    for (const child of room.children) {
      const row = node('article', '', 'cloud-game-person');
      row.append(node('strong', child.name), node('p', `${child.online ? 'In game room' : 'Not in game room'} · ${child.access.allowed ? 'Available' : child.access.reason || 'Locked'}`));
      if (child.access.remainingSeconds != null) row.append(node('p', `${Math.ceil(child.access.remainingSeconds/60)} min left · ${Math.floor(child.access.usedSeconds/60)} min used`));
      if (parent) row.append(button('Edit access / unlock today', () => openSettings(child), !fresh || busy));
      else if (child.id !== room.studentId) row.append(button('Invite to Checkers', () => act('invite', null, { opponentId: child.id }), !fresh || busy || loading || !!pending || !child.access.allowed || !room.children.find(c => c.id === room.studentId)?.access.allowed));
      people.append(row);
    }
    const matches = node('section', '', 'cloud-panel'); matches.append(node('h3', 'Checkers matches'));
    if (!room.matches.length) matches.append(node('p','No matches yet. Invite a sibling when both game rooms are unlocked.'));
    const name = id => room.children.find(c => c.id === id)?.name || 'Archived child';
    for (const match of room.matches) {
      const row = node('article', '', 'cloud-game-person');
      row.append(node('strong',`${name(match.challengerId)} vs ${name(match.opponentId)}`), node('p',`${match.status}${match.outcome ? ` · ${match.outcome.result === 'draw' ? 'Draw' : name(match.outcome.result === 'red' ? match.challengerId : match.opponentId)+' wins'}` : ''}`));
      row.append(button(match.id === selected ? 'Viewing match' : 'Open match', () => { selected = match.id; square = null; refresh(); }, busy || loading));
      const disabled = !fresh || busy || loading || !!pending;
      if (parent && ['active','invited'].includes(match.status)) row.append(button('Stop match', () => { if (window.confirm('Stop this family match? Its record will remain, but it cannot continue.')) act('cancel', match); }, disabled));
      if (!parent && match.status === 'invited') {
        if (match.opponentId === room.studentId) row.append(button('Accept', () => act('accept',match), disabled), button('Decline', () => act('decline',match), disabled));
        else row.append(button('Cancel invitation', () => act('cancel',match), disabled));
      }
      if (!parent && match.status === 'active') row.append(button('Resign', () => { if (window.confirm('Resign this match? Your sibling will win.')) act('resign', match); }, disabled));
      matches.append(row);
    }
    const display = node('section', '', 'cloud-panel cloud-checkers-panel');
    const match = room.matches.find(m => m.id === selected);
    if (match) {
      display.append(node('h3', 'Checkers'), node('p', parent ? 'Family match view' : `You are ${match.seat}. ${match.turn === match.seat ? 'Your turn.' : 'Your sibling’s turn.'}`));
      const participants = [match.challengerId,match.opponentId].map(id => room.children.find(c => c.id === id));
      const ready = fresh && !pending && !busy && !loading && participants.every(c => c?.online && c.access.allowed);
      const canMove = ready && !parent && match.status === 'active' && match.turn === match.seat;
      if (match.status === 'active' && !ready) display.append(node('p','Paused / reconnecting. Both siblings need to open this match with game access. The last saved board is kept.', 'cloud-note'));
      if (match.must_continue_from) display.append(node('p','Continue the jump with the same piece.'));
      const board = node('div', '', 'cloud-checkers-board'); board.setAttribute('aria-label','Checkers board');
      const order = Array.from({ length: 8 },(_,i) => !parent && match.seat === 'black' ? 7-i : i);
      for (const r of order) for (const c of order) {
        const piece = match.board[r][c];
        const cell = button('', () => {
          const destination = square && match.legalMoves.find(m => m.from.row === square.row && m.from.column === square.column && m.to.row === r && m.to.column === c);
          if (destination) act('move', match, { from: square, to: { row:r,column:c } });
          else { square = piece?.seat === match.seat ? { row:r,column:c } : null; render(); }
        }, !canMove || (r+c)%2 === 0);
        cell.className = `cloud-checkers-square ${(r+c)%2 ? 'dark' : 'light'}`;
        if (square?.row === r && square.column === c) cell.classList.add('selected');
        if (square && match.legalMoves.some(m => m.from.row === square.row && m.from.column === square.column && m.to.row === r && m.to.column === c)) cell.classList.add('destination');
        cell.setAttribute('aria-label', `${'abcdefgh'[c]}${8-r}${piece ? ` ${piece.seat}${piece.king ? ' king' : ' piece'}` : ' empty'}`);
        if (piece) cell.append(node('span',piece.king ? '♛' : '',`cloud-checkers-piece ${piece.seat}`));
        board.append(cell);
      }
      display.append(board, node('p',`Saved online · ${new Date(match.updatedAt).toLocaleTimeString()} · Match expires ${new Date(match.expiresAt).toLocaleString()}`, 'cloud-note'));
    } else display.append(node('p','Choose a match to open its board.'));
    content.replaceChildren(people,matches,display);
    if (focusedSquare) [...content.querySelectorAll('.cloud-checkers-square')].find(cell => cell.getAttribute('aria-label')?.startsWith(focusedSquare+' '))?.focus({ preventScroll: true });
  }
  async function refresh() {
    if (!active || document.hidden || loading || busy) return;
    clearTimeout(timer); loading = true; controlsView();
    const ticket = generation;
    try {
      const result = await request('room', { matchId: selected });
      if (ticket !== generation) return;
      room = result; fresh = true; failures = 0;
      if (!room.matches.some(m => m.id === selected)) selected = room.matches.find(m => m.status === 'active')?.id || room.matches[0]?.id || null;
      if (!pending) note(`Connected · ${room.timeZone} · ${parent ? '30-second' : '5-second'} refresh while this room is open.`);
    } catch (error) { if (ticket === generation) { fresh = false; failures++; note(`${error.message} Moves are paused; your saved match is not deleted.`); } }
    finally {
      loading = false;
      if (ticket === generation) render();
      if (active && !document.hidden) timer = setTimeout(refresh, Math.min(60000,(parent ? 30000 : 5000)*2**Math.min(failures,4)));
    }
  }
  function setActive(value) { active = value; clearTimeout(timer); if (active) refresh(); else { generation++; fresh = false; square = null; } }
  function clear() { generation++; room = null; selected = null; square = null; pending = null; fresh = false; settingsOpen = false; formArea.replaceChildren(); render(); }
  document.addEventListener('visibilitychange', () => { clearTimeout(timer); fresh = false; if (!document.hidden && active) refresh(); else render(); });
  window.addEventListener('pagehide', () => { active = false; clear(); clearTimeout(timer); });
  return { setActive, clear, refresh, isEditing: () => settingsOpen };
}
