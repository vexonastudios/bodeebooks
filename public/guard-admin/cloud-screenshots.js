export function setupCloudScreenshots({ endpoint }) {
  const root = document.getElementById('cloud-screenshots');
  let active = false, epoch = 0, overview = null, students = [];
  const node = (tag, text = '', className = '') => { const value = document.createElement(tag); value.textContent = text; value.className = className; return value; };
  async function call(input) {
    const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(30000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    const value = await response.json(); if (!response.ok) throw Error(value.error || 'Screenshots could not connect.'); return value;
  }
  async function image(screenshotId) {
    const file = await call({ action: 'screenshot-image', screenshotId });
    if (file?.mime !== 'image/webp' || typeof file.data !== 'string') throw Error('The private screenshot was invalid.');
    return `data:${file.mime};base64,${file.data}`;
  }
  function statusText(item) {
    if (item.status === 'pending') return 'Waiting for the child app to respond.';
    if (item.status === 'captured') return item.retained ? 'Kept by parent.' : `Expires ${new Date(item.expires_at).toLocaleString()}.`;
    if (item.status === 'failed') return item.failure || 'The child app did not respond.';
    return item.status === 'expired' ? 'Expired and removed from private storage.' : item.status;
  }
  function render() {
    root.replaceChildren();
    const header = node('div', '', 'tab-header'), title = node('h1', 'Screenshots'), refresh = node('button', 'Refresh', 'btn btn-secondary');
    refresh.type = 'button'; refresh.onclick = () => void load(); header.append(title, refresh); root.append(header);
    root.append(node('p', `A screenshot is captured only when you request it. Unkept images are removed from private cloud storage after ${overview.retention_days} days.`, 'cloud-note'));
    const byStudent = new Map(); for (const item of overview.screenshots) { if (!byStudent.has(item.student_id)) byStudent.set(item.student_id, []); byStudent.get(item.student_id).push(item); }
    const list = node('div', '', 'cloud-screenshot-list');
    for (const student of students.filter(item => !item.archived_at)) {
      const card = node('section', '', 'cloud-panel cloud-screenshot-card'), actions = node('div', '', 'cloud-actions'), status = node('p', '', 'cloud-note');
      const request = node('button', 'Request screenshot now', 'btn btn-primary'); request.type = 'button'; request.onclick = async () => { request.disabled = true; try { await call({ action: 'request-screenshot', studentId: student.id }); await load(); } catch (error) { request.disabled = false; status.textContent = error.message; } };
      card.append(node('h2', student.name), node('p', 'Parent-requested only. The child app captures its BodeeGuard window; no desktop or automatic captures.', 'cloud-note'), actions, status); actions.append(request);
      const items = byStudent.get(student.id) || [];
      if (!items.length) card.append(node('p', 'No cloud screenshots requested yet.', 'cloud-note'));
      for (const item of items) {
        const row = node('article', '', 'cloud-screenshot-row'), details = node('div', '', 'cloud-screenshot-details');
        details.append(node('strong', new Date(item.requested_at).toLocaleString()), node('p', statusText(item)));
        row.append(details);
        if (item.has_image) { const preview = document.createElement('img'); preview.alt = `Private screenshot for ${student.name}`; preview.className = 'cloud-screenshot-preview'; image(item.id).then(url => { preview.src = url; }).catch(error => { preview.alt = error.message; }); row.append(preview); }
        if (item.status === 'captured') {
          const itemActions = node('div', '', 'cloud-actions');
          if (!item.retained) { const keep = node('button', 'Keep', 'btn btn-secondary'); keep.type = 'button'; keep.onclick = async () => { keep.disabled = true; try { await call({ action: 'screenshot-action', screenshotId: item.id, screenshotAction: 'keep' }); await load(); } catch (error) { keep.disabled = false; details.append(node('p', error.message)); } }; itemActions.append(keep); }
          const remove = node('button', 'Delete', 'btn btn-secondary'); remove.type = 'button'; remove.onclick = async () => { remove.disabled = true; try { await call({ action: 'screenshot-action', screenshotId: item.id, screenshotAction: 'delete' }); await load(); } catch (error) { remove.disabled = false; details.append(node('p', error.message)); } }; itemActions.append(remove); row.append(itemActions);
        }
        card.append(row);
      }
      list.append(card);
    }
    if (!students.filter(item => !item.archived_at).length) list.append(node('p', 'Add and assign a cloud child computer in Overview before requesting a screenshot.', 'cloud-panel'));
    root.append(list);
  }
  async function load() { const current = ++epoch; if (!active) return; root.textContent = 'Loading screenshots…'; try { const value = await call({ action: 'screenshots-overview' }); if (!active || current !== epoch) return; overview = value; render(); } catch (error) { if (active && current === epoch) root.textContent = error.message; } }
  return { update(snapshot) { students = snapshot?.students || []; }, setActive(value) { active = value; epoch++; if (value) void load(); } };
}
