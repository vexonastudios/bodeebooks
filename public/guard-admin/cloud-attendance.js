function node(tag, text = '', className = '') {
  const element = document.createElement(tag); element.textContent = text; element.className = className; return element;
}
export function setupCloudAttendance() {
  let generation = 0, lastKey = '';
  async function request(action, input) {
    const response = await fetch('/guard/dashboard/bridge/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...input }) });
    const result = await response.json();
    if (!response.ok) throw Error(result.error || 'Check-ins could not be loaded.');
    return result;
  }
  return { async render(host, date, snapshot, force = false) {
    const schedule = window.BODEE_CLOUD_SCHEDULE.normalizeCloudSchoolSchedule(snapshot.rules.schedule);
    const today = window.BODEE_CLOUD_SCHEDULE.cloudSchoolDateParts(schedule.timeZone, snapshot.serverTime).localDate;
    const key = JSON.stringify([date, snapshot.rules.revision, Math.floor(new Date(snapshot.serverTime).getTime() / 30000)]);
    if (!force && key === lastKey && host.childElementCount) return;
    lastKey = key; const token = ++generation;
    host.replaceChildren(node('h3', 'School check-ins'), node('p', 'Loading check-ins...', 'cloud-note'));
    const age = (Date.parse(today) - Date.parse(date)) / 86400000;
    if (age < 0 || age > 30) {
      host.replaceChildren(node('h3', 'School check-ins'), node('p', age < 0 ? 'Check-ins will appear on this school day.' : 'Choose a date within the last 30 days to review check-ins.', 'cloud-note'));
      return;
    }
    try {
      const result = await request('attendance-list', { date });
      if (token !== generation || !host.isConnected) return;
      host.replaceChildren(node('h3', `School check-ins · ${date}`));
      if (!result.rows.length) host.append(node('p', result.enabled ? 'No check-ins for this day. Newly enabled coin rules start tomorrow; days off are not charged.' : 'Late coins are off. Open School start time & late coins above to set them up.', 'cloud-note'));
      for (const record of result.rows) {
        const row = node('div', '', 'cloud-day-subject'), copy = node('div', '', 'cloud-day-subject-copy');
        const status = { excused: 'Excused', 'on-time': 'On time', late: 'Started late', 'waiting-late': 'Waiting for schoolwork', waiting: 'Waiting for schoolwork' }[record.status] || 'Not checked in';
        copy.append(node('strong', record.name), node('span', `${status}${record.penaltyCoins ? ` · −${record.penaltyCoins} coins` : ''}${record.bonusCoins ? ` · +${record.bonusCoins} coins` : ''}`)); row.append(copy);
        if (record.status === 'late' || record.status === 'waiting-late') {
          const button = node('button', 'Excuse late start', 'btn btn-secondary'); button.type = 'button';
          button.setAttribute('aria-label', `Excuse late start for ${record.name}`);
          button.onclick = async () => {
            button.disabled = true;
            try { await request('attendance-excuse', { date, studentId: record.studentId }); if (token === generation) await this.render(host, date, snapshot, true); }
            catch (error) { if (token === generation) { row.append(node('p', error.message, 'cloud-note')); button.disabled = false; } }
          };
          row.append(button);
        }
        host.append(row);
      }
    } catch (error) {
      if (token === generation && host.isConnected) {
        lastKey = '';
        const retry = node('button', 'Retry check-ins', 'btn btn-secondary'); retry.type = 'button'; retry.onclick = () => this.render(host, date, snapshot, true);
        host.replaceChildren(node('h3', 'School check-ins'), node('p', error.message, 'cloud-note'), retry);
      }
    }
  }};
}
