export function setupCloudDailyQuestions({ endpoint, getSnapshot }) {
  const root = document.getElementById('cloud-daily-reports'), node = (tag, text = '') => { const value = document.createElement(tag); value.textContent = text; return value; };
  const selector = node('select'), refresh = node('button', 'Refresh daily answers'), status = node('p'), history = node('div');
  selector.className = 'admin-select'; selector.setAttribute('aria-label', 'Daily question student'); refresh.className = 'btn btn-secondary';
  status.setAttribute('role','status'); root.append(node('h2','Daily Verse & Brain Teaser'), selector, refresh, status, history);
  let active = false, busy = false, generation = 0, offset = 0;
  async function load() {
    if (!active || busy) return; busy = true; refresh.disabled = true;
    const epoch = generation, studentId = selector.value || null;
    try {
      const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000), headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ action:'list-daily-questions',studentId,offset }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Daily answers could not connect.');
      if (!active || epoch !== generation) return;
      history.replaceChildren();
      for (const answer of data.answers.slice(0,50)) {
        const record = node('details'), question = answer.question;
        record.append(node('summary', `${answer.name} · ${answer.practice_date} · ${answer.kind === 'verse' ? 'Daily Verse' : 'Brain Teaser'} · ${answer.correct ? 'Correct' : 'Practice'} · ${answer.coins} coins`),
          node('p', question.text || question.riddle), node('p', question.question || question.reference || ''),
          node('p', `Selected: ${question.options[answer.selected_index]}`), node('p', `Correct answer: ${question.options[question.answer_index]}`),
          node('p', `Saved ${new Date(answer.created_at).toLocaleString()}${answer.streak_bonus ? ` · ${answer.streak_bonus} streak bonus` : ''}`)); history.append(record);
      }
      for (const [label,page] of [['Newer daily answers',offset-50],['Older daily answers',offset+50]]) {
        if (page < 0 || page > offset && data.answers.length <= 50) continue;
        const button = node('button',label); button.className='btn btn-secondary'; button.addEventListener('click',()=>{offset=page;generation++;void load();}); history.append(button);
      }
      status.textContent = `${data.answers.length ? 'Cloud answers and rewards are connected.' : 'No cloud daily answers recorded.'} Earlier answer history still awaits transfer.`;
    } catch(error) { if (active && epoch === generation) { history.replaceChildren(); status.textContent=error.message; } }
    finally { busy=false;refresh.disabled=false;if(active && epoch!==generation)void load(); }
  }
  function update() {
    if (document.activeElement === selector) return;
    const selected=selector.value;
    selector.replaceChildren(...[{id:'',name:'All students'},...(getSnapshot()?.students || [])].map(child=>{const option=node('option',child.name);option.value=child.id;return option;}));
    if ([...selector.options].some(option=>option.value===selected))selector.value=selected;
  }
  selector.addEventListener('change',()=>{offset=0;generation++;void load();});refresh.addEventListener('click',load);
  return{update,setActive(value){active=value;generation++;if(value){update();void load();}}};
}
