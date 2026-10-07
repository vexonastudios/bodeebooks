(function(){"use strict";const modules={"renderer/js/preview/vocabulary.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cloud_vocabulary_controller_js_1 = require("renderer/js/cloud-vocabulary-controller.js");
const theme_js_1 = require("renderer/js/kiosk/theme.js");
const session_js_1 = require("renderer/js/preview/session.js");
(0, session_js_1.receivePreview)(seed => {
    const el = id => document.getElementById(id), close = () => (0, session_js_1.sendPreview)({ type: 'preview-open', module: 'dashboard' });
    (0, theme_js_1.applyStudentTheme)(seed.status.dashboard.data.student.theme);
    el('activity-loader').hidden = true;
    el('vocabulary-cloud-status').textContent = 'Test practice • no school progress, mastery or coins change.';
    const data = seed.vocabulary || { overview: { active: false }, items: [] };
    let results = new Map();
    const session = () => ({ session: { id: 'preview', status: 'in_progress', session_date: seed.status.dashboard.data.date, planned_count: data.items.length }, list: data.list, items: data.items.map(item => ({ ...item.view, answered: results.has(item.view.id) })), current: data.overview, completed_today: false });
    const normalized = value => String(value || '').trim().toLocaleLowerCase('en-US').replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}'-]+/gu, ' ').trim();
    const controller = (0, cloud_vocabulary_controller_js_1.mountVocabulary)({ canAct: () => true, onBack: close, onError: error => { el('vocabulary-cloud-status').textContent = error.message; }, transport: {
            read: async (input) => { if (input.view === 'current')
                return data.overview; if (input.view === 'session')
                return session(); const item = data.items.find(row => row.view.id === input.activityId); return { text: item?.word || '' }; },
            command: async (input) => {
                if (input.kind === 'start') {
                    results = new Map();
                    return session();
                }
                if (input.kind === 'respond') {
                    const item = data.items.find(row => row.view.id === input.activityId);
                    if (!item)
                        throw Error('This word is not part of the preview.');
                    const correct = item.answerSpec.kind === 'continue' ? null : item.answerSpec.accepted.map(normalized).includes(normalized(input.answer));
                    const result = { correct, scored: correct !== null, feedback: correct === null ? 'Introduction complete in this test session.' : `${correct ? 'Correct.' : 'Not quite.'} “${item.word}” means ${item.definition}.`, preview: true };
                    results.set(item.view.id, result);
                    return result;
                }
                return { completed_today: false, needs_practice: true, title: 'Preview practice complete', message: 'Test answers were not submitted. Your child’s real progress has not changed.', summary: { answered: results.size, correct: [...results.values()].filter(r => r.correct === true).length, scored: [...results.values()].filter(r => r.scored).length, introduced: [...results.values()].filter(r => !r.scored).length, terms_reviewed: results.size }, readiness: data.overview };
            }
        } });
    el('vocabulary-close').onclick = close;
    el('vocabulary-refresh').onclick = () => void controller.reload();
    void controller.reload();
    document.documentElement.dataset.previewReady = 'true';
});

},
"renderer/js/cloud-vocabulary-controller.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountVocabulary = mountVocabulary;
// Mechanically adapted original Vocabulary Mastery presentation.
function mountVocabulary({ transport, canAct, onBack, onError }) {
    const studentId = "assigned";
    const views = ['loading-view', 'overview-view', 'session-view', 'results-view', 'empty-view'];
    const state = {
        summary: null,
        session: null,
        steps: [],
        index: 0,
        selectedResponse: null,
        answered: false,
        currentResult: null,
        lastIncorrectTermId: null,
        audio: null,
        retentionOnly: false,
        emptyRetry: null
    };
    const byId = id => document.getElementById(id);
    const show = id => views.forEach(viewId => byId(viewId)?.classList.toggle('hidden', viewId !== id));
    const focusSoon = id => setTimeout(() => {
        const target = byId(id);
        if (!target)
            return;
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
    }, 0);
    const asArray = value => Array.isArray(value) ? value.filter(item => item !== null && item !== undefined && item !== '') : [];
    const asSingleOrArray = value => Array.isArray(value)
        ? value.filter(item => item !== null && item !== undefined && item !== '')
        : value === null || value === undefined || value === '' ? [] : [value];
    const asWordList = value => Array.isArray(value)
        ? value.filter(item => item !== null && item !== undefined && item !== '')
        : typeof value === 'string' ? value.split(/\s*[,;]\s*/).filter(Boolean) : asSingleOrArray(value);
    const firstValue = (...values) => values.find(value => value !== undefined && value !== null && value !== '');
    const numberValue = (...values) => {
        const found = firstValue(...values);
        const parsed = Number(found);
        return Number.isFinite(parsed) ? parsed : 0;
    };
    const boolValue = (...values) => {
        const found = firstValue(...values);
        if (typeof found === 'string')
            return !['false', '0', 'no', 'off', ''].includes(found.toLowerCase());
        return Boolean(found);
    };
    async function request(route, options = {}) {
        if (!canAct())
            throw Error('Vocabulary is paused or waiting for saved work.');
        const parsed = new URL(route, 'https://vocabulary.invalid'), input = options.body ? JSON.parse(options.body) : {};
        if (parsed.pathname === '/current')
            return transport.read({ view: 'current' });
        if (parsed.pathname === '/sessions/start')
            return transport.command({ kind: 'start' });
        const segments = parsed.pathname.split('/').filter(Boolean);
        if (segments[0] === 'sessions' && segments[2] === 'respond')
            return transport.command({ kind: 'respond', sessionId: segments[1], activityId: input.activity_id, answer: String(input.answer ?? '') });
        if (segments[0] === 'sessions' && segments[2] === 'complete')
            return transport.command({ kind: 'complete', sessionId: segments[1] });
        throw Error('Choose a supported Vocabulary action.');
    }
    function dashboard() {
        stopAudio();
        onBack();
    }
    function stopAudio() {
        if (state.audio) {
            try {
                state.audio.pause();
            }
            catch (_) { /* audio is optional */ }
            state.audio = null;
        }
        window.speechSynthesis?.cancel?.();
    }
    function formatDate(value) {
        if (!value)
            return '';
        const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
        const date = match
            ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)
            : new Date(value);
        if (Number.isNaN(date.getTime()))
            return String(value);
        return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
    }
    function normalizeTerm(source = {}, step = {}) {
        if (typeof source === 'string')
            source = { word: source };
        const connections = source.connections || step.connections || {};
        const enrichment = source.enrichment || step.enrichment || {};
        const examples = [
            ...asSingleOrArray(source.source_sentence),
            ...asSingleOrArray(source.example_sentence),
            ...asSingleOrArray(enrichment.examples),
            ...asSingleOrArray(enrichment.scenarios),
            ...asSingleOrArray(source.examples),
            ...asSingleOrArray(source.example_sentences),
            ...asSingleOrArray(step.examples),
            ...asSingleOrArray(step.example_sentence)
        ].filter((value, index, values) => values.findIndex(other => JSON.stringify(other) === JSON.stringify(value)) === index);
        return {
            id: firstValue(source.id, source.term_id, source.vocabulary_term_id, step.term_id, step.vocabulary_term_id),
            word: firstValue(source.word, source.term, source.text, source.vocabulary_word, step.word, step.term_text),
            pronunciation: firstValue(source.pronunciation, source.phonetic, source.pronunciation_text, step.pronunciation),
            partOfSpeech: firstValue(source.part_of_speech, source.partOfSpeech, source.pos, step.part_of_speech),
            exactMeaning: firstValue(source.exact_definition, source.definition, source.book_definition, step.exact_definition, step.definition),
            friendlyMeaning: firstValue(source.child_friendly_definition, source.friendly_definition, source.simple_definition, source.explanation, enrichment.plain_explanation, step.child_friendly_definition),
            examples,
            nonexamples: asSingleOrArray(firstValue(enrichment.nonexamples, source.nonexamples, source.non_examples, source.nonexample, step.nonexamples, step.non_examples)),
            synonyms: asWordList(firstValue(source.synonyms, connections.synonyms, step.synonyms)),
            antonyms: asWordList(firstValue(source.antonyms, connections.antonyms, step.antonyms)),
            forms: asWordList(firstValue(source.related_forms, source.forms, enrichment.morphology, source.morphology, connections.related_forms, step.related_forms)),
            memoryHook: firstValue(source.memory_hook, source.memoryHook, enrichment.memory_hook, step.memory_hook),
            image: firstValue(source.image_url, source.image, step.image_url)
        };
    }
    function normalizeStep(source = {}, index = 0) {
        const rawType = String(firstValue(source.type, source.kind, source.activity_type, source.step_type, 'teach'))
            .trim().toLowerCase().replace(/[\s-]+/g, '_');
        const teachingSource = source.teaching && typeof source.teaching === 'object' ? source.teaching : {};
        const compactTermSource = source.term && typeof source.term === 'object'
            ? source.term
            : source.word && typeof source.word === 'object' ? source.word
                : source.vocabulary_term || {};
        // The session API intentionally sends a compact term on every activity and
        // the full curriculum/enrichment payload only on teaching activities.
        // Merge them so the compact object cannot hide the rich teaching content.
        const termSource = Object.keys(teachingSource).length
            ? {
                ...teachingSource,
                ...compactTermSource,
                enrichment: teachingSource.enrichment || compactTermSource.enrichment
            }
            : compactTermSource;
        const choices = asArray(firstValue(source.choices, source.options, source.answers, source.response_choices)).map((choice, choiceIndex) => {
            if (typeof choice === 'object') {
                return {
                    id: String(firstValue(choice.id, choice.value, choice.key, choiceIndex)),
                    value: firstValue(choice.value, choice.id, choice.text, choice.label, choice.answer),
                    label: String(firstValue(choice.label, choice.text, choice.answer, choice.value, choice.id, ''))
                };
            }
            return { id: String(choiceIndex), value: choice, label: String(choice) };
        });
        return {
            raw: source,
            id: String(firstValue(source.id, source.step_id, source.activity_id, `step-${index}`)),
            type: rawType,
            term: normalizeTerm(termSource, source),
            prompt: firstValue(source.prompt, source.question, source.instruction, source.title),
            context: firstValue(source.context, source.sentence, source.passage, source.scenario),
            choices,
            allowOral: boolValue(source.allow_oral, source.oral_allowed, source.speech_allowed),
            showTerm: source.show_term === true || source.reveal_term === true,
            inputLabel: firstValue(source.input_label, source.answer_label),
            placeholder: firstValue(source.placeholder, source.answer_placeholder)
        };
    }
    function normalizeSummary(data = {}) {
        const current = data.current || data.active_list || data.list || data.vocabulary || data;
        const terms = asArray(firstValue(current.terms, data.terms));
        const statusCounts = { new: 0, learning: 0, ready: 0, remembered: 0 };
        for (const term of terms) {
            const status = String(firstValue(term.mastery_status, term.status, 'new')).toLowerCase().replace(/[\s_-]+/g, '');
            if (status.includes('remember') || status.includes('master'))
                statusCounts.remembered += 1;
            else if (status.includes('ready') || status.includes('test'))
                statusCounts.ready += 1;
            else if (status.includes('learn'))
                statusCounts.learning += 1;
            else
                statusCounts.new += 1;
        }
        const progressSummary = current.progress_summary || data.progress_summary || {};
        const stages = progressSummary.stages || {};
        const vault = current.vault || current.vault_counts || data.vault || data.vault_counts || {};
        const dueReviews = numberValue(data.due_review_count, data.due_reviews, current.due_review_count, current.due_reviews);
        const retentionOnly = boolValue(current.retention_only, data.retention_only);
        const hasCurrentWork = boolValue(current.has_current_work, data.has_current_work);
        const explicitActive = firstValue(current.active, data.active, current.status === 'active' ? true : undefined);
        const totalTerms = numberValue(current.total_terms, current.total_words, data.total_terms, terms.length);
        return {
            raw: data,
            id: firstValue(current.id, current.list_id, current.vocabulary_list_id),
            active: !retentionOnly && (explicitActive === undefined
                ? Boolean(firstValue(current.id, current.list_id, totalTerms > 0))
                : boolValue(explicitActive)),
            title: firstValue(current.title, current.name, data.title, 'Vocabulary Mastery'),
            testDate: firstValue(current.test_date, current.assessment_date, data.test_date),
            totalTerms,
            dueReviews,
            retentionOnly,
            hasCurrentWork,
            completedToday: boolValue(current.completed_today, data.completed_today, current.today_complete),
            required: boolValue(current.required, data.required),
            readiness: Math.max(0, Math.min(100, numberValue(current.readiness_percent, current.readiness, data.readiness_percent, data.readiness))),
            sessionCount: numberValue(current.sessions_completed, current.session_count, data.sessions_completed),
            vault: {
                new: numberValue(vault.new, vault.new_count, stages.New, stages.new, current.new_count, statusCounts.new),
                learning: numberValue(vault.learning, vault.learning_count, stages.Learning, stages.learning, current.learning_count, statusCounts.learning),
                ready: numberValue(vault.test_ready, vault.ready, vault.ready_count, stages['Test-ready'], stages.test_ready, current.test_ready_count, data.test_ready_terms, statusCounts.ready),
                remembered: numberValue(vault.remembered, vault.mastered, vault.remembered_count, stages.Remembered, stages.remembered, current.remembered_count, data.remembered_terms, statusCounts.remembered)
            }
        };
    }
    function renderOverview(summary) {
        state.summary = summary;
        byId('list-title').textContent = summary.title;
        byId('list-kicker').textContent = summary.active ? 'Current word list' : 'Long-term review';
        const message = summary.active
            ? `Build real understanding now, feel ready for the test, and keep the words afterward. ${summary.required ? 'Required Vocabulary helps you finish school and earn the daily school coins once all required work is done.' : 'This practice does not earn separate coins.'}`
            : 'A few older words are ready for a quick memory check. This review does not earn separate coins.';
        byId('list-message').textContent = message;
        const meta = [];
        if (summary.totalTerms)
            meta.push(`${summary.totalTerms} word${summary.totalTerms === 1 ? '' : 's'}`);
        if (summary.testDate)
            meta.push(`Test ${formatDate(summary.testDate)}`);
        if (summary.dueReviews)
            meta.push(`${summary.dueReviews} older word${summary.dueReviews === 1 ? '' : 's'} due`);
        byId('list-meta').replaceChildren(...meta.map(text => {
            const pill = document.createElement('span');
            pill.className = 'meta-pill';
            pill.textContent = text;
            return pill;
        }));
        byId('today-status').textContent = summary.completedToday
            ? '✓ Vocabulary is complete for today. You can still practice again—today only counts once.'
            : summary.sessionCount
                ? 'Your next review is ready. It focuses on the words that need the most attention.'
                : 'Start with a calm check. It is okay not to know a word yet—that helps BodeeGuard teach it well.';
        byId('continue-button').textContent = summary.completedToday ? 'Practice Again' : 'Continue Vocabulary';
        byId('readiness-ring').style.setProperty('--readiness', String(summary.readiness));
        byId('readiness-number').textContent = `${Math.round(summary.readiness)}%`;
        byId('readiness-copy').textContent = summary.readiness >= 85
            ? 'Most words have passed meaning and spaced recall checks. Keep reviewing.'
            : summary.readiness > 0
                ? 'Words become ready through meaning checks and recall on separate days.'
                : 'Meet each word, check its meaning, then recall it without looking.';
        const stages = [
            ['new', '✦', 'New', summary.vault.new, 'Words you are meeting'],
            ['learning', '◐', 'Learning', summary.vault.learning, 'Meaning is taking root'],
            ['ready', '◆', 'Test-ready', summary.vault.ready, 'Recalled in different ways'],
            ['remembered', '✓', 'Remembered', summary.vault.remembered, 'Still known after time']
        ];
        byId('vault-grid').replaceChildren(...stages.map(([className, icon, label, count, copy]) => {
            const card = document.createElement('div');
            card.className = `vault-card ${className}`;
            card.innerHTML = `<span class="vault-icon" aria-hidden="true">${icon}</span><strong>${label}</strong><span class="vault-count">${count}</span><p>${copy}</p>`;
            return card;
        }));
        show('overview-view');
        focusSoon('list-title');
    }
    async function loadCurrent() {
        if (!studentId) {
            showEmpty('Student profile not found', 'Return to the dashboard and choose a student before opening Vocabulary.');
            return;
        }
        show('loading-view');
        try {
            const data = await request(`/current?student_id=${encodeURIComponent(studentId)}`);
            const summary = normalizeSummary(data);
            const hasOpenableReview = summary.active
                || summary.dueReviews > 0
                || summary.hasCurrentWork
                || (summary.retentionOnly && summary.completedToday);
            if (!hasOpenableReview) {
                showEmpty('No vocabulary review is due', 'When Mom or Dad assigns a list, or an older word is ready for review, it will appear here.');
                return;
            }
            renderOverview(summary);
        }
        catch (error) {
            showEmpty('Vocabulary is not available right now', error.message, loadCurrent);
        }
    }
    function showEmpty(title, copy, retry = null) {
        byId('empty-title').textContent = title;
        byId('empty-copy').textContent = copy;
        state.emptyRetry = typeof retry === 'function' ? retry : null;
        byId('empty-retry-button').classList.toggle('hidden', !state.emptyRetry);
        show('empty-view');
        focusSoon('empty-title');
    }
    async function startSession() {
        byId('continue-button').disabled = true;
        show('loading-view');
        try {
            const data = await request('/sessions/start', {
                method: 'POST',
                body: JSON.stringify({ student_id: studentId })
            });
            await useSession(data);
        }
        catch (error) {
            byId('continue-button').disabled = false;
            showEmpty('Your review could not start', error.message, startSession);
        }
    }
    function phaseLabel(type) {
        if (isTeachStep(type))
            return 'Meet the word';
        if (/recall|definition_to_word|produce_word/.test(type))
            return 'Recall it';
        if (/context|scenario|transfer/.test(type))
            return 'Use the context';
        if (/contrast|nonexample|distinguish/.test(type))
            return 'Tell meanings apart';
        if (/productive|use|explain|sentence/.test(type))
            return 'Use the word';
        if (/synonym|antonym|form|morph/.test(type))
            return 'Build connections';
        return 'Understand it';
    }
    function isTeachStep(type) {
        return /^(teach|teaching|intro|introduce|meet|learn|explain)$/.test(type) || type.startsWith('teach_');
    }
    function isTermHidden(type) {
        return type === 'context' || /definition_to_word|produce_word|(^|_)recall($|_)|recall_word|unseen_context|identify_word|context_blank/.test(type);
    }
    function renderStep() {
        stopAudio();
        const step = state.steps[state.index];
        if (!step) {
            completeSession();
            return;
        }
        state.selectedResponse = null;
        state.answered = false;
        state.currentResult = null;
        const teach = isTeachStep(step.type);
        const showTerm = teach || step.showTerm || !isTermHidden(step.type);
        byId('step-phase').textContent = phaseLabel(step.type);
        byId('progress-label').textContent = `${state.index + 1} of ${state.steps.length}`;
        byId('progress-fill').style.width = `${Math.max(4, ((state.index + 1) / state.steps.length) * 100)}%`;
        byId('term-heading').classList.toggle('hidden', !showTerm || !step.term.word);
        byId('listen-button').classList.toggle('hidden', !teach || !step.term.word);
        byId('term-text').textContent = showTerm ? (step.term.word || '') : '';
        byId('part-of-speech').textContent = showTerm ? (step.term.partOfSpeech || '') : '';
        byId('pronunciation').textContent = showTerm ? (step.term.pronunciation || '') : '';
        byId('teach-content').classList.toggle('hidden', !teach);
        byId('question-content').classList.toggle('hidden', teach);
        byId('feedback-panel').className = 'feedback-panel hidden';
        byId('step-button').textContent = teach ? 'I understand—continue' : 'Check my answer';
        byId('step-button').disabled = false;
        if (teach)
            renderTeachStep(step);
        else
            renderQuestionStep(step);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    function renderTeachStep(step) {
        byId('exact-meaning').textContent = step.term.exactMeaning || 'Your curriculum meaning will appear here.';
        byId('friendly-meaning').textContent = step.term.friendlyMeaning || step.term.memoryHook || step.term.exactMeaning || '';
        const image = byId('teach-image');
        // Images are intentionally limited to introduction cards. They are never shown during recall.
        const safeImage = step.term.image && /^(https?:|data:image\/|\/)/i.test(step.term.image);
        image.classList.toggle('hidden', !safeImage);
        image.src = safeImage ? step.term.image : '';
        image.alt = safeImage ? `A learning picture for ${step.term.word || 'this word'}` : '';
        fillList('examples-list', step.term.examples);
        fillList('nonexamples-list', step.term.nonexamples);
        byId('examples-panel').classList.toggle('hidden', !step.term.examples.length);
        byId('nonexamples-panel').classList.toggle('hidden', !step.term.nonexamples.length);
        const connectionGroups = [
            ['Synonyms', step.term.synonyms],
            ['Antonyms', step.term.antonyms],
            ['Word forms', step.term.forms],
            ['Remember', asSingleOrArray(step.term.memoryHook)]
        ].filter(([, values]) => values.length);
        const connections = byId('word-connections');
        connections.replaceChildren(...connectionGroups.flatMap(([label, values]) => {
            const labelNode = document.createElement('strong');
            labelNode.textContent = `${label}: `;
            return [labelNode, ...values.map(value => {
                    const chip = document.createElement('span');
                    chip.textContent = typeof value === 'object' ? firstValue(value.text, value.word, value.label, '') : String(value);
                    return chip;
                })];
        }));
    }
    function fillList(id, values) {
        byId(id).replaceChildren(...values.map(value => {
            const item = document.createElement('li');
            item.textContent = typeof value === 'object' ? String(firstValue(value.text, value.sentence, value.example, '')) : String(value);
            return item;
        }));
    }
    function renderQuestionStep(step) {
        byId('question-type').textContent = phaseLabel(step.type);
        byId('question-prompt').textContent = step.prompt || defaultPrompt(step);
        const context = byId('question-context');
        context.textContent = step.context || '';
        context.classList.toggle('hidden', !step.context);
        const choices = byId('choice-grid');
        const typed = byId('typed-answer');
        const oral = byId('oral-button');
        choices.classList.toggle('hidden', step.choices.length === 0);
        typed.classList.toggle('hidden', step.choices.length > 0);
        oral.classList.toggle('hidden', !step.allowOral || step.choices.length > 0);
        oral.disabled = false;
        oral.textContent = '🎙️ I said my answer out loud';
        choices.replaceChildren(...step.choices.map(choice => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'choice';
            button.setAttribute('role', 'radio');
            button.setAttribute('aria-checked', 'false');
            button.dataset.choiceId = choice.id;
            button.textContent = choice.label;
            button.addEventListener('click', () => {
                choices.querySelectorAll('.choice').forEach(other => {
                    other.classList.remove('selected');
                    other.setAttribute('aria-checked', 'false');
                });
                button.classList.add('selected');
                button.setAttribute('aria-checked', 'true');
                state.selectedResponse = choice.value;
            });
            return button;
        }));
        byId('answer-label').textContent = step.inputLabel || (/productive|sentence|explain|use/.test(step.type) ? 'Explain it in your own words' : 'Your answer');
        byId('answer-input').placeholder = step.placeholder || (step.allowOral ? 'Type here, or say your answer out loud…' : 'Type your answer…');
        byId('answer-input').value = '';
        byId('answer-input').disabled = false;
        if (step.choices.length)
            setTimeout(() => choices.querySelector('.choice')?.focus(), 0);
        else
            setTimeout(() => byId('answer-input').focus(), 0);
    }
    function defaultPrompt(step) {
        if (/word_to_definition|meaning|recognition/.test(step.type))
            return `Which meaning best matches “${step.term.word || 'this word'}”?`;
        if (/definition_to_word|recall/.test(step.type))
            return 'Which vocabulary word matches this meaning?';
        if (/context|scenario/.test(step.type))
            return 'Which word best completes this new situation?';
        if (/contrast|nonexample/.test(step.type))
            return 'Which choice uses the meaning correctly?';
        if (/productive|sentence|explain|use/.test(step.type))
            return `Show what “${step.term.word || 'this word'}” means in your own words.`;
        return 'Choose the best answer.';
    }
    async function handleStepButton() {
        if (state.answered) {
            advanceStep();
            return;
        }
        const step = state.steps[state.index];
        if (!step)
            return;
        let response;
        if (isTeachStep(step.type))
            response = 'understood';
        else if (step.choices.length)
            response = state.selectedResponse;
        else
            response = byId('answer-input').value.trim();
        if (!isTeachStep(step.type) && (response === null || response === undefined || response === '')) {
            showFeedback({ correct: null, feedback: 'Choose or enter an answer first.' }, false);
            return;
        }
        await submitResponse(step, response);
    }
    async function submitResponse(step, response) {
        byId('step-button').disabled = true;
        const label = byId('step-button').textContent;
        byId('step-button').textContent = 'Checking…';
        byId('step-button').setAttribute('aria-busy', 'true');
        try {
            const result = await request(`/sessions/${encodeURIComponent(state.session.id)}/respond`, {
                method: 'POST',
                body: JSON.stringify({ step_id: step.id, activity_id: step.id, response, answer: response })
            });
            acceptResponse(step, result);
        }
        catch (error) {
            showFeedback({ correct: null, feedback: error.message }, false);
            byId('step-button').disabled = false;
            byId('step-button').textContent = label;
        }
        finally {
            byId('step-button').removeAttribute('aria-busy');
        }
    }
    function showFeedback(result = {}, finalAnswer = true) {
        const panel = byId('feedback-panel');
        const correct = result.correct;
        panel.className = `feedback-panel ${correct === true ? 'correct' : correct === false ? 'incorrect' : 'neutral'}`;
        byId('feedback-heading').textContent = correct === true
            ? '✓ You understood it'
            : correct === false
                ? 'Not yet—this is how it works'
                : finalAnswer ? 'Answer saved' : 'One more thing';
        byId('feedback-copy').textContent = String(firstValue(result.feedback, result.explanation, result.message, correct === true ? 'Good thinking. You connected the word to its meaning.' :
            correct === false ? 'Read the explanation, then continue. This word will return later—not right away.' : ''));
        const remember = firstValue(result.remember, result.memory_tip, result.coach_hint, result.try_next_time);
        byId('feedback-remember').textContent = remember ? `Remember: ${remember}` : '';
        byId('feedback-remember').classList.toggle('hidden', !remember);
    }
    function disableAnswers() {
        byId('choice-grid').querySelectorAll('button').forEach(button => { button.disabled = true; });
        byId('answer-input').disabled = true;
        byId('oral-button').disabled = true;
    }
    function advanceStep() {
        const previous = state.steps[state.index];
        state.index += 1;
        // A miss is never drilled again immediately. If the server scheduled the
        // same term next, place the first different term before it.
        if (state.lastIncorrectTermId && state.index < state.steps.length) {
            const next = state.steps[state.index];
            const nextTermId = next?.term?.id || next?.term?.word;
            if (nextTermId && nextTermId === state.lastIncorrectTermId) {
                const laterIndex = state.steps.findIndex((candidate, index) => index > state.index
                    && (candidate.term?.id || candidate.term?.word) !== state.lastIncorrectTermId);
                if (laterIndex > state.index) {
                    const [differentStep] = state.steps.splice(laterIndex, 1);
                    state.steps.splice(state.index, 0, differentStep);
                }
            }
        }
        if (!previous || state.index >= state.steps.length || state.currentResult?.session_complete)
            completeSession();
        else
            renderStep();
    }
    async function completeSession() {
        show('loading-view');
        try {
            const result = state.session?.id
                ? await request(`/sessions/${encodeURIComponent(state.session.id)}/complete`, {
                    method: 'POST', body: JSON.stringify({ student_id: studentId })
                })
                : {};
            renderResults(result);
        }
        catch (error) {
            showEmpty('Your work was saved, but the summary is unavailable', error.message, completeSession);
        }
    }
    function renderResults(result = {}) {
        if (result.readiness) {
            state.summary = normalizeSummary(result.readiness);
            state.retentionOnly = state.summary.retentionOnly;
        }
        const summary = result.summary || {};
        const readiness = result.readiness || {};
        const completed = boolValue(result.completed_today, result.today_complete, true);
        byId('result-title').textContent = firstValue(result.title, completed ? 'Good work—your Word Vault grew today.' : 'Good work—your review is saved.');
        byId('result-copy').textContent = `${firstValue(result.message, result.feedback, 'BodeeGuard will bring words back at the right time so they stay with you.')} ${state.summary?.required && !state.retentionOnly && !result.needs_practice
            ? 'Vocabulary is done for today. Finish your other required schoolwork to earn the daily school coins; Vocabulary has no separate coin payout.'
            : 'This Vocabulary review has no separate coin payout.'}`;
        const scored = numberValue(summary.scored);
        const introduced = numberValue(summary.introduced);
        const performanceValue = scored > 0
            ? `${numberValue(summary.correct)}/${scored}`
            : introduced;
        const performanceLabel = scored > 0 ? 'correct answers' : 'new words met';
        const stats = [
            [numberValue(result.words_reviewed, result.terms_reviewed, summary.terms_reviewed, summary.answered, state.steps.length), 'words reviewed'],
            [performanceValue, performanceLabel]
        ];
        if (state.summary?.active && !state.retentionOnly) {
            stats.push([`${Math.round(numberValue(result.readiness_percent, readiness.readiness_percent, state.summary?.readiness))}%`, 'test readiness']);
        }
        else {
            stats.push([numberValue(readiness.remembered_terms, state.summary?.vault?.remembered), 'remembered words']);
        }
        byId('result-summary').replaceChildren(...stats.map(([value, label]) => {
            const item = document.createElement('div');
            item.className = 'result-stat';
            const strong = document.createElement('strong');
            strong.textContent = String(value);
            const span = document.createElement('span');
            span.textContent = label;
            item.append(strong, span);
            return item;
        }));
        // Retention reviews remain intentionally repeatable on the same day. The
        // server resumes an interrupted session or creates one deliberate repeat,
        // so this never changes daily completion more than once.
        byId('practice-again-button').textContent = result.needs_practice ? 'Check these words' : 'Practice again';
        byId('practice-again-button').classList.toggle('hidden', !state.summary);
        show('results-view');
        focusSoon('result-title');
    }
    async function hearCurrentTerm() {
        const step = state.steps[state.index];
        if (!step || !canAct())
            return;
        stopAudio();
        byId('listen-button').disabled = true;
        try {
            const value = await transport.read({ view: 'speech', sessionId: state.session.id, activityId: step.id });
            if (state.steps[state.index]?.id !== step.id || !canAct())
                return;
            const voice = window.speechSynthesis?.getVoices().find(v => v.localService && /^en[-_]/i.test(v.lang));
            if (!voice)
                throw Error('An English Windows speech voice is needed to hear vocabulary words.');
            const utterance = new SpeechSynthesisUtterance(value.text);
            utterance.voice = voice;
            utterance.lang = voice.lang;
            utterance.rate = .88;
            window.speechSynthesis.speak(utterance);
        }
        catch (error) {
            showFeedback({ correct: null, feedback: error.message }, false);
        }
        finally {
            byId('listen-button').disabled = false;
        }
    }
    byId('back-button').addEventListener('click', dashboard);
    byId('empty-back-button').addEventListener('click', dashboard);
    byId('empty-retry-button').addEventListener('click', () => state.emptyRetry?.());
    byId('finish-button').addEventListener('click', dashboard);
    byId('continue-button').addEventListener('click', startSession);
    byId('practice-again-button').addEventListener('click', startSession);
    byId('step-button').addEventListener('click', handleStepButton);
    byId('listen-button').addEventListener('click', hearCurrentTerm);
    byId('oral-button').addEventListener('click', () => {
        if (state.answered)
            return;
        byId('oral-button').textContent = '✓ Rehearsed out loud';
        byId('oral-button').disabled = true;
        byId('answer-label').textContent = 'Now type a few words so BodeeGuard can check your understanding';
        byId('answer-input').placeholder = 'A short answer is enough…';
        byId('answer-input').focus();
        showFeedback({
            correct: null,
            feedback: 'Saying it out loud is excellent practice. Add a short typed answer before this can count as mastery evidence.'
        }, false);
    });
    byId('answer-input').addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleStepButton();
        }
    });
    window.addEventListener('beforeunload', stopAudio);
    async function useSession(data) {
        state.summary = normalizeSummary(data.current);
        state.session = data.session || data.vocabulary_session || data;
        const sourceSteps = asArray(firstValue(data.steps, data.items, data.activities, state.session.steps));
        state.steps = sourceSteps.filter(step => !boolValue(step.answered, step.completed)).map(normalizeStep);
        state.index = 0;
        state.lastIncorrectTermId = null;
        state.retentionOnly = boolValue(data.list?.retention_only);
        byId('session-title').textContent = firstValue(data.list?.title, data.title, state.summary?.title, 'Make the word yours');
        if (!state.session?.id || !state.steps.length) {
            await completeSession();
            return;
        }
        show('session-view');
        renderStep();
    }
    function acceptResponse(step, result) {
        state.answered = true;
        state.currentResult = result;
        if (result.correct === false)
            state.lastIncorrectTermId = step.term.id || step.term.word || null;
        else if (result.correct === true && state.lastIncorrectTermId === (step.term.id || step.term.word))
            state.lastIncorrectTermId = null;
        if (result.next_step) {
            const nextStep = normalizeStep(result.next_step, state.steps.length);
            if (!state.steps.some(existing => existing.id === nextStep.id))
                state.steps.splice(state.index + 1, 0, nextStep);
        }
        showFeedback(result, true);
        disableAnswers();
        byId('step-button').textContent = state.index >= state.steps.length - 1 || result.session_complete ? 'Finish review' : 'Continue';
        byId('step-button').disabled = false;
    }
    return { reload: loadCurrent, stop: stopAudio, async showSaved(result) {
            if (result.kind === 'start') {
                await useSession(result);
                return;
            }
            if (result.kind === 'complete') {
                renderResults(result);
                return;
            }
            const received = await transport.read({ view: 'session', sessionId: result.command.sessionId });
            if (received.result) {
                renderResults(received.result);
                return;
            }
            const target = received.items.find(step => step.id === result.command.activityId);
            if (!target)
                throw Error('The saved Vocabulary activity could not be reopened.');
            // Reopen the just-received card before its remaining steps so a lost reply
            // does not skip the child's original answer feedback.
            received.items = [{ ...target, answered: false }, ...received.items.filter(step => step.id !== target.id)];
            await useSession(received);
            acceptResponse(state.steps[state.index], result);
        } };
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

}};const cache={};function require(id){if(cache[id])return cache[id].exports;const module={exports:{}};cache[id]=module;modules[id](require,module,module.exports);return module.exports;}require("renderer/js/preview/vocabulary.js");})();