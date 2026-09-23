import { activityAccent } from './cloud-activity-colors.js';
import { assignmentFor } from './cloud-workspace-model.js';

const groups = [
  ['websites', 'School & study websites', 'globe', 'School portals and other approved study links.'],
  ['learning', 'Learning activities', 'book-open', 'Practice and creative tools included with BodeeGuard.'],
  ['free-time', 'Media & free time', 'headphones', 'Listening, watching and games. Access is set in Daily Plan.'],
  ['offline', 'Offline work', 'notebook-pen', 'Paper assignments and work away from the computer.'],
];
const media = new Set(['app://music', 'app://audiobooks', 'app://videos', 'app://games']);
const groupFor = subject => subject.kind === 'offline' || !subject.url ? 'offline'
  : media.has(subject.url) ? 'free-time' : subject.url.startsWith('app://') ? 'learning' : 'websites';
function element(tag, className = '', text = '') {
  const item = document.createElement(tag); item.className = className; item.textContent = text; return item;
}
function icon(name, fallback = 'book-open') {
  const key = String(name || '').replace(/(^|-)([a-z\d])/g, (_, dash, letter) => letter.toUpperCase());
  const item = element('i');
  item.dataset.lucide = /^[a-z][a-z\d-]{0,79}$/.test(name || '') && window.lucide?.icons?.[key] ? name : fallback;
  item.setAttribute('aria-hidden', 'true'); return item;
}
function siteLabel(subject) {
  if (groupFor(subject) === 'offline') return 'Offline work';
  if (subject.url.startsWith('app://')) return 'Built-in activity';
  try { return new URL(subject.url).hostname.replace(/^www\./, ''); } catch { return 'School website'; }
}

