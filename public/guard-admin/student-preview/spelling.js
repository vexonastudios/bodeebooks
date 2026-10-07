(function(){"use strict";const modules={"renderer/js/preview/spelling.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cloud_spelling_controller_js_1 = require("renderer/js/cloud-spelling-controller.js");
const theme_js_1 = require("renderer/js/kiosk/theme.js");
const session_js_1 = require("renderer/js/preview/session.js");
const spelling_model_js_1 = require("renderer/js/preview/spelling-model.js");
(0, session_js_1.receivePreview)(seed => {
    const close = () => (0, session_js_1.sendPreview)({ type: 'preview-open', module: 'dashboard' }), el = id => document.getElementById(id);
    (0, theme_js_1.applyStudentTheme)(seed.status.dashboard.data.student.theme);
    el('activity-loader').hidden = true;
    el('spelling-status').textContent = 'Test practice • answers stay in this preview; no school progress or coins change.';
    const model = (0, spelling_model_js_1.createPreviewSpelling)(seed.spelling, seed.status.dashboard.data.date);
    const controller = (0, cloud_spelling_controller_js_1.mountSpelling)({ transport: { list: async () => model.list(), command: async (input) => model.command(input), audio: async () => ({ useLocal: true }) }, canAct: () => true, onBack: close, onError: error => { el('spelling-status').textContent = error.message; } });
    el('spelling-close').onclick = close;
    el('spelling-refresh').onclick = () => void controller.reload();
    void controller.reload();
    document.documentElement.dataset.previewReady = 'true';
});

},
"renderer/js/cloud-spelling-controller.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountSpelling = mountSpelling;
// Original weekly Spelling presentation and progression, with received cloud
// sessions/answers and local Windows speech. No renderer-held LAN credentials.
function mountSpelling({ transport, canAct, onBack, onError }) {
    const state = { current: null, session: null, items: [], queue: [], index: 0, plays: 0, masteryRequired: false, singlePass: false, reviewing: false, resultNextMode: null, advancing: false }, el = id => document.getElementById(id);
    const node = (tag, text = '') => { const item = document.createElement(tag); item.textContent = text; return item; };
    const show = id => ['loading-card', 'intro-card', 'empty-card', 'session-card', 'results-card'].forEach(card => el(card).classList.toggle('hidden', card !== id));
    const dateLabel = value => { const [y, m, d] = String(value).split('-').map(Number); return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date(y, m - 1, d, 12)); };
    const requiredMode = () => state.current?.today_mode || 'practice';
    const stageLabel = node('div');
    stageLabel.className = 'spelling-stage-label';
    stageLabel.setAttribute('role', 'status');
    el('learn-word').before(stageLabel);
    const nextWord = node('button', 'Next word');
    nextWord.id = 'spelling-next-word';
    nextWord.type = 'button';
    nextWord.className = 'primary';
    nextWord.hidden = true;
    el('feedback').after(nextWord);
    nextWord.onclick = () => { if (!canAct() || !state.reviewing)
        return; state.reviewing = false; state.index++; renderWord(); };
    const focusReview = node('p', 'Review from last time');
    focusReview.className = 'pill';
    focusReview.hidden = true;
    stageLabel.before(focusReview);
    const letterReview = node('div');
    letterReview.className = 'letter-review hidden';
    el('learn-info').after(letterReview);
    function compareLetters(correct, typed) {
        const expected = [...String(correct || '').normalize('NFKC')], actual = [...String(typed || '').normalize('NFKC')];
        const same = (a, b) => a?.replace(/[’‘]/g, "'").toLocaleLowerCase('en-US') === b?.replace(/[’‘]/g, "'").toLocaleLowerCase('en-US');
        const cost = Array.from({ length: expected.length + 1 }, () => Array(actual.length + 1).fill(0));
        for (let i = 0; i <= expected.length; i++)
            cost[i][0] = i;
        for (let j = 0; j <= actual.length; j++)
            cost[0][j] = j;
        for (let i = 1; i <= expected.length; i++)
            for (let j = 1; j <= actual.length; j++)
                cost[i][j] = Math.min(cost[i - 1][j] + 1, cost[i][j - 1] + 1, cost[i - 1][j - 1] + (same(expected[i - 1], actual[j - 1]) ? 0 : 1));
        const pairs = [];
        let i = expected.length, j = actual.length;
        while (i || j) {
            if (i && j && same(expected[i - 1], actual[j - 1]) && cost[i][j] === cost[i - 1][j - 1])
                pairs.push([expected[--i], actual[--j], false]);
            else if (i && j && cost[i][j] === cost[i - 1][j - 1] + 1)
                pairs.push([expected[--i], actual[--j], true]);
            else if (i && cost[i][j] === cost[i - 1][j] + 1)
                pairs.push([expected[--i], '', true]);
            else
                pairs.push(['', actual[--j], true]);
        }
        return pairs.reverse();
    }
    function reviewLetters(typed, correct) {
        const review = node('div');
        review.className = 'letter-review-inner';
        review.setAttribute('role', 'group');
        review.setAttribute('aria-label', `You typed ${typed}. Correct spelling: ${correct}. Highlighted letters differ.`);
        for (const [label, index] of [['You typed', 1], ['Correct spelling', 0]]) {
            const row = node('div');
            row.className = 'letter-review-row';
            row.setAttribute('aria-hidden', 'true');
            row.append(node('strong', label));
            const letters = node('span');
            letters.className = 'letter-review-letters';
            for (const pair of compareLetters(correct, typed)) {
                const cell = node('span', pair[index] || '·');
                cell.className = 'letter-review-letter' + (pair[2] ? ' letter-review-different' : '') + (!pair[index] ? ' letter-review-gap' : '');
                letters.append(cell);
            }
            row.append(letters);
            review.append(row);
        }
        return review;
    }
    const library = node('div');
    library.className = 'optional';
    el('loading-card').before(library);
    const resume = node('div');
    resume.className = 'optional';
    el('loading-card').before(resume);
    let voiceGeneration = 0, voiceAudio = null, voiceUrl = null;
    function stopVoice() { voiceGeneration++; if (voiceAudio) {
        voiceAudio.pause();
        voiceAudio.removeAttribute('src');
        voiceAudio = null;
    } if (voiceUrl) {
        URL.revokeObjectURL(voiceUrl);
        voiceUrl = null;
    } window.speechSynthesis?.cancel(); }
    function browserSpeak(text) { if (!canAct() || !window.speechSynthesis || !text)
        return false; window.speechSynthesis.cancel(); const speech = new SpeechSynthesisUtterance(text), voices = window.speechSynthesis.getVoices(), voice = voices.find(item => item.localService && /^en[-_]/i.test(item.lang)); if (!voice) {
        el('replay-note').textContent = 'A local English speech voice is unavailable. Ask your parent to check Windows speech settings.';
        return false;
    } speech.voice = voice; speech.rate = .8; speech.onerror = () => { el('replay-note').textContent = 'The word could not be read aloud. Tap the speaker to retry.'; }; window.speechSynthesis.speak(speech); return true; }
    async function reload() {
        stopVoice();
        state.advancing = false;
        state.current = await transport.list();
        resume.replaceChildren();
        for (const run of state.current.resumable || []) {
            const button = node('button', `Resume ${run.title} · ${run.mode === 'test' ? 'Practice Pre-test' : run.mode} · ${run.session_date}`);
            button.className = 'secondary';
            button.onclick = () => void start(run.mode, run.list_id, run.id).catch(onError);
            resume.append(button);
        }
        library.replaceChildren();
        if (state.current.practice_lists?.length) {
            library.append(node('h2', 'Practice lists'));
            for (const list of state.current.practice_lists) {
                const card = node('div');
                card.className = 'card';
                card.append(node('h3', list.title), node('p', list.word_count + ' words'));
                for (const [mode, label] of [['learn', 'Learn words'], ['practice', 'Practice']]) {
                    const button = node('button', label);
                    button.className = 'secondary';
                    button.onclick = () => void start(mode, list.id).catch(onError);
                    card.append(button);
                }
                library.append(card);
            }
        }
        if (!state.current.active) {
            show('empty-card');
            return;
        }
        const mastery = state.current.mastery_required_today;
        el('list-title').textContent = state.current.title;
        el('week-meta').replaceChildren(...[`${state.current.total_words} words`, state.current.progression ? `${state.current.progression.ready} ready without hints` : `${state.current.learned_words} reviewed`, `Pre-test ${dateLabel(state.current.test_date)}`, ...(mastery ? ['Pre-test review'] : [])].map(text => { const pill = node('span', text); pill.className = 'pill'; return pill; }));
        el('practice-plan-copy').textContent = (mastery ? 'Tomorrow is your pre-test. Make one practice pass today; mistakes are saved for your next practice.' : 'Try each word once. If you miss one, look at the highlighted letters and continue. Missed words come first next time, with help at your current level. Copying and letter hints are practice, not proof that you know the word from memory.') + ' Required Spelling helps you earn the daily school coins after all required work is done; ordinary practice earns no separate coins.';
        el('practice-mode-copy').textContent = 'One pass finishes today’s practice. You do not need every answer right.';
        const locked = state.current.date < state.current.test_date;
        el('test-mode').disabled = locked;
        el('test-mode-copy').textContent = locked ? `Opens ${dateLabel(state.current.test_date)}.` : 'A scored practice check, separate from your book grade. The first pre-test can change your coins: +5 for 100%, +3 for 90–99%, or a deduction below 80% (never more than your balance).';
        show('intro-card');
    }
    async function start(mode, listId = state.current?.list_id, sessionId) { if (!canAct())
        return; state.advancing = false; const data = await transport.command({ kind: 'start', mode, adaptiveVersion: 2, ...(mode !== 'optional' && listId ? { listId } : {}), ...(sessionId ? { sessionId } : {}) }); await useSession(data); }
    async function useSession(data) {
        if (data.locked) {
            el('empty-card').querySelector('.intro-copy').textContent = data.mastered ? 'You mastered all optional spelling words!' : 'Optional spelling is complete for today.';
            show('empty-card');
            return;
        }
        if (data.result) {
            showResult(data.result);
            return;
        }
        library.replaceChildren();
        state.session = { ...data.session, practice_only: data.list.practice_only, list_id: data.list.id };
        state.items = data.items;
        state.masteryRequired = !!data.mastery_required;
        state.singlePass = data.list.adaptive_version === 2;
        state.reviewing = false;
        state.index = 0;
        state.plays = 0;
        state.advancing = false;
        const done = new Set();
        for (const attempt of data.prior_attempts || [])
            if (state.singlePass || data.session.mode === 'test' || !data.list.adaptive_version && !state.masteryRequired || attempt.correct)
                done.add(attempt.list_word_id);
        state.queue = data.items.filter(item => !done.has(item.id)).map(item => ({ ...item, correction: item.correction_word || '', lastMiss: item.correction_word ? [...(data.prior_attempts || [])].reverse().find(attempt => attempt.list_word_id === item.id && attempt.correct === false)?.answer || '' : '' }));
        if (!state.singlePass && data.session.mode === 'practice' && data.list.adaptive_version && !state.masteryRequired) {
            for (const item of data.items) {
                const history = (data.prior_attempts || []).filter(attempt => attempt.list_word_id === item.id), firstCorrect = history.findIndex(attempt => attempt.correct === true);
                if (firstCorrect > 0 && history.length === firstCorrect + 1)
                    state.queue.push({ ...item, correction: '', lastMiss: '', coach_hint: '', delayedReview: true, adaptive: { ...item.adaptive, stage: 'recall' } });
            }
        }
        state.received = done.size;
        resume.replaceChildren();
        el('mode-label').textContent = data.session.mode === 'learn' ? 'Learn' : data.session.mode === 'test' ? 'Practice Pre-test' : data.session.mode === 'optional' ? 'Optional Practice' : state.masteryRequired ? 'Mastery Day' : 'Practice';
        el('session-title').textContent = data.list.title;
        el('submit').textContent = data.session.mode === 'test' ? 'Submit' : 'Check';
        show('session-card');
        if (!state.queue.length) {
            await complete();
            return;
        }
        renderWord();
    }
    const currentItem = () => state.queue[state.index];
    function updateReplayNote() { el('replay-note').textContent = state.session.mode === 'test' ? `${Math.max(0, 2 - state.plays)} replay${2 - state.plays === 1 ? '' : 's'} remaining for this word` : 'Tap the speaker to hear it again'; }
    function speak() {
        const item = currentItem();
        if (!canAct() || !item || state.session.mode === 'test' && state.plays >= 2)
            return;
        state.plays++;
        stopVoice();
        const generation = voiceGeneration, sessionId = state.session.id, wordId = item.id;
        updateReplayNote();
        if (!transport.audio) {
            browserSpeak(item.speech_text);
            return;
        }
        el('replay-note').textContent = 'Preparing your spelling voice…';
        void transport.audio({ sessionId, wordId }).then(value => {
            if (generation !== voiceGeneration || !canAct() || currentItem()?.id !== wordId)
                return;
            const bytes = Uint8Array.from(atob(value.data), character => character.charCodeAt(0));
            voiceUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
            voiceAudio = new Audio(voiceUrl);
            voiceAudio.onended = () => { if (generation === voiceGeneration) {
                stopVoice();
                updateReplayNote();
            } };
            voiceAudio.onerror = () => { if (generation === voiceGeneration) {
                stopVoice();
                if (browserSpeak(item.speech_text))
                    el('replay-note').textContent = 'Using this computer’s voice while narration is unavailable.';
            } };
            return voiceAudio.play().then(() => { if (generation === voiceGeneration)
                updateReplayNote(); });
        }).catch(() => { if (generation !== voiceGeneration || !canAct() || currentItem()?.id !== wordId)
            return; stopVoice(); if (browserSpeak(item.speech_text))
            el('replay-note').textContent = 'Using this computer’s voice while narration is unavailable.'; });
    }
    function renderWord() {
        stopVoice();
        state.reviewing = false;
        nextWord.hidden = true;
        const item = currentItem();
        if (!item) {
            void complete().catch(onError);
            return;
        }
        focusReview.hidden = !item.review_due;
        state.plays = 0;
        el('answer').value = '';
        el('answer').disabled = false;
        el('submit').disabled = false;
        el('feedback').className = 'feedback hidden';
        const learn = state.session.mode === 'learn', adaptive = item.adaptive, correction = !!item.correction;
        const stage = learn || correction ? 'copy' : adaptive?.stage;
        const coach = state.session.mode === 'practice' && (!adaptive || correction) && !!item.coach_hint;
        const prompt = correction ? item.correction : learn ? item.word : adaptive?.prompt || '';
        const visible = stage === 'copy' || stage === 'partial';
        el('coach-tip').classList.toggle('hidden', !coach);
        el('coach-tip-text').textContent = coach ? item.coach_hint : '';
        el('learn-word').classList.toggle('hidden', !visible);
        el('learn-word').textContent = visible ? prompt : '';
        el('learn-word').classList.toggle('letter-hints', stage === 'partial');
        el('learn-word').setAttribute('aria-label', stage === 'partial' ? [...prompt].map(letter => letter === '_' ? 'blank' : letter).join(' ') : visible ? prompt : '');
        letterReview.replaceChildren();
        letterReview.classList.toggle('hidden', !correction || !item.lastMiss);
        if (correction && item.lastMiss)
            letterReview.append(reviewLetters(item.lastMiss, item.correction));
        el('learn-info').classList.toggle('hidden', !learn);
        el('learn-info').textContent = learn ? [item.definition, item.example_sentence, item.teaching_hint].filter(Boolean).join(' — ') || 'Look carefully, say the word, and type it.' : '';
        stageLabel.hidden = !adaptive;
        stageLabel.textContent = correction ? 'Study & correct' : stage === 'copy' ? '1 · Look, say & copy' : stage === 'partial' ? '2 · Letter hints · ' + adaptive.hint_days + '/2 successful practice days' : '3 · From memory · ' + adaptive?.recall_days + '/2 successful practice days';
        el('listen-label').textContent = correction ? 'Look at the correct spelling, then type it carefully' : stage === 'copy' ? 'Look, listen, and copy' : stage === 'partial' ? 'Use the letters as clues. Type the whole word.' : state.session.mode === 'test' ? 'Listen carefully — no hints' : coach ? 'Use your coach tip, then listen carefully' : 'Listen, then spell it from memory';
        el('progress-copy').textContent = 'Word ' + (state.received + state.index + 1) + ' of ' + (state.received + state.queue.length);
        el('progress-bar').style.width = Math.round((state.received + state.index) / (state.received + state.queue.length) * 100) + '%';
        el('answer').focus();
        speak();
    }
    function feedback(text, type) { el('feedback').textContent = text; el('feedback').className = `feedback ${type}`; }
    async function submit() {
        if (state.reviewing) {
            nextWord.click();
            return;
        }
        const item = currentItem(), answer = el('answer').value.trim();
        if (!canAct() || state.advancing || !item || !answer)
            return;
        state.advancing = true;
        el('answer').disabled = el('submit').disabled = true;
        const label = el('submit').textContent;
        el('submit').textContent = 'Checking…';
        el('submit').setAttribute('aria-busy', 'true');
        try {
            const result = await transport.command({ kind: 'attempt', sessionId: state.session.id, wordId: item.id, answer });
            el('submit').textContent = label;
            el('submit').removeAttribute('aria-busy');
            let delay = 350;
            if (state.singlePass && !result.correct && state.session.mode !== 'test') {
                letterReview.replaceChildren(reviewLetters(answer, result.correct_word));
                letterReview.classList.remove('hidden');
                el('learn-word').classList.add('hidden');
                stageLabel.hidden = false;
                stageLabel.textContent = 'Saved for next practice';
                el('listen-label').textContent = 'Compare the highlighted letters, then continue';
                const tip = result.coach_hint || result.teaching_hint || result.correction_hint || '';
                el('coach-tip').classList.toggle('hidden', !tip);
                el('coach-tip-text').textContent = tip;
                feedback('Not quite. This word is saved for another practice. You can keep going.', 'wrong');
                state.advancing = false;
                state.reviewing = true;
                nextWord.textContent = state.index + 1 < state.queue.length ? 'Next word' : 'Finish this pass';
                nextWord.hidden = false;
                nextWord.focus();
                return;
            }
            if (item.adaptive && !result.correct && state.session.mode !== 'test') {
                item.correction = result.correct_word;
                item.lastMiss = answer;
                item.coach_hint = result.coach_hint || result.teaching_hint || '';
                state.advancing = false;
                renderWord();
                feedback('Let’s learn this spelling. ' + (result.correction_hint || 'Copy the word above, then we will keep practicing.'), 'wrong');
                return;
            }
            if (state.session.mode === 'test') {
                feedback('Answer saved.', 'neutral');
                delay = 250;
            }
            else if (result.correct) {
                if (item.correction && item.adaptive && !item.delayedReview && !state.masteryRequired && state.session.mode === 'practice') {
                    state.queue.splice(Math.min(state.index + 3, state.queue.length), 0, { ...item, correction: '', lastMiss: '', coach_hint: '', delayedReview: true, adaptive: { ...item.adaptive, stage: 'recall' } });
                    feedback('Good correction. You’ll spell this word from memory again after a few others.', 'correct');
                }
                else
                    feedback(item.correction ? 'Good correction. A later practice will check your memory.' : item.adaptive?.stage === 'copy' ? 'Copied correctly — next, you will use letter clues.' : '✓ Correct!', 'correct');
            }
            else {
                if (result.coach_hint)
                    item.coach_hint = result.coach_hint;
                letterReview.replaceChildren(reviewLetters(answer, result.correct_word));
                letterReview.classList.remove('hidden');
                if (state.masteryRequired) {
                    feedback(`Not quite. The word is “${result.correct_word}”. Since tomorrow is test day, it will return after a few others.`, 'wrong');
                    state.queue.splice(Math.min(state.index + 3, state.queue.length), 0, item);
                }
                else
                    feedback(`Not quite. The word is “${result.correct_word}”. We saved it for another practice.`, 'wrong');
                delay = 3200;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
            state.index++;
            state.advancing = false;
            if (canAct())
                renderWord();
        }
        catch (error) {
            el('submit').textContent = label;
            el('submit').removeAttribute('aria-busy');
            feedback(error.message, 'wrong');
            state.advancing = false;
            el('answer').disabled = el('submit').disabled = false;
            throw error;
        }
    }
    async function complete() { const result = await transport.command({ kind: 'complete', sessionId: state.session.id }); showResult(result); }
    function showResult(result) {
        stopVoice();
        const test = result.mode === 'test', learn = result.mode === 'learn', mastery = !!result.mastery_required, nextMode = learn ? (state.session?.practice_only ? 'practice' : requiredMode()) : null;
        state.resultNextMode = nextMode;
        state.advancing = false;
        el('result-icon').textContent = test ? '📝' : learn ? '📖' : mastery ? '⭐' : '🎉';
        el('result-title').textContent = test ? 'Practice pre-test complete!' : learn ? 'Learning complete — now practice!' : mastery ? 'Mastery Day complete!' : 'Practice complete!';
        el('result-score').hidden = !!result.guided_practice && !test;
        el('result-score').textContent = `${Math.round(result.score_percent)}%`;
        const coinChange = Number(result.coins_delta) || 0, coinMessage = coinChange > 0 ? `You earned ${coinChange} coin${coinChange === 1 ? '' : 's'} this session.` : coinChange < 0 ? `${-coinChange} coin${coinChange === -1 ? ' was' : 's were'} deducted from this practice pre-test.` : test ? 'No coins changed for this pre-test. Only the first pre-test on a list can change coins.' : state.session?.mode === 'optional' ? 'No coins earned this pass. New correct optional words can earn 1 coin each, up to 20 per day.' : 'No separate coins for this practice. Required Spelling counts toward the daily school reward after all required work is done.';
        el('result-copy').textContent = (test ? 'This practice score helps you know what to study. It is not your gradebook grade; your test in the book will be graded separately.' : learn ? `You reviewed every word, but spelling is not finished for today. Complete ${nextMode === 'test' ? 'the Practice Pre-test' : 'Practice'} to finish spelling.` : result.guided_practice ? result.single_pass ? (result.review_next_time ? result.review_next_time + ' word' + (result.review_next_time === 1 ? ' is' : 's are') + ' saved to review first next time. You finished today’s practice.' : 'You finished today’s practice. Keep reviewing to remember these words.') + ' ' + result.progression.ready + ' of ' + result.total_words + ' words are ready without hints. Copying and letter hints do not count as unaided spelling.' : result.progression.ready + ' of ' + result.total_words + ' words were spelled from memory on two practice days. Copied words and letter hints are learning steps, not a test score. Keep practicing the words that still need help.' : mastery ? 'You reviewed every word and corrected your mistakes. Keep practicing so you can spell them without help.' : 'You finished one complete pass. Missed words are saved so your next practice can help where you need it most.') + ' ' + coinMessage;
        el('practice-again-button').textContent = learn ? (nextMode === 'test' ? 'Start Practice Pre-test' : 'Start Practice') : 'Practice Again';
        el('result-stats').replaceChildren(...[[`${result.first_try_correct}/${result.total_words}`, 'Right first try'], [`${result.eventual_correct}/${result.total_words}`, 'Correct this pass'], [`${coinChange > 0 ? '+' : ''}${coinChange}`, coinChange > 0 ? 'Coins earned' : coinChange < 0 ? 'Coins deducted' : 'Coins this pass']].map(([value, label]) => { const stat = node('div'); stat.className = 'result-stat'; stat.append(node('strong', value), node('span', label)); return stat; }));
        if (result.guided_practice && !test) {
            el('result-stats').replaceChildren(...[[result.progression.copy, 'Learning the word'], [result.progression.partial, 'Using letter hints'], [result.progression.recall, 'Practicing from memory']].map(([value, label]) => { const stat = node('div'); stat.className = 'result-stat'; stat.append(node('strong', String(value)), node('span', label)); return stat; }));
        }
        if (result.single_pass && !test) {
            for (const [value, label] of [[result.first_try_correct + '/' + result.total_words, 'Right this pass · includes hints'], [result.review_next_time, 'Review next time']]) {
                const stat = node('div');
                stat.className = 'result-stat';
                stat.append(node('strong', String(value)), node('span', label));
                el('result-stats').prepend(stat);
            }
        }
        const corrections = result.corrections || [];
        el('corrections').classList.toggle('hidden', !corrections.length);
        el('corrections').replaceChildren();
        if (corrections.length) {
            const list = node('ul');
            for (const item of corrections) {
                const row = node('li');
                row.append(reviewLetters(item.answer, item.word));
                list.append(row);
            }
            el('corrections').append(node('strong', 'Words to keep practicing'), list);
        }
        resume.replaceChildren();
        show('results-card');
    }
    async function showSaved(result) { state.advancing = false; if (result.kind === 'complete') {
        showResult(result);
        return;
    } if (result.kind === 'start') {
        await useSession(result);
        return;
    } await reload(); const received = node('p', result.correct === null ? 'Your practice pre-test answer was received. Resume the session to continue.' : result.correct ? 'Your correct answer was received. Resume the saved session to continue.' : `Your answer was received. The word was “${result.correct_word}”. Resume the saved session to continue.`); received.setAttribute('role', 'status'); resume.prepend(received); }
    const run = fn => () => void Promise.resolve().then(fn).catch(onError);
    document.querySelectorAll('[data-mode]').forEach(button => button.onclick = run(() => start(button.dataset.mode)));
    el('speaker').onclick = speak;
    el('coach-hear').onclick = () => browserSpeak(el('coach-tip-text').textContent);
    el('submit').onclick = run(submit);
    el('answer').onkeydown = event => { if (event.key === 'Enter')
        void submit().catch(onError); };
    el('fallback-start').onclick = el('empty-fallback').onclick = run(() => start('optional'));
    el('back-button').onclick = el('finish-button').onclick = onBack;
    el('practice-again-button').onclick = run(() => state.resultNextMode ? start(state.resultNextMode, state.session?.list_id) : reload());
    return { reload, showSaved, stopVoice };
}

},
"renderer/js/kiosk/theme.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STUDENT_THEME_IDS = void 0;
exports.normalizeStudentTheme = normalizeStudentTheme;
exports.applyThemeToIframe = applyThemeToIframe;
exports.decorateThemedIframe = decorateThemedIframe;
exports.applyStudentTheme = applyStudentTheme;
exports.STUDENT_THEME_IDS = new Set([
    'default',
    'pink',
    'teal',
    'dark-green',
    'orange',
    'purple',
    'aurora',
    'crimson',
    'sunset-gold'
]);
function normalizeStudentTheme(theme) {
    return exports.STUDENT_THEME_IDS.has(theme) ? theme : 'default';
}
function replaceThemeClass(element, theme) {
    if (!element)
        return;
    [...element.classList]
        .filter(className => className.startsWith('theme-'))
        .forEach(className => element.classList.remove(className));
    element.classList.add(`theme-${theme}`);
}
function ensureThemeStylesheet(documentRef) {
    if (!documentRef?.head || documentRef.getElementById('student-theme-styles'))
        return;
    const link = documentRef.createElement('link');
    link.id = 'student-theme-styles';
    link.rel = 'stylesheet';
    link.href = '/css/kiosk/themes.css';
    documentRef.head.appendChild(link);
}
function applyThemeToIframe(iframe, theme) {
    const safeTheme = normalizeStudentTheme(theme);
    try {
        const documentRef = iframe?.contentDocument;
        if (!documentRef)
            return safeTheme;
        ensureThemeStylesheet(documentRef);
        replaceThemeClass(documentRef.documentElement, safeTheme);
        replaceThemeClass(documentRef.body, safeTheme);
    }
    catch (error) {
        // External content is hosted in <webview>, but keep this guarded in case a
        // future iframe is cross-origin.
    }
    return safeTheme;
}
function decorateThemedIframe(iframe, theme) {
    const safeTheme = normalizeStudentTheme(theme);
    iframe.dataset.studentTheme = safeTheme;
    if (!iframe.dataset.studentThemeBound) {
        iframe.dataset.studentThemeBound = '1';
        iframe.addEventListener('load', () => applyThemeToIframe(iframe, iframe.dataset.studentTheme));
    }
    applyThemeToIframe(iframe, safeTheme);
    return safeTheme;
}
function applyStudentTheme(theme) {
    const safeTheme = normalizeStudentTheme(theme);
    replaceThemeClass(document.documentElement, safeTheme);
    replaceThemeClass(document.body, safeTheme);
    document.querySelectorAll('iframe').forEach(iframe => decorateThemedIframe(iframe, safeTheme));
    return safeTheme;
}

},
"renderer/js/preview/session.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPreview = sendPreview;
exports.receivePreview = receivePreview;
exports.memoryStorage = memoryStorage;
function sendPreview(value) { window.parent.postMessage(value, '*'); }
function receivePreview(start) {
    let initialized = false;
    window.addEventListener('message', event => {
        if (initialized || event.source !== window.parent || event.data?.type !== 'preview-seed' || event.data.seed?.preview !== true)
            return;
        initialized = true;
        Promise.resolve().then(() => start(event.data.seed)).then(() => sendPreview({ type: 'preview-loaded' })).catch(error => { document.body.replaceChildren(Object.assign(document.createElement('p'), { textContent: 'Preview could not open. Close it and try again.' })); console.error(error); });
    });
    sendPreview({ type: 'preview-ready' });
}
function memoryStorage() {
    const values = new Map();
    return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
}

},
"renderer/js/preview/spelling-model.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPreviewSpelling = createPreviewSpelling;
// Memory-only transport for the maintained student Spelling controller.
// Never imitates earned coins, mastery or submission receipts from production.
function createPreviewSpelling(source = [], date) {
    const lists = structuredClone(source);
    let session = null, selected = null, attempts = [];
    const words = list => (list?.words || []).map((word, index) => ({ ...word, word: typeof word === 'string' ? word : word.word, id: `preview-word-${index}`, position: index + 1 }));
    return {
        list() { const list = lists.find(row => !row.practice_only); return { active: !!list, list_id: list?.id, title: list?.title, date, test_date: list?.test_date || date, total_words: words(list).length, learned_words: 0, progression: list?.progression, today_mode: list?.test_date === date ? 'test' : 'practice', practice_lists: lists.filter(row => row.practice_only).map(row => ({ ...row, word_count: words(row).length })), resumable: [] }; },
        command(input) {
            if (input.kind === 'start') {
                selected = lists.find(row => row.id === input.listId);
                if (!selected)
                    throw Error('No assigned words for this preview. Add a spelling list in the parent dashboard.');
                if (input.mode === 'test' && selected.test_date > date)
                    throw Error('The practice pre-test is not open yet.');
                attempts = [];
                session = { id: 'preview-session', mode: input.mode, session_date: date, status: 'in_progress', total_words: words(selected).length };
                return { kind: 'start', session, list: { ...selected, adaptive_version: 2 }, items: words(selected).map(word => ({ ...word, speech_text: word.word, adaptive: input.mode === 'test' ? null : input.mode === 'learn' ? { stage: 'copy', prompt: word.word, hint_days: 0, recall_days: 0 } : word.adaptive || { stage: 'copy', prompt: word.word, hint_days: 0, recall_days: 0 } })), prior_attempts: [] };
            }
            if (!session || input.sessionId !== session.id)
                throw Error('Start a preview practice first.');
            if (input.kind === 'attempt') {
                const word = words(selected).find(row => row.id === input.wordId);
                if (!word)
                    throw Error('That word is not in this preview.');
                const normalized = value => String(value || '').trim().normalize('NFKC').replace(/[’‘]/g, "'").toLowerCase();
                const correct = normalized(input.answer) === normalized(word.word);
                attempts.push({ word: word.word, answer: input.answer, correct });
                return { kind: 'attempt', correct: session.mode === 'test' ? null : correct, correct_word: word.word };
            }
            if (input.kind === 'complete') {
                const total = words(selected).length, correct = attempts.filter(row => row.correct).length;
                return { kind: 'complete', mode: session.mode, single_pass: true, total_words: total, first_try_correct: correct, eventual_correct: correct, score_percent: Math.round(correct / total * 100), coins_delta: 0, coins_change: 0, review_next_time: total - correct, corrections: attempts.filter(row => !row.correct), practice_only: true };
            }
            throw Error('That action is not available in preview.');
        }
    };
}

}};const cache={};function require(id){if(cache[id])return cache[id].exports;const module={exports:{}};cache[id]=module;modules[id](require,module,module.exports);return module.exports;}require("renderer/js/preview/spelling.js");})();