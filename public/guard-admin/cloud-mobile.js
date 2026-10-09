// The parent phone layout uses the same authenticated cloud actions as desktop.
import { preparePhotoForUpload } from './parent-photo-upload.js';
export function setupCloudMobile({ navigate, refresh }) {
  const byId = id => document.getElementById(id);
  const make = (tag, className, text = '') => { const el = document.createElement(tag); el.className = className; el.textContent = text; return el; };
  const button = (label, action, className = 'secondary') => {
    const el = make('button', className, label); el.type = 'button'; el.addEventListener('click', action); return el;
  };
  const icon = name => { const el = make('i', ''); el.dataset.lucide = name; el.setAttribute('aria-hidden', 'true'); return el; };
  const root = byId('admin-dashboard');
  const main = root.querySelector('.main-content');
  const media = window.matchMedia('(max-width: 900px), (pointer: coarse) and (max-width: 1180px)');
  const expanded = new Set();
  const header = make('header', 'app-header cloud-mobile-only');
  const brand = make('div', '');
  brand.append(make('p', 'eyebrow', 'Parent dashboard'), make('h1', '', 'BodeeGuard'));
  const actions = make('div', 'header-actions');
  const assistant = byId('parent-assistant-launcher');
  const assistantHome = document.createComment('Assistant desktop position');
  assistant?.before(assistantHome);
  if (assistant) assistant.title = 'Ask BodeeGuard';
  const reload = button('↻', () => void refresh(), 'icon-button'); reload.setAttribute('aria-label', 'Refresh dashboard');
  const account = make('a', 'text-button mobile-account-button', 'Parent account'); account.href = '/guard/account/'; account.target = '_top';
  actions.append(reload, account); header.append(brand, actions); root.prepend(header);

  const menus = {};
  for (const [id, title] of [['mobile-add', 'Add schoolwork & media'], ['mobile-more', 'More']]) {
    const nav = button(title, () => navigate(id), 'nav-item'); nav.dataset.tab = id; nav.hidden = true;
    root.querySelector('.sidebar-nav').append(nav);
    const section = make('section', 'tab-content cloud-mobile-menu'); section.id = `tab-${id}`;
    section.setAttribute('aria-label', title); section.append(make('h1', '', title));
    const list = make('div', 'more-list'); section.append(list); main.append(section); menus[id] = list;
  }
  const accountLinks = make('nav', 'mobile-account-links');
  accountLinks.setAttribute('aria-label', 'Parent account and computer setup');
  for (const [label, detail, href, symbol] of [
    ['Set up a child computer', 'Get the installer and connect a child’s PC from your phone.', '/guard/account/?setup=connect', 'laptop'],
    ['Parent account', 'Manage your account, subscription and computers.', '/guard/account/', 'user-round']
  ]) {
    const link = make('a', 'mobile-account-link'); link.href = href; link.target = '_top';
    const mark = make('i', ''); mark.dataset.lucide = symbol; mark.setAttribute('aria-hidden', 'true');
    const copy = make('span', ''); copy.append(make('strong', '', label), make('small', '', detail));
    const arrow = make('i', ''); arrow.dataset.lucide = 'chevron-right'; arrow.setAttribute('aria-hidden', 'true');
    link.append(mark, copy, arrow); accountLinks.append(link);
  }
  const report = make('a', 'mobile-account-link cloud-report-bug');
  report.href = '/guard/report/'; report.target = '_top';
  const reportCopy = make('span', ''); reportCopy.append(make('strong', '', 'Report a bug'), make('small', '', 'Tell us what happened, by typing or recording.'));
  report.append(icon('bug'), reportCopy, icon('chevron-right')); accountLinks.prepend(report);
  const desktopReport = make('a', 'nav-item cloud-report-bug', 'Report a bug');
  desktopReport.href = '/guard/report/'; desktopReport.target = '_top'; desktopReport.prepend(icon('bug'));
  root.querySelector('.sidebar-nav').append(desktopReport);
  menus['mobile-more'].before(accountLinks);
  const reportNotice=make('a','cloud-student-report-banner');reportNotice.href='/guard/report/#student-reports';reportNotice.target='_top';reportNotice.hidden=true;main.prepend(reportNotice);
  const reportNoticeText=make('span','cloud-student-report-copy');
  reportNotice.append(icon('triangle-alert'),reportNoticeText,icon('chevron-right'));
  let reportCountBusy=false;
  async function refreshStudentReports(){
    if(reportCountBusy||document.hidden)return;reportCountBusy=true;
    try{const response=await fetch('/guard/report/api/',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'student-count'}),signal:AbortSignal.timeout(10000)});if(!response.ok)return;const data=await response.json(),count=Math.max(0,Math.min(999,Number(data.count)||0));reportNotice.hidden=!count;reportNoticeText.textContent=count===1?'Your child reported a problem · Review report':count+' student problem reports · Review';reportCopy.querySelector('small').textContent=count?count+' student '+(count===1?'report needs':'reports need')+' your review.':'Tell us what happened, or review a child’s report.';desktopReport.setAttribute('aria-label',count?'Report a bug · '+count+' student reports to review':'Report a bug');}catch{/* Leave the saved inbox available if this badge cannot refresh. */}finally{reportCountBusy=false;}
  }
  window.addEventListener('cloud-student-report-refresh',()=>void refreshStudentReports());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshStudentReports();});
  void refreshStudentReports();

  const addTabs = ['music', 'videos', 'audiobooks', 'learning-videos', 'spelling', 'vocabulary', 'poems', 'worksheets'];
  for (const nav of root.querySelectorAll('.sidebar .nav-item[data-tab]')) {
    const id = nav.dataset.tab;
    if (nav.hidden || nav.style.display === 'none' || id.startsWith('mobile-')) continue;
    const label = nav.textContent.trim();
    const menuButton = () => button(label + '  ›', () => navigate(id));
    menus['mobile-more'].append(menuButton());
  }
  const addMenu = byId('tab-mobile-add');
  addMenu.classList.add('mobile-media-hub');
  const schoolHeading = make('h2', 'mobile-section-heading', 'Schoolwork');
  menus['mobile-add'].before(schoolHeading);
  menus['mobile-add'].className = 'mobile-schoolwork-choices';
  for (const [id, title, glyph, description] of [
    ['spelling', 'Spelling', 'spell-check', 'Create or assign a word list'],
    ['vocabulary', 'Vocabulary', 'book-a', 'Add words for your children'],
    ['poems', 'Poems', 'book-open', 'Scan or assign a poem'],
    ['worksheets', 'Worksheets', 'file-text', 'Add a worksheet or assignment'],
    ['learning-videos', 'Learning videos', 'graduation-cap', 'Add a lesson video']
  ]) {
    if (!byId('tab-' + id)) continue;
    const card = make('div', 'mobile-schoolwork-choice'); card.dataset.schoolworkKind = id;
    const open = button('', () => navigate(id), 'mobile-schoolwork-open');
    const symbol = make('span', 'mobile-schoolwork-symbol'); symbol.append(icon(glyph));
    const copy = make('span', 'mobile-schoolwork-copy'); copy.append(make('strong', '', title), make('small', '', description));
    open.append(symbol, copy, icon('chevron-right'));
    open.setAttribute('aria-label', 'Open ' + title.toLowerCase());
    card.append(open); menus['mobile-add'].append(card);
  }
  const mediaHeading = make('h2', 'mobile-section-heading mobile-media-heading', 'Videos, music & audiobooks');
  menus['mobile-add'].after(mediaHeading);
  const mediaIntro = make('p', 'mobile-media-intro', 'Find something on YouTube, review it, then choose who can see it.');
  mediaHeading.after(mediaIntro);
  const mediaChoices = make('div', 'mobile-media-choices');
  mediaIntro.after(mediaChoices);
  for (const [id, title, glyph, description, inputId, subtab] of [
    ['videos', 'Videos', 'video', 'Add a video for your children', 'video-yt-url', '[data-vstab="vlib"]'],
    ['music', 'Music', 'music-2', 'Add a song from YouTube', 'music-yt-url', '[data-stab="mlib"]'],
    ['audiobooks', 'Audiobooks', 'headphones', 'Add a book or read-aloud', 'ab-youtube-url', '[data-abtab="ab-library"]']
  ]) {
    const card = make('div', 'mobile-media-choice'); card.dataset.mediaKind = id;
    const open = button('', () => openMedia(true), 'mobile-media-open');
    const symbol = make('span', 'mobile-media-symbol'); symbol.append(icon(glyph));
    const copy = make('span', 'mobile-media-copy'); copy.append(make('strong', '', title), make('small', '', description));
    open.append(symbol, copy, icon('chevron-right'));
    open.setAttribute('aria-label', 'Add ' + title.toLowerCase());
    const library = button('View library and playlists', () => openMedia(false), 'mobile-media-library');
    library.prepend(icon('library'));
    card.append(open, library); mediaChoices.append(card);
    function openMedia(add) {
      const panel = byId('tab-' + id);
      const input = byId(inputId);
      const form = input?.closest('.settings-section');
      if (!panel) return;
      if (!panel.querySelector('.mobile-media-toolbar')) {
        const toolbar = make('div', 'mobile-media-toolbar cloud-mobile-only');
        const back = button('', () => navigate('mobile-add'), 'text-button');
        back.append(icon('arrow-left'), document.createTextNode('Add media'));
        const heading = make('h1', '', title);
        const manage = button('View library', () => openMedia(false), 'btn btn-secondary mobile-media-manage');
        manage.prepend(icon('library'));
        toolbar.append(back, heading, manage); panel.prepend(toolbar);
      }
      panel.classList.add('mobile-media-page');
      panel.classList.toggle('mobile-media-add', Boolean(add && form));
      panel.querySelector('.mobile-media-toolbar h1').textContent = (add && form ? 'Add ' : '') + title.toLowerCase();
      if (form) {
        form.classList.add('mobile-media-add-form');
        input.parentElement.classList.add('mobile-media-link-row');
        for (let parent = form.parentElement; parent && parent !== panel; parent = parent.parentElement) parent.classList.add('mobile-media-add-path');
        form.querySelector('[id$="preview"]')?.classList.add('mobile-media-preview');
      }
      if (!add) panel.querySelector(subtab)?.click();
      navigate(id);
      window.lucide?.createIcons();
    }
  }
  const install = button('Add to Home Screen', () => window.parent.postMessage({ type: 'bodeeguard-install' }, window.location.origin));
  install.classList.add('cloud-parent-mobile-install'); install.hidden = true;
  menus['mobile-more'].prepend(install);
  const desktopInstall = button('', () => window.parent.postMessage({ type: 'bodeeguard-install' }, window.location.origin), 'nav-item cloud-parent-install');
  desktopInstall.hidden = true;
  const appIcon = make('i', 'nav-icon'); appIcon.dataset.lucide = 'app-window'; appIcon.setAttribute('aria-hidden', 'true');
  desktopInstall.append(appIcon, document.createTextNode('Install parent app'));
  desktopInstall.title = 'Open BodeeGuard in its own app window; pin it to your taskbar';
  const sidebar = root.querySelector('.sidebar'), accountBadge = byId('admin-user-badge');
  if (accountBadge) {
    const footer = make('div', 'cloud-sidebar-footer'); accountBadge.before(footer);
    const clients = sidebar.querySelector('.sidebar-clients'); if (clients) footer.append(clients);
    footer.append(desktopInstall, accountBadge);
  } else sidebar.append(desktopInstall);
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== window.location.origin || event.data?.type !== 'bodeeguard-pwa-display') return;
    desktopInstall.hidden = install.hidden = Boolean(event.data.standalone);
  });
  window.parent.postMessage({ type: 'bodeeguard-pwa-state-request' }, window.location.origin);
  const bottom = make('nav', 'bottom-nav cloud-mobile-only'); bottom.setAttribute('aria-label', 'BodeeGuard navigation');
  const tabs = [['overview', '⌂', 'Controls'], ['grades', '▣', 'Papers'], ['messages', '✉', 'Messages'], ['mobile-add', '＋', 'Add media'], ['mobile-more', '•••', 'More']];
  for (const [id, icon, label] of tabs) {
    const nav = button('', () => navigate(id), 'nav-button'); nav.dataset.mobileTab = id;
    nav.append(make('span', '', icon), make('small', '', label)); bottom.append(nav);
  }
  root.append(bottom);
  const shortcut = button('', () => navigate('grades'), 'mobile-paper-shortcut cloud-mobile-only');
  const paperIcon = make('span', 'mobile-paper-shortcut-icon'); paperIcon.append(icon('camera'));
  shortcut.append(paperIcon, make('strong', '', 'Papers'));
  shortcut.setAttribute('aria-label', 'Photograph school papers'); shortcut.title = 'Photograph school papers';
  byId('overview-grid').before(shortcut);
  const overviewShortcuts = make('nav', 'mobile-overview-shortcuts cloud-mobile-only');
  overviewShortcuts.setAttribute('aria-label', 'Parent tools');
  const abekaShortcut = byId('cloud-abeka-parent-shortcut');
  if (abekaShortcut) {
    abekaShortcut.append(make('span', 'mobile-overview-shortcut-label cloud-mobile-only', 'Abeka unlocks'));
    abekaShortcut.setAttribute('aria-label', 'Abeka test unlocks — Assessment permissions');
    abekaShortcut.title = 'Abeka test unlocks — Parent sign-in';
  }
  // Move the existing controls, so their handlers and optional visibility stay intact.
  // Anchors return them to their original desktop positions when the viewport grows.
  const overviewTools = [abekaShortcut, root.querySelector('.chore-summary'), shortcut].filter(Boolean).map(control => {
    const anchor = document.createComment('Parent tool position'); control.before(anchor);
    return { control, anchor };
  });
  overviewTools[0].anchor.before(overviewShortcuts);
  // Camera input feeds the existing upload form and its normal validation.
  const file = byId('cloud-paper-file');
  if (file && !file.dataset.gradebookCamera) {
    const camera = make('input', ''); camera.type = 'file'; camera.accept = 'image/*'; camera.setAttribute('capture', 'environment'); camera.hidden = true;
    const takePhoto = button('Take a photo', () => camera.click(), 'btn btn-primary cloud-mobile-only');
    file.before(takePhoto, camera);
    camera.addEventListener('change', async () => {
      if (!camera.files?.length || file.disabled) return;
      const photo = camera.files[0]; const submit = byId('cloud-paper-upload');
      takePhoto.disabled = true; const wasDisabled = submit.disabled; submit.disabled = true;
      const status = byId('cloud-files-status'); status.textContent = 'Preparing photo…';
      try {
        if (photo.size > 20 * 1024 * 1024) throw new Error('Choose a photo smaller than 20 MB.');
        let prepared = await preparePhotoForUpload(photo);
        if (prepared.byteSize > 2 * 1024 * 1024) prepared = await preparePhotoForUpload(photo, { maxEdge: 1400, quality: 0.7 });
        if (prepared.byteSize > 2 * 1024 * 1024) throw new Error('This photo is too large. Try a smaller photo.');
        const bytes = Uint8Array.from(atob(prepared.dataUrl.split(',')[1]), char => char.charCodeAt(0));
        const transfer = new DataTransfer(); transfer.items.add(new File([bytes], 'School-paper.jpg', { type: 'image/jpeg' }));
        if (!file.disabled) { file.files = transfer.files; file.dispatchEvent(new Event('change', { bubbles: true })); status.textContent = 'Photo ready. Choose a child and tap Upload paper.'; }
      } catch (error) { status.textContent = error.message; }
      finally { camera.value = ''; takePhoto.disabled = false; submit.disabled = wasDisabled; }
    });
  }
  const spellingCoach = byId('tab-spelling')?.querySelector('.spelling-coach-panel');
  let coachDetails;
  if (spellingCoach) {
    coachDetails = make('details', 'mobile-spelling-coach');
    const summary = make('summary', '');
    summary.append(icon('brain-circuit'), make('span', '', 'Spelling coach settings'), icon('chevron-down'));
    const content = make('div', 'mobile-spelling-coach-body');
    while (spellingCoach.firstChild) content.append(spellingCoach.firstChild);
    coachDetails.append(summary, content); spellingCoach.append(coachDetails);
  }
  const heading = byId('tab-overview').querySelector('h1'); const desktopHeading = heading?.textContent;
  function resize() {
    document.body.classList.toggle('cloud-mobile', media.matches);
    for (const { control, anchor } of overviewTools) {
      if (media.matches) overviewShortcuts.append(control); else anchor.after(control);
    }
    if (coachDetails) coachDetails.open = !media.matches;
    if (assistant) { if (media.matches) actions.prepend(assistant); else assistantHome.after(assistant); }
    if (heading) heading.textContent = media.matches ? 'Quick controls' : desktopHeading;
    for (const card of document.querySelectorAll('.monitor-card')) placeQuickUnlock(card);
    if (!media.matches && document.querySelector('.cloud-mobile-menu.active')) navigate('overview');
  }
  function placeQuickUnlock(card) {
    const quick = card.querySelector('.monitor-quick-unlock');
    const top = card.querySelector('.monitor-card-top');
    const primary = card.querySelector('.monitor-primary-actions');
    if (!quick || !top || !primary) return;
    if (media.matches) top.insertBefore(quick, top.querySelector('.mobile-card-toggle'));
    else primary.prepend(quick);
  }
  media.addEventListener('change', resize); resize();
  return {
    setActive(id) {
      const selected = tabs.some(([tab]) => tab === id) ? id : addTabs.includes(id) ? 'mobile-add' : 'mobile-more';
      for (const nav of bottom.children) {
        const active = nav.dataset.mobileTab === selected; nav.classList.toggle('active', active);
        if (active) nav.setAttribute('aria-current', 'page'); else nav.removeAttribute('aria-current');
      }
      if (media.matches) main.scrollTop = 0;
    },
    decorateCard(card, id) {
      card.classList.add('student-card');
      const top = card.querySelector('.monitor-card-top');
      const body = make('div', 'mobile-card-body'); body.id = `mobile-card-${id}`;
      for (const child of [...card.children]) if (child !== top) body.append(child);
      const shortcuts = make('div', 'cloud-actions cloud-mobile-only');
      shortcuts.append(button('Screenshots', () => navigate('screenshots'), 'btn btn-secondary'));
      body.append(shortcuts);
      const toggle = button('', () => {
        if (expanded.has(id)) expanded.delete(id); else expanded.add(id);
        card.classList.toggle('is-open', expanded.has(id)); toggle.setAttribute('aria-expanded', String(expanded.has(id)));
      }, 'icon-button cloud-mobile-only mobile-card-toggle');
      toggle.append(icon('chevron-down'));
      toggle.setAttribute('aria-label', `Controls for ${card.querySelector('.monitor-name').textContent}`);
      toggle.setAttribute('aria-controls', body.id); toggle.setAttribute('aria-expanded', String(expanded.has(id)));
      top.append(toggle); card.append(body); card.classList.toggle('is-open', expanded.has(id));
      const quick = card.querySelector('.monitor-quick-unlock');
      if (quick) { quick.setAttribute('aria-label', `Quick Unlock for ${card.querySelector('.monitor-name').textContent}`); quick.title = `Quick Unlock for ${card.querySelector('.monitor-name').textContent}`; }
      placeQuickUnlock(card);
    }
  };
}
