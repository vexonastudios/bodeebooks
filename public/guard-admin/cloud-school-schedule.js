'use strict';

const DEFAULT_CLOUD_SCHOOL_SCHEDULE = Object.freeze({
  enabled: false,
  timeZone: 'America/Chicago',
  days: Object.freeze([1, 2, 3, 4, 5]),
  start: '08:00',
  end: '15:00'
});
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

function validTimeZone(value) {
  if (typeof value !== 'string' || !value || value.length > 80) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }).format(0); return true; }
  catch (_) { return false; }
}

function validDate(value) {
  if (typeof value !== 'string' || !DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function normalizeCloudSubjectSchedule(input) {
  const rawStart = input?.scheduleStart;
  const rawEnd = input?.scheduleEnd;
  const scheduleStart = rawStart == null || rawStart === '' ? null : rawStart;
  const scheduleEnd = rawEnd == null || rawEnd === '' ? null : rawEnd;
  if ((scheduleStart !== null && typeof scheduleStart !== 'string') || (scheduleEnd !== null && typeof scheduleEnd !== 'string') ||
      Boolean(scheduleStart) !== Boolean(scheduleEnd) ||
      (scheduleStart && (!TIME.test(scheduleStart) || !TIME.test(scheduleEnd) || scheduleStart >= scheduleEnd))) {
    throw new Error('Choose subject start and end times, with the start earlier than the end.');
  }
  return { scheduleStart, scheduleEnd };
}

function normalizeCloudSchoolSchedule(input) {
  const value = input == null ? DEFAULT_CLOUD_SCHOOL_SCHEDULE : input;
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.enabled !== 'boolean') {
    throw new Error('Choose whether the weekly school schedule is enabled.');
  }
  const timeZone = value.timeZone || DEFAULT_CLOUD_SCHOOL_SCHEDULE.timeZone;
  if (!validTimeZone(timeZone)) throw new Error('Choose a valid school time zone.');
  if (!Array.isArray(value.days) || value.days.some(day => !Number.isInteger(day) || day < 0 || day > 6)) {
    throw new Error('Choose valid school weekdays.');
  }
  const days = [...new Set(value.days)].sort((a, b) => a - b);
  if (value.enabled && !days.length) throw new Error('Choose at least one school day.');
  const start = value.start || DEFAULT_CLOUD_SCHOOL_SCHEDULE.start;
  const end = value.end || DEFAULT_CLOUD_SCHOOL_SCHEDULE.end;
  if (!TIME.test(start) || !TIME.test(end) || start >= end) {
    throw new Error('Choose a school start time earlier than the end time.');
  }
  const termStart = value.termStart || null;
  const termEnd = value.termEnd || null;
  if (Boolean(termStart) !== Boolean(termEnd) || (termStart && (!validDate(termStart) || !validDate(termEnd) || termStart > termEnd))) {
    throw new Error('Choose valid first and last school dates.');
  }
  const rawBreaks = value.breaks == null ? [] : value.breaks;
  if (!Array.isArray(rawBreaks) || rawBreaks.length > 40) throw new Error('Choose up to 40 school breaks.');
  const breakIds = new Set();
  const breaks = rawBreaks.map(item => {
    const id = String(item?.id || '').toLowerCase();
    const label = String(item?.label || '').trim();
    if (!UUID.test(id) || breakIds.has(id) || !label || label.length > 80 || !validDate(item?.start) || !validDate(item?.end) || item.start > item.end) {
      throw new Error('Every school break needs a name and valid date range.');
    }
    breakIds.add(id);
    return { id, label, start: item.start, end: item.end };
  });
  const rawExceptions = value.exceptions == null ? [] : value.exceptions;
  if (!Array.isArray(rawExceptions) || rawExceptions.length > 60) throw new Error('Choose up to 60 one-day exceptions.');
  const exceptionDates = new Set();
  const exceptions = rawExceptions.map(item => {
    if (!validDate(item?.date) || typeof item.school !== 'boolean' || exceptionDates.has(item.date)) {
      throw new Error('Every one-day exception needs one unique valid date.');
    }
    exceptionDates.add(item.date);
    return { date: item.date, school: item.school };
  }).sort((a, b) => a.date.localeCompare(b.date));
  return { enabled: value.enabled, timeZone, days, start, end, termStart, termEnd, breaks, exceptions };
}

// Date-only evaluation is shared with the parent's monthly calendar. Never
// interpret a selected date in the browser computer's own time zone.
function cloudSchoolDayState(input, localDate) {
  const schedule = normalizeCloudSchoolSchedule(input);
  if (!validDate(localDate)) throw new Error('Choose a valid school date.');
  const day = new Date(`${localDate}T00:00:00Z`).getUTCDay();
  const exception = schedule.exceptions.find(item => item.date === localDate);
  const inTerm = !schedule.termStart || (localDate >= schedule.termStart && localDate <= schedule.termEnd);
  const schoolBreak = schedule.breaks.find(item => localDate >= item.start && localDate <= item.end);
  const schoolDay = exception ? exception.school : inTerm && !schoolBreak && schedule.days.includes(day);
  const reason = !schoolDay ? exception ? 'day_exception' : !inTerm ? 'outside_term' : schoolBreak ? 'school_break' : 'day_off' : null;
  return { allowed: !schedule.enabled || schoolDay, reason: schedule.enabled ? reason : 'not_enabled',
    day, localDate, exception: exception || null, schoolBreak: schoolBreak || null, schedule };
}

function cloudSchoolDateParts(timeZone, at = Date.now()) {
  const instant = new Date(at);
  if (!Number.isFinite(instant.getTime())) throw new Error('The school clock is invalid.');
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(instant).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return { localDate: `${values.year.padStart(4, '0')}-${values.month}-${values.day}`, localTime: `${values.hour}:${values.minute}` };
}

function cloudSchoolScheduleState(input, at = Date.now()) {
  const schedule = normalizeCloudSchoolSchedule(input);
  if (!schedule.enabled) return { allowed: true, reason: 'not_enabled', schedule };
  const { localDate, localTime } = cloudSchoolDateParts(schedule.timeZone, at);
  const state = cloudSchoolDayState(schedule, localDate);
  const withinHours = localTime >= schedule.start && localTime < schedule.end;
  return { ...state, allowed: state.allowed && withinHours, reason: state.reason || (withinHours ? null : 'outside_hours'), localTime };
}

function cloudSubjectScheduleState(subject, familySchedule, at = Date.now()) {
  const subjectSchedule = normalizeCloudSubjectSchedule(subject);
  if (!subjectSchedule.scheduleStart) return { allowed: true, reason: null, localTime: null, ...subjectSchedule };
  const schedule = normalizeCloudSchoolSchedule(familySchedule);
  const instant = new Date(at);
  if (!Number.isFinite(instant.getTime())) throw new Error('The school clock is invalid.');
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: schedule.timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(instant).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  const localTime = `${values.hour}:${values.minute}`;
  const allowed = localTime >= subjectSchedule.scheduleStart && localTime < subjectSchedule.scheduleEnd;
  return { allowed, reason: allowed ? null : 'subject_hours', localTime, ...subjectSchedule };
}

const cloudScheduleApi = { DEFAULT_CLOUD_SCHOOL_SCHEDULE, normalizeCloudSchoolSchedule, cloudSchoolScheduleState,
  normalizeCloudSubjectSchedule, cloudSubjectScheduleState, cloudSchoolDayState, cloudSchoolDateParts, validTimeZone };
if (typeof module !== 'undefined') module.exports = cloudScheduleApi;
else globalThis.BODEE_CLOUD_SCHEDULE = Object.freeze(cloudScheduleApi);
