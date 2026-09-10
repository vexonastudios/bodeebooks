export const PLAN_GROUPS = [
  ['school', 'School', 'Finish these to open after-school activities.', 'graduation-cap'],
  ['after_school', 'Open after school', 'Opens automatically when required work is done.', 'party-popper'],
  ['scheduled', 'Certain days & times', 'Available during the hours you choose.', 'calendar-clock'],
  ['anytime', 'No school requirement', 'Activities without a school-completion requirement.', 'sun']
];
const names = { 'art-studio': 'Art Studio', 'coloring-studio': 'Coloring Studio', notebook: 'Writing', typing: 'Typing School', words: 'Confused Words', 'math-coach': 'Math Coach', 'learning-videos': 'Learning Videos', poems: 'Poems' };
const icons = { music: 'music', videos: 'video', audiobooks: 'headphones', typing: 'keyboard', spelling: 'spell-check', vocabulary: 'book-a', poems: 'mic', notebook: 'notebook-pen', 'art-studio': 'palette', 'coloring-studio': 'paintbrush', 'math-coach': 'calculator', geography: 'globe', piano: 'piano', logic: 'brain', reading: 'book-open' };
const mediaKinds = { music: 'music', videos: 'video', audiobooks: 'audiobook' };
export function dailyPlanCards(snapshot, details, studentId) {
  const activities = snapshot.schoolActivities || [], cards = [], seen = new Set();
  for (const subject of snapshot.rules.subjects) {
    if (subject.active === false) continue;
    const assignment = Array.isArray(subject.assignments) ? subject.assignments.find(a => a.studentId === studentId && a.active !== false) : { dailyGoalMinutes: 30 };
    if (!assignment) continue;
    const module = activities.find(a => a.url === subject.url)?.module;
    if (module) seen.add(module);
    const stats = details.media?.[mediaKinds[module]], plan = assignment.dailyPlan;
    const placement = plan?.placement || (subject.accessTier === 'after_school' || subject.isReward ? 'after_school' : subject.accessTier === 'school_optional' ? subject.scheduleStart ? 'scheduled' : 'anytime' : 'school');
    cards.push({ key: subject.id, subjectId: subject.id, module, title: subject.title, icon: subject.icon || icons[module] || 'book-open', url: subject.url,
      goal: assignment.dailyGoalMinutes, portal: subject.isSchoolPortal, placement, days: plan?.days || subject.scheduleDays || [0,1,2,3,4,5,6],
      start: plan ? plan.start : subject.scheduleStart || stats?.startTime || null, end: plan ? plan.end : subject.scheduleEnd || stats?.endTime || null,
      limitMinutes: plan?.limitMinutes ?? stats?.limitMinutes ?? null, disabled: details.features?.[module] === false || stats?.enabled === false,
      assignedWork: ['spelling','vocabulary','poems'].includes(module), requiredNow: details.requirements?.find(r => r.module === module)?.required === true });
  }
  for (const activity of activities) {
    const module = activity.module;
    if (!activity.ready || seen.has(module)) continue;
    seen.add(module);
    const stats = details.media?.[mediaKinds[module]], requiredNow = details.requirements?.find(r => r.module === module)?.required === true;
    cards.push({ key: `module:${module}`, module, title: names[module] || module.charAt(0).toUpperCase() + module.slice(1), icon: icons[module] || 'sparkles', url: activity.url,
      goal: module === 'typing' ? 15 : 0, placement: stats?.requireCompletion ? 'after_school' : requiredNow ? 'school' : 'anytime', days: [0,1,2,3,4,5,6],
      start: stats?.startTime || null, end: stats?.endTime || null, limitMinutes: stats?.limitMinutes ?? null,
      disabled: details.features?.[module] === false || stats?.enabled === false, assignedWork: ['spelling','vocabulary','poems'].includes(module), requiredNow });
  }
  return cards;
}
export function saveDailyPlan(snapshot, studentId, changes, newId = () => crypto.randomUUID()) {
  const subjects = structuredClone(snapshot.rules.subjects);
  if (!snapshot.students.some(s => s.id === studentId && !s.archived_at)) throw Error('Choose a child.');
  for (const card of changes) {
    // Reuse the family activity row; only its child assignment changes. Ten
    // children with the same twenty activities must not need 200 subjects.
    let subject = subjects.find(s => s.id === card.subjectId) || subjects.find(s => s.planOnly && s.url === card.url && s.active !== false);
    if (!subject) {
      subject = { id: newId(), title: card.title, kind: 'activity', url: card.url, icon: card.icon, active: true, accessTier: 'school_optional', planOnly: true, assignments: [] };
      subjects.push(subject);
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
    assignment.dailyGoalMinutes = card.goal; assignment.active = true;
    assignment.dailyPlan = { placement: card.placement, days: card.days, start: card.start || null, end: card.end || null, limitMinutes: card.limitMinutes };
  }
  if (subjects.length > 30) throw Error('Your plan supports up to 30 distinct subjects. Remove unused subjects first.');
  return { revision: snapshot.rules.revision, subjects, schedule: structuredClone(snapshot.rules.schedule) };
}
