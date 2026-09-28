// Parent-only access to Abeka's own account. Never load this in a student view.
export const ABEKA_ASSESSMENT_URL = 'https://athome.abeka.com/Account/Students/AssessmentPermissions.aspx';
const SHORTCUT_KEY = 'bodeeguard-parent-abeka-shortcut-v1';

export function familyUsesAbeka(snapshot) {
  const children = (snapshot?.students || []).filter(child => !child.archived_at);
  if (children.some(child => child.main_school?.provider === 'abeka')) return true;
  const ids = new Set(children.map(child => child.id));
  return (snapshot?.rules?.subjects || []).some(subject => {
    if (!subject.isSchoolPortal || subject.active === false) return false;
    const assigned = !Array.isArray(subject.assignments) ? ids.size > 0
      : subject.assignments.some(item => item.active !== false && ids.has(item.studentId));
    if (!assigned) return false;
    try {
      const url = new URL(subject.url);
      return url.protocol === 'https:' && !url.username && !url.password
        && (url.hostname === 'abeka.com' || url.hostname.endsWith('.abeka.com')
          || url.hostname === 'abekaacademy.com' || url.hostname.endsWith('.abekaacademy.com'));
    } catch { return false; }
  });
}

export function setupAbekaParent({ before, getSnapshot }) {
  const node = (tag, className, text = '') => {
    const element = document.createElement(tag); element.className = className;
    element.textContent = text; return element;
  };
  const icon = name => { const mark = node('i', ''); mark.dataset.lucide = name; mark.setAttribute('aria-hidden','true'); return mark; };
  const link = (label, className) => {
    const element = node('a', className, label);
    // Top-level navigation works inside the dashboard's sandbox and mobile PWA,
    // and lets Abeka retain its own login cookies and authentication redirects.
    element.href = ABEKA_ASSESSMENT_URL; element.target = '_top';
    element.referrerPolicy = 'no-referrer';
    return element;
  };
  let showShortcut = true;
  try { showShortcut = window.localStorage.getItem(SHORTCUT_KEY) !== 'hidden'; } catch { /* This preference is optional. */ }
  const shortcut = link('', 'cloud-abeka-parent-shortcut'); shortcut.id = 'cloud-abeka-parent-shortcut';
  const symbol = node('span','cloud-abeka-parent-symbol'); symbol.append(icon('key-round'));
  const copy = node('span','cloud-abeka-parent-copy');
  copy.append(node('strong','','Abeka test unlocks'),node('small','','Assessment permissions · Parent sign-in'));
  shortcut.append(symbol,copy,icon('arrow-up-right')); before.before(shortcut);

  const settings = node('section','cloud-panel cloud-abeka-parent-settings'); settings.id = 'cloud-abeka-parent-settings';
  settings.setAttribute('aria-labelledby','cloud-abeka-parent-title');
  const title = node('h3','','Abeka parent tools'); title.id = 'cloud-abeka-parent-title'; title.prepend(icon('key-round'));
  const description = node('p','cloud-note','For accredited students: manage quiz and test locks in Abeka Assessment Permissions. Sign in with your Abeka parent account if asked.');
  const open = link('Open Assessment Permissions','btn btn-secondary cloud-abeka-parent-open'); open.append(icon('arrow-up-right'));
  const label = node('label','cloud-abeka-parent-preference');
  const checkbox = node('input',''); checkbox.type = 'checkbox'; checkbox.checked = showShortcut;
  label.append(checkbox,document.createTextNode('Show Abeka test unlocks on this device’s dashboard'));
  settings.append(title,description,open,label,node('p','cloud-note','Opens Abeka in your browser. Use Back to return to BodeeGuard.'));
  document.querySelector('#tab-students .tab-header')?.after(settings);
  checkbox.addEventListener('change',()=>{
    showShortcut = checkbox.checked;
    try { window.localStorage.setItem(SHORTCUT_KEY,showShortcut ? 'shown' : 'hidden'); } catch { /* Still applies in this open dashboard. */ }
    render();
  });
  function render() {
    const available = familyUsesAbeka(getSnapshot());
    shortcut.hidden = !available || !showShortcut; settings.hidden = !available;
  }
  render();
  return { render };
}
