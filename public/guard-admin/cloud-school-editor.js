import { editSubjects, assignmentFor } from './cloud-workspace-model.js';

export function cloudSubjectEdit(captured, subjectId, form) {
  const subject = captured.rules.subjects.find(item => item.id === subjectId), kind = form.get('kind');
  const assignments = captured.students.flatMap(student => {
    const current = subject ? assignmentFor(subject, student.id) : null, active = form.get(`assigned-${student.id}`) === 'on';
    if (!active && !current) return [];
    return [{ ...(current?.dailyPlan ? { dailyPlan: current.dailyPlan } : {}), studentId: student.id, active,
      dailyGoalMinutes: active ? Number(form.get(`goal-${student.id}`)) : current.dailyGoalMinutes,
      displayOrder: active ? Number(form.get(`order-${student.id}`)) : current.displayOrder ?? subject?.displayOrder ?? 0 }];
  });
  const provider = kind === 'website' ? form.get('portalProvider') : 'none';
  return editSubjects(captured, subjectId, form.get('title'), kind === 'website' ? form.get('url') : kind === 'activity' ? form.get('activityUrl') : '', false, assignments, {
    kind, accessTier: form.get('accessTier'), active: form.get('active') === 'on', icon: form.get('icon'), color: form.get('color'), description: form.get('description'),
    displayOrder: Number(form.get('displayOrder')), unlockAfterSubjectId: form.get('unlockAfterSubjectId') || null, isReward: form.get('isReward') === 'on',
    isSchoolPortal: provider !== 'none', portalProvider: provider, idleMonitoringEnabled: subject?.idleMonitoringEnabled === true,
    gradeCaptureEnabled: kind === 'website' && subject?.gradeCaptureEnabled === true,
    scheduleStart: form.get('scheduleStart') || null, scheduleEnd: form.get('scheduleEnd') || null,
    allowedDomains: kind === 'website' ? String(form.get('allowedDomains') || '').split(/[,\n\r]+/).map(value => value.trim()).filter(Boolean) : []
  });
}

