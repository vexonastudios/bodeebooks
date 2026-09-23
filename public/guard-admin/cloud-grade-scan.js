import { gradebookButton, gradebookIcon, gradebookIcons } from './cloud-grade-editor.js';

export function addGradeScan({ root, fields, notes, paper, endpoint, node, scorePreview }) {
  const panel = node('details', 'gradebook-scan'); panel.open = true;
  const heading = node('summary', '', 'Get help reading this paper'); heading.prepend(gradebookIcon('scan-line'));
  const label = node('label', '', 'What would you like BodeeGuard to do?'), mode = node('select', 'admin-input'); mode.setAttribute('aria-label', 'Paper scan option');
  for (const [value, text] of [['read','Read a grade already on the paper'],['suggest','Suggest a grade for unmarked work']]) { const option = node('option', '', text); option.value = value; mode.append(option); } label.append(mode);
  const disclosure = node('p', 'cloud-note', 'Read paper sends this photo or PDF, including any visible names and answers, to OpenAI. It uses your family’s AI allowance. Review all suggestions before saving.');
  const status = node('p', 'cloud-note'); status.setAttribute('role', 'status');
  const result = node('div', 'gradebook-scan-result'); result.hidden = true;
  let id = null, busy = false, currentMode = mode.value;
  mode.addEventListener('change', () => { id = null; currentMode = mode.value; result.hidden = true; status.textContent = ''; scan.lastChild.textContent = 'Read paper'; });
  const scan = gradebookButton('Read paper', 'sparkles', async () => {
    if (busy) return; busy = true; mode.disabled = true; scan.disabled = true; result.hidden = true;
    id ||= crypto.randomUUID(); status.textContent = 'Reading the paper… You can still enter details yourself. Nothing has been added to the gradebook.';
    try {
      const response = await fetch(endpoint.replace(/bridge\/?$/, 'grade-scan/'), { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(60000),
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, fileId: paper.id, mode: currentMode }) });
      const data = await response.json();
      if (!root.isConnected || !root.closest('dialog')?.open) return;
      if (!response.ok) { if ([400,422,429,502].includes(response.status)) id = null; throw new Error(data.error || 'This scan could not finish.'); }
      if (data.id !== id || data.fileId !== paper.id || data.studentId !== paper.studentId || data.mode !== currentMode || !data.suggestions) throw new Error('The scan reply did not match this paper. Retry the same scan.');
      const s = data.suggestions;
      result.replaceChildren(node('strong', '', s.title || 'Assignment title not found'), node('p', '', `${s.course || 'Subject not found'} · ${s.category}`),
        node('p', '', s.scoreSource === 'unavailable' ? 'No reliable numerical score found. Enter the grade yourself.' : `${s.scoreSource === 'written' ? 'Written score' : 'Suggested score'}: ${s.scoreEarned} / ${s.scorePossible}`),
        node('p', '', s.assignmentDate ? `Date on paper: ${s.assignmentDate}` : 'No clear date found. Check the assignment date below.'), node('p', '', s.notes || 'Review the original paper before saving.'));
      const apply = gradebookButton('Use these suggestions', 'arrow-down-to-line', () => {
        const input = name => fields.querySelector(`[name="${name}"]`);
        if ((input('title').value || input('course').value || input('scoreEarned').value) && !confirm('Replace the assignment details and score with these suggestions? You can edit them before saving.')) return;
        const metadata = `Paper: ${paper.name}\nUploaded: ${data.uploadedAt}\nAI scan: ${data.scannedAt} (${data.mode === 'read' ? 'read existing grade' : 'suggest grade'}; parent reviewed)\n${s.notes || ''}`;
        const combined = [input('parentNotes').value, metadata].filter(Boolean).join('\n\n');
        if (combined.length > 2000) { status.textContent = 'Shorten the private notes before adding the scan details (2,000 characters maximum).'; return; }
        for (const name of ['title','course','category']) if (s[name]) input(name).value = s[name];
        if (s.assignmentDate) input('date').value = s.assignmentDate;
        input('scoreEarned').value = s.scoreEarned ?? ''; input('scorePossible').value = s.scorePossible ?? 100;
        input('parentNotes').value = combined; scorePreview(); apply.disabled = true;
        status.textContent = 'Suggestions filled in. Check the paper, correct anything needed, then select Save. Scan date and notes are recorded privately.';
        notes.open = false; panel.open = false;
        heading.textContent = 'Suggestions added · review the grade below'; heading.prepend(gradebookIcon('circle-check')); gradebookIcons(panel);
      }, 'btn btn-secondary'); result.append(apply); result.hidden = false; gradebookIcons(panel);
      status.textContent = `Read ${new Date(data.scannedAt).toLocaleString()}. Review the suggestions below.`;
      scan.lastChild.textContent = 'Read again'; id = null;
    } catch (error) { if (root.isConnected && root.closest('dialog')?.open) { status.textContent = `${error.message} You can still enter the grade manually.`; scan.lastChild.textContent = id ? 'Retry same scan' : 'Start a new scan'; } }
    finally { busy = false; mode.disabled = false; scan.disabled = false; }
  }, 'btn btn-secondary');
  panel.append(heading, label, disclosure, scan, status, result); fields.prepend(panel); return panel;
}
