// Original parent multiple-choice and written-question builder.
let questionCount=0;
export function resetQuestions(){questionCount=0;}
export function addQuestion(type) {
  questionCount++;
  const idx = questionCount;
  const container = document.getElementById('quiz-questions-list');
  const div = document.createElement('div');
  div.className = 'quiz-question-block';
  div.dataset.idx = idx;
  div.dataset.type = type;
  div.style.cssText = 'background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:10px; padding:16px;';

  if (type === 'multiple_choice') {
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <strong style="font-size:13px;">Q${idx} — Multiple Choice</strong>
        <button class="btn btn-secondary remove-q-btn" style="font-size:11px; padding:3px 8px;">✕ Remove</button>
      </div>
      <input type="text" class="admin-input q-question" placeholder="Question text..." style="width:100%; margin-bottom:10px;">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
        <input type="text" class="admin-input q-choice" placeholder="Choice A" data-ci="0">
        <input type="text" class="admin-input q-choice" placeholder="Choice B" data-ci="1">
        <input type="text" class="admin-input q-choice" placeholder="Choice C" data-ci="2">
        <input type="text" class="admin-input q-choice" placeholder="Choice D" data-ci="3">
      </div>
      <div>
        <label class="form-label">Correct Answer</label>
        <select class="admin-select q-correct" style="width:200px;">
          <option value="A">Choice A</option>
          <option value="B">Choice B</option>
          <option value="C">Choice C</option>
          <option value="D">Choice D</option>
        </select>
      </div>
    `;
  } else {
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <strong style="font-size:13px;">Q${idx} — Short Answer</strong>
        <button class="btn btn-secondary remove-q-btn" style="font-size:11px; padding:3px 8px;">✕ Remove</button>
      </div>
      <input type="text" class="admin-input q-question" placeholder="Question text..." style="width:100%;">
      <p style="font-size:12px; color:var(--text-muted); margin-top:8px;">Student will type a free-form answer. You review it in Quiz Results.</p>
    `;
  }

  container.appendChild(div);
  div.querySelector('.remove-q-btn').addEventListener('click', () => div.remove());
}

