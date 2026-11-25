import { dailyPlanCards, familyPlanCards, planCardKey, saveDailyPlan, templateFromCards } from './cloud-daily-plan-model.js';
import { hasActivityPlan } from './cloud-parent-readiness.js?v=20261125-first-day';

function withAccess(card, enabled) {
  const placement = card.placement === 'blocked' ? card.previousPlacement || 'anytime' : card.placement;
  return { ...card, previousPlacement: placement, placement: enabled ? placement : 'blocked', accessChanged: true };
}

export async function loadFamilyActivities(snapshot, setup, readChild) {
  const { rules } = snapshot;
  const children = snapshot.students.filter(child => !child.archived_at);
  const defaults = familyPlanCards(snapshot).filter(card => card.module);
  const savedDefaults = new Set(rules.dailyPlanTemplate?.activities.map(entry => entry.key));
  const readyUrls = new Set(snapshot.schoolActivities.filter(activity => activity.ready).map(activity => activity.url));
  const legacyChoices = Object.keys(setup.features || {}).length > 0 || setup.children?.some(child => child.completed);
  const fresh = !rules.dailyPlanTemplate && !setup.completed && !legacyChoices && !snapshot.devices?.some(device => !device.revoked_at)
    && !rules.subjects.some(subject => !subject.isSchoolPortal && readyUrls.has(subject.url));

  const plans = await Promise.all(children.map(async child => {
    const assigned = subject => !Array.isArray(subject.assignments) || subject.assignments.some(a => a.studentId === child.id);
    const hasPlan = hasActivityPlan(rules, child.id);
    const newProfile = !hasPlan && !legacyChoices && !rules.subjects.some(s => readyUrls.has(s.url) && Array.isArray(s.assignments) && assigned(s))
      && !snapshot.devices?.some(device => !device.revoked_at && device.student_id === child.id);
    const inherit = newProfile && !!rules.dailyPlanTemplate;
    if (fresh || (inherit && defaults.every(card => savedDefaults.has(planCardKey(card))))) {
      const cards = defaults.map(card => {
        const subject = rules.subjects.find(s => s.url === card.url);
        return { ...card, subjectId:subject?.id, placement:fresh && card.placement === 'blocked' ? 'anytime' : card.placement };
      });
      return { child, cards, initialize:true };
    }
    // A plan-only row for a sibling does not override this child's library settings.
    const subjects = rules.subjects.filter(s => !s.planOnly || !readyUrls.has(s.url) || assigned(s) || s.active === false);
    const local = { ...snapshot, rules:{ ...rules, subjects } };
    let cards = dailyPlanCards(local, {}, child.id).filter(card => card.module);
    const explicit = new Set(subjects.filter(s => s.active === false || s.assignments?.some(a =>
      a.studentId === child.id && (a.active === false || typeof a.dailyPlan?.enabled === 'boolean'))).map(s => s.id));
    if (cards.some(card => !explicit.has(card.subjectId))) {
      const details = await readChild(child.id);
      if (details.rulesRevision !== rules.revision) throw Error('Activities changed. Reload the choices to see the latest settings.');
      cards = dailyPlanCards(local, details, child.id).filter(card => card.module);
    }
    if (inherit) {
      const byModule = new Map(defaults.filter(card => savedDefaults.has(planCardKey(card))).map(card => [card.module, card]));
      cards = cards.map(card => byModule.has(card.module) ? { ...byModule.get(card.module), subjectId:card.subjectId } : card);
    }
    return { child, cards, initialize:!hasPlan };
  }));
  const values = new Map(defaults.map(card => {
    const allowed = plans.map(plan => plan.cards.some(c => c.module === card.module && c.placement !== 'blocked'));
    return [card.module, allowed.every(Boolean) ? true : allowed.some(Boolean) ? null : false];
  }));
  return { snapshot, plans, defaults, values, fresh, choices:new Map() };
}

