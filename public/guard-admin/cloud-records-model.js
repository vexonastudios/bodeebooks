export function csvCell(value) {
  let text = String(value ?? '');
  // Quote all cells and neutralize spreadsheet formulas (including whitespace).
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function schoolReportCsv(report) {
  if (report.truncated) throw new Error('Narrow the date or student filters before exporting; this report is incomplete.');
  return [['Date', 'Student', 'Subject', 'Seconds', 'Minutes', 'Family time zone'],
    ...report.rows.map(row => [row.date, row.student_name, row.subject_name, row.seconds, (row.seconds / 60).toFixed(2), report.timeZone])]
    .map(row => row.map(csvCell).join(',')).join('\r\n');
}
export function localDate(timeZone, at = Date.now()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function reportDefaults(timeZone, at = Date.now()) {
  const end = localDate(timeZone, at);
  return { end, start: new Date(Date.parse(end) - 13 * 86400000).toISOString().slice(0, 10) };
}