export function setupActivityLibrary({ getSnapshot, editSubject, canEdit, handwriting = false }) {
  const byId = id => document.getElementById(id);
  const grid = byId('subjects-grid-admin'), search = byId('activity-library-search'), child = byId('activity-library-child');
  const picker = byId('activity-library-picker'), choices = byId('activity-library-choices');
  const presets = [
    ['website', 'globe', 'School or study website', 'Add Abeka, BJU, a math website or another approved link.'],
    ...(handwriting ? [['handwriting', 'pencil', 'Add Handwriting', 'Choose letters and paper practice for each child.']] : []),
    ['activity', 'blocks', 'Built-in activity', 'Add another entry for an included learning activity.'],
    ['offline', 'notebook-pen', 'Offline work', 'Track a workbook, reading assignment or other paper work.'],
  ];
  const websites = [
    ['abeka', 'school', 'Abeka Academy', 'Start with the Abeka school website.'],
    ['bju', 'school', 'Bob Jones / BJU Press', 'Start with the BJU Homeschool Hub website.'],
    ['quizlet', 'layers', 'Quizlet', 'Flashcards, practice tests and study sets.'],
    ['custom-website', 'globe', 'Another website', 'Enter any other school or study website.'],
  ];
  function showChoices(websiteStep = false) {
    choices.replaceChildren();
    byId('activity-library-picker-title').textContent = websiteStep ? 'School or study website' : 'Add an activity';
    byId('activity-library-picker-help').textContent = websiteStep ? 'Choose a starting link, then select the children who may use it.' : 'Choose what to add. You can organize it in Daily Plan after saving.';
    if (websiteStep) {
      const back = element('button', 'btn btn-secondary', 'Back to activity types'); back.type = 'button'; back.dataset.activityBack = 'true'; back.prepend(icon('arrow-left'));
      back.addEventListener('click', () => { showChoices(); choices.querySelector('button').focus(); }); choices.append(back);
    }
    for (const [preset, glyph, title, description] of websiteStep ? websites : presets) {
    const choice = element('button', 'activity-library-choice'); choice.type = 'button'; choice.dataset.activityPreset = preset; choice.dataset.cloudMutation = 'true'; choice.disabled = !canEdit();
    const copy = element('span'); copy.append(element('strong', '', title), element('span', '', description));
    choice.append(icon(glyph), copy, icon('chevron-right'));
    choice.addEventListener('click', () => {
      if (!canEdit()) return;
      if (preset === 'website') { showChoices(true); choices.querySelector('[data-activity-preset]').focus(); return; }
      picker.close(); editSubject(null, { preset: preset === 'custom-website' ? 'website' : preset });
    });
    choices.append(choice);
    }
    window.lucide?.createIcons();
  }
  byId('add-subject-btn').addEventListener('click', () => { if (canEdit()) { showChoices(); picker.showModal(); } });
  byId('activity-library-picker-close').addEventListener('click', () => picker.close());
  search.addEventListener('input', render); child.addEventListener('change', render);

  function render() {
    const snapshot = getSnapshot(); if (!snapshot) return;
    const students = snapshot.students.filter(student => !student.archived_at);
    const previous = child.value;
    child.replaceChildren(new Option('All children', ''), ...students.map(student => new Option(student.name, student.id)));
    child.value = students.some(student => student.id === previous) ? previous : '';
    const query = search.value.trim().toLocaleLowerCase();
    const subjects = snapshot.rules.subjects.filter(subject => {
      const assignment = child.value ? assignmentFor(subject, child.value) : null;
      return (!child.value || assignment && assignment.active !== false)
        && (!query || [subject.title, subject.description, subject.url].some(value => String(value || '').toLocaleLowerCase().includes(query)));
    });
    grid.replaceChildren();
    byId('activity-library-count').textContent = `${subjects.length} ${subjects.length === 1 ? 'activity' : 'activities'}${child.value ? ` assigned to ${students.find(student => student.id === child.value).name}` : ' in your library'}`;
    for (const [key, title, glyph, description] of groups) {
      const items = subjects.filter(subject => groupFor(subject) === key); if (!items.length) continue;
      const section = element('section', 'activity-library-group');
      const heading = element('h2', '', title); heading.id = `activity-group-${key}`; heading.prepend(icon(glyph)); heading.append(element('span', 'activity-library-group-count', String(items.length)));
      section.setAttribute('aria-labelledby', heading.id); section.append(heading, element('p', 'activity-library-group-help', description));
      const cards = element('div', 'activity-library-cards');
      for (const subject of items) {
        const card = element('button', 'subject-card-admin activity-library-card'); card.type = 'button'; card.dataset.cloudMutation = 'true'; card.dataset.subjectId = subject.id; card.disabled = !canEdit();
        card.style.setProperty('--activity-accent', activityAccent(subject));
        card.setAttribute('aria-label', `Edit details for ${subject.title}`); card.addEventListener('click', () => { if (canEdit()) editSubject(subject); });
        const top = element('span', 'activity-library-card-heading'), badge = element('span', 'activity-library-icon'); badge.append(icon(subject.icon));
        top.append(badge, element('strong', '', subject.title));
        const assigned = students.filter(student => { const assignment = assignmentFor(subject, student.id); return assignment && assignment.active !== false; });
        const state = element('span', 'activity-library-assignment'); state.append(icon('users'), element('span', '', assigned.length ? assigned.map(student => student.name).join(', ') : 'Not assigned yet'));
        card.append(top, element('span', 'activity-library-type', siteLabel(subject)));
        if (subject.description) card.append(element('span', 'activity-library-description', subject.description));
        const footer = element('span', 'activity-library-card-footer'); footer.append(element('span', '', 'Edit details'), icon('arrow-up-right'));
        if (subject.active === false) { const hidden = element('span', 'activity-library-hidden', 'Hidden from all children'); hidden.prepend(icon('eye-off')); card.append(hidden); }
        card.append(state, footer); cards.append(card);
      }
      section.append(cards); grid.append(section);
    }
    if (!subjects.length) {
      const empty = element('div', 'activity-library-empty'); empty.append(icon(query || child.value ? 'search' : 'library-big'), element('h2', '', query || child.value ? 'No matching activities' : 'Start your activity library'), element('p', '', query || child.value ? 'Try a different search or choose All children.' : 'Add a school website, a built-in activity or offline work. Then organize it in Daily Plan.')); grid.append(empty);
    }
    window.lucide?.createIcons();
  }
  return { render };
}
