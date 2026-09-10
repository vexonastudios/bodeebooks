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
  function changeKind() {
    const selected = kindField.querySelector('select').value;
    website.hidden = selected !== 'website'; website.querySelector('input').required = selected === 'website'; website.querySelector('input').disabled = selected !== 'website';
    activity.hidden = selected !== 'activity'; activity.querySelector('select').required = selected === 'activity'; activity.querySelector('select').disabled = selected !== 'activity';
    for (const wrapper of [domainsLabel, provider, capture]) { wrapper.hidden = selected !== 'website'; wrapper.querySelector('input,textarea,select').disabled = selected !== 'website'; }
    capture.querySelector('input').disabled = true;
    domainsHelp.hidden = selected !== 'website';
  }
  kindField.querySelector('select').addEventListener('change', changeKind); changeKind();
  const description = node('label', '', 'Description'), descriptionInput = node('textarea', 'admin-input'); descriptionInput.name = 'description'; descriptionInput.rows = 2; descriptionInput.maxLength = 1000; descriptionInput.value = subject?.description || ''; description.append(descriptionInput);
  const fields = [field('Name', 'title', subject?.title || ''), kindField, website, activity,
    selectField('Available as', 'accessTier', [{ value: 'school', label: 'Required schoolwork' }, { value: 'school_optional', label: 'Optional schoolwork' }, { value: 'after_school', label: 'After required schoolwork is complete' }], subject?.accessTier || 'school'),
    checkbox('Show this subject', 'active', subject?.active !== false), field('Icon', 'icon', subject?.icon || 'book-open'), field('Color', 'color', subject?.color || '#38bdf8', { type: 'color' }), description,
    numberField('Default subject order', 'displayOrder', subject?.displayOrder || 0), checkbox('Place with rewards', 'isReward', subject?.isReward === true),
    selectField('Complete this subject first', 'unlockAfterSubjectId', [{ value: '', label: 'No prerequisite' }, ...captured.rules.subjects.filter(item => item.id !== subjectId).map(item => ({ value: item.id, label: item.title + (item.active === false ? ' (hidden)' : '') }))], subject?.unlockAfterSubjectId || ''),
    field('Available from (optional)', 'scheduleStart', subject?.scheduleStart || '', { type: 'time', required: false }), field('Available until (optional)', 'scheduleEnd', subject?.scheduleEnd || '', { type: 'time', required: false }),
    node('p', 'cloud-note', 'Subject hours use your family time zone. After-school access also checks required subjects, weekly Spelling, Vocabulary and Poems. Zero minutes means no time goal; it does not automatically complete schoolwork.'),
    domainsLabel, domainsHelp, provider, capture,
    idle, node('p', 'cloud-note', 'Original grade capture and idle settings are retained for transfer. Automatic provider capture and idle monitoring are still being connected. Use Daily school completion for parent review.')];
  const assignmentFields = node('fieldset', 'cloud-assignment-fields'); assignmentFields.append(node('legend', '', 'Children, daily goals and order'));
  for (const student of captured.students) {
    const current = subject ? assignmentFor(subject, student.id) : { dailyGoalMinutes: 30 }, row = node('div', 'cloud-assignment-row');
    const enabled = node('input'); enabled.type = 'checkbox'; enabled.name = `assigned-${student.id}`; enabled.checked = Boolean(current && current.active !== false); enabled.setAttribute('aria-label', `Assign to ${student.name}`);
    const goal = numberField('Goal (minutes)', `goal-${student.id}`, current?.dailyGoalMinutes ?? 30, 480), order = numberField('Child order', `order-${student.id}`, current?.displayOrder ?? subject?.displayOrder ?? 0);
    const update = () => { for (const wrapper of [goal, order]) { const input = wrapper.querySelector('input'); input.disabled = !enabled.checked; input.required = enabled.checked; } };
    enabled.addEventListener('change', update); update(); row.append(enabled, node('span', '', student.name + (student.archived_at ? ' (archived; settings retained)' : '')), goal, order); assignmentFields.append(row);
  }
  if (subject?.assignments?.some(a => a.dailyPlan)) assignmentFields.append(node('p', 'cloud-note', 'This subject has individual Daily plan settings. Change its placement and days in Daily plan.'));
  if (!captured.students.length) assignmentFields.append(node('p', 'cloud-note', 'Add a student before assigning this subject.')); fields.push(assignmentFields);
  if (subject) fields.push(button('Remove subject', async () => {
    if (!confirm(`Remove ${subject.title} from cloud school? Its history is retained. Hide the subject instead to retain its assignments and prerequisites.`)) return;
    try { await mutate('save-subjects', editSubjects(captured, subject.id, '', '', true)); close(); } catch (error) { showError(error.message); }
  }, 'btn btn-danger'));
  editor(subject ? 'Edit Subject' : 'Add Subject', fields, form => mutate('save-subjects', cloudSubjectEdit(captured, subjectId, form)));
}
