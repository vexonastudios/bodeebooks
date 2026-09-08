// The parent phone layout uses the same authenticated cloud actions as desktop.
import { preparePhotoForUpload } from './parent-photo-upload.js';
export function setupCloudMobile({ navigate, refresh }) {
  const byId = id => document.getElementById(id);
  const make = (tag, className, text = '') => { const el = document.createElement(tag); el.className = className; el.textContent = text; return el; };
  const button = (label, action, className = 'secondary') => {
    const el = make('button', className, label); el.type = 'button'; el.addEventListener('click', action); return el;
  };
  const root = byId('admin-dashboard');
  const main = root.querySelector('.main-content');
  const media = window.matchMedia('(max-width: 900px), (pointer: coarse) and (max-width: 1180px)');
  const expanded = new Set();
  const header = make('header', 'app-header cloud-mobile-only');
  const brand = make('div', '');
  brand.append(make('p', 'eyebrow', 'Parent dashboard'), make('h1', '', 'BodeeGuard'));
  const actions = make('div', 'header-actions');
  const reload = button('↻', () => void refresh(), 'icon-button'); reload.setAttribute('aria-label', 'Refresh dashboard');
  const account = make('a', 'text-button', 'Account'); account.href = '/guard/account/'; account.target = '_top';
  actions.append(reload, account); header.append(brand, actions); root.prepend(header);

  const menus = {};
  for (const [id, title] of [['mobile-add', 'Add media & schoolwork'], ['mobile-more', 'More']]) {
    const nav = button(title, () => navigate(id), 'nav-item'); nav.dataset.tab = id; nav.hidden = true;
    root.querySelector('.sidebar-nav').append(nav);
    const section = make('section', 'tab-content cloud-mobile-menu'); section.id = `tab-${id}`;
    section.setAttribute('aria-label', title); section.append(make('h1', '', title));
    const list = make('div', 'more-list'); section.append(list); main.append(section); menus[id] = list;
  }
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
  menus['mobile-more'].prepend(install);
  const bottom = make('nav', 'bottom-nav cloud-mobile-only'); bottom.setAttribute('aria-label', 'BodeeGuard navigation');
  const tabs = [['overview', '⌂', 'Controls'], ['grades', '▣', 'Papers'], ['messages', '✉', 'Messages'], ['mobile-add', '＋', 'Add media'], ['mobile-more', '•••', 'More']];
  for (const [id, icon, label] of tabs) {
    const nav = button('', () => navigate(id), 'nav-button'); nav.dataset.mobileTab = id;
    nav.append(make('span', '', icon), make('small', '', label)); bottom.append(nav);
  }
  root.append(bottom);
  const shortcut = button('', () => navigate('grades'), 'mobile-paper-shortcut cloud-mobile-only');
  shortcut.append(make('span', 'mobile-paper-shortcut-icon', '▣'), make('strong', '', 'Photograph school papers'), make('b', '', '›'));
  byId('overview-grid').before(shortcut);
  // Camera input feeds the existing upload form and its normal validation.
  const file = byId('cloud-paper-file');
  if (file) {
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
  const heading = byId('tab-overview').querySelector('h1'); const desktopHeading = heading?.textContent;
  function resize() {
    document.body.classList.toggle('cloud-mobile', media.matches);
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
      shortcuts.append(button('Messages', () => navigate('messages'), 'btn btn-secondary'), button('Screenshots', () => navigate('screenshots'), 'btn btn-secondary'));
      body.append(shortcuts);
      const toggle = button(expanded.has(id) ? '⌃' : '⌄', () => {
        if (expanded.has(id)) expanded.delete(id); else expanded.add(id);
        card.classList.toggle('is-open', expanded.has(id)); toggle.setAttribute('aria-expanded', String(expanded.has(id)));
        toggle.textContent = expanded.has(id) ? '⌃' : '⌄';
      }, 'icon-button cloud-mobile-only');
      toggle.setAttribute('aria-label', `Controls for ${card.querySelector('.monitor-name').textContent}`);
      toggle.setAttribute('aria-controls', body.id); toggle.setAttribute('aria-expanded', String(expanded.has(id)));
      const total = body.querySelector('.monitor-timer-value');
      if (total) top.append(make('span', 'mobile-card-time cloud-mobile-only', total.textContent));
      top.append(toggle); card.append(body); card.classList.toggle('is-open', expanded.has(id));
    }
  };
}