export function editCloudSubject({ snapshot, editor, field, selectField, node, button, mutate, close, showError }, subject = null) {
  if (!document.getElementById('cloud-subject-editor-style')) { const style = document.createElement('link'); style.id = 'cloud-subject-editor-style'; style.rel = 'stylesheet'; style.href = '/guard-admin/cloud-school-editor.css?v=20260910-wide1'; document.head.append(style); }
  const glyph = name => { const el = node('i'); el.dataset.lucide = name; el.setAttribute('aria-hidden', 'true'); return el; };
  const panel = (title, symbol, ...fields) => { const el = node('section', 'cloud-subject-panel'), heading = node('h3', '', title); heading.prepend(glyph(symbol)); el.append(heading, ...fields); return el; };
  const pair = (...fields) => { const el = node('div', 'cloud-subject-pair'); el.append(...fields); return el; };
  const captured = structuredClone(snapshot), subjectId = subject?.id || crypto.randomUUID();
  const kind = subject?.kind || (subject?.url?.startsWith('app://') ? 'activity' : subject && !subject.url ? 'offline' : 'website');
  const checkbox = (label, name, checked) => { const wrapper = node('label', 'cloud-schedule-toggle'), input = node('input'); input.type = 'checkbox'; input.name = name; input.checked = checked; wrapper.append(input, node('span', '', label)); return wrapper; };
  const numberField = (label, name, value, max = 100000) => { const wrapper = field(label, name, value, { type: 'number' }), input = wrapper.querySelector('input'); input.min = '0'; input.max = String(max); input.step = '1'; return wrapper; };
  const kindField = selectField('Subject type', 'kind', [{ value: 'website', label: 'School website' }, { value: 'activity', label: 'Learning activity' }, { value: 'offline', label: 'Offline schoolwork' }], kind);
  const website = field('School website', 'url', kind === 'website' ? subject?.url || '' : '', { type: 'url', maxLength: 2048 });
  const choices = (captured.schoolActivities || []).filter(activity => activity.ready && activity.url === `app://${activity.module}` || activity.url === subject?.url)
    .map(activity => ({ value: activity.url, label: `${activity.module.replaceAll('-', ' ')}${activity.ready ? '' : ' (still connecting)'}` }));
  if (kind === 'activity' && !choices.some(choice => choice.value === subject.url)) choices.push({ value: subject.url, label: 'Retained original activity' });
  const activity = selectField('Learning activity', 'activityUrl', choices, kind === 'activity' ? subject.url : choices[0]?.value || '');
  const domainsLabel = node('label', '', 'Additional allowed domains (optional)'), domains = node('textarea', 'admin-input'); domains.name = 'allowedDomains'; domains.rows = 3; domains.maxLength = 5100;
  domains.value = (subject?.allowedDomains || []).join('\n'); domains.placeholder = 'quizzes.example.com\nlogin.example.com'; domainsLabel.append(domains);
  const provider = selectField('School provider', 'portalProvider', ['none', 'abeka', 'bju', 'quizlet', 'custom'].map(value => ({ value, label: ({ none: 'No provider completion', abeka: 'Abeka', bju: 'BJU', quizlet: 'Quizlet', custom: 'Other school portal' })[value] })),
    subject?.portalProvider || (kind === 'website' && subject?.isSchoolPortal === true ? 'custom' : 'none'));
  const capture = checkbox('Original provider grade capture setting (still connecting)', 'gradeCaptureEnabled', subject?.gradeCaptureEnabled === true);
  const idle = checkbox('Original idle monitoring setting (still connecting)', 'idleMonitoringEnabled', subject?.idleMonitoringEnabled === true);
  idle.querySelector('input').disabled = true;
  const domainsHelp = node('p', 'cloud-note', 'Each approved website domain includes its subdomains over HTTPS. The school website is already allowed.');
  let websiteExtras = null;
  function changeKind() {
    const selected = kindField.querySelector('select').value;
    website.hidden = selected !== 'website'; website.querySelector('input').required = selected === 'website'; website.querySelector('input').disabled = selected !== 'website';
    activity.hidden = selected !== 'activity'; activity.querySelector('select').required = selected === 'activity'; activity.querySelector('select').disabled = selected !== 'activity';
    for (const wrapper of [domainsLabel, provider, capture]) { wrapper.hidden = selected !== 'website'; wrapper.querySelector('input,textarea,select').disabled = selected !== 'website'; }
    capture.querySelector('input').disabled = true;
    domainsHelp.hidden = selected !== 'website';
    if (websiteExtras) websiteExtras.hidden = selected !== 'website';
  }
  kindField.querySelector('select').addEventListener('change', changeKind); changeKind();
  const description = node('label', '', 'Description'), descriptionInput = node('textarea', 'admin-input'); descriptionInput.name = 'description'; descriptionInput.rows = 2; descriptionInput.maxLength = 1000; descriptionInput.value = subject?.description || ''; description.append(descriptionInput);
  const basics = panel('Subject details', 'notebook-pen', field('Name', 'title', subject?.title || ''), kindField, website, activity, provider, description, checkbox('Show this subject', 'active', subject?.active !== false));
  const availability = panel('Availability', 'calendar-clock',
    selectField('Available as', 'accessTier', [{ value: 'school', label: 'Required schoolwork' }, { value: 'school_optional', label: 'Optional schoolwork' }, { value: 'after_school', label: 'After required schoolwork is complete' }], subject?.accessTier || 'school'),
    selectField('Complete this subject first', 'unlockAfterSubjectId', [{ value: '', label: 'No prerequisite' }, ...captured.rules.subjects.filter(item => item.id !== subjectId).map(item => ({ value: item.id, label: item.title + (item.active === false ? ' (hidden)' : '') }))], subject?.unlockAfterSubjectId || ''),
    pair(field('From (optional)', 'scheduleStart', subject?.scheduleStart || '', { type: 'time', required: false }), field('Until (optional)', 'scheduleEnd', subject?.scheduleEnd || '', { type: 'time', required: false })),
    checkbox('Place with rewards', 'isReward', subject?.isReward === true),
    node('p', 'cloud-note', 'Uses your family time zone. After-school access also checks required subjects and assigned Spelling, Vocabulary and Poems.'));
  const iconOptions = [['book-open','Book'],['graduation-cap','Graduation cap'],['school','School'],['laptop','Computer'],['notebook-pen','Writing'],['pencil','Pencil'],['calculator','Math'],['flask-conical','Science'],['globe','Geography'],['languages','Languages'],['spell-check','Spelling'],['keyboard','Typing'],['music','Music'],['headphones','Audiobooks'],['palette','Art'],['brain','Thinking'],['star','Star']].map(([value,label]) => ({value,label}));
  const currentIcon = subject?.icon || 'book-open';
  if (!iconOptions.some(item => item.value === currentIcon)) iconOptions.push({ value: currentIcon, label: 'Current icon' });
  const iconField = selectField('Subject icon', 'icon', iconOptions, currentIcon), preview = node('div', 'cloud-subject-icon-preview'); preview.setAttribute('aria-hidden','true');
  const iconPicker = node('div', 'cloud-subject-icon-picker'); iconPicker.append(preview, iconField);
  const color = field('Color', 'color', subject?.color || '#38bdf8', { type: 'color' });
  const previewIcon = () => { preview.replaceChildren(glyph(iconField.querySelector('select').value)); preview.style.color = color.querySelector('input').value; window.lucide?.createIcons(); };
  iconField.querySelector('select').addEventListener('change', previewIcon); color.querySelector('input').addEventListener('input', previewIcon);
  websiteExtras = node('div', 'cloud-subject-website'); const websiteHeading = node('h4', '', 'Website access'); websiteHeading.prepend(glyph('globe')); websiteExtras.append(websiteHeading, domainsLabel, domainsHelp);
  const retained = node('details', 'cloud-subject-retained'), retainedHeading = node('summary', '', 'Retained monitoring settings'); retainedHeading.prepend(glyph('history')); retained.append(retainedHeading, capture, idle, node('p', 'cloud-note', 'Original grade capture and idle settings are retained for transfer. Automatic provider capture and idle monitoring are still being connected. Use Daily school completion for parent review.'));
  const appearance = panel('Appearance & website', 'palette', iconPicker, pair(color, numberField('Default order', 'displayOrder', subject?.displayOrder || 0)), websiteExtras, retained);
  const assignmentFields = node('fieldset', 'cloud-assignment-fields cloud-subject-assignments'), legend = node('legend', '', 'Children & daily goals'); legend.prepend(glyph('users')); assignmentFields.append(legend, node('p', 'cloud-note', 'Choose who uses this subject. 0 minutes means no time goal; it does not mark schoolwork complete.'));
  const assignmentGrid = node('div', 'cloud-subject-children'); assignmentFields.append(assignmentGrid);
  for (const student of captured.students) {
    const current = subject ? assignmentFor(subject, student.id) : { dailyGoalMinutes: 30 }, row = node('div', 'cloud-assignment-row');
    const enabled = node('input'); enabled.type = 'checkbox'; enabled.name = `assigned-${student.id}`; enabled.checked = Boolean(current && current.active !== false); enabled.setAttribute('aria-label', `Assign to ${student.name}`);
    const goal = numberField('Goal (minutes)', `goal-${student.id}`, current?.dailyGoalMinutes ?? 30, 480), order = numberField('Child order', `order-${student.id}`, current?.displayOrder ?? subject?.displayOrder ?? 0);
    const update = () => { for (const wrapper of [goal, order]) { const input = wrapper.querySelector('input'); input.disabled = !enabled.checked; input.required = enabled.checked; } };
    const childLabel = node('label', 'cloud-subject-child'); childLabel.append(enabled, node('span', '', student.name + (student.archived_at ? ' (archived; settings retained)' : '')));
    enabled.addEventListener('change', update); update(); row.append(childLabel, goal, order); assignmentGrid.append(row);
  }
  if (subject?.assignments?.some(a => a.dailyPlan)) assignmentFields.append(node('p', 'cloud-note', 'This subject has individual Daily plan settings. Change its placement and days in Daily plan.'));
  if (!captured.students.length) assignmentFields.append(node('p', 'cloud-note', 'Add a student before assigning this subject.'));
  const grid = node('div', 'cloud-subject-grid'); grid.append(basics, availability, appearance, assignmentFields);
  let remove = null;
  if (subject) { remove = button('Remove subject', async () => {
    if (!confirm(`Remove ${subject.title} from cloud school? Its history is retained. Hide the subject instead to retain its assignments and prerequisites.`)) return;
    try { await mutate('save-subjects', editSubjects(captured, subject.id, '', '', true)); close(); } catch (error) { showError(error.message); }
  }, 'btn btn-danger cloud-subject-remove'); remove.prepend(glyph('trash-2')); remove.title = 'Remove subject'; }
  changeKind();
  editor(subject ? 'Edit Subject' : 'Add Subject', [grid], form => mutate('save-subjects', cloudSubjectEdit(captured, subjectId, form)));
  document.getElementById('cloud-editor-title')?.prepend(glyph(subject ? 'notebook-pen' : 'plus'));
  const dialog = document.getElementById('cloud-editor');
  if (remove && dialog?.open) { dialog.querySelector('.modal-actions')?.prepend(remove); dialog.addEventListener('close', () => remove.remove(), { once: true }); }
  for (const [selector, name] of [['#cloud-editor-cancel','x'],['button[type="submit"]','save']]) { const control = dialog?.querySelector(selector); if (control && !control.querySelector('svg,i')) control.prepend(glyph(name), document.createTextNode(' ')); }
  previewIcon();
}
