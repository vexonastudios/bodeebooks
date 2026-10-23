const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
export function spellingReviewMarkup(list, day) {
  const report=list.daily_report;if(!report)return '';
  const results=[...(list.school_results||[])].reverse();
  return `<section data-spelling-review="${escape(list.id)}" class="spelling-daily-report">
    <h4>Daily learning & retention</h4><p>${report.checked}/${report.total} checked without hints since this list started · ${report.independent} correct at their last check · ${report.retained} remembered on a later day · ${report.due} due for review.</p>
    <p>Practice completion, supported retries, and remembered words are separate. A short daily review never requires a perfect score.</p>
    ${report.coverage_warning?`<p class="spelling-review-warning" role="status">${escape(report.coverage_warning)}</p>`:''}
    ${report.focus.length?`<ul>${report.focus.map(item=>`<li><strong>${escape(item.word)}</strong> · missed on ${item.miss_days} review day(s) · review ${escape(item.next_review)}</li>`).join('')}</ul>`:'<p>No repeated daily-review difficulties recorded yet. Missing checks do not mean words are learned.</p>'}
    <details><summary>Paper practice test</summary><p>Read each word and its sentence aloud in the order below. Have your child write on the numbered sheet with the word list hidden. This is optional and does not block school.</p>
      <button type="button" class="btn btn-secondary" data-print-spelling>Print answer sheet</button>
      <ol class="spelling-dictation-key">${[...list.words].reverse().map(word=>`<li>${escape(word.word)}${word.example_sentence?` — ${escape(word.example_sentence)}`:''}</li>`).join('')}</ol>
      <div class="spelling-print-sheet" hidden><h1>Spelling practice</h1><p>${escape(list.student_name)} · ${escape(list.title)}</p><p>Name: ____________________ Date: ______________</p><ol>${list.words.map(()=>'<li><span>________________________________________________</span></li>').join('')}</ol></div>
    </details>
    <details><summary>Record a school spelling result</summary><p>Parent-reported school results stay separate from BodeeGuard practice scores, mastery and coins.</p>
      <form data-school-result><label>Test date<input name="date" type="date" required max="${escape(day)}" value="${escape(day)}"></label>
      <label>Correct<input name="correct" type="number" min="0" max="150" required></label><label>Out of<input name="total" type="number" min="1" max="150" value="${list.word_count}" required></label>
      <label>Missed words from this list (optional, one per line)<textarea name="missed" rows="3" maxlength="12000"></textarea></label>
      <label>Notes (optional)<textarea name="note" rows="2" maxlength="500"></textarea></label><button type="submit" class="btn btn-primary">Save school result</button><p role="status" data-result-status></p></form>
      ${results.length?`<ul>${results.map(result=>`<li>${escape(result.date)}: ${result.correct}/${result.total} · parent reported${result.missed.length?` · Missed: ${escape(result.missed.join(', '))}`:''}${result.note?` · ${escape(result.note)}`:''}</li>`).join('')}</ul>`:'<p>No school results recorded.</p>'}
    </details></section>`;
}
export function bindSpellingReviews(root, { save, notice }) {
  for(const section of root.querySelectorAll('[data-spelling-review]')){
    section.addEventListener('click',event=>event.stopPropagation());
    section.querySelector('[data-print-spelling]').onclick=()=>{
      document.getElementById('spelling-print-root')?.remove();const sheet=section.querySelector('.spelling-print-sheet').cloneNode(true);sheet.id='spelling-print-root';sheet.hidden=false;document.body.append(sheet);document.body.classList.add('spelling-printing');
      const cleanup=()=>{sheet.remove();document.body.classList.remove('spelling-printing');window.removeEventListener('afterprint',cleanup);};
      window.addEventListener('afterprint',cleanup);try{window.print();}catch(error){cleanup();throw error;}
    };
    section.querySelector('form').onsubmit=async event=>{
      event.preventDefault();const form=event.currentTarget,button=form.querySelector('[type=submit]'),status=form.querySelector('[data-result-status]');
      if(button.disabled)return;button.disabled=true;status.textContent='Saving school result…';const values=new FormData(form);
      try{await save(section.dataset.spellingReview,{testDate:values.get('date'),correct:Number(values.get('correct')),total:Number(values.get('total')),missed:String(values.get('missed')).split(/[\r\n,;]+/).map(word=>word.trim()).filter(Boolean),note:String(values.get('note')).trim()});status.textContent='School result saved.';}
      catch(error){status.textContent=error.message;notice(error.message);}finally{button.disabled=false;}
    };
  }
}
