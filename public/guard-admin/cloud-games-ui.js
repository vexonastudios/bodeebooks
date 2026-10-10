import { FAMILY_GAME_PREVIEWS, FAMILY_GAME_DOWNLOADS, familyGameDownloadUrl } from './cloud-games-catalog.js';
import { setupTabletop } from './cloud-tabletop-ui.js';
import { setupOnlineTabletop } from './cloud-online-tabletop.js';
export const GAME_TIME_REQUEST_MESSAGE = "I'm out of game time. Can I have 30 more minutes of Family Games, please?";
function gameMessage(value) {
  const message = String(value?.message || value || '').replace(/^Error invoking remote method '[^']+':\s*/, '').replace(/^Error:\s*/, '');
  return message === 'Daily game time used' ? "You've used all of today's game time." : message;
}
// LAN traffic stays in the installed main process. Parent access remains cloud-managed.
export function setupCloudGames({ root, request, parent = false, renderAvatar, externalRequest, lanRequest, requestExtraTime, tabletop = parent || !!lanRequest, assetBase = new URL('assets/family-games/v1/', window.location.href) }) {
  let external={supported:false,games:[]};
  const gameActions=new Map();
  const childLibrary = !parent && tabletop;
  let childView = 'adventures';
  let messaging = null, timeRequest = null, exhaustedByAction = false;
  const requestStates = new Map();
  let active = false, room = null, selected = null, square = null, timer = null, loading = false, busy = false;
  let generation = 0, failures = 0, fresh = false, pending = null, settingsOpen = false;
  function node(tag, text = '', className = '') { const n = document.createElement(tag); n.textContent = text; n.className = className; return n; }
  function icon(name) { const i = node('i'); i.dataset.lucide = name; i.setAttribute('aria-hidden', 'true'); return i; }
  function icons() { window.lucide?.createIcons({ root }); }
  function heading(tag, text, symbol) { const h = node(tag); h.append(icon(symbol), document.createTextNode(text)); return h; }
  function button(text, click, disabled = false, symbol) { const b = node('button', '', 'btn btn-secondary'); if (symbol) b.append(icon(symbol)); b.append(document.createTextNode(text)); b.type = 'button'; b.disabled = disabled; b.addEventListener('click', click); return b; }
  const status = node('p', 'Opening your family room…', 'cloud-game-status'); status.setAttribute('role','status');
  const controls = node('div', '', 'cloud-game-actions');
  const title = node('div', '', 'cloud-game-title'); title.append(node('span', 'BODEEGUARD', 'cloud-game-eyebrow'), heading('h2', parent ? 'Family Game Room' : 'Family Games', 'gamepad-2'));
  const toolbar = node('div', '', 'cloud-game-toolbar'); toolbar.append(controls, status);
  const header = node('header', '', 'cloud-game-header');
  const currentAccess = node('div', '', 'cloud-game-current-access');
  header.append(title, ...(childLibrary ? [currentAccess] : []), toolbar);
  const timeNotice = node('section', '', 'cloud-game-time-notice'); timeNotice.hidden = true; timeNotice.setAttribute('aria-label', 'Game time');
  const timeCopy = node('div', '', 'cloud-game-time-copy');
  const timeHeading = heading('h3', "You're out of game time", 'alarm-clock');
  const timeHelp = node('p', "You've used today's game time. Your parent can add 30 more minutes.");
  const timeStatus = node('p', '', 'cloud-game-request-status'); timeStatus.setAttribute('role', 'status');
  const askTime = button('Ask for 30 more minutes', askForTime, false, 'message-circle'); askTime.classList.add('btn-primary');
  timeCopy.append(timeHeading, timeHelp, timeStatus); timeNotice.append(timeCopy, askTime);
  const content = node('div', '', 'cloud-game-layout');
  const formArea = node('div');
  const gallery = makeGallery();
  const tabletopRoot=node('section');
  const onlineRoot=node('section');
  const onlineUI=setupOnlineTabletop({root:onlineRoot,request,parent});
  const tabletopUI=tabletop?setupTabletop({root:tabletopRoot,request:lanRequest,parent}):null;
  const boardArea = node('div', '', 'cloud-game-board-area');
  const childNav = node('nav', '', 'cloud-game-child-nav'); childNav.setAttribute('aria-label', 'Choose game type');
  const videoTab = button('Video games', () => { childView = 'adventures'; applyChildView(); }, false, 'gamepad-2');
  const boardTab = button('Board games', () => { childView = 'boards'; applyChildView(); }, false, 'dices');
  childNav.append(videoTab, boardTab); childNav.hidden = !childLibrary;
  root.classList.add('cloud-family-room'); root.classList.toggle('is-parent', parent); root.classList.toggle('is-child-room', childLibrary);
  root.append(header, timeNotice, childNav, formArea, content);
  function applyChildView() {
    if (!childLibrary) return;
    const view = external.supported ? childView : 'boards';
    root.dataset.gameView = view;
    videoTab.hidden = !external.supported;
    videoTab.setAttribute('aria-pressed', String(view === 'adventures')); boardTab.setAttribute('aria-pressed', String(view === 'boards'));
    gallery.hidden = view !== 'adventures'; boardArea.hidden = view !== 'boards';
    const people = content.querySelector('.cloud-game-people'); if (people) people.hidden = view !== 'boards';
  }
  function ownAccess() { return room?.children.find(child => child.id === room.studentId)?.access; }
  function outOfTime() { const access = ownAccess(); return exhaustedByAction || access?.allowed === false && access.reason === 'Daily game time used'; }
  function requestKey() { return room?.studentId && room?.date ? room.studentId + ':' + room.date : null; }
  function messageDate(value) {
    if (!value) return '';
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: room.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value)); }
    catch (_) { return ''; }
  }
  function requestState() {
    const key = requestKey();
    if (key && messaging?.studentId === room.studentId) {
      const matches = message => message.body === GAME_TIME_REQUEST_MESSAGE && messageDate(message.createdAt) === room.date;
      if (messaging.messages?.some(message => message.sender === 'child' && matches(message))) requestStates.set(key, 'sent');
      else if (messaging.pending?.some(matches)) requestStates.set(key, 'queued');
    }
    return requestStates.get(key);
  }
  function updateTimeNotice() {
    timeNotice.hidden = parent || !outOfTime();
    if (timeNotice.hidden) return;
    const saved = requestState(), sending = timeRequest?.key === requestKey();
    askTime.hidden = !requestExtraTime;
    askTime.disabled = !active || sending || !!saved || !requestKey();
    askTime.textContent = sending ? 'Sending request…' : saved === 'sent' ? 'Request sent' : saved === 'queued' ? 'Request saved' : 'Ask for 30 more minutes';
    timeStatus.textContent = sending ? 'Sending your parent a message…' : saved === 'sent' ? 'Your parent has your request. Games stay locked until more time is available.' : saved === 'queued' ? 'Your request is saved and will send when connected. You can check it in Messages.' : timeRequest?.error || '';
  }
  async function askForTime() {
    const key = requestKey(), studentId = room?.studentId;
    if (!requestExtraTime || parent || !active || !outOfTime() || !key || timeRequest?.key === key || requestState()) return;
    const attempt = {key}; timeRequest = attempt; updateTimeNotice();
    try {
      const receipt = await requestExtraTime(studentId, GAME_TIME_REQUEST_MESSAGE);
      if (timeRequest !== attempt) return;
      if (!receipt?.id || receipt.queued !== true) throw Error('The request could not be confirmed. Check Messages before trying again.');
      requestStates.set(key, 'queued'); timeRequest = null;
    } catch (error) {
      if (timeRequest !== attempt) return;
      timeRequest = {error: gameMessage(error) || 'The request could not be sent. Try again.'};
    }
    updateTimeNotice();
  }
  function reportError(error) {
    note(gameMessage(error));
    if (/Daily game time used/.test(String(error?.message || error))) exhaustedByAction = true;
    updateCurrentAccess(); updateTimeNotice(); renderExternalState(); icons();
    void refresh();
  }
  function setMessageState(value) { messaging = value; updateTimeNotice(); }
  function updateCurrentAccess() {
    if (!childLibrary) return;
    currentAccess.replaceChildren();
    const access = ownAccess();
    if (!access) { currentAccess.append(node('span', 'Checking game time…')); return; }
    const text = node('span'); text.append(node('strong', access.allowed ? Math.ceil(Math.max(0, access.remainingSeconds || 0) / 60) + ' min left' : 'Games locked'),
      node('small', access.allowed ? 'Your game time today' : gameMessage(access.reason) || 'Ask your parent to unlock games.'));
    currentAccess.append(icon(access.allowed ? 'clock-3' : 'lock-keyhole'), text);
  }
  function note(text) { status.textContent = gameMessage(text); }
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
    let imageIndex = 0;
    const imageButtons = node('div', '', 'cloud-game-preview-nav');
    const draw = () => { const game = FAMILY_GAME_PREVIEWS[index]; name.textContent = game.name; const images=game.images||[game],current=images[imageIndex]||images[0]; picture.src = new URL(current.image, assetBase).href; picture.alt = current.alt; imageButtons.replaceChildren(); if(images.length>1)imageButtons.append(button('Previous picture',()=>{imageIndex=(imageIndex+images.length-1)%images.length;draw();}),node('span',`${imageIndex+1} / ${images.length}`),button('Next picture',()=>{imageIndex=(imageIndex+1)%images.length;draw();})); description.textContent = game.description; details.textContent = `${game.players} · ${game.details || 'Separate Windows game'}`; availability.textContent = [game.availability || 'Download and play in the BodeeGuard Windows app.', game.help || 'For multiplayer, host and join on the same home network using matching game versions.'].join(' '); counter.textContent = `${index + 1} / ${FAMILY_GAME_PREVIEWS.length}`; };
    const move = delta => { imageIndex=0; index = (index + delta + FAMILY_GAME_PREVIEWS.length) % FAMILY_GAME_PREVIEWS.length; draw(); };
    navigation.append(button('Previous game', () => move(-1), false, 'arrow-left'), counter, button('Next game', () => move(1), false, 'arrow-right'));
    info.append(imageButtons, description, details, availability, navigation); dialog.append(top, imageArea, info); root.append(dialog);
    dialog.addEventListener('keydown', event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); } });
    dialog.addEventListener('close', () => { dialog.remove(); opener?.focus({ preventScroll: true }); });
    draw(); icons(); dialog.showModal(); close.focus();
  }
  function makeGallery() {
    const section = node('section', '', 'cloud-game-gallery'); section.setAttribute('aria-label', 'More family games');
    const top = node('div', '', 'cloud-game-section-heading'); top.append(heading('h3', 'Family adventures', 'sparkles'), node('span', 'Windows games', 'cloud-game-badge'));
    section.append(top, node('p', parent ? 'These are separate Windows games. Lesson Village is single-player; the other games support family multiplayer on the same home Wi-Fi.' : 'Choose an adventure. Play on your own or with family on the same home Wi-Fi.', 'cloud-note'));
    const steps=node('ol','','cloud-game-start-steps');
    for(const text of (parent?[
      'Allow Family Games for each child using Access & game time on the left, or Daily Plan.',
      'On each child’s computer: open Family Games, find a game below, then choose Download & play. After the first download, choose Play.',
      'To join on your Windows computer, use the Windows download below and open the game. Choose Mom or Dad as your player name.',
      'For multiplayer, one player hosts in the game lobby. Everyone else joins from the same home Wi-Fi. Keep everyone on the same game version.'
    ]:['Choose Download & play below. The first download can take a few minutes.','Next time, choose Play. BodeeGuard checks for game updates automatically.','For multiplayer, one person hosts in the game lobby and the others join on the same home Wi-Fi.']))steps.append(node('li',text));
    if (parent) section.append(steps);
    else { const help = node('details', '', 'cloud-game-library-help'); help.append(node('summary', 'How to download & play together'), steps); section.append(help); }
    const banners = node('div', '', 'cloud-game-banners');
    FAMILY_GAME_PREVIEWS.forEach((game, index) => {
      const card = button('', () => preview(index, card)); card.className = 'cloud-game-banner'; card.style.setProperty('--game-accent', game.color); card.setAttribute('aria-label', `Preview ${game.name}`);
      const img = node('img'); img.src = new URL(game.image, assetBase).href; img.alt = game.alt; img.loading = 'lazy'; img.decoding = 'async'; img.width = 960; img.height = 540;
      const cover = node('span', '', 'cloud-game-cover'); cover.dataset.titleStyle = game.coverTitle?.style || 'default';
      const emblem = node('span', '', 'cloud-game-cover-emblem'); emblem.setAttribute('aria-hidden', 'true'); emblem.append(icon(game.icon));
      const wordmark = node('h4', '', 'cloud-game-wordmark'); wordmark.setAttribute('aria-label', game.name);
      for (const [lineIndex, text] of (game.coverTitle?.lines || [game.name]).entries()) {
        if (lineIndex) wordmark.append(document.createTextNode(' '));
        wordmark.append(node('span', text, 'cloud-game-title-line'));
      }
      cover.append(img, emblem, wordmark);
      const label = node('div', '', 'cloud-game-banner-label'), category = node('span', game.genre, 'cloud-game-banner-genre');
      const action = node('span', '', 'cloud-game-banner-action'); action.append(icon('expand'), document.createTextNode('View game'));
      label.append(category, action); card.append(cover, label);
      const item=node('article','','cloud-game-install-card'),actions=node('div','','cloud-game-install-actions');
      gameActions.set(game.id,actions);item.append(card,actions);banners.append(item);
    });
    section.append(banners); return section;
  }
  function setExternalState(value){
    const message = value?.message;
    external=value||{supported:false,games:[]};
    if(message) { note(message); if (/Daily game time used/.test(message)) exhaustedByAction = true; }
    renderExternalState(); updateTimeNotice();
  }
  function renderExternalState(){
    gallery.hidden=!parent&&!external.supported;
    for(const game of FAMILY_GAME_PREVIEWS){
      const area=gameActions.get(game.id);area.replaceChildren();
      const downloadReady=FAMILY_GAME_DOWNLOADS[game.id]?.available!==false;
      if(parent && game.details)area.append(node('small',game.details,'cloud-note'));
      if(parent && game.help)area.append(node('small',game.help,'cloud-note'));
      if(parent){
        if(!downloadReady){area.append(button('Awaiting signed release',()=>{},true,'clock'),node('p',game.availability,'cloud-note'));continue;}
        const link=node('a','Download for my Windows PC','btn btn-secondary');link.href=familyGameDownloadUrl(game.id);link.target='_blank';link.rel='noopener noreferrer';link.prepend(icon('download'));
        area.append(link,node('p',game.id==='mountain-rush'?'Extract the ZIP, open MountainRush.exe, then choose your name in LAN Multiplayer. One person hosts; others select the host or enter its IP address. Use the same game version and home Wi-Fi. Progress is shared by players using the same Windows account.':game.id==='berean-rpg'?'Single player · Children download from their own app.':'Play as Mom or Dad in the game lobby · Same home Wi-Fi','cloud-note'));continue;
      }
      if(!external.supported)continue;
      const record=external.games.find(item=>item.key===game.id);
      const canLaunch = active && fresh && !loading && ownAccess()?.allowed === true && !outOfTime();
      const run=async action=>{if(!active || !fresh || loading || ownAccess()?.allowed !== true || outOfTime())return;const ticket=generation;try{await externalRequest(action,game.id);}catch(error){if(ticket===generation)reportError(error);}};
      const playButton = button(record?.installed ? 'Play' : downloadReady ? 'Download & play' : 'Awaiting signed release', () => run('play'), !canLaunch || external.busy || !!external.playing || (!record?.installed && !downloadReady), 'play');
      playButton.classList.add('btn-primary', 'cloud-game-launch'); playButton.setAttribute('aria-label', (record?.installed ? 'Play ' : 'Download & play ') + game.name);
      const actions = node('div', '', 'cloud-game-launch-row'); actions.append(playButton);
      if (record?.installed) { const repair = button('Update / repair', () => run('update'), !canLaunch || external.busy || !!external.playing || !downloadReady, 'download'); repair.classList.add('cloud-game-repair'); repair.setAttribute('aria-label', 'Update or repair ' + game.name); actions.append(repair); }
      area.append(node('small', game.playLabel || game.players, 'cloud-note cloud-game-player-count'), actions,
        node('small', record?.version ? 'Installed ' + record.version : downloadReady ? 'Download once · Automatic updates' : game.availability, 'cloud-note cloud-game-install-status'));
      if(external.progress?.gameKey===game.id){const meter=node('progress');meter.max=100;if(external.progress.percent!=null)meter.value=external.progress.percent;meter.setAttribute('aria-label',`${game.name} download progress`);area.append(meter);}
    }
    applyChildView();
    icons();
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
  function openSettings(children) {
    const targets = structuredClone(Array.isArray(children) ? children : [children]);
    if (!targets.length) return;
    const group = Array.isArray(children), child = targets[0], date = room.date;
    const remaining = new Map(targets.map(target => [target.id,target]));
    let draft = null, saving = false;
    settingsOpen = true; formArea.replaceChildren();
    const opener = document.activeElement;
    const dialog = node('dialog', '', 'cloud-game-dialog cloud-game-editor');
    const title = group ? 'Family Games — all children' : child.name + ' — Family Games';
    dialog.setAttribute('aria-label', title);
    const form = node('form', '', 'cloud-game-settings');
    const top = node('header', '', 'cloud-game-settings-header');
    const close = button('Close', () => dialog.close(), false, 'x'); close.setAttribute('aria-label','Close game settings');
    const titleHeading = heading('h3', title, 'sliders-horizontal'); titleHeading.tabIndex = -1; titleHeading.autofocus = true;
    top.append(titleHeading,close);
    const body = node('div', '', 'cloud-game-settings-body');
    if (group) body.append(node('p', targets.length + ' children: ' + targets.map(c => c.name).join(', '), 'cloud-game-settings-targets'),
      node('p', 'Starts with ' + child.name + '’s settings. Saving applies every choice below to all ' + targets.length + ' children. You can still edit each child separately.', 'cloud-note'));
    const fields = node('div', '', 'cloud-game-settings-grid'); body.append(fields);
    const field = (label, name, type, value) => {
      const wrap = node('label', label, type === 'checkbox' ? 'cloud-game-check' : 'cloud-game-field'), input = document.createElement('input'); input.name = name; input.type = type;
      if (type === 'checkbox') input.checked = value; else input.value = value;
      if (type === 'checkbox') wrap.prepend(input); else wrap.append(input); fields.append(wrap); return input;
    };
    field('Enable family games', 'enabled', 'checkbox', child.settings.enabled);
    const minutes = field('Daily minutes (0–240)', 'dailyMinutes', 'number', child.settings.dailyMinutes); minutes.min = '0'; minutes.max = '240'; minutes.required = true;
    field('Finish required schoolwork first', 'requireSchool', 'checkbox', child.settings.requireSchool);
    field('Bypass schoolwork today only', 'unlock', 'checkbox', child.settings.unlockDate === date);
    const opens = field('Opens', 'start', 'time', child.settings.start); opens.required = true;
    const ends = field('Closes (blank means midnight)', 'end', 'time', child.settings.end === '24:00' ? '' : child.settings.end);
    const days = node('fieldset'); days.append(node('legend','Allowed days'));
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach((day,index) => { const label = node('label', day), check = document.createElement('input'); check.type = 'checkbox'; check.name = 'day'; check.value = index; check.checked = child.settings.days.includes(index); label.prepend(check); days.append(label); });
    const dayPresets = node('div', '', 'cloud-game-day-presets');
    for (const [label,values] of [['Every day',[0,1,2,3,4,5,6]],['Weekdays',[1,2,3,4,5]],['Weekends',[0,6]]]) dayPresets.append(button(label, () => {
      days.querySelectorAll('input').forEach(input => { input.checked = values.includes(Number(input.value)); });
    }));
    body.append(days,dayPresets,node('p', 'Hours use ' + room.timeZone + '. These choices also update Daily Plan. A schoolwork bypass lasts today only; time limits, allowed hours and chores still apply.', 'cloud-note'));
    const saveLabel = group ? 'Save for all ' + targets.length + ' children' : 'Save settings';
    const save = button(saveLabel, () => {}, false, 'save'); save.classList.add('btn-primary'); save.type = 'submit';
    const cancel = button('Cancel', () => dialog.close());
    const review = button('Review latest settings', async () => { dialog.close(); await refresh(); if (fresh) openSettings(group ? room.children : room.children.find(c => c.id === child.id) || []); }); review.hidden = true;
    const actions = node('div', '', 'cloud-game-actions'); actions.append(cancel,review,save);
    const message = node('p', '', 'cloud-game-settings-feedback'); message.setAttribute('role','status'); message.setAttribute('aria-live','polite');
    const footer = node('footer', '', 'cloud-game-settings-footer'); footer.append(message,actions);
    form.append(top,body,footer);
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (saving) return;
      if (!draft) {
        const values = new FormData(form);
        draft = { enabled:values.has('enabled'), requireSchool:values.has('requireSchool'), dailyMinutes:Number(values.get('dailyMinutes')), start:values.get('start'), end:values.get('end') || '24:00', days:values.getAll('day').map(Number), unlockDate:values.has('unlock') ? date : null };
        if (!draft.days.length || draft.start >= draft.end) {
          message.textContent = !draft.days.length ? 'Choose at least one allowed day.' : 'Choose a closing time after the opening time, or leave it blank for midnight.';
          message.dataset.state = 'error'; (!draft.days.length ? days.querySelector('input') : ends).focus(); draft = null; return;
        }
      }
      saving = true; save.disabled = cancel.disabled = close.disabled = true;
      body.querySelectorAll('input,button').forEach(control => { control.disabled = true; });
      message.dataset.state = ''; const errors = []; let conflict = false;
      for (const target of remaining.values()) {
        message.textContent = 'Saving ' + target.name + '…';
        try {
          const receipt = await request('settings', {studentId:target.id,revision:target.revision,expectedSettings:target.settings,settings:draft});
          if (receipt?.saved !== true) throw new Error('The save was not confirmed. Please retry.');
          remaining.delete(target.id);
        } catch (error) { errors.push(target.name + ': ' + gameMessage(error)); conflict ||= error.status === 409; }
      }
      saving = false; cancel.disabled = close.disabled = false;
      if (!remaining.size) {
        dialog.close(); await refresh();
        status.textContent = group ? 'Settings saved for all ' + targets.length + ' children.' : 'Settings saved for ' + child.name + '.';
      } else {
        message.dataset.state = 'error';
        message.textContent = (group ? (targets.length - remaining.size) + ' of ' + targets.length + ' saved. ' : '') + errors.join(' ') + (conflict ? ' Review the latest settings before trying again.' : ' Retry keeps these choices and only saves children still waiting.');
        save.textContent = group ? 'Retry remaining (' + remaining.size + ')' : 'Retry save'; save.disabled = conflict;
        cancel.textContent = 'Close'; review.hidden = !conflict;
      }
    });
    dialog.append(form); formArea.append(dialog); icons(); dialog.showModal();
    dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
    dialog.addEventListener('close', () => { dialog.remove(); settingsOpen = !!formArea.querySelector('dialog[open]'); if (!settingsOpen && opener?.isConnected) opener.focus({preventScroll:true}); });
  }
  function openExtraTime(child) {
    settingsOpen = true; formArea.replaceChildren();
    const opener = document.activeElement;
    const dialog = node('dialog', '', 'cloud-game-dialog'); dialog.setAttribute('aria-label', `Extra game time for ${child.name}`);
    const panel = node('div', '', 'cloud-game-settings');
    panel.append(heading('h3', `Extra game time for ${child.name}`, 'clock-3'),
      node('p', `Choose extra minutes for today (${room.date}). This does not change ${child.name}’s regular daily limit or bypass school, chore, or game-hour rules.`, 'cloud-note'));
    const actions = node('div', '', 'cloud-game-actions');
    const message = node('p'); message.setAttribute('role', 'status');
    let pendingGrant = null;
    for (const minutes of [15,30,60]) {
      const grant = button(`+${minutes} minutes`, async () => {
        if (!pendingGrant || pendingGrant.minutes !== minutes) pendingGrant = {requestId:crypto.randomUUID(),studentId:child.id,minutes};
        [...actions.querySelectorAll('button')].forEach(control => { control.disabled = true; });
        message.textContent = 'Saving extra game time…';
        try {
          await request('add-time', pendingGrant);
          pendingGrant = null; dialog.close(); await refresh();
        } catch (error) {
          message.textContent = `${error.message} Retry the same amount if the response was interrupted.`;
          if (error.status >= 400 && error.status < 500 && ![408,429].includes(error.status)) pendingGrant = null;
        } finally { [...actions.querySelectorAll('button')].forEach(control => { control.disabled = false; }); }
      }, false, 'clock-plus');
      actions.append(grant);
    }
    actions.append(button('Cancel', () => dialog.close(), false, 'x'));
    panel.append(actions, message); dialog.append(panel); formArea.append(dialog); icons(); dialog.showModal();
    dialog.addEventListener('close', () => { settingsOpen = false; formArea.replaceChildren(); opener?.focus({preventScroll:true}); });
  }
  function render() {
    const focusedElement = document.activeElement;
    const focusedSquare = content.contains(document.activeElement) && document.activeElement.classList.contains('cloud-checkers-square') ? document.activeElement.getAttribute('aria-label')?.split(' ')[0] : null;
    controlsView(); updateCurrentAccess(); updateTimeNotice(); renderExternalState();
    if (!room) { content.replaceChildren(); return; }
    const people = node('aside', '', 'cloud-game-people'); people.append(heading('h3', parent ? 'Family game access' : 'Your family', 'users-round'));
    people.append(node('p', parent ? 'Choose when each child can play.' : tabletop ? 'Family Games access and daily time.' : 'Invite a sibling to play Checkers.', 'cloud-note'));
    if (parent && room.children.length) { const all = button('Settings for all children', () => openSettings(room.children), !fresh || busy, 'users-round'); all.classList.add('btn-primary','cloud-game-settings-all'); people.append(all); }
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
        if (child.settings?.bonusDate === room.date && child.settings.bonusMinutes) row.append(node('p', `+${child.settings.bonusMinutes} parent minutes today`, 'cloud-note'));
        const parentActions = node('div', '', 'cloud-game-actions');
        parentActions.append(button('Access & game time', () => openSettings(child), !fresh || busy, 'sliders-horizontal'),
          button('Add game time today', () => openExtraTime(child), !fresh || busy, 'clock-plus'));
        row.append(parentActions);
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
      if (childLibrary) { boardArea.replaceChildren(onlineRoot, tabletopRoot); play.append(boardArea); }
      else play.append(onlineRoot,tabletopRoot);
      if(parent&&room.matches.length){const old=node('details');old.append(node('summary','Previous online Checkers matches'),matches);if(match)old.append(display);play.append(old);}
    }else{if (match) play.append(display);play.append(matches);}
    play.append(gallery);
    content.replaceChildren(people, play); applyChildView(); icons();
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
      room = result; fresh = true; failures = 0; exhaustedByAction = false;
      if (!room.matches.some(m => m.id === selected)) selected = room.matches.find(m => m.status === 'active')?.id || room.matches[0]?.id || null;
      if (!pending) note(`Updated ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
    } catch (error) { if (ticket === generation) { fresh = false; failures++; note(`${error.message} Moves are paused; your saved match is not deleted.`); } }
    finally {
      loading = false;
      if (ticket === generation) render();
      if (active && !document.hidden && !external.playing && (!tabletop||parent)) timer = setTimeout(refresh, Math.min(parent?1800000:60000,(parent ? 1800000 : 5000)*2**Math.min(failures,4)));
    }
  }
  function setActive(value) { active = value; onlineUI.setActive(value); clearTimeout(timer); if (active) refresh(); else { generation++; fresh = false; square = null; root.querySelectorAll('dialog').forEach(dialog => dialog.close()); } }
  function clear() { messaging = null; timeRequest = null; requestStates.clear(); exhaustedByAction = false; childView = 'adventures'; onlineUI.clear(); generation++; room = null; selected = null; square = null; pending = null; fresh = false; settingsOpen = false; root.querySelectorAll('dialog').forEach(dialog => dialog.close()); formArea.replaceChildren(); render(); }
  document.addEventListener('visibilitychange', () => { clearTimeout(timer); fresh = false; if (!document.hidden && active) refresh(); else render(); });
  window.addEventListener('pagehide', () => { active = false; clear(); clearTimeout(timer); });
  return { setActive, clear, refresh, reportError, setMessageState, setExternalState, setLanState:value=>tabletopUI?.setState(value), isEditing: () => settingsOpen };
}
