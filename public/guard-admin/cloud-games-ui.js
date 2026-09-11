import { FAMILY_GAME_PREVIEWS } from './cloud-games-catalog.js';
import { setupTabletop } from './cloud-tabletop-ui.js';
// LAN traffic stays in the installed main process. Parent access remains cloud-managed.
export function setupCloudGames({ root, request, parent = false, renderAvatar, externalRequest, lanRequest, tabletop = parent || !!lanRequest, assetBase = new URL('assets/family-games/v1/', window.location.href) }) {
  let external={supported:false,games:[]};
  const gameActions=new Map();
  let active = false, room = null, selected = null, square = null, timer = null, loading = false, busy = false;
  let generation = 0, failures = 0, fresh = false, pending = null, settingsOpen = false;
  function node(tag, text = '', className = '') { const n = document.createElement(tag); n.textContent = text; n.className = className; return n; }
  function icon(name) { const i = node('i'); i.dataset.lucide = name; i.setAttribute('aria-hidden', 'true'); return i; }
  function icons() { window.lucide?.createIcons({ root }); }
  function heading(tag, text, symbol) { const h = node(tag); h.append(icon(symbol), document.createTextNode(text)); return h; }
  function button(text, click, disabled = false, symbol) { const b = node('button', '', 'btn btn-secondary'); if (symbol) b.append(icon(symbol)); b.append(document.createTextNode(text)); b.type = 'button'; b.disabled = disabled; b.addEventListener('click', click); return b; }
  const status = node('p', 'Opening your family room…', 'cloud-game-status'); status.setAttribute('role','status');
  const controls = node('div', '', 'cloud-game-actions');
  const title = node('div', '', 'cloud-game-title'); title.append(node('span', 'BODEEGUARD', 'cloud-game-eyebrow'), heading('h2', 'Family Game Room', 'gamepad-2'));
  const toolbar = node('div', '', 'cloud-game-toolbar'); toolbar.append(controls, status);
  const header = node('header', '', 'cloud-game-header'); header.append(title, toolbar);
  const content = node('div', '', 'cloud-game-layout');
  const formArea = node('div');
  const gallery = makeGallery();
  const tabletopRoot=node('section');
  const tabletopUI=tabletop?setupTabletop({root:tabletopRoot,request:lanRequest,parent}):null;
  root.classList.add('cloud-family-room'); root.classList.toggle('is-parent', parent);
  root.append(header, formArea, content);
  function note(text) { status.textContent = text; }
  function controlsView() {
    controls.replaceChildren(button(loading ? 'Refreshing…' : 'Refresh', refresh, loading || busy || !active, 'refresh-cw'));
    if (pending) controls.append(button('Retry the same action', () => send(pending), busy || !active, 'rotate-ccw'));
    icons();
  }
  function preview(index, opener) {
    const dialog = node('dialog', '', 'cloud-game-preview'); dialog.setAttribute('aria-label', 'Family game previews');
    const top = node('header'), name = node('h2'), close = button('Close', () => dialog.close(), false, 'x'); top.append(name, close);
    const picture = node('img'); picture.decoding = 'async';
    const imageArea = node('div', '', 'cloud-game-preview-image'); imageArea.append(picture);
    const info = node('div', '', 'cloud-game-preview-info'), description = node('p'), availability = node('p', 'Download and play in the BodeeGuard Windows app. For multiplayer, one child hosts and the others join inside the game on the same home router. Lesson Village is single-player.', 'cloud-game-preview-availability');
    const details = node('p', '', 'cloud-note'), navigation = node('div', '', 'cloud-game-preview-nav'), counter = node('span');
    const draw = () => { const game = FAMILY_GAME_PREVIEWS[index]; name.textContent = game.name; picture.src = new URL(game.image, assetBase).href; picture.alt = game.alt; description.textContent = game.description; details.textContent = `${game.players} · Separate Windows game`; counter.textContent = `${index + 1} / ${FAMILY_GAME_PREVIEWS.length}`; };
    const move = delta => { index = (index + delta + FAMILY_GAME_PREVIEWS.length) % FAMILY_GAME_PREVIEWS.length; draw(); };
    navigation.append(button('Previous game', () => move(-1), false, 'arrow-left'), counter, button('Next game', () => move(1), false, 'arrow-right'));
    info.append(description, details, availability, navigation); dialog.append(top, imageArea, info); root.append(dialog);
    dialog.addEventListener('keydown', event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); } });
    dialog.addEventListener('close', () => { dialog.remove(); opener?.focus({ preventScroll: true }); });
    draw(); icons(); dialog.showModal(); close.focus();
  }
  function makeGallery() {
    const section = node('section', '', 'cloud-game-gallery'); section.setAttribute('aria-label', 'More family games');
    const top = node('div', '', 'cloud-game-section-heading'); top.append(heading('h3', 'Family adventures', 'sparkles'), node('span', 'Windows games', 'cloud-game-badge'));
    section.append(top, node('p', 'Games download and update on the child’s PC. For family multiplayer, one child hosts and the others join inside the game using the same home router. Lesson Village is single-player.', 'cloud-note'));
    const banners = node('div', '', 'cloud-game-banners');
    FAMILY_GAME_PREVIEWS.forEach((game, index) => {
      const card = button('', () => preview(index, card)); card.className = 'cloud-game-banner'; card.style.setProperty('--game-accent', game.color); card.setAttribute('aria-label', `Preview ${game.name}`);
      const img = node('img'); img.src = new URL(game.image, assetBase).href; img.alt = game.alt; img.loading = 'lazy'; img.decoding = 'async'; img.width = 960; img.height = 540;
      const label = node('div', '', 'cloud-game-banner-label'), category = node('span', game.genre, 'cloud-game-banner-genre');
      const action = node('span', '', 'cloud-game-banner-action'); action.append(icon('expand'), document.createTextNode('View game'));
      label.append(category, heading('h4', game.name, game.icon), action); card.append(img, label);
      const item=node('article','','cloud-game-install-card'),actions=node('div','','cloud-game-install-actions');
      gameActions.set(game.id,actions);item.append(card,actions);banners.append(item);
    });
    section.append(banners); return section;
  }
  function setExternalState(value){
    external=value||{supported:false,games:[]};gallery.hidden=!parent&&!external.supported;
    for(const game of FAMILY_GAME_PREVIEWS){
      const area=gameActions.get(game.id);area.replaceChildren();
      if(parent){area.append(node('p','Available in the Windows child app · Uses Family Games access and time','cloud-note'));continue;}
      if(!external.supported)continue;
      const record=external.games.find(item=>item.key===game.id);
      const run=async action=>{try{await externalRequest(action,game.id);}catch(error){note(error.message);}};
      area.append(button(record?.installed?'Play':'Download & play',()=>run('play'),external.busy||!!external.playing,'play'));
      if(record?.installed)area.append(button('Check for updates',()=>run('update'),external.busy||!!external.playing,'download'));
      area.append(node('small',record?.version?`Installed ${record.version}`:'Download once · Automatic updates','cloud-note'));
      if(external.progress?.gameKey===game.id){const meter=node('progress');meter.max=100;if(external.progress.percent!=null)meter.value=external.progress.percent;meter.setAttribute('aria-label',`${game.name} download progress`);area.append(meter);}
    }
    if(external.message)note(external.message);icons();
  }
  setExternalState(external);
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
    const opener = document.activeElement;
    const dialog = node('dialog', '', 'cloud-game-dialog'); dialog.setAttribute('aria-label', `${child.name} — Family Games`);
    const form = node('form', '', 'cloud-game-settings');
    form.append(heading('h3', `${child.name} — Family Games`, 'sliders-horizontal'));
    const fields = node('div', '', 'cloud-game-settings-grid'); form.append(fields);
    const field = (label, name, type, value) => {
      const wrap = node('label', label, type === 'checkbox' ? 'cloud-game-check' : 'cloud-game-field'), input = document.createElement('input'); input.name = name; input.type = type;
      if (type === 'checkbox') input.checked = value; else input.value = value;
      if (type === 'checkbox') wrap.prepend(input); else wrap.append(input); fields.append(wrap); return input;
    };
    field('Enable family games', 'enabled', 'checkbox', child.settings.enabled);
    const minutes = field('Daily minutes (0–240)', 'dailyMinutes', 'number', child.settings.dailyMinutes); minutes.min = '0'; minutes.max = '240'; minutes.required = true;
    field('Finish required schoolwork first', 'requireSchool', 'checkbox', child.settings.requireSchool);
    field('Bypass schoolwork today only', 'unlock', 'checkbox', child.settings.unlockDate === room.date);
    field('Opens', 'start', 'time', child.settings.start).required = true;
    field('Closes (blank means midnight)', 'end', 'time', child.settings.end === '24:00' ? '' : child.settings.end);
    const days = node('fieldset'); days.append(node('legend','Allowed days'));
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach((day,index) => { const label = node('label', day), check = document.createElement('input'); check.type = 'checkbox'; check.name = 'day'; check.value = index; check.checked = child.settings.days.includes(index); label.append(check); days.append(label); });
    form.append(days, node('p', `Hours use ${room.timeZone}. Required schoolwork follows this child’s school plan. Daily time and allowed hours still apply when you bypass schoolwork.`, 'cloud-note'));
    const save = button('Save settings', () => {}, false, 'save'); save.classList.add('btn-primary'); save.type = 'submit';
    const cancel = button('Cancel', () => dialog.close(), false, 'x');
    const actions = node('div', '', 'cloud-game-actions'); actions.append(cancel, save);
    const message = node('p'); message.setAttribute('role','status'); form.append(message, actions);
    form.addEventListener('submit', async event => {
      event.preventDefault(); save.disabled = true; cancel.disabled = true;
      const values = new FormData(form);
      const settings = { enabled: values.has('enabled'), requireSchool: values.has('requireSchool'), dailyMinutes: Number(values.get('dailyMinutes')), start: values.get('start'), end: values.get('end') || '24:00', days: values.getAll('day').map(Number), unlockDate: values.has('unlock') ? room.date : null };
      try { await request('settings', { studentId: child.id, revision: child.revision, settings }); dialog.close(); await refresh(); }
      catch (error) { message.textContent = error.message; }
      finally { save.disabled = false; cancel.disabled = false; }
    });
    dialog.append(form); formArea.append(dialog); icons(); dialog.showModal();
    dialog.addEventListener('cancel', event => { if (save.disabled) event.preventDefault(); });
    dialog.addEventListener('close', () => { settingsOpen = false; formArea.replaceChildren(); opener?.focus({ preventScroll: true }); });
  }
  function render() {
    const focusedElement = document.activeElement;
    const focusedSquare = content.contains(document.activeElement) && document.activeElement.classList.contains('cloud-checkers-square') ? document.activeElement.getAttribute('aria-label')?.split(' ')[0] : null;
    controlsView();
    if (!room) { content.replaceChildren(); return; }
    const people = node('aside', '', 'cloud-game-people'); people.append(heading('h3', parent ? 'Family game access' : 'Your family', 'users-round'));
    people.append(node('p', parent ? 'Choose when each child can play.' : tabletop ? 'Family Games access and daily time.' : 'Invite a sibling to play Checkers.', 'cloud-note'));
    for (const child of room.children) {
      const row = node('article', '', 'cloud-game-person');
      const identity = node('div', '', 'cloud-game-person-heading');
      const avatar = renderAvatar?.(child) || node('span', child.name.trim().slice(0, 1).toUpperCase(), 'cloud-game-avatar');
      const who = node('div'); who.append(node('strong', child.name), node('small', tabletop ? (child.id===room.studentId?'This computer':'Family member') : child.online ? 'In game room' : 'Away', !tabletop&&child.online ? 'cloud-game-online' : 'cloud-note')); identity.append(avatar, who);
      const access = node('span', child.access.allowed ? 'Available' : 'Locked', `cloud-game-badge ${child.access.allowed ? 'available' : 'locked'}`); identity.append(access); row.append(identity);
      if (!child.access.allowed) row.append(node('p', child.access.reason || 'Ask your parent to unlock Family Games.', 'cloud-game-access-reason'));
      if (child.access.remainingSeconds != null) {
        const remaining = Math.max(0, child.access.remainingSeconds), used = Math.max(0, child.access.usedSeconds || 0);
        const time = node('div', '', 'cloud-game-time'); time.append(icon('clock-3'), node('strong', `${Math.ceil(remaining / 60)} min left`), node('span', `${Math.floor(used / 60)} min used`));
        const meter = node('progress'); meter.max = Math.max(1, remaining + used); meter.value = remaining; meter.setAttribute('aria-label', `${child.name}: game time remaining`); row.append(time, meter);
      }
      if (parent) {
        const days = child.settings?.days || [], names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const schedule = node('p', '', 'cloud-game-schedule'); schedule.append(icon('calendar-days'), document.createTextNode(`${days.length === 7 ? 'Every day' : days.map(d => names[d]).join(', ') || 'No days selected'} · ${child.settings?.start || '00:00'}–${child.settings?.end || '24:00'}`)); row.append(schedule);
        row.append(button('Access & game time', () => openSettings(child), !fresh || busy, 'sliders-horizontal'));
      } else if (!tabletop && child.id !== room.studentId) row.append(button('Invite to Checkers', () => act('invite', null, { opponentId: child.id }), !fresh || busy || loading || !!pending || !child.access.allowed || !room.children.find(c => c.id === room.studentId)?.access.allowed, 'send'));
      people.append(row);
    }
    const matches = node('section', '', 'cloud-game-matches'); matches.append(heading('h3', 'Checkers', 'circle-dot'));
    if (!room.matches.length) matches.append(node('p', parent ? 'Your children’s invitations and matches will appear here.' : 'Ready for a match? Choose a sibling under Your family.', 'cloud-note'));
    const name = id => room.children.find(c => c.id === id)?.name || 'Archived child';
    for (const match of room.matches) {
      const row = node('article', '', 'cloud-game-person');
      row.append(node('strong',`${name(match.challengerId)} vs ${name(match.opponentId)}`), node('p',`${match.status}${match.outcome ? ` · ${match.outcome.result === 'draw' ? 'Draw' : name(match.outcome.result === 'red' ? match.challengerId : match.opponentId)+' wins'}` : ''}`));
      row.append(button(match.id === selected ? 'Viewing match' : 'Open match', () => { selected = match.id; square = null; refresh(); }, busy || loading, 'play'));
      const disabled = !fresh || busy || loading || !!pending;
      if (parent && ['active','invited'].includes(match.status)) row.append(button('Stop match', () => { if (window.confirm('Stop this family match? Its record will remain, but it cannot continue.')) act('cancel', match); }, disabled, 'square'));
      if (!parent && match.status === 'invited') {
        if (match.opponentId === room.studentId) row.append(button('Accept', () => act('accept',match), disabled, 'check'), button('Decline', () => act('decline',match), disabled, 'x'));
        else row.append(button('Cancel invitation', () => act('cancel',match), disabled, 'x'));
      }
      if (!parent && match.status === 'active') row.append(button('Resign', () => { if (window.confirm('Resign this match? Your sibling will win.')) act('resign', match); }, disabled, 'flag'));
      matches.append(row);
    }
    const display = node('section', '', 'cloud-checkers-panel');
    const match = room.matches.find(m => m.id === selected);
    if (match) {
      display.append(heading('h3', 'Checkers', 'circle-dot'), node('p', parent ? 'Family match view' : `You are ${match.seat}. ${match.turn === match.seat ? 'Your turn.' : 'Your sibling’s turn.'}`));
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
    }
    const play = node('main', '', 'cloud-game-play');
    if(tabletop){
      play.append(tabletopRoot);
      if(parent&&room.matches.length){const old=node('details');old.append(node('summary','Previous online Checkers matches'),matches);if(match)old.append(display);play.append(old);}
    }else{if (match) play.append(display);play.append(matches);}
    play.append(gallery);
    content.replaceChildren(people, play); icons();
    if (focusedSquare) [...content.querySelectorAll('.cloud-checkers-square')].find(cell => cell.getAttribute('aria-label')?.startsWith(focusedSquare+' '))?.focus({ preventScroll: true });
    else if (content.contains(focusedElement)) focusedElement.focus({ preventScroll: true });
  }
  async function refresh() {
    if (!active || document.hidden || loading || busy) return;
    clearTimeout(timer); loading = true; render();
    const ticket = generation;
    try {
      const result = await request('room', { matchId: selected });
      if (ticket !== generation) return;
      room = result; fresh = true; failures = 0;
      if (!room.matches.some(m => m.id === selected)) selected = room.matches.find(m => m.status === 'active')?.id || room.matches[0]?.id || null;
      if (!pending) note(`Updated ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
    } catch (error) { if (ticket === generation) { fresh = false; failures++; note(`${error.message} Moves are paused; your saved match is not deleted.`); } }
    finally {
      loading = false;
      if (ticket === generation) render();
      if (active && !document.hidden && !external.playing && (!tabletop||parent)) timer = setTimeout(refresh, Math.min(parent?1800000:60000,(parent ? 1800000 : 5000)*2**Math.min(failures,4)));
    }
  }
  function setActive(value) { active = value; clearTimeout(timer); if (active) refresh(); else { generation++; fresh = false; square = null; root.querySelectorAll('dialog').forEach(dialog => dialog.close()); } }
  function clear() { generation++; room = null; selected = null; square = null; pending = null; fresh = false; settingsOpen = false; root.querySelectorAll('dialog').forEach(dialog => dialog.close()); formArea.replaceChildren(); render(); }
  document.addEventListener('visibilitychange', () => { clearTimeout(timer); fresh = false; if (!document.hidden && active) refresh(); else render(); });
  window.addEventListener('pagehide', () => { active = false; clear(); clearTimeout(timer); });
  return { setActive, clear, refresh, setExternalState, setLanState:value=>tabletopUI?.setState(value), isEditing: () => settingsOpen };
}
