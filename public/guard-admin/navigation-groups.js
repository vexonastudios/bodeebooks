const STORAGE_KEY = 'bodeeguard-admin-nav-groups-v1';

function readOpenGroups() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return new Set(Array.isArray(saved) ? saved.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveOpenGroups() {
  try {
    const open = [...document.querySelectorAll('.nav-group.open')]
      .map(group => group.dataset.navGroup)
      .filter(Boolean);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(open));
  } catch {
    // Navigation remains usable when browser storage is unavailable.
  }
}

function setGroupOpen(group, open, { persist = true } = {}) {
  if (!group) return;
  const toggle = group.querySelector(':scope > .nav-group-toggle');
  const items = group.querySelector(':scope > .nav-group-items');
  if (!toggle || !items) return;
  group.classList.toggle('open', open);
  toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  items.hidden = !open;
  if (persist) saveOpenGroups();
}

function syncGroupAttention(group) {
  const toggle = group.querySelector(':scope > .nav-group-toggle');
  const items = group.querySelector(':scope > .nav-group-items');
  const indicator = toggle?.querySelector('.nav-group-alert');
  if (!toggle || !items || !indicator) return;
  const needsAttention = [...items.querySelectorAll('.alert-badge, .help-badge')].some(badge => (
    !badge.hidden && getComputedStyle(badge).display !== 'none'
  ));
  indicator.hidden = !needsAttention;
  const label = toggle.querySelector('span')?.textContent?.trim() || 'Navigation group';
  toggle.setAttribute('aria-label', needsAttention ? `${label}, needs attention` : label);
}

export function activateSidebarGroupForItem(item) {
  document.querySelectorAll('.nav-group').forEach(group => group.classList.remove('has-active'));
  const group = item?.closest?.('.nav-group');
  if (!group) return;
  group.classList.add('has-active');
  setGroupOpen(group, true);
}

export function setupSidebarGroups() {
  const savedOpenGroups = readOpenGroups();
  document.querySelectorAll('.nav-group').forEach(group => {
    const toggle = group.querySelector(':scope > .nav-group-toggle');
    const items = group.querySelector(':scope > .nav-group-items');
    if (!toggle || !items) return;
    const activeItem = items.querySelector('.nav-item.active');
    const shouldOpen = Boolean(activeItem || savedOpenGroups.has(group.dataset.navGroup));
    group.classList.toggle('has-active', Boolean(activeItem));
    setGroupOpen(group, shouldOpen, { persist: false });
    toggle.addEventListener('click', () => setGroupOpen(group, !group.classList.contains('open')));
    const observer = new MutationObserver(() => syncGroupAttention(group));
    observer.observe(items, { attributes: true, attributeFilter: ['hidden', 'style', 'class'], childList: true, characterData: true, subtree: true });
    syncGroupAttention(group);
  });
}
