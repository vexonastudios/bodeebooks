export const PLAN_GROUPS = [
  ['school', 'School', 'Required on selected days. Other days are optional.', 'graduation-cap'],
  ['after_school', 'Open after school', 'Opens when today’s required work is done, or on days off.', 'party-popper'],
  ['scheduled', 'Certain days & times', 'Available during the hours you choose.', 'calendar-clock'],
  ['anytime', 'No school requirement', 'Activities without a school-completion requirement.', 'sun'],
  ['blocked', 'Not allowed', 'Hidden from this child. Drag an activity out to allow it again.', 'lock-keyhole']
];
// A catalog entry, not an assignment. Quizlet stays off until a parent allows it.
const quizlet = () => ({ key:'preset:quizlet', preset:'quizlet', title:'Quizlet Study', icon:'layers', color:'#4255ff',
  url:'https://quizlet.com/', goal:0, placement:'blocked', previousPlacement:'anytime', days:[0,1,2,3,4,5,6], start:null, end:null, limitMinutes:null });
const names = { games:'Games', 'art-studio': 'Art Studio', 'coloring-studio': 'Coloring Studio', notebook: 'Writing', typing: 'Typing School', words: 'Confused Words', 'math-coach': 'Math Coach', 'learning-videos': 'Learning Videos', poems: 'Poems' };
const icons = { music: 'music', videos: 'video', audiobooks: 'headphones', typing: 'keyboard', spelling: 'spell-check', vocabulary: 'book-a', poems: 'mic', notebook: 'notebook-pen', 'art-studio': 'palette', 'coloring-studio': 'paintbrush', 'math-coach': 'calculator', geography: 'globe', piano: 'piano', logic: 'brain', reading: 'book-open' };
icons.games = 'gamepad-2';
const mediaKinds = { music: 'music', videos: 'video', audiobooks: 'audiobook', games:'family_game' };
const defaultDays = placement => placement === 'school' ? [1,2,3,4,5] : [0,1,2,3,4,5,6];
export function movePlanCard(card, placement) {
  if (card.placement === placement) return;
  const previous = card.placement === 'blocked' ? card.previousPlacement || 'anytime' : card.placement;
  // Required work days and allowed activity days have different meanings.
  // Keep draft choices when moving back, but never carry an all-day catalog
  // default into School (or weekday requirements into after-school access).
  card.daysByPlacement = { ...card.daysByPlacement, [previous]: [...card.days] };
  if (placement !== 'blocked') card.days = [...(card.daysByPlacement[placement] || defaultDays(placement))];
  card.previousPlacement = previous;
  card.placement = placement;
  card.accessChanged = true;
  card.disabled = false;
  if (placement === 'scheduled' && !card.start) { card.start = '15:00'; card.end = '18:00'; }
  if (placement === 'school' && !card.portal && !card.assignedWork && !card.goal) card.goal = 15;
}
export function useSchoolWeekdays(cards) {
  const changed = cards.filter(card => card.placement === 'school' && !isSchoolWeekdays(card.days));
  for (const card of changed) card.days = defaultDays('school');
  return changed;
}
export function isSchoolWeekdays(days) {
  return days.length === 5 && defaultDays('school').every(day => days.includes(day));
}
export function dailyPlanCards(snapshot, details, studentId) {
  const activities = snapshot.schoolActivities || [], cards = [], seen = new Set();
  for (const subject of snapshot.rules.subjects) {
    const assignment = Array.isArray(subject.assignments) ? subject.assignments.find(a => a.studentId === studentId) : { dailyGoalMinutes: 30 };
    // Main schools belong to their assigned children; optional websites belong
    // in the catalog even before they have an assignment.
    if (!assignment && subject.isSchoolPortal) continue;
    const module = activities.find(a => a.url === subject.url)?.module;
    if (!assignment && module && subject.planOnly) continue;
    if (module) seen.add(module);
    const stats = details.media?.[mediaKinds[module]], plan = assignment?.dailyPlan;
    const placement = plan?.placement || (subject.accessTier === 'after_school' || subject.isReward ? 'after_school' : subject.accessTier === 'school_optional' ? subject.scheduleStart ? 'scheduled' : 'anytime' : 'school');
    cards.push({ key: subject.id, subjectId: subject.id, module, ...(subject.planOnly && subject.portalProvider === 'quizlet' ? {preset:'quizlet'} : {}), title: subject.title, icon: subject.icon || icons[module] || 'book-open', url: subject.url, color: subject.color, alwaysOpen: subject.alwaysOpen,
      goal: subject.isSchoolPortal || ['spelling','vocabulary','poems'].includes(module) ? 0 : assignment?.dailyGoalMinutes ?? 0, portal: subject.isSchoolPortal,
      placement: subject.active === false || !assignment || assignment.active === false ? 'blocked' : placement, previousPlacement:placement, globallyDisabled:subject.active === false,
      days: plan?.days || subject.scheduleDays || stats?.days || defaultDays(placement),
      start: plan ? plan.start : subject.scheduleStart || stats?.startTime || null, end: plan ? plan.end : subject.scheduleEnd || stats?.endTime || null,
      limitMinutes: plan?.limitMinutes ?? stats?.limitMinutes ?? null, disabled: plan?.enabled !== true && (details.features?.[module] === false || stats?.enabled === false),
      assignedWork: ['spelling','vocabulary','poems'].includes(module), requiredNow: details.requirements?.find(r => r.module === module)?.required === true });
  }
  for (const activity of activities) {
    const module = activity.module;
    if (!activity.ready || seen.has(module)) continue;
    seen.add(module);
    const stats = details.media?.[mediaKinds[module]], requiredNow = details.requirements?.find(r => r.module === module)?.required === true;
    const placement = stats?.requireCompletion ? 'after_school' : requiredNow ? 'school' : 'anytime';
    cards.push({ key: `module:${module}`, module, title: names[module] || module.charAt(0).toUpperCase() + module.slice(1), icon: icons[module] || 'sparkles', url: activity.url,
      goal: module === 'typing' ? 15 : 0, placement, days: stats?.days || defaultDays(placement),
      start: stats?.startTime || null, end: stats?.endTime || null, limitMinutes: stats?.limitMinutes ?? null,
      disabled: details.features?.[module] === false || stats?.enabled === false, assignedWork: ['spelling','vocabulary','poems'].includes(module), requiredNow });
  }
  if (!snapshot.rules.subjects.some(s => s.portalProvider === 'quizlet' || /^https:\/\/(www\.)?quizlet\.com\//i.test(s.url || ''))) cards.push(quizlet());
  for (const card of cards) if (card.disabled && card.placement !== 'blocked') { card.previousPlacement = card.placement; card.placement = 'blocked'; }
  return cards;
}
export function planCardKey(card) {
  return card.portal ? 'school' : card.preset ? `preset:${card.preset}` : card.module ? `module:${card.module}` : `subject:${card.subjectId}`;
}
export function differsFromFamily(card, template) {
  const entry = template?.activities?.find(item => item.key === planCardKey(card));
  if (!entry) return true;
  if ((card.placement !== 'blocked') !== (entry.enabled !== false)) return true;
  if (card.placement === 'blocked') return false;
  return card.placement !== entry.placement || (!card.portal && !card.assignedWork && card.goal !== entry.goal)
    || JSON.stringify([...card.days].sort()) !== JSON.stringify([...entry.days].sort())
    || (card.start || null) !== (entry.start || null) || (card.end || null) !== (entry.end || null)
    || (card.limitMinutes ?? null) !== (entry.limitMinutes ?? null);
}
export function saveDailyPlan(snapshot, studentId, changes, newId = () => crypto.randomUUID()) {
  const subjects = structuredClone(snapshot.rules.subjects);
  if (!snapshot.students.some(s => s.id === studentId && !s.archived_at)) throw Error('Choose a child.');
  for (const card of changes) {
    if (card.preset === 'quizlet' && card.placement === 'blocked' && !card.subjectId) continue;
    // Reuse the family activity row; only its child assignment changes. Ten
    // children with the same twenty activities must not need 200 subjects.
    let subject = subjects.find(s => s.id === card.subjectId) || subjects.find(s => s.planOnly && s.url === card.url && s.active !== false);
    if (!subject) {
      subject = { id: newId(), title: card.title, kind: card.preset === 'quizlet' ? 'website' : 'activity', url: card.url, icon: card.icon, active: true, accessTier: 'school_optional', planOnly: true, assignments: [],
        ...(card.preset === 'quizlet' ? { portalProvider:'quizlet', isSchoolPortal:false, alwaysOpen:true, color:'#4255ff', allowedDomains:['quizlet.com','accounts.google.com'] } : {}) };
      subjects.push(subject);
    }
    if (subject.active === false && card.placement !== 'blocked') {
      // Enable only the chosen child. Previously global-off siblings must stay off.
      if (!card.accessChanged) throw Error(`${card.title} is turned off. Move it to an allowed group to enable it for this child.`);
      subject.assignments = snapshot.students.map(student => ({ ...(subject.assignments?.find(a => a.studentId === student.id) || { studentId:student.id, dailyGoalMinutes:0 }), active:false }));
      subject.active = true;
    }
    if (!subject.assignments) subject.assignments = snapshot.students.map(s => ({ studentId: s.id, dailyGoalMinutes: 30 }));
    let assignment = subject.assignments.find(a => a.studentId === studentId);
    if (!assignment) { assignment = { studentId, dailyGoalMinutes: 0 }; subject.assignments.push(assignment); }
    if (!Number.isInteger(card.goal) || card.goal < 0 || card.goal > 480) throw Error('Choose a school goal from 0 to 480 minutes.');
    if (card.limitMinutes !== null && (!Number.isInteger(card.limitMinutes) || card.limitMinutes < 1 || card.limitMinutes > 480)) throw Error('Choose daily media minutes from 1 to 480.');
    if (card.placement === 'school' && card.limitMinutes !== null && card.goal > card.limitMinutes) throw Error(`The ${card.title} school goal cannot exceed its daily media limit.`);
    if (card.placement === 'school' && !card.portal && !card.assignedWork && card.module && card.goal === 0) throw Error(`Set a time goal for ${card.title}.`);
    if (!card.days.length) throw Error(`Choose at least one day for ${card.title}.`);
    if ((!!card.start !== !!card.end) || card.start && card.start >= card.end || card.placement === 'scheduled' && !card.start) throw Error(`Choose valid hours for ${card.title}.`);
    const blocked = card.placement === 'blocked';
    assignment.dailyGoalMinutes = card.portal || card.assignedWork ? 0 : card.goal; assignment.active = !blocked;
    assignment.dailyPlan = { placement: blocked ? card.previousPlacement || 'anytime' : card.placement, days: card.days, start: card.start || null, end: card.end || null, limitMinutes: card.limitMinutes,
      ...(card.accessChanged ? {enabled:!blocked} : typeof assignment.dailyPlan?.enabled === 'boolean' ? {enabled:assignment.dailyPlan.enabled} : {}) };
  }
  if (subjects.length > 30) throw Error('Your plan supports up to 30 distinct subjects. Remove unused subjects first.');
  return { revision: snapshot.rules.revision, subjects, schedule: structuredClone(snapshot.rules.schedule) };
}

// Templates contain only plan choices. A child's school URL, assignments,
// feature switches, activity records and media banks are never copied.
export function familyPlanCards(snapshot, template = snapshot.rules.dailyPlanTemplate) {
  const baseline = dailyPlanCards({ ...snapshot, rules: { ...snapshot.rules, subjects: [] } }, {}, 'family');
  for (const card of baseline) {
    if (mediaKinds[card.module]) { card.limitMinutes = { music: 60, videos: 20, audiobooks: 120, games:60 }[card.module]; card.placement = 'after_school'; }
  }
  baseline.unshift({ key: 'school', title: 'Each child’s school website', icon: 'graduation-cap', portal: true, goal: 0,
    placement: 'school', days: defaultDays('school'), start: null, end: null, limitMinutes: null });
  for (const subject of snapshot.rules.subjects) {
    if (subject.isSchoolPortal || snapshot.schoolActivities.some(a => a.url === subject.url)) continue;
    const owner = snapshot.students.find(s => !s.archived_at && (!subject.assignments || subject.assignments.some(a => a.studentId === s.id && a.active !== false)));
    const card = dailyPlanCards(snapshot, {}, owner?.id || 'family').find(c => c.subjectId === subject.id);
    if (card) baseline.push({ ...card, key: `subject:${subject.id}` });
  }
  if (baseline.some(c => c.subjectId && (snapshot.rules.subjects.find(s => s.id === c.subjectId)?.portalProvider === 'quizlet' || /^https:\/\/(www\.)?quizlet\.com\//i.test(c.url || '')))) baseline.splice(baseline.findIndex(c => c.preset === 'quizlet'), 1);
  for (const card of baseline) {
    // Color describes the activity, not its placement or family plan settings.
    const subject = snapshot.rules.subjects.find(s => s.active !== false && s.url === card.url);
    if (subject?.color) card.color = subject.color;
    const saved = template?.activities?.find(entry => entry.key === card.key || card.preset && entry.key === `preset:${card.preset}`);
    if (saved) { Object.assign(card, structuredClone(saved)); if (saved.enabled === false) { card.previousPlacement = saved.placement; card.placement = 'blocked'; } }
  }
  return baseline;
}

export function templateFromCards(cards) {
  const entries = new Map();
  for (const card of cards) {
    const key = card.portal ? 'school' : card.preset ? `preset:${card.preset}` : card.module ? `module:${card.module}` : card.key.startsWith('subject:') ? card.key : `subject:${card.subjectId}`;
    if (!entries.has(key)) entries.set(key, { key, goal: card.portal ? 0 : card.goal, placement: card.placement === 'blocked' ? card.previousPlacement || 'anytime' : card.placement,
      ...(card.placement === 'blocked' || card.accessChanged || typeof card.enabled === 'boolean' ? { enabled:card.placement !== 'blocked' } : {}),
      days: [...card.days], start: card.start || null, end: card.end || null, limitMinutes: card.limitMinutes ?? null });
  }
  return { version: 1, activities: [...entries.values()] };
}

export function applyFamilyPlan(snapshot, template, studentIds, newId = () => crypto.randomUUID()) {
  if (!template?.activities?.length) throw Error('Save a family default first.');
  if (!studentIds.length || new Set(studentIds).size !== studentIds.length || studentIds.some(id => !snapshot.students.some(s => s.id === id && !s.archived_at)))
    throw Error('Choose children from this family.');
  let current = structuredClone(snapshot);
  for (const studentId of studentIds) {
    const changes = [];
    for (const card of dailyPlanCards(current, {}, studentId)) {
      const key = card.portal ? 'school' : card.preset ? `preset:${card.preset}` : card.module ? `module:${card.module}` : `subject:${card.subjectId}`;
      const entry = template.activities.find(item => item.key === key || item.key === 'preset:quizlet' && (card.preset === 'quizlet' || current.rules.subjects.find(s => s.id === card.subjectId)?.portalProvider === 'quizlet'));
      if (!entry) continue;
      if (card.placement === 'blocked' && entry.enabled !== true && entry.enabled !== false) continue;
      // A fallback module card must not reactivate an explicitly hidden subject.
      if (entry.enabled !== true && !card.subjectId && current.rules.subjects.some(subject => current.schoolActivities.some(a => a.url === subject.url && a.module === card.module)
        && (subject.active === false || subject.assignments?.some(a => a.studentId === studentId && a.active === false)))) continue;
      changes.push({ ...card, ...structuredClone(entry), key: card.key, accessChanged:typeof entry.enabled === 'boolean', placement:entry.enabled === false ? 'blocked' : entry.placement, previousPlacement:entry.placement, goal: card.portal || card.assignedWork ? 0 : entry.goal });
    }
    current = { ...current, rules: { ...current.rules, ...saveDailyPlan(current, studentId, changes, newId) } };
  }
  return { revision: snapshot.rules.revision, subjects: current.rules.subjects };
}