export function familyActivityUpdate(draft, latest) {
  const { snapshot, plans, defaults, choices, fresh } = draft;
  const ids = latest.students.filter(s => !s.archived_at).map(s => s.id);
  if (snapshot.rules.revision !== latest.rules.revision || ids.length !== plans.length || plans.some(p => !ids.includes(p.child.id)))
    throw Error('Your family or activities changed. Go back and return to this step to load the latest choices.');
  let current = snapshot;
  const shared = new Map();
  for (const card of defaults) {
    // With no assignment list, an ordinary optional subject applies to the whole
    // family. Keep explicit assignments for media limits, schedules and overrides.
    const placement = card.placement === 'blocked' ? card.previousPlacement : card.placement;
    if (placement !== 'anytime' || card.limitMinutes != null || card.start || card.end) continue;
    const existing = snapshot.rules.subjects.find(s => s.url === card.url);
    if (fresh) {
      shared.set(card.module, { id:crypto.randomUUID(), title:card.title, kind:'activity', url:card.url,
        icon:card.icon, accessTier:'school_optional', active:choices.get(card.module) ?? true });
    } else if (existing && !existing.planOnly && !Array.isArray(existing.assignments) && existing.accessTier === 'school_optional'
      && plans.every(plan => plan.cards.filter(c => c.module === card.module).every(c => c.subjectId === existing.id))) {
      if (!choices.has(card.module) || choices.get(card.module) === false) shared.set(card.module, existing);
    }
  }
  if (fresh && shared.size) {
    current = { ...snapshot, rules:{ ...snapshot.rules, subjects:[...snapshot.rules.subjects, ...shared.values()] } };
  } else if ([...shared].some(([module,s]) => choices.get(module) === false && s.active !== false)) {
    const disabled = new Set([...shared].filter(([module]) => choices.get(module) === false).map(([,s]) => s.id));
    current = { ...snapshot, rules:{ ...snapshot.rules, subjects:snapshot.rules.subjects.map(s => disabled.has(s.id) ? {...s,active:false} : s) } };
  }
  for (const { child, cards, initialize } of plans) {
    const changes = cards.filter(card => !shared.has(card.module) && (initialize || (choices.has(card.module) && choices.get(card.module) !== (card.placement !== 'blocked'))))
      .map(card => withAccess(card, choices.get(card.module) ?? (card.placement !== 'blocked')));
    if (!changes.length) continue;
    const { subjects } = saveDailyPlan(current, child.id, changes);
    // Access is the only setting edited here. Keep date overrides and other fields
    // from a child's saved plan that are not represented on a Daily Plan card.
    for (const card of changes) {
      const prior = current.rules.subjects.find(s => s.id === card.subjectId)?.assignments?.find(a => a.studentId === child.id);
      if (!prior?.dailyPlan) continue;
      const edited = subjects.find(s => s.id === card.subjectId).assignments.find(a => a.studentId === child.id);
      edited.dailyPlan = { ...prior.dailyPlan, enabled:edited.active };
      edited.dailyGoalMinutes = prior.dailyGoalMinutes;
    }
    current = { ...current, rules:{ ...current.rules, subjects } };
  }
  const entries = new Map(snapshot.rules.dailyPlanTemplate?.activities.map(entry => [entry.key, entry]));
  for (const card of defaults) {
    if (!fresh && !choices.has(card.module)) continue;
    const enabled = choices.get(card.module) ?? true;
    const key = planCardKey(card), existing = entries.get(key);
    const starter = fresh && card.placement === 'blocked' ? { ...card, placement:'anytime' } : card;
    entries.set(key, existing ? { ...existing, enabled } : templateFromCards([withAccess(starter, enabled)]).activities[0]);
  }
  if (current === snapshot && !choices.size) return null;
  const payload = { revision:snapshot.rules.revision, subjects:current.rules.subjects };
  if (entries.size && (fresh || choices.size)) payload.dailyPlanTemplate = { version:1, activities:[...entries.values()] };
  return payload;
}
