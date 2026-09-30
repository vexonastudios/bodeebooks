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
  for (const [id, title] of [['mobile-add', 'Add media & schoolwork'], ['mobile-more', 'More']]) {
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
  menus['mobile-more'].before(accountLinks);
  const addTabs = ['learning-videos', 'spelling', 'science-spelling', 'vocabulary', 'poems', 'worksheets'];
  for (const nav of root.querySelectorAll('.sidebar .nav-item[data-tab]')) {
    const id = nav.dataset.tab;
    if (nav.hidden || nav.style.display === 'none' || id.startsWith('mobile-')) continue;
    const label = nav.textContent.trim();
    const menuButton = () => button(label + '  ›', () => navigate(id));
    menus['mobile-more'].append(menuButton());
    if (addTabs.includes(id)) menus['mobile-add'].append(menuButton());
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
    if (!media.matches && document.querySelector('.cloud-mobile-menu.active')) navigate('overview');
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
      const total = body.querySelector('.monitor-timer-value');
      if (total) top.append(make('span', 'mobile-card-time cloud-mobile-only', total.textContent));
      top.append(toggle); card.append(body); card.classList.toggle('is-open', expanded.has(id));
    }
  };
}
