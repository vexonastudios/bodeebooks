(function(){"use strict";const modules={"renderer/js/preview/dashboard.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const session_js_1 = require("renderer/js/preview/session.js");
(0, session_js_1.receivePreview)(async (seed) => {
    const state = structuredClone(seed.status), questions = (seed.daily || []).map(row => ({ ...row, canAnswer: true, answer: null }));
    const unsupported = () => Promise.reject(Error('Not available in browser preview. This test session cannot use the child’s computer, school sign-in, live messages or paid services.'));
    const callbacks = new Set(), notify = () => { for (const callback of callbacks)
        callback(state); };
    const api = { onStatus: callback => { callbacks.add(callback); return () => callbacks.delete(callback); }, preview: true, previewStorage: (0, session_js_1.memoryStorage)(), status: async () => state, sync: async () => state, pause: async () => ({}), activityPanel: async () => ({}),
        saveTheme: async (theme) => { state.dashboard.data.student.theme = theme; (0, session_js_1.sendPreview)({ type: 'preview-theme', theme }); return { saved: true, theme }; },
        practice: async (module) => { if (!['spelling', 'vocabulary'].includes(module))
            return unsupported(); (0, session_js_1.sendPreview)({ type: 'preview-open', module }); },
        messageView: async () => ({}), syncMessages: async () => ({}), messageGroups: async () => seed.messaging || { groups: [], siblings: [], peerMessagingEnabled: false },
        groupMessages: async (id) => { const page = seed.messaging?.groupPages[id]; if (!page)
            throw Error('This chat is not in the preview snapshot.'); return page; },
        sendMessage: async (body) => { state.messaging.messages.push({ id: crypto.randomUUID(), sender: 'child', body, createdAt: new Date().toISOString(), reactions: [] }); notify(); return { saved: true }; },
        sendFamilyMessage: async (body, id) => { if (!state.messaging.childrenCanPost)
            throw Error('This child cannot post to family chat.'); const message = { id: id || crypto.randomUUID(), sender: 'child', authorStudentId: state.school.student.id, senderName: state.school.student.name, body, createdAt: new Date().toISOString(), reactions: [] }; state.messaging.familyMessages.push(message); notify(); return { ...message, saved: true }; },
        sendGroupMessage: async (groupId, body, id) => { const page = seed.messaging?.groupPages[groupId]; if (!page?.childrenCanPost || page.group.closedAt)
            throw Error('This group is closed for this child.'); page.messages.push({ id, body, sender: 'child', authorStudentId: state.school.student.id, senderName: state.school.student.name, createdAt: new Date().toISOString(), reactions: [] }); return { id, saved: true }; },
        setMessageSoundMuted: async (muted) => { state.messaging.notificationSoundMuted = muted; notify(); return { studentId: state.school.student.id, notificationSoundMuted: muted }; },
        chores: async (action, input = {}) => {
            if (action === 'pending')
                return null;
            const chores = state.school.chores || { enabled: false, items: [] };
            if (action === 'submit') {
                const item = chores.items.find(row => row.id === input.id && row.date === input.date);
                if (!item?.available)
                    throw Error('This chore is not ready to mark done.');
                item.status = item.definition?.approvalRequired ? 'submitted' : 'approved';
                item.available = false;
                item.note = 'Test check-off only. This was not sent to your parent.';
            }
            return { ...chores, history: [] };
        },
        dailyQuestions: async (action, input = {}) => {
            if (action === 'pending')
                return null;
            if (action === 'list') {
                if (input.verseOffset)
                    throw Error('Earlier questions are not included in this test session. Return to today or reset preview.');
                return { date: state.dashboard.data.date, questions };
            }
            const question = questions.find(q => q.id === input.questionId);
            if (action !== 'command' || !question || question.answer)
                throw Error('This preview question is already answered. Reset preview to try again.');
            question.answer = { selectedIndex: input.selectedIndex, correct: input.selectedIndex === question.correctIndex, correctIndex: question.correctIndex, coins: 0, explanation: question.explanation };
            question.canAnswer = false;
            return { question };
        } };
    // Explicitly local adapters. No child token, fetch proxy or command passthrough.
    // Unimplemented transports report the limitation through the actual UI.
    window.cloudPilot = new Proxy(api, { get: (target, key) => key in target ? target[key] : String(key).startsWith('on') ? () => () => { } : unsupported });
    window.cloudSchoolView = { openSubject: unsupported };
    await Promise.resolve().then(() => require("renderer/js/cloud-file-tools.js"));
    await Promise.resolve().then(() => require("renderer/js/cloud-student.js"));
    await Promise.resolve().then(() => require("renderer/js/cloud-student-messages.js"));
    const notice = document.createElement('dialog');
    notice.className = 'preview-notice';
    const heading = document.createElement('h2'), text = document.createElement('p'), close = document.createElement('button');
    heading.textContent = 'Not available in browser preview yet';
    text.textContent = 'You can test the dashboard, assigned Spelling and Vocabulary, today’s questions, Messages and Chores. This screen needs its student-app connection. No real activity was started.';
    close.textContent = 'Back to preview';
    close.onclick = () => notice.close();
    notice.append(heading, text, close);
    document.body.append(notice);
    window.addEventListener('cloud-student-surface', event => {
        if (['student-papers-panel', 'student-games-panel', 'student-grades-panel', 'student-learning-panel', 'student-reading-panel', 'student-store-panel', 'student-challenges-panel'].includes(event.detail)) {
            window.dispatchEvent(new CustomEvent('cloud-activity-finished'));
            notice.showModal();
            close.focus();
        }
    });
    const blocked = new Set(['dash-grades-btn', 'store-btn', 'wallet-store-btn', 'wallet-history-btn', 'wallet-earn-btn']);
    document.addEventListener('click', event => {
        const control = event.target.closest('button');
        if (blocked.has(control?.id)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            notice.showModal();
            close.focus();
        }
    }, true);
    document.getElementById('parent-exit').onclick = () => { document.getElementById('error').textContent = 'Use Close above to leave Preview. No parent password is needed for this test session.'; };
    window.dispatchEvent(new CustomEvent('cloud-student-status', { detail: state }));
    document.documentElement.dataset.previewReady = 'true';
});

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
"renderer/js/cloud-file-tools.js":function(require,module,exports){
'use strict';
// Shared private-file UI for the parent browser and isolated child renderer.
// Bytes arrive only from authenticated APIs; no storage URL or token is used.
(() => {
    const maximum = 2 * 1024 * 1024;
    const types = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'audio/wav', 'audio/mpeg', 'audio/webm', 'audio/ogg']);
    const accept = '.png,.jpg,.jpeg,.webp,.pdf,.wav,.mp3,.webm,.ogg';
    const element = (tag, text = '') => { const item = document.createElement(tag); item.textContent = text; return item; };
    const button = (text, action) => { const item = element('button', text); item.type = 'button'; item.className = 'btn btn-secondary'; item.addEventListener('click', action); return item; };
    async function prepareMessageImage(file) {
        if (!/^image\/(?:jpeg|png|webp)$/.test(file.type))
            return file;
        if (file.size > 20 * 1024 * 1024)
            throw new Error('Choose a photo under 20 MB. Your original is unchanged.');
        if (file.size <= 300 * 1024)
            return file;
        let bitmap;
        try {
            bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        }
        catch {
            throw new Error('This photo could not be opened. Try a JPG, PNG, or WebP image. Your draft is retained.');
        }
        try {
            for (const [edge, quality] of [[1800, .82], [1400, .7], [1100, .6]]) {
                const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(bitmap.width * scale));
                canvas.height = Math.max(1, Math.round(bitmap.height * scale));
                const context = canvas.getContext('2d', { alpha: false });
                if (!context)
                    throw new Error('Photo compression is unavailable on this device. Your draft is retained.');
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
                const blob = await new Promise((resolve, reject) => canvas.toBlob(resolve, 'image/jpeg', quality));
                canvas.width = canvas.height = 0;
                if (!blob)
                    throw new Error('Photo compression failed. Your draft is retained.');
                if (blob.size <= maximum && blob.size < file.size)
                    return new File([blob], (file.name || 'Photo').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
            }
        }
        finally {
            bitmap.close();
        }
        if (file.size <= maximum)
            return file;
        throw new Error('This photo is still too large after compression. Your original and message draft are unchanged.');
    }
    async function encode(file, purpose) {
        if (!file || !file.size)
            throw new Error('Choose a nonempty file. Your draft is retained.');
        if (purpose === 'message')
            file = await prepareMessageImage(file);
        if (file.size > maximum)
            throw new Error('Choose a file up to 2 MB. Photos are compressed automatically; your original and draft are unchanged.');
        const bytes = new Uint8Array(await file.arrayBuffer());
        let binary = '';
        for (let index = 0; index < bytes.length; index += 16384)
            binary += String.fromCharCode(...bytes.subarray(index, index + 16384));
        return { id: crypto.randomUUID(), name: file.name, mime: file.type, purpose, data: btoa(binary) };
    }
    let current = null;
    let generation = 0;
    function close() {
        generation++;
        if (!current)
            return;
        const { dialog, url } = current;
        current = null;
        dialog.querySelector('audio')?.pause();
        dialog.remove();
        if (url)
            URL.revokeObjectURL(url);
    }
    async function preview(load, { review, remove } = {}) {
        close();
        const ticket = generation;
        const dialog = element('dialog');
        dialog.className = 'cloud-file-dialog';
        const status = element('p', 'Opening private file…');
        status.setAttribute('role', 'status');
        dialog.append(button('Close', close), status);
        document.body.append(dialog);
        dialog.showModal();
        dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
        current = { dialog, url: null };
        try {
            const value = await load();
            if (ticket !== generation)
                return;
            let file = value.file;
            if (!types.has(file?.mime) || typeof value.data !== 'string' || value.data.length > Math.ceil(maximum / 3) * 4)
                throw new Error('The private file response was invalid.');
            const binary = atob(value.data);
            if (binary.length !== file.size || binary.length > maximum)
                throw new Error('The private file size did not match.');
            const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
            const url = URL.createObjectURL(new Blob([bytes], { type: file.mime }));
            current.url = url;
            dialog.prepend(element('h2', file.name));
            status.textContent = file.reviewedAt ? 'Reviewed by your parent.' : 'Private family file. Downloading saves a copy on this computer.';
            const download = element('a', 'Download original copy');
            download.href = url;
            const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'application/pdf': 'pdf', 'audio/wav': 'wav', 'audio/mpeg': 'mp3', 'audio/webm': 'webm', 'audio/ogg': 'ogg' }[file.mime];
            download.download = `${file.name.replace(/[^\p{L}\p{N} ._-]/gu, '_').replace(/\.[^.]*$/, '').slice(0, 120) || 'BodeeGuard-file'}.${extension}`;
            download.className = 'btn btn-primary';
            dialog.append(download);
            let picture, source;
            const rotate = () => {
                if (!picture || !source)
                    return;
                const sideways = [90, 270].includes(file.rotation);
                picture.width = sideways ? source.naturalHeight : source.naturalWidth;
                picture.height = sideways ? source.naturalWidth : source.naturalHeight;
                const context = picture.getContext('2d');
                context.translate(picture.width / 2, picture.height / 2);
                context.rotate((file.rotation || 0) * Math.PI / 180);
                context.drawImage(source, -source.naturalWidth / 2, -source.naturalHeight / 2);
            };
            if (file.mime.startsWith('image/')) {
                const viewport = element('div');
                viewport.className = 'cloud-file-viewport';
                source = element('img');
                source.src = url;
                await source.decode();
                if (ticket !== generation)
                    return;
                if (source.naturalWidth * source.naturalHeight > 40000000)
                    throw new Error('This image is too large to preview safely. Use Download original copy.');
                picture = element('canvas');
                picture.className = 'cloud-file-image';
                picture.setAttribute('role', 'img');
                picture.setAttribute('aria-label', file.name);
                rotate();
                viewport.append(picture);
                dialog.append(viewport);
                dialog.append(button('Zoom / fit', () => viewport.classList.toggle('zoomed')));
            }
            else if (file.mime.startsWith('audio/')) {
                const audio = element('audio');
                audio.controls = true;
                audio.preload = 'metadata';
                audio.src = url;
                dialog.append(audio);
            }
            else
                dialog.append(element('p', 'Download this PDF to view all pages in your PDF reader. PDFs are not embedded in the dashboard.'));
            if (review && file.purpose === 'paper') {
                const save = async (patch) => {
                    const controls = [...dialog.querySelectorAll('button')];
                    controls.forEach(item => { item.disabled = true; });
                    try {
                        const result = await review({ id: file.id, rotation: file.rotation || 0, reviewed: Boolean(file.reviewedAt), gradeId: file.gradeId, ...patch });
                        if (ticket !== generation)
                            return;
                        file = result.file;
                        rotate();
                        reviewed.textContent = file.reviewedAt ? 'Mark not reviewed' : 'Mark reviewed';
                        status.textContent = 'Review saved. Add the score and feedback using Add Grade in Gradebook.';
                    }
                    catch (error) {
                        if (ticket === generation)
                            status.textContent = `${error.message} The review could not be confirmed; retry the same change.`;
                    }
                    finally {
                        controls.forEach(item => { item.disabled = false; });
                    }
                };
                if (picture)
                    dialog.append(button('Rotate 90° and save', () => save({ rotation: ((file.rotation || 0) + 90) % 360 })));
                const reviewed = button(file.reviewedAt ? 'Mark not reviewed' : 'Mark reviewed', () => save({ reviewed: !file.reviewedAt }));
                dialog.append(reviewed);
            }
            if (remove)
                dialog.append(button('Remove private file', async () => {
                    if (!confirm('Remove this file from your online family storage? Messages retain their text. Download a copy first if you need it.'))
                        return;
                    try {
                        await remove(file.id);
                        if (ticket === generation)
                            close();
                    }
                    catch (error) {
                        if (ticket === generation)
                            status.textContent = error.message;
                    }
                }));
        }
        catch (error) {
            if (ticket === generation)
                status.textContent = error.message;
        }
    }
    function voiceAttachment(file, load) {
        const item = element('div');
        item.className = 'cloud-inline-audio';
        item.setAttribute('role', 'group');
        item.setAttribute('aria-label', 'Voice message player');
        const audio = element('audio');
        audio.preload = 'none';
        audio.hidden = true;
        audio.setAttribute('aria-label', 'Voice message');
        const status = element('span');
        status.className = 'cloud-inline-audio-status';
        status.setAttribute('role', 'status');
        const controls = element('div');
        controls.className = 'cloud-inline-audio-controls';
        const play = button('', () => { if (!audio.paused)
            audio.pause();
        else
            void start(); });
        play.className = 'cloud-inline-audio-play';
        play.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="voice-play-icon" d="m9 5 11 7-11 7Z" fill="currentColor"/><path class="voice-pause-icon" d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="4"/></svg>';
        const timeline = element('div');
        timeline.className = 'cloud-inline-audio-timeline';
        const seek = element('input');
        seek.type = 'range';
        seek.min = '0';
        seek.max = '1';
        seek.step = '0.1';
        seek.value = '0';
        seek.disabled = true;
        seek.setAttribute('aria-label', 'Seek voice message');
        const time = element('span', '0:00 / —');
        time.className = 'cloud-inline-audio-time';
        const mute = button('', () => { audio.muted = !audio.muted; });
        mute.className = 'cloud-inline-audio-mute';
        mute.disabled = true;
        mute.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m11 5-6 4H2v6h3l6 4Z"/><path class="voice-sound-icon" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/><path class="voice-muted-icon" d="m16 9 5 6m0-6-5 6"/></svg>';
        timeline.append(seek, time);
        controls.append(play, timeline, mute);
        item.append(controls, audio, status);
        let url = null, loading = false, disposed = false;
        const visible = () => !disposed && item.isConnected && !document.hidden && item.getClientRects().length > 0;
        const clock = value => { const seconds = Math.max(0, Math.floor(value || 0)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; };
        function paint() {
            const duration = Number.isFinite(audio.duration) ? audio.duration : 0, position = audio.currentTime || 0;
            play.dataset.playing = String(!audio.paused);
            play.setAttribute('aria-label', status.textContent && !url ? 'Retry voice message' : audio.paused ? 'Play voice message' : 'Pause voice message');
            mute.dataset.muted = String(audio.muted);
            mute.setAttribute('aria-label', audio.muted ? 'Unmute voice message' : 'Mute voice message');
            mute.setAttribute('aria-pressed', String(audio.muted));
            mute.disabled = !url;
            seek.disabled = !duration;
            seek.max = String(duration || 1);
            seek.value = String(position);
            seek.style.setProperty('--voice-position', `${duration ? Math.min(100, position / duration * 100) : 0}%`);
            seek.setAttribute('aria-valuetext', `${clock(position)} of ${duration ? clock(duration) : 'unknown duration'}`);
            time.textContent = `${clock(position)} / ${duration ? clock(duration) : '—'}`;
        }
        seek.addEventListener('input', () => { if (visible() && Number.isFinite(audio.duration)) {
            audio.currentTime = Math.min(audio.duration, Math.max(0, Number(seek.value)));
            paint();
        } });
        for (const name of ['loadedmetadata', 'durationchange', 'timeupdate', 'play', 'pause', 'ended', 'volumechange'])
            audio.addEventListener(name, paint);
        paint();
        async function start() {
            if (loading || !visible())
                return;
            loading = true;
            play.disabled = true;
            item.setAttribute('aria-busy', 'true');
            status.textContent = '';
            try {
                if (!url) {
                    status.textContent = 'Loading voice message…';
                    const value = await load();
                    if (!visible())
                        return;
                    const saved = value?.file;
                    if (saved?.id !== file.id || saved.removed || saved.mime !== file.mime || !types.has(saved.mime) || !saved.mime.startsWith('audio/') || typeof value.data !== 'string' || value.data.length > Math.ceil(maximum / 3) * 4)
                        throw new Error('The voice message response was invalid.');
                    const binary = atob(value.data);
                    if (!binary.length || binary.length !== saved.size || binary.length > maximum)
                        throw new Error('The voice message size did not match.');
                    url = URL.createObjectURL(new Blob([Uint8Array.from(binary, char => char.charCodeAt(0))], { type: saved.mime }));
                    audio.src = url;
                }
                if (!visible())
                    return;
                status.textContent = '';
                try {
                    await audio.play();
                }
                catch (error) {
                    if (error.name === 'NotAllowedError')
                        status.textContent = 'Ready to play. Tap Play.';
                    else if (error.name !== 'AbortError')
                        throw new Error('This voice message could not play. Please try again.');
                }
            }
            catch (error) {
                if (!disposed)
                    status.textContent = error.message || 'Could not load this voice message. Try again.';
            }
            finally {
                loading = false;
                play.disabled = false;
                item.removeAttribute('aria-busy');
                paint();
            }
        }
        audio.addEventListener('playing', () => {
            if (!visible()) {
                audio.pause();
                return;
            }
            for (const other of document.querySelectorAll('.cloud-inline-audio audio'))
                if (other !== audio)
                    other.pause();
            status.textContent = '';
            paint();
        });
        audio.addEventListener('error', () => {
            if (disposed)
                return;
            status.textContent = 'This voice message could not play. Try again.';
            audio.removeAttribute('src');
            if (url)
                URL.revokeObjectURL(url);
            url = null;
            paint();
        });
        // The keyed message row owns the URL; receipt updates leave this player intact.
        item.dispose = () => { disposed = true; audio.pause(); audio.removeAttribute('src'); audio.load(); if (url)
            URL.revokeObjectURL(url); url = null; };
        return item;
    }
    function imageAttachment(file, load) {
        const item = button('', () => preview(read));
        item.className = 'cloud-inline-image';
        item.setAttribute('aria-label', `Open image ${file.name || 'attachment'}`);
        const picture = element('img');
        picture.alt = file.name || 'Image attachment';
        picture.loading = 'lazy';
        const status = element('span', 'Image attachment');
        status.className = 'cloud-inline-image-status';
        item.append(picture, status);
        let url = null, saved = null, loading = false, disposed = false, observer = null;
        async function read() { return saved || (saved = await load()); }
        async function show() {
            if (loading || disposed || url)
                return;
            loading = true;
            status.textContent = 'Loading image…';
            try {
                const value = await read(), meta = value?.file;
                if (disposed)
                    return;
                if (meta?.id !== file.id || meta.removed || meta.mime !== file.mime || !/^image\/(?:png|jpeg|webp)$/.test(meta.mime) ||
                    typeof value.data !== 'string' || value.data.length > Math.ceil(maximum / 3) * 4)
                    throw new Error('Image unavailable. Tap to retry.');
                const binary = atob(value.data);
                if (!binary.length || binary.length !== meta.size || binary.length > maximum)
                    throw new Error('Image unavailable. Tap to retry.');
                url = URL.createObjectURL(new Blob([Uint8Array.from(binary, char => char.charCodeAt(0))], { type: meta.mime }));
                picture.src = url;
                picture.onload = () => {
                    if (picture.naturalWidth * picture.naturalHeight > 40000000) {
                        picture.removeAttribute('src');
                        URL.revokeObjectURL(url);
                        url = null;
                        status.textContent = 'Image too large to show here. Tap to open.';
                    }
                    else
                        status.textContent = '';
                };
                picture.onerror = () => { if (url)
                    URL.revokeObjectURL(url); url = null; status.textContent = 'Image unavailable. Tap to retry.'; };
            }
            catch {
                saved = null;
                if (!disposed)
                    status.textContent = 'Image unavailable. Tap to retry.';
            }
            finally {
                loading = false;
                observer?.disconnect();
            }
        }
        if ('IntersectionObserver' in window) {
            observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting))
                void show(); }, { rootMargin: '200px' });
            observer.observe(item);
        }
        else
            void show();
        item.addEventListener('click', () => { if (!url)
            void show(); });
        item.dispose = () => { disposed = true; observer?.disconnect(); picture.removeAttribute('src'); if (url)
            URL.revokeObjectURL(url); url = null; };
        return item;
    }
    function attachment(file, load) {
        if (!file.removed && types.has(file.mime) && file.mime.startsWith('audio/'))
            return voiceAttachment(file, load);
        if (!file.removed && types.has(file.mime) && file.mime.startsWith('image/'))
            return imageAttachment(file, load);
        const item = button(file.removed ? 'Attachment removed' : `Open ${file.name || 'attachment'}`, () => preview(load));
        item.disabled = Boolean(file.removed);
        return item;
    }
    window.addEventListener('pagehide', close);
    document.addEventListener('visibilitychange', () => { if (document.hidden)
        close(); });
    window.cloudFileTools = { encode, preview, attachment, close, accept, element, button };
})();

},
"renderer/js/cloud-student.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cloud_student_dashboard_js_1 = require("renderer/js/cloud-student-dashboard.js");
const cloud_student_daily_js_1 = require("renderer/js/cloud-student-daily.js");
const cloud_student_reading_js_1 = require("renderer/js/cloud-student-reading.js");
const cloud_learning_challenges_js_1 = require("renderer/js/cloud-learning-challenges.js");
const cloud_student_store_js_1 = require("renderer/js/cloud-student-store.js");
const cloud_school_break_js_1 = require("renderer/js/cloud-school-break.js");
const cloud_student_planner_js_1 = require("renderer/js/cloud-student-planner.js");
const cloud_student_chores_js_1 = require("renderer/js/cloud-student-chores.js");
const cloud_student_sleep_js_1 = require("renderer/js/cloud-student-sleep.js");
const cloud_school_close_dialog_js_1 = require("renderer/js/cloud-school-close-dialog.js");
const cloud_white_noise_js_1 = require("renderer/js/cloud-white-noise.js");
const cloud_student_bug_report_js_1 = require("renderer/js/cloud-student-bug-report.js");
const cloud_student_rendering_js_1 = require("renderer/js/cloud-student-rendering.js");
'use strict';
/* global document, window, CustomEvent */
(() => {
    const api = window.cloudPilot, el = id => document.getElementById(id);
    const panels = [...document.querySelectorAll('main > section'), el('student-loading-panel')];
    document.querySelector('.header-right')?.append(el('parent-exit'));
    (0, cloud_student_daily_js_1.mountCloudDailyQuestions)({ api, preview: api.preview === true });
    (0, cloud_student_reading_js_1.mountCloudReading)({ api });
    (0, cloud_student_store_js_1.mountCloudStore)({ api });
    const schoolBreak = (0, cloud_school_break_js_1.mountCloudSchoolBreak)({ api, onError: error => { el('error').textContent = error.message; } });
    const planner = (0, cloud_student_planner_js_1.mountCloudStudentPlanner)({ api });
    (0, cloud_student_chores_js_1.mountCloudStudentChores)({ api });
    (0, cloud_student_sleep_js_1.mountCloudStudentSleep)({ api });
    const whiteNoise = (0, cloud_white_noise_js_1.mountWhiteNoise)({ api });
    el('toolbar-volume').title = 'Lesson volume. For Windows speaker or headset volume, open Devices & Sound.';
    el('volume-slider').setAttribute('aria-label', 'Lesson volume');
    const appsButton = document.createElement('button');
    appsButton.type = 'button';
    appsButton.className = 'header-btn cloud-apps-button';
    appsButton.title = 'My Apps';
    appsButton.setAttribute('aria-label', 'My Apps');
    appsButton.innerHTML = '<i data-lucide="app-window"></i><span>Apps</span>';
    appsButton.addEventListener('click', async () => { appsButton.disabled = true; try {
        await api.apps();
    }
    catch (error) {
        el('error').textContent = error.message;
    }
    finally {
        appsButton.disabled = false;
    } });
    document.querySelector('.header-right')?.append(appsButton);
    let latest = null, child = null, active = 'student-loading-panel', setupStage, startupComplete = false;
    el('student-loading-parent').addEventListener('click', () => el('parent-exit').click());
    el('student-loading-retry').addEventListener('click', async () => {
        const button = el('student-loading-retry');
        button.disabled = true;
        try {
            await api.sync();
            window.dispatchEvent(new CustomEvent('cloud-student-status', { detail: await api.status() }));
        }
        catch (error) {
            el('student-loading-detail').textContent = error.message;
        }
        finally {
            button.disabled = false;
        }
    });
    el('school-access-retry').addEventListener('click', async () => {
        const button = el('school-access-retry');
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        el('school-access-recovery-detail').textContent = 'Checking your connection and school rules…';
        try {
            await api.sync();
            const value = await api.status();
            button.disabled = false;
            window.dispatchEvent(new CustomEvent('cloud-student-status', { detail: value }));
        }
        catch (error) {
            el('school-access-recovery-detail').textContent = error.message;
        }
        finally {
            button.disabled = false;
            button.removeAttribute('aria-busy');
        }
    });
    el('school-access-wifi').addEventListener('click', () => api.deviceTools('wifi').catch(error => { el('school-access-recovery-detail').textContent = error.message; }));
    function icons() { (0, cloud_student_rendering_js_1.renderPendingIcons)(); }
    for (const target of [document.querySelector('.header-right'), document.querySelector('#subject-toolbar .toolbar-actions'), document.querySelector('.cloud-setup-heading')]) {
        if (!target)
            continue;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `${target.classList.contains('header-right') ? 'header-btn' : 'toolbar-btn'} local-device-button`;
        button.title = 'Windows sound, Wi-Fi, headsets & printers';
        button.setAttribute('aria-label', button.title);
        button.innerHTML = `<i data-lucide="settings-2" aria-hidden="true"></i><span>${target.classList.contains('header-right') ? 'Devices &amp; Sound' : 'Sound, Wi-Fi, headsets &amp; printers'}</span>`;
        button.addEventListener('click', () => api.deviceTools('wifi').catch(error => { el('error').textContent = error.message; }));
        target.append(button);
    }
    // Group once, preserving the existing buttons, handlers and keyboard order.
    const header = document.querySelector('.header-right');
    for (const [name, className, buttons] of [
        ['School shortcuts', 'cloud-header-school', [el('dash-planner-btn'), el('dash-message-btn'), el('dash-grades-btn'), el('store-btn'), appsButton]],
        ['Computer controls', 'cloud-header-device', [el('completion-badge'), el('dash-sleep-btn'), el('dash-update-btn'), el('parent-exit'), header?.querySelector('.local-device-button')]]
    ]) {
        const group = document.createElement('div');
        group.className = `cloud-header-group ${className}`;
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', name);
        for (const button of buttons.filter(Boolean)) {
            if (button.title && !button.hasAttribute('aria-label'))
                button.setAttribute('aria-label', button.title);
            group.append(button);
        }
        header?.append(group);
    }
    (0, cloud_student_bug_report_js_1.mountStudentBugReport)({ api });
    function show(id) {
        if (active === id || !panels.some(panel => panel.id === id))
            return;
        active = id;
        for (const panel of panels) {
            panel.hidden = panel.id !== id;
            panel.inert = panel.hidden;
            panel.classList.toggle('active', panel.id === id);
        }
        if (id === 'dashboard-screen' && latest) {
            desk.render(latest);
            icons();
        }
        if (latest)
            renderUpdateFeedback(latest);
        window.dispatchEvent(new CustomEvent('cloud-student-surface', { detail: id }));
    }
    async function leaveSchool(id) {
        try {
            if (latest?.school?.student?.id || latest?.session?.subjectId || latest?.activityStudy)
                await api.pause();
            show(id);
        }
        catch (error) {
            el('error').textContent = error.message;
        }
    }
    window.cloudStudent = { originalDashboard: true };
    const resumeNotice = document.createElement('aside');
    resumeNotice.className = 'cloud-school-resume';
    resumeNotice.id = 'cloud-school-resume';
    resumeNotice.hidden = true;
    const resumeLabel = document.createElement('strong');
    resumeLabel.id = 'cloud-school-resume-label';
    const resumeButton = document.createElement('button');
    resumeButton.id = 'cloud-school-resume-button';
    resumeButton.type = 'button';
    resumeButton.innerHTML = '<i data-lucide="play" aria-hidden="true"></i> Resume school';
    resumeButton.addEventListener('click', async () => { resumeButton.disabled = true; try {
        await window.cloudSchoolView.openSubject(latest.session.subjectId);
    }
    catch (error) {
        el('error').textContent = error.message;
    }
    finally {
        resumeButton.disabled = false;
    } });
    const endButton = document.createElement('button');
    endButton.id = 'cloud-school-end-button';
    endButton.type = 'button';
    endButton.textContent = 'End session';
    endButton.title = 'Close the paused school page';
    const schoolClose = (0, cloud_school_close_dialog_js_1.mountCloudSchoolClose)({ api, button: endButton, getStatus: () => latest, onError: error => { el('error').textContent = error.message; } });
    resumeNotice.append(resumeLabel, resumeButton, endButton);
    el('dashboard-screen').prepend(resumeNotice);
    window.addEventListener('cloud-activity-finished', () => show('dashboard-screen'));
    const destinations = {
        'app://music': ['student-learning-panel', 'learning-videos-toggle'],
        'app://videos': ['student-learning-panel', 'learning-videos-toggle'],
        'app://messages': ['student-messages-panel', 'message-refresh'],
        'app://reading': ['student-reading-panel', 'reading-refresh'],
        'app://papers': ['student-papers-panel', 'paper-refresh'],
        'app://games': ['student-games-panel', 'games-toggle'],
        'app://learning-videos': ['student-learning-panel', 'learning-videos-toggle']
    };
    const desk = (0, cloud_student_dashboard_js_1.createCloudStudentDesk)({ api, storage: api.previewStorage,
        openSchool: id => window.cloudSchoolView.openSubject(id),
        openActivity: async (url, subjectId) => {
            if (url === 'app://white-noise') {
                whiteNoise.open();
                return;
            }
            el('error').textContent = '';
            const assignedId = latest?.school?.subjects?.some(s => s.id === subjectId && s.kind === 'activity') ? subjectId : undefined;
            if (['app://music', 'app://videos', 'app://audiobooks', 'app://learning-videos'].includes(url)) {
                await api.media(url.slice(6), assignedId);
                return;
            }
            if (url === 'app://typing') {
                await api.typing(assignedId);
                return;
            }
            if (url === 'app://logic' || url === 'app://words' || url === 'app://geography' || url === 'app://spelling' || url === 'app://science-spelling' || url === 'app://vocabulary' || url === 'app://poems' || url === 'app://quizzes' || url === 'app://worksheets' || url === 'app://spanish' || url === 'app://coloring-studio' || url === 'app://piano' || url === 'app://math-coach' || url === 'app://long-division') {
                await api.practice(url === 'app://science-spelling' ? 'spelling' : url.slice(6), assignedId);
                return;
            }
            if (url === 'app://coloring') {
                await api.practice('art-studio', assignedId);
                return;
            }
            if (['app://notebook', 'app://writing', 'app://word-processor', 'app://journal'].includes(url)) {
                await api.notebook(assignedId);
                return;
            }
            const [panel, trigger] = destinations[url];
            await leaveSchool(panel);
            if (active === panel) {
                if (['app://reading', 'app://learning-videos', 'app://music', 'app://videos'].includes(url))
                    await api.activityPanel(url.slice(6), assignedId);
                if (panel === 'student-learning-panel')
                    window.dispatchEvent(new CustomEvent('cloud-media-library', { detail: url.slice(6) }));
                el(trigger).click();
            }
        }
    });
    (0, cloud_learning_challenges_js_1.mountLearningChallenges)({ api, open: () => leaveSchool('student-challenges-panel') });
    for (const button of document.querySelectorAll('[data-student-home]'))
        button.addEventListener('click', () => leaveSchool('dashboard-screen'));
    for (const [id, panel, trigger] of [['store-btn', 'student-store-panel', 'store-refresh'], ['wallet-store-btn', 'student-store-panel', 'store-rewards-toggle'], ['wallet-history-btn', 'student-store-panel', 'store-history-toggle'], ['dash-message-btn', 'student-messages-panel', 'message-refresh'], ['dash-grades-btn', 'student-grades-panel', 'grades-refresh'], ['toolbar-help', 'student-messages-panel', 'message-refresh']]) {
        el(id).addEventListener('click', async () => { await leaveSchool(panel); if (active === panel)
            el(trigger).click(); });
    }
    const refreshButton = el('dash-update-btn');
    let refreshNoticeTimer = null;
    const installedVersion = document.createElement('span');
    installedVersion.className = 'cloud-app-version';
    installedVersion.hidden = true;
    const updateHelp = document.createElement('button');
    updateHelp.type = 'button';
    updateHelp.className = 'cloud-update-help';
    updateHelp.textContent = 'Updates';
    updateHelp.title = 'Update status and recovery';
    refreshButton.before(installedVersion, updateHelp);
    const updateFeedback = document.createElement('div');
    updateFeedback.className = 'cloud-update-feedback';
    updateFeedback.hidden = true;
    const updateLabel = document.createElement('span');
    updateLabel.setAttribute('role', 'status');
    const updateProgress = document.createElement('progress');
    updateProgress.max = 100;
    updateProgress.hidden = true;
    updateProgress.setAttribute('aria-label', 'BodeeGuard update download');
    const updateBytes = document.createElement('span');
    updateBytes.className = 'cloud-update-bytes';
    updateBytes.hidden = true;
    const updateDismiss = document.createElement('button');
    updateDismiss.type = 'button';
    updateDismiss.className = 'cloud-update-dismiss';
    updateDismiss.setAttribute('aria-label', 'Dismiss update notification');
    updateDismiss.innerHTML = '<i data-lucide="x" aria-hidden="true"></i>';
    // The glass header creates a fixed-position containing block. Mount on the
    // body so the notification stays in the screen corner and never covers Refresh.
    const updateActions = document.createElement('div');
    updateActions.className = 'cloud-update-actions';
    updateActions.hidden = true;
    const restartNow = document.createElement('button');
    restartNow.type = 'button';
    restartNow.textContent = 'Restart now';
    restartNow.className = 'cloud-update-now';
    const restartLater = document.createElement('button');
    restartLater.type = 'button';
    restartLater.textContent = 'Restart in 30 minutes';
    restartLater.className = 'cloud-update-later';
    const updateRecover = document.createElement('button');
    updateRecover.type = 'button';
    updateRecover.textContent = 'Recover update';
    updateRecover.className = 'cloud-update-recover';
    updateActions.append(restartNow, restartLater, updateRecover);
    updateFeedback.append(updateLabel, updateProgress, updateBytes, updateActions, updateDismiss);
    document.body.append(updateFeedback);
    let showUpdateFeedback = false, updateFeedbackTimer = null, updateFeedbackKey = '';
    let dismissedTransfer = '';
    let displayedVersion = null;
    let updateChoiceBusy = false;
    async function chooseRestart(action) {
        if (updateChoiceBusy)
            return;
        updateChoiceBusy = true;
        restartNow.disabled = restartLater.disabled = updateDismiss.disabled = true;
        try {
            const updates = await api.updateChoice(action);
            if (latest) {
                latest = { ...latest, updates };
                renderUpdateFeedback(latest);
            }
            if (action === 'later') {
                dismissedTransfer = updateFeedbackKey;
                showUpdateFeedback = false;
                updateFeedback.hidden = true;
            }
        }
        catch (error) {
            updateLabel.textContent = error.message;
        }
        finally {
            updateChoiceBusy = false;
            if (latest)
                renderUpdateFeedback(latest);
        }
    }
    updateHelp.addEventListener('click', () => { showUpdateFeedback = true; updateFeedbackKey = ''; if (latest)
        renderUpdateFeedback(latest); });
    updateRecover.addEventListener('click', async () => {
        if (updateChoiceBusy)
            return;
        updateChoiceBusy = true;
        updateRecover.disabled = true;
        try {
            const updates = await api.recoverUpdate();
            if (latest) {
                latest = { ...latest, updates };
                showUpdateFeedback = true;
                renderUpdateFeedback(latest);
            }
        }
        catch (error) {
            el('error').textContent = error.message;
        }
        finally {
            updateChoiceBusy = false;
            if (latest)
                renderUpdateFeedback(latest);
        }
    });
    restartNow.addEventListener('click', () => chooseRestart('now'));
    restartLater.addEventListener('click', () => chooseRestart('schedule'));
    updateDismiss.addEventListener('click', () => {
        if (latest?.updates?.state === 'waiting-for-idle') {
            void chooseRestart('later');
            return;
        }
        showUpdateFeedback = false;
        updateFeedback.hidden = true;
        dismissedTransfer = updateFeedbackKey;
        window.clearTimeout(updateFeedbackTimer);
        updateFeedbackTimer = null;
    });
    function renderUpdateFeedback(value) {
        const version = /^\d{1,5}\.\d{1,5}\.\d{1,5}$/.test(value.build?.version || '') ? value.build.version : '';
        if (version !== displayedVersion) {
            displayedVersion = version;
            installedVersion.textContent = version ? `v${version}` : '';
            installedVersion.hidden = !version;
            installedVersion.title = version ? `Installed BodeeGuard version ${version}` : '';
        }
        const update = value.updates;
        const activeTransfer = ['downloading', 'staging', 'waiting-for-idle', 'preparing-restart', 'restarting'].includes(update?.state);
        // Show real transfers automatically on the dashboard, but keep routine
        // background checks quiet. Existing IPC supplies progress; there is no poll.
        const key = `${update?.state}:${update?.version || ''}:${update?.reason || ''}:${update?.restartScheduled ? 'scheduled' : 'idle'}`;
        if ((activeTransfer || ['waiting-for-release', 'repair-required'].includes(update?.state)) && key !== dismissedTransfer)
            showUpdateFeedback = true;
        if (!showUpdateFeedback || (active !== 'dashboard-screen' || value.applicationReady === false) && !['preparing-restart', 'restarting'].includes(update?.state)) {
            updateFeedback.hidden = true;
            return;
        }
        const targetVersion = /^\d{1,5}\.\d{1,5}\.\d{1,5}$/.test(update?.version || '') ? update.version : '';
        const target = targetVersion ? `BodeeGuard ${targetVersion}` : 'BodeeGuard';
        const failedVersion = /^\d{1,5}\.\d{1,5}\.\d{1,5}$/.test(update?.lastResult?.version || '') ? update.lastResult.version : targetVersion;
        const hasBytes = update?.state === 'downloading' && Number.isSafeInteger(update.receivedBytes) && Number.isSafeInteger(update.totalBytes) &&
            update.totalBytes > 0 && update.receivedBytes >= 0 && update.receivedBytes <= update.totalBytes;
        const percent = hasBytes ? Math.floor(update.receivedBytes * 100 / update.totalBytes) : null;
        const waitReasons = {
            refresh: 'Finishing Refresh. You can keep working.', busy: 'A local task is open. The update will wait.',
            dashboard: 'Your activity is open. The update will wait.', school: 'Your school session is still open. When finished, choose End session before restarting.',
            planner: 'Your planner is open. The update will wait.', games: 'Family Games is open. The update will wait.', apps: 'Your desktop app is open. The update will wait.',
            'unsaved-work': 'Your draft is open. The update will wait.', 'parent-controls': 'Parent controls are open. The update will wait.',
            messages: 'A message from Mom & Dad is open. The update will wait.', 'device-tools': 'Connections is open. The update will wait.',
            media: 'Your media player is open. The update will wait.', writing: 'Writing is open. The update will wait.',
            typing: 'Typing is open. The update will wait.', practice: 'Your practice activity is open. The update will wait.',
            'using-computer': 'You can keep working. Restart whenever you are ready.',
            postponed: update?.restartScheduled ? `Restart scheduled in ${Math.max(1, Math.ceil((update.restartAfterSeconds || 0) / 60))} minutes. School and open activities will delay it.` : 'Restart postponed for 30 minutes. You can keep working.',
            'restart-countdown': `${update?.restartScheduled ? 'Your scheduled restart is ready.' : 'This computer has been unused.'} Restarting in ${Number.isInteger(update?.restartInSeconds) ? update.restartInSeconds : 60} seconds. Choose Restart in 30 minutes to delay it.`
        };
        const messages = {
            checking: 'Checking for updates…', downloading: `Downloading ${target}${hasBytes ? ` — ${percent}%` : '…'}`,
            staging: `Verifying ${target}…`,
            'waiting-for-idle': `${targetVersion ? `${targetVersion} ready.` : 'Update ready.'} ${update?.restartScheduled && update.restartAfterSeconds === 0 && update.reason !== 'restart-countdown' ? 'Your scheduled restart is waiting. ' : ''}${waitReasons[update?.reason] || 'You can keep working. Restart whenever you are ready.'}${update?.restartScheduled && update.reason !== 'postponed' && update.reason !== 'restart-countdown' ? ' Close your activities and save your work to start the restart warning.' : ''}`,
            'preparing-restart': `Saving your work before restarting for ${targetVersion || 'the update'}… Parent controls are available.`,
            restarting: `Restarting to finish ${targetVersion || 'the update'}…`,
            'up-to-date': `No new update. ${targetVersion ? target : `BodeeGuard${version ? ` ${version}` : ''}`} is up to date.`, retrying: 'Update interrupted. BodeeGuard will retry automatically.',
            'waiting-for-release': `Update${failedVersion ? ` ${failedVersion}` : ''} did not install. ${version ? `Version ${version} is still installed. ` : ''}${update?.retryAvailable ? 'Use Recover update to download a fresh verified copy and retry.' : 'This version failed its checks. Check the latest version below; your previous app is kept.'}`,
            'repair-required': 'Installation recovery is being retried automatically. Saved work and recovery copies are kept. Check again in a minute.',
            'waiting-for-account': 'Connect this computer before updating.', 'waiting-for-protection': 'Finish setup before updating.',
            'development-disabled': 'Activities refreshed. Updates are available in the installed app.',
            'validation-isolated': 'Activities refreshed. This isolated test does not download updates.',
            idle: 'Activities refreshed. The update check has not started yet.'
        };
        const message = messages[update?.state];
        if (!message)
            return;
        updateLabel.textContent = message;
        updateFeedback.hidden = false;
        const canRecover = ['idle', 'up-to-date', 'retrying', 'waiting-for-release', 'repair-required'].includes(update?.state);
        updateActions.hidden = update?.state !== 'waiting-for-idle' && !canRecover;
        restartNow.hidden = restartLater.hidden = update?.state !== 'waiting-for-idle';
        updateRecover.hidden = !canRecover;
        updateRecover.disabled = updateChoiceBusy;
        updateRecover.textContent = update?.retryAvailable ? 'Recover update' : 'Get latest update';
        restartNow.disabled = updateChoiceBusy || update?.restartAvailable !== true;
        restartLater.disabled = updateDismiss.disabled = updateChoiceBusy;
        updateDismiss.hidden = ['preparing-restart', 'restarting'].includes(update?.state);
        updateDismiss.setAttribute('aria-label', update?.state === 'waiting-for-idle' ? 'Postpone restart for 30 minutes' : 'Dismiss update notification');
        updateProgress.hidden = updateBytes.hidden = !hasBytes;
        if (hasBytes) {
            updateProgress.value = percent;
            updateProgress.setAttribute('aria-valuetext', `${percent}% downloaded`);
            updateBytes.textContent = `${(update.receivedBytes / 1000000).toFixed(1)} of ${(update.totalBytes / 1000000).toFixed(1)} MB`;
        }
        if (key === updateFeedbackKey)
            return;
        updateFeedbackKey = key;
        window.clearTimeout(updateFeedbackTimer);
        updateFeedbackTimer = null;
        if (update?.state === 'waiting-for-idle' && update.reason === 'postponed' && update.restartScheduled) {
            // A warning or changed blocker has a new key and reopens this notice.
            updateFeedbackTimer = window.setTimeout(() => {
                if (updateFeedbackKey !== key)
                    return;
                dismissedTransfer = key;
                showUpdateFeedback = false;
                updateFeedback.hidden = true;
                updateFeedbackTimer = null;
            }, 4000);
        }
        else if (!['checking', 'downloading', 'staging', 'waiting-for-idle', 'preparing-restart', 'restarting', 'waiting-for-release', 'repair-required', 'retrying'].includes(update.state)) {
            updateFeedbackTimer = window.setTimeout(() => {
                showUpdateFeedback = false;
                updateFeedback.hidden = true;
                updateFeedbackTimer = null;
            }, 4000);
        }
    }
    refreshButton.title = 'Refresh activities, messages and check for updates';
    refreshButton.setAttribute('aria-label', refreshButton.title);
    refreshButton.addEventListener('click', async () => {
        if (refreshButton.disabled)
            return;
        window.clearTimeout(refreshNoticeTimer);
        refreshNoticeTimer = null;
        window.clearTimeout(updateFeedbackTimer);
        updateFeedbackTimer = null;
        updateFeedbackKey = '';
        showUpdateFeedback = true;
        dismissedTransfer = '';
        updateFeedback.hidden = false;
        updateLabel.textContent = 'Refreshing activities and checking for updates…';
        updateProgress.hidden = updateBytes.hidden = true;
        refreshButton.disabled = true;
        refreshButton.setAttribute('aria-busy', 'true');
        refreshButton.title = 'Refreshing…';
        refreshButton.setAttribute('aria-label', refreshButton.title);
        el('error').textContent = '';
        try {
            await api.sync();
            const value = await api.status();
            window.dispatchEvent(new CustomEvent('cloud-student-status', { detail: value }));
            const notice = value.school?.accessRecovery?.message || (value.school?.online ? 'Activities and messages refreshed.' : 'You’re offline. Your saved activities are still here.');
            el('error').textContent = notice;
            if (value.school?.online)
                refreshNoticeTimer = window.setTimeout(() => {
                    if (el('error').textContent === notice)
                        el('error').textContent = '';
                    refreshNoticeTimer = null;
                }, 4000);
        }
        catch (error) {
            el('error').textContent = error.message;
            if (updateLabel.textContent === 'Refreshing activities and checking for updates…')
                updateLabel.textContent = 'Could not refresh. Check your internet connection and try again.';
        }
        finally {
            refreshButton.disabled = false;
            refreshButton.removeAttribute('aria-busy');
            refreshButton.title = 'Refresh activities, messages and check for updates';
            refreshButton.setAttribute('aria-label', refreshButton.title);
        }
    });
    el('toolbar-home').addEventListener('click', () => leaveSchool('dashboard-screen'));
    el('toolbar-break').addEventListener('click', () => schoolBreak.start());
    el('toolbar-break').title = 'Pause school time and take a break';
    el('toolbar-school-return').addEventListener('click', () => el('home').click());
    for (const [id, action] of [['toolbar-abeka-dashboard', 'abeka-dashboard'], ['toolbar-abeka-lessons', 'abeka-lessons']]) {
        el(id).addEventListener('click', async () => {
            try {
                if (!await window.cloudSchoolView.navigate(action))
                    throw new Error('The school page is not ready. Resume school or choose Reload.');
            }
            catch (error) {
                el('error').textContent = error.message;
            }
        });
    }
    el('toolbar-notes').title = 'Open Writing beside school';
    el('toolbar-notes').innerHTML = '<i data-lucide="file-pen-line" aria-hidden="true"></i> Writing';
    el('toolbar-notes').addEventListener('click', () => api.notebook().catch(error => { el('error').textContent = error.message; }));
    for (const [id, action] of [['toolbar-back', 'back'], ['toolbar-fwd', 'forward']])
        el(id).addEventListener('click', () => api.navigate(action).catch(error => { el('error').textContent = error.message; }));
    async function media(kind, value) {
        try {
            const result = await api.schoolMedia(kind, value);
            if (!result.success)
                throw new Error(result.error || 'The school player did not accept this control.');
        }
        catch (error) {
            el('error').textContent = error.message;
        }
    }
    el('school-speed-select').addEventListener('change', event => media('rate', Number(event.target.value)));
    el('volume-slider').addEventListener('change', event => media('volume', Number(event.target.value) / 100));
    el('toolbar-captions').addEventListener('click', async () => {
        const button = el('toolbar-captions');
        button.disabled = true;
        try {
            const result = await api.schoolCaptions();
            el('error').textContent = result.success
                ? 'Live Captions opened. Follow the Windows setup prompts if this is the first time.'
                : result.error || 'Windows Live Captions could not open.';
        }
        catch (error) {
            el('error').textContent = error.message;
        }
        finally {
            button.disabled = false;
        }
    });
    window.addEventListener('cloud-student-status', event => {
        const value = event.detail;
        latest = value;
        schoolClose.render(value);
        const recovery = value.school?.accessRecovery;
        for (const [id, hidden] of [['school-access-recovery', !recovery], ['school-access-retry', !recovery?.canRetry], ['school-access-wifi', !recovery?.canRetry]]) {
            if (el(id).hidden !== hidden)
                el(id).hidden = hidden;
        }
        if (recovery && !el('school-access-retry').disabled && el('school-access-recovery-detail').textContent !== recovery.message)
            el('school-access-recovery-detail').textContent = recovery.message;
        document.body.classList.toggle('cloud-writing-split', Boolean(value.writing?.split));
        renderUpdateFeedback(value);
        const nextChild = value.school?.student?.id || null;
        if (child !== nextChild) {
            child = nextChild;
            setupStage = undefined;
            show('dashboard-screen');
        }
        whiteNoise.render(value);
        const session = value.session;
        if (session?.subjectId && !session.suspended) {
            show('student-school-screen');
            el('toolbar-subject-name').textContent = value.school?.subjects?.find(subject => subject.id === session.subjectId)?.title || 'School';
            el('toolbar-subject-icon').textContent = '📚';
        }
        else if (active === 'student-school-screen' && !session?.opening)
            show('dashboard-screen');
        const retained = Boolean(session?.subjectId && session.suspended);
        if (resumeNotice.hidden === retained)
            resumeNotice.hidden = !retained;
        if (retained) {
            const label = (value.school?.subjects?.find(subject => subject.id === session.subjectId)?.title || 'School') + ' is paused here';
            if (resumeLabel.textContent !== label)
                resumeLabel.textContent = label;
        }
        const paired = Boolean(value.account?.deviceId);
        const needsRecovery = paired && (!value.school || value.school.needsRecoveryConfirmation);
        // Missing assignment during restoration is not a request to choose a child.
        // Keep genuine first-time setup available only after the host finishes it.
        const restoring = !startupComplete && value.applicationReady === false || value.startup?.state === 'loading' || paired && !value.school && value.startup?.state !== 'error';
        const unavailable = value.startup?.state === 'error' || paired && !child && !value.school?.online && !restoring;
        const nextStage = restoring || unavailable ? 'student-loading-panel' : !paired ? 'student-setup-panel' : needsRecovery || !child ? 'student-recovery-panel' : null;
        if (nextStage !== 'student-loading-panel')
            startupComplete = true;
        el('student-loading-panel').setAttribute('aria-busy', String(restoring));
        el('student-loading-progress').hidden = !restoring;
        el('student-loading-retry').hidden = !unavailable;
        el('student-loading-title').textContent = unavailable ? 'Your school needs a connection' : 'Getting your dashboard ready';
        el('student-loading-detail').textContent = unavailable ? 'Your saved work is safe. Check your connection and try again, or ask your parent for help.' : 'Opening your saved school and activities…';
        const setup = value.school?.setup;
        const recoveryReady = Boolean(setup?.recoveryAvailable);
        const title = !paired ? 'Connect this computer'
            : !setup?.assigned && !child ? 'Choose the child'
                : !recoveryReady ? 'Create the Parent password'
                    : 'Finish setup';
        const message = !paired ? 'Keep this app open. On your phone or parent device, sign in at guard.bodeebooks.com/activate/ and enter this computer’s pairing code.'
            : !setup?.assigned && !child ? 'On your parent device, open the family dashboard, select this computer, choose the child who uses it, and save. This app will continue automatically.'
                : !recoveryReady ? 'On your parent device, create the one Parent password for your family. This app will receive it automatically.'
                    : value.protection?.parentPaused ? 'A parent paused BodeeGuard. Enter your parent password to resume.'
                        : setup?.familyPassword && value.school.needsRecoveryConfirmation ? 'Connecting your family’s parent password…'
                            : value.school.needsRecoveryConfirmation ? 'Enter your parent password, then choose Confirm password. It lets you exit BodeeGuard without internet.'
                                : 'Your parent password is ready. Enter it below to test it.';
        el('finish-setup-title').textContent = title;
        el('recovery-next-step').textContent = message;
        el('recovery-form').hidden = !recoveryReady || Boolean(setup?.familyPassword && !value.protection?.parentPaused);
        el('test-recovery').hidden = !recoveryReady;
        el('recovery-code').disabled = !paired;
        el('confirm-recovery').disabled = !recoveryReady;
        el('test-recovery').disabled = !recoveryReady;
        if (nextStage !== setupStage) {
            setupStage = nextStage;
            show(nextStage || 'dashboard-screen');
        }
        el('toolbar-back').disabled = !session?.canGoBack;
        el('toolbar-fwd').disabled = !session?.canGoForward;
        el('toolbar-school-return').disabled = !session?.subjectId;
        document.querySelector('.cloud-school-recovery').hidden = !session?.subjectId || !(session.needsReopen || session.phase === 'error');
        el('toolbar-abeka-pages').hidden = !session?.hasAbekaPages;
        el('toolbar-abeka-dashboard').disabled = !session?.canNavigate || session?.opening;
        el('toolbar-abeka-dashboard').setAttribute('aria-pressed', String(session?.page === 'abeka-dashboard'));
        el('toolbar-abeka-lessons').disabled = !(session?.canNavigate || session?.canReturnLessons) || session?.opening;
        el('toolbar-abeka-lessons').setAttribute('aria-pressed', String(session?.page === 'abeka-lessons'));
        el('toolbar-break').disabled = !session?.subjectId || Boolean(session.onBreak);
        el('school-speed-select').disabled = !session?.canNavigate;
        el('volume-slider').disabled = !session?.canNavigate;
        el('toolbar-captions').disabled = !session?.canNavigate;
        el('school-speed-select').value = String(session?.playbackRate || 1);
        el('volume-slider').value = String(Math.round((session?.volume ?? 1) * 100));
        schoolBreak.render(value);
        desk.render(value);
        planner.render(value);
        icons();
        document.documentElement.dataset.cloudStudentReady = 'true';
    });
    icons();
})();

},
"renderer/js/cloud-student-dashboard.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentModuleKey = studentModuleKey;
exports.canHideStudentModule = canHideStudentModule;
exports.readHiddenStudentModules = readHiddenStudentModules;
exports.saveHiddenStudentModules = saveHiddenStudentModules;
exports.splitStudentModules = splitStudentModules;
exports.cloudDashboardModel = cloudDashboardModel;
exports.cloudActivityAccess = cloudActivityAccess;
exports.visibleCloudSubjects = visibleCloudSubjects;
exports.combinedCreativeSubjects = combinedCreativeSubjects;
exports.createCloudStudentDesk = createCloudStudentDesk;
const cloud_student_day_js_1 = require("renderer/js/cloud-student-day.js");
const student_subject_card_js_1 = require("renderer/js/shared/student-subject-card.js");
const student_dashboard_presentation_js_1 = require("renderer/js/shared/student-dashboard-presentation.js");
const cloud_student_rendering_js_1 = require("renderer/js/cloud-student-rendering.js");
const cloud_activity_colors_js_1 = require("renderer/js/admin/cloud-activity-colors.js");
const student_theme_dialog_js_1 = require("renderer/js/shared/student-theme-dialog.js");
const theme_js_1 = require("renderer/js/kiosk/theme.js");
const el = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
const formatTime = seconds => {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    if (total < 60)
        return `${total} sec`;
    const minutes = Math.floor(total / 60), remainder = total % 60;
    return remainder ? `${minutes} min ${remainder} sec` : `${minutes} min`;
};
const activityModule = url => url === 'app://coloring' ? 'art-studio' : url === 'app://science-spelling' ? 'spelling' : ['app://writing', 'app://word-processor', 'app://journal'].includes(url) ? 'notebook' : url.slice(6);
const hiddenModulesStorageKey = studentId => `bodeeguard:student-hidden-modules:v1:${studentId}`;
function studentModuleKey(subject) {
    if (typeof subject?.url !== 'string' || !subject.url.startsWith('app://'))
        return null;
    const module = activityModule(subject.url);
    return module === 'coloring-studio' ? 'art-studio' : module;
}
function canHideStudentModule(subject) {
    return subject?.planPlacement !== 'school' && studentModuleKey(subject) !== null;
}
function readHiddenStudentModules(storage, studentId) {
    if (!studentId)
        return new Set();
    try {
        const saved = JSON.parse(storage.getItem(hiddenModulesStorageKey(studentId)) || '[]');
        return new Set(Array.isArray(saved) ? saved.filter(key => typeof key === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(key)).slice(0, 128) : []);
    }
    catch {
        return new Set();
    }
}
function saveHiddenStudentModules(storage, studentId, hiddenModules) {
    if (!studentId)
        throw new Error('Choose a child before saving dashboard preferences.');
    storage.setItem(hiddenModulesStorageKey(studentId), JSON.stringify([...hiddenModules].sort()));
}
function splitStudentModules(subjects, hiddenModules) {
    const shown = [], hidden = [];
    for (const subject of subjects) {
        (canHideStudentModule(subject) && hiddenModules.has(studentModuleKey(subject)) ? hidden : shown).push(subject);
    }
    return { shown, hidden };
}
function cloudDashboardModel(value, now = new Date()) {
    const school = value.school;
    const student = school?.student || null;
    const snapshot = value.dashboard?.data;
    const matches = Boolean(student?.id && snapshot && snapshot.studentId === student.id && snapshot.student?.id === student.id
        && (!value.account?.deviceId || snapshot.deviceId === value.account.deviceId)
        && (!school?.policyVersion || `${snapshot.policyRevision}:${snapshot.rulesRevision}` === school.policyVersion));
    const data = matches ? snapshot : null;
    const timeZone = school?.timeZone || data?.timeZone || 'America/Chicago';
    const date = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const currentDay = data?.date === date;
    const totals = new Map((data?.subjects || []).map(subject => [subject.id, subject]));
    return { student: student ? { ...student, avatar: data?.student?.avatar || null, theme: data?.student?.theme || 'default' } : null, data, currentDay, timeZone, date,
        subjects: (school?.assignedSubjects || school?.subjects || []).filter(subject => subject.url !== 'app://science-spelling').map(subject => {
            const alwaysOpen = school.alwaysOpenSubjectIds?.includes(subject.id) === true;
            // Match the school-hours gate: Daily Plan activities outside the school
            // category do not inherit the family's school window. Explicit activity
            // schedules still have their own label and access checks.
            const managed = school.managedSubjects === true || Object.hasOwn(subject, 'kind');
            const usesSchoolHours = school.schoolHours?.enabled && (!managed || subject.accessTier !== 'after_school')
                && (!subject.dailyPlan || subject.dailyPlan.placement === 'school');
            const plannedToday = !subject.dailyPlan || subject.dailyPlan.days.includes(new Date(date + 'T00:00:00Z').getUTCDay());
            const completion = school?.completion?.date === date && school.completion.known ? school.completion.subjects.find(row => row.subjectId === subject.id) : null;
            const localSeconds = Math.max(0, Number(school?.localStudySeconds?.[subject.id]) || 0);
            const received = subject.kind ? (completion ? Math.max(0, Number(completion.seconds) || 0) + localSeconds : localSeconds || null) : totals.get(subject.id)?.todaySeconds;
            return { id: subject.id, name: subject.title, url: subject.url, icon: subject.icon || 'book-open', color: (0, cloud_activity_colors_js_1.activityAccent)(subject),
                is_school_portal: subject.kind ? Number(subject.isSchoolPortal === true) : 1, daily_goal_minutes: subject.isSchoolPortal || ['spelling', 'vocabulary', 'poems'].includes(activityModule(subject.url)) ? 0 : subject.dailyGoalMinutes, timeSource: 'cloud',
                planPlacement: alwaysOpen && !plannedToday && subject.dailyPlan?.placement === 'school' ? 'anytime' : subject.dailyPlan?.placement || (subject.accessTier === 'after_school' || subject.isReward ? 'after_school' : subject.accessTier === 'school_optional' ? 'anytime' : 'school'),
                plannedToday,
                assignedWork: completion?.assignedWork,
                ...(subject.kind ? { kind: subject.kind, description: subject.description || '', access_tier: subject.accessTier || 'school', is_reward: Number(subject.isReward === true),
                    display_order: subject.displayOrder || 0, completionKnown: Boolean(completion), completionSource: completion?.source || null } : {}),
                today_seconds: (subject.kind ? Boolean(completion) || localSeconds > 0 : currentDay) && Number.isFinite(received) && received >= 0 ? received : null,
                portal_courses: (completion?.portalCourses || (currentDay ? totals.get(subject.id)?.completion?.portalCourses : []) || []).map(c => ({ course_name: c.courseName, lesson_label: c.lessonLabel, completed: c.completed, ...(c.upcoming ? { upcoming: true, school_lesson: c.schoolLesson } : {}) })),
                scheduleStart: alwaysOpen ? null : subject.scheduleStart || (usesSchoolHours ? school.schoolHours.start : null),
                scheduleEnd: alwaysOpen ? null : subject.scheduleEnd || (usesSchoolHours ? school.schoolHours.end : null),
                today_completed: completion?.completed === true };
        }) };
}
function cloudActivityAccess(school, subject, activityAccess) {
    if (!school?.student?.id)
        return { allowed: false, reason: 'Pair this computer with your parent first.' };
    // These panels have independent authenticated transports and parent rules.
    // In particular, a child must still be able to contact a parent after hours.
    if (['app://messages', 'app://papers'].includes(subject.url))
        return { allowed: true };
    if (school.locked)
        return { allowed: false, reason: 'Your parent has paused this computer.' };
    if (school.accessRecovery)
        return { allowed: false, reason: school.accessRecovery.message };
    if (subject.url === 'app://math-coach') {
        const coach = activityAccess?.['math-coach'];
        if (school.features?.['math-coach'] === false || coach?.enabled !== true)
            return { allowed: false, reason: 'Ask a parent to enable Math Coach.' };
        if (coach.allowed !== true)
            return { allowed: false, reason: 'Ask a parent to approve Math Coach for today.' };
    }
    if (subject.url === 'app://white-noise')
        return school.canUseLearningVideos && school.features?.['white-noise'] !== false
            ? { allowed: true } : { allowed: false, reason: 'White Noise is unavailable right now.' };
    if (subject.url.startsWith('app://') && school.moduleAccess) {
        const module = school.moduleAccess[activityModule(subject.url)];
        if (module?.allowed === false)
            return module;
        if (school.managedSubjects && school.subjectAccess?.[subject.id])
            return school.ready ? school.subjectAccess[subject.id] : { allowed: false, reason: 'Reconnect to confirm parent recovery and school rules.' };
        if (module)
            return module;
    }
    if (school.managedSubjects && school.subjectAccess?.[subject.id])
        return school.ready ? school.subjectAccess[subject.id] : { allowed: false, reason: 'Reconnect to confirm parent recovery and school rules.' };
    const canOpen = subject.url.startsWith('app://') ? school.canUseLearningVideos ?? school.ready : school.ready;
    if (!canOpen)
        return { allowed: false, reason: school.needsRecoveryConfirmation
                ? 'Confirm parent recovery before school begins.' : school.schedule?.allowed === false && !subject.url.startsWith('app://')
                ? 'Outside your parent’s allowed school time.' : 'Reconnect to check your parent’s access rules.' };
    if (subject.url.startsWith('app://'))
        return { allowed: true };
    return school.subjects?.some(item => item.id === subject.id)
        ? { allowed: true } : { allowed: false, reason: 'Outside your parent’s allowed school time.' };
}
function visibleCloudSubjects(subjects, school, getAccess, activityAccess) {
    return subjects.filter(subject => {
        if (subject.url === 'app://science-spelling')
            return false;
        const module = activityModule(subject.url);
        if (module === 'math-coach' && activityAccess?.[module]?.enabled !== true)
            return false;
        if (school?.features?.[module] === false || subject.plannedToday === false && subject.planPlacement === 'school')
            return false;
        if (['spelling', 'vocabulary', 'poems'].includes(module) && school?.completion?.known) {
            const work = school.completion.learningAssignments?.find(row => row.module === module);
            if (subject.assignedWork === false || work && !(work.assigned ?? work.required))
                return false;
        }
        // Optional/scheduled work has its own shelf; unavailable rewards do not
        // clutter the school list. Their native/API permissions remain authoritative.
        if (['after_school', 'scheduled'].includes(subject.planPlacement) || ['games', 'music', 'videos', 'audiobooks'].includes(module) && subject.planPlacement !== 'school')
            return getAccess(subject).allowed;
        return true;
    });
}
// One studio entry, while keeping original assignment ids/rules for opening.
function combinedCreativeSubjects(subjects, getAccess) {
    const creative = subjects.filter(row => ['art-studio', 'coloring-studio'].includes(activityModule(row.url)));
    if (!creative.length)
        return subjects;
    const score = row => Number(getAccess(row).allowed) * 100 + Number(!row.id.startsWith('__')) * 20 + Number(row.planPlacement === 'school' && !row.today_completed) * 10;
    const chosen = [...creative].sort((a, b) => score(b) - score(a))[0];
    const studio = { ...chosen, name: 'Art & Coloring Studio', icon: 'palette', description: 'Draw, create coloring pages, and print your favorites.' };
    let inserted = false;
    return subjects.flatMap(row => { if (!creative.includes(row))
        return [row]; if (inserted)
        return []; inserted = true; return [studio]; });
}
function createCloudStudentDesk({ api, openActivity, openSchool, storage }) {
    const state = { currentStudent: null, dashboardData: null, isOffline: false };
    let latest = null, identity = null, factsContext = null, factOffset = 0, cardKey = null, theme = null;
    let hiddenModules = new Set(), daySubjects = [];
    let avatarSource = null, avatarUrl = null;
    let renderKey = null, headerKey = null;
    window.showToast = message => { el('error').textContent = message; };
    const activities = [
        { id: '__audiobooks__', name: 'Audiobooks', icon: 'headphones', url: 'app://audiobooks', color: '#fb923c', description: 'Listen to your approved books.' },
        { id: '__music__', name: 'Music', icon: 'music', url: 'app://music', color: '#c084fc', description: 'Listen to your family’s approved music.' },
        { id: '__videos__', name: 'Videos', icon: 'video', url: 'app://videos', color: '#fbbf24', description: 'Watch videos your parent has approved.' },
        { id: '__spanish__', name: 'Spanish', icon: 'languages', url: 'app://spanish', color: '#fb923c', description: 'Practice Spanish.' },
        { id: '__piano__', name: 'Piano', icon: 'piano', url: 'app://piano', color: '#a78bfa', description: 'Play and record on this computer.' },
        { id: '__art__', name: 'Art Studio', icon: 'palette', url: 'app://coloring', color: '#f472b6', description: 'Draw and save your artwork on this computer.' },
        { id: '__coloring__', name: 'Coloring Studio', icon: 'paintbrush', url: 'app://coloring-studio', color: '#34d399', description: 'Browse approved coloring pages or create a page with parent permission.' },
        { id: '__math_coach__', name: 'Math Coach', icon: 'sigma', url: 'app://math-coach', color: '#38bdf8', description: 'Ask for math help. Your parent controls access and daily questions.' },
        { id: '__long_division__', name: 'Long Division', icon: 'divide', url: 'app://long-division', color: '#34d399', description: 'Work through long division one line at a time.' },
        { id: '__reading__', name: 'Reading Log', icon: 'book-open', url: 'app://reading', color: '#22c55e', description: 'Keep your bookshelf, log pages, and earn a bonus for finishing a book.' },
        { id: '__typing__', name: 'Typing School', icon: 'keyboard', url: 'app://typing', color: '#38bdf8', description: 'Learn the original home-row lessons, take speed tests, and earn typing coins.' },
        { id: '__logic__', name: 'Logic Lab', icon: 'brain', url: 'app://logic', color: '#a78bfa', description: 'Think through the clues, practice clear reasoning, and earn coins.' },
        { id: '__words__', name: 'Confused Words', icon: 'spell-check', url: 'app://words', color: '#f472b6', description: 'Choose the word that fits and learn the rule behind it.' },
        { id: '__spelling__', name: 'Spelling', icon: 'spell-check', url: 'app://spelling', color: '#f97316', description: 'Learn your weekly words, practice, and prepare for your spelling pre-test.' },
        { id: '__vocabulary__', name: 'Vocabulary Mastery', icon: 'book-a', url: 'app://vocabulary', color: '#70cbb5', description: 'Understand, recall and use your assigned words, with older-word reviews.' },
        { id: '__poems__', name: 'Poem Memorization', icon: 'quote', url: 'app://poems', color: '#f7c948', description: 'Practice your poem, build your memory, and record a recitation for your parent.' },
        { id: '__worksheets__', name: 'Worksheet Library', icon: 'printer', url: 'app://worksheets', color: '#38bdf8', description: 'Choose a family worksheet and print one copy on this computer.' },
        { id: '__quizzes__', name: 'My Quizzes', icon: 'clipboard-check', url: 'app://quizzes', color: '#818cf8', description: 'Take your assigned quizzes and see your parent’s feedback.' },
        { id: '__geography__', name: 'Geography Mastery', icon: 'map', url: 'app://geography', color: '#22c55e', description: 'Explore the U.S. map, build capital memory, and practice geography.' },
        { id: '__notebook__', name: 'Writing', icon: 'file-pen-line', url: 'app://writing', color: '#ec4899', description: 'Write, save and print your work. Submit it to your parent when ready.' },
        { id: '__papers__', name: 'My Papers', icon: '📄', url: 'app://papers', color: '#34d399', description: 'Submit schoolwork and read your parent’s feedback.' },
        { id: '__family-games__', name: 'Family Game Room', icon: 'games', url: 'app://games', color: '#f7c948', description: 'Choose a family game or download a Windows adventure.' },
        { id: '__learning-videos__', name: 'Learning Videos', icon: '▶', url: 'app://learning-videos', color: '#22d3ee', description: 'Watch parent-approved lessons in your learning library.' }
    ];
    activities.forEach(subject => { subject.cloudActivity = true; });
    function access(subject) {
        const coachModel = subject.url === 'app://math-coach' ? cloudDashboardModel(latest || {}) : null;
        const signed = cloudActivityAccess(latest?.school, subject, coachModel?.currentDay ? coachModel.data?.activityAccess : null);
        return signed.allowed && subject.moduleStatus?.allowed === false ? { allowed: false, reason: subject.moduleStatus.availability } : signed;
    }
    function openSubject(subject) {
        const current = access(subject);
        if (!current.allowed) {
            window.showToast(current.reason);
            return;
        }
        Promise.resolve(subject.url.startsWith('app://') ? openActivity(subject.url, subject.id) : openSchool(subject.id))
            .catch(error => {
            const message = String(error?.message || error);
            el('error').textContent = message.includes('School is waiting for parent approval or confirmed rules')
                ? 'School rules could not be confirmed yet. Choose Refresh at the top and try again. If it keeps happening, ask a parent to check this computer’s approval.'
                : message.includes('The school protections could not confirm these rules')
                    ? 'School protection could not finish applying the new rules. Choose Refresh and try again. If it keeps happening, ask a parent for help.'
                    : message;
        });
    }
    const { createSubjectCard } = (0, student_subject_card_js_1.createStudentCardRenderer)({ state, formatTime, escapeHtml, getAccessState: access, openSubject });
    const day = (0, cloud_student_day_js_1.mountStudentDay)({ openSubject });
    const hiddenArea = document.createElement('details');
    hiddenArea.id = 'student-hidden-modules';
    hiddenArea.className = 'cloud-hidden-modules';
    hiddenArea.hidden = true;
    const hiddenSummary = document.createElement('summary');
    const hiddenList = document.createElement('div');
    hiddenList.className = 'cloud-hidden-modules-list';
    hiddenArea.append(hiddenSummary, hiddenList);
    el('subjects-container').after(hiddenArea);
    function changeHiddenModule(subject, hide) {
        const studentId = state.currentStudent?.id, module = studentModuleKey(subject);
        if (!studentId || !canHideStudentModule(subject) || !module)
            return;
        const next = new Set(hiddenModules);
        if (hide)
            next.add(module);
        else
            next.delete(module);
        try {
            saveHiddenStudentModules(storage || window.localStorage, studentId, next);
        }
        catch {
            window.showToast('Could not save your hidden modules on this computer.');
            return;
        }
        hiddenModules = next;
        renderKey = null;
        cardKey = null;
        desk.render(latest);
        if (hide) {
            hiddenArea.open = true;
            hiddenSummary.focus({ preventScroll: true });
        }
        else {
            const restored = [...el('subjects-container').querySelectorAll('.cloud-module-card-frame')]
                .find(frame => frame.dataset.moduleKey === module)?.querySelector('.subject-card');
            restored?.focus({ preventScroll: true });
        }
    }
    function renderHiddenModules(subjects) {
        hiddenArea.hidden = !subjects.length;
        hiddenSummary.textContent = `Hidden modules (${subjects.length})`;
        hiddenList.replaceChildren(...subjects.map(subject => {
            const row = document.createElement('div');
            row.className = 'cloud-hidden-module';
            const name = document.createElement('span');
            name.textContent = subject.name;
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = 'Show';
            button.setAttribute('aria-label', `Show ${subject.name} on my dashboard`);
            button.addEventListener('click', () => changeHiddenModule(subject, false));
            row.append(name, button);
            return row;
        }));
    }
    const cardList = (0, cloud_student_rendering_js_1.createDashboardCardList)({ createSubjectCard, getAccess: access,
        decorateOptionalCard(subject, card) {
            if (!canHideStudentModule(subject))
                return card;
            const frame = document.createElement('div');
            frame.className = 'cloud-module-card-frame';
            frame.dataset.moduleKey = studentModuleKey(subject);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'cloud-hide-module';
            button.textContent = 'Hide';
            button.setAttribute('aria-label', `Hide ${subject.name} from my dashboard`);
            button.addEventListener('click', () => changeHiddenModule(subject, true));
            frame.append(card, button);
            return frame;
        } });
    function settings() {
        if (!state.currentStudent)
            return;
        (0, student_theme_dialog_js_1.showStudentThemeDialog)({ state, applyStudentTheme: theme_js_1.applyStudentTheme, saveTheme: selected => api.saveTheme(selected),
            onError: () => { el('error').textContent = 'Theme was not saved. Reconnect and try again.'; } });
    }
    // Retain original shelves while explicitly identifying records that have no
    // Cloud implementation. A missing history must never look like a zero balance.
    el('wallet-coins').textContent = '—';
    el('wallet-store-btn').disabled = true;
    el('wallet-store-btn').innerHTML = '<i data-lucide="shopping-cart" aria-hidden="true"></i><span>Store</span>';
    const walletAmount = el('wallet-coins').parentElement;
    const walletLink = document.createElement('button');
    walletLink.type = 'button';
    walletLink.className = `${walletAmount.className} wallet-balance-button`;
    walletLink.setAttribute('aria-label', 'Open Rewards Store');
    walletLink.disabled = true;
    walletLink.append(...walletAmount.childNodes);
    walletAmount.replaceWith(walletLink);
    walletLink.addEventListener('click', () => el('wallet-store-btn').click());
    walletLink.closest('.wallet-widget').addEventListener('click', event => {
        if (!event.target.closest('button') && !walletLink.disabled)
            el('wallet-store-btn').click();
    });
    el('store-btn').disabled = true;
    el('store-btn').title = 'Rewards Store';
    el('typing-wpm').textContent = '—';
    el('typing-metric-unit').textContent = 'BEST WPM';
    el('typing-last-practiced').textContent = 'Open Typing School';
    el('typing-widget-tip').hidden = true;
    el('typing-widget').setAttribute('role', 'button');
    el('typing-widget').tabIndex = 0;
    const openTyping = () => { const result = access({ url: 'app://typing' }); if (result.allowed)
        void openActivity('app://typing').catch(error => window.showToast(error.message));
    else
        window.showToast(result.reason); };
    el('typing-widget').addEventListener('click', openTyping);
    el('typing-widget').addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openTyping();
    } });
    el('streak-widget').style.display = 'flex';
    el('streak-count').textContent = '—';
    el('streak-best').textContent = '—';
    el('streak-tip').textContent = 'Study streak records not connected yet';
    el('completion-text').textContent = '—';
    el('completion-badge').title = 'Verified lesson completion is not connected yet. Study time is counted separately.';
    el('completion-badge').setAttribute('aria-label', 'Lesson completion unavailable');
    el('school-checkin-badge').style.display = 'none';
    const desk = {
        render(value) {
            latest = value;
            // Keep current permissions for click-time checks, but don't rebuild an
            // invisible desk while a lesson or another in-app panel is on screen.
            // The surface owner paints the latest snapshot before showing it again.
            if (el('dashboard-screen').hidden)
                return;
            const school = value.school;
            // Host snapshots also contain message, download and session updates.
            // Skip desk work when its inputs are unchanged, but always retain the
            // latest access rules for click-time checks. No authorization is cached.
            const nextRenderKey = JSON.stringify([Math.floor(Date.now() / 60000), value.account?.deviceId, value.dashboard?.data,
                school?.student, school?.policyVersion, school?.timeZone, school?.assignedSubjects, school?.subjects,
                school?.alwaysOpenSubjectIds, school?.managedSubjects, school?.schoolHours, school?.completion,
                school?.ready, school?.online, school?.locked, school?.canUseLearningVideos, school?.needsRecoveryConfirmation,
                school?.schedule, school?.accessRecovery, school?.moduleAccess, school?.subjectAccess, school?.features, school?.localStudySeconds]);
            if (renderKey === nextRenderKey)
                return;
            const model = cloudDashboardModel(value);
            const nextIdentity = `${value.account?.deviceId || ''}:${model.student?.id || ''}`;
            const portrait = model.student?.avatar || null;
            if (identity !== nextIdentity || portrait !== avatarSource) {
                if (avatarUrl)
                    URL.revokeObjectURL(avatarUrl);
                avatarUrl = null;
                avatarSource = portrait;
                // Display the already verified local thumbnail through the existing
                // blob-only image policy. No external image request or CSP expansion.
                if (typeof portrait === 'string' && portrait.length <= 43720 && /^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(portrait)) {
                    try {
                        avatarUrl = URL.createObjectURL(new Blob([Uint8Array.from(atob(portrait.slice(23)), c => c.charCodeAt(0))], { type: 'image/webp' }));
                    }
                    catch { /* A malformed cached image falls back to the profile icon. */ }
                }
            }
            if (model.student)
                model.student.avatar = avatarUrl;
            if (identity !== nextIdentity) {
                identity = nextIdentity;
                cardKey = null;
                theme = null;
                factOffset = 0;
                try {
                    hiddenModules = readHiddenStudentModules(storage || window.localStorage, model.student?.id);
                }
                catch {
                    hiddenModules = new Set();
                }
                hiddenArea.open = false;
                cardList.clear();
                el('student-settings-modal')?.remove();
            }
            state.currentStudent = model.student;
            const wallet = model.data?.wallet;
            const typing = model.data?.typing;
            const attendance = model.currentDay ? model.data?.attendance : null, badge = el('school-checkin-badge');
            badge.style.display = attendance?.enabled ? 'inline-block' : 'none';
            badge.textContent = attendance?.status === 'on-time' ? ('On time' + (attendance.bonusCoins ? ' · +' + attendance.bonusCoins + ' coins' : ''))
                : attendance?.status === 'excused' ? 'Late start excused' : attendance?.status === 'late' ? ('Checked in' + (attendance.penaltyCoins ? ' · −' + attendance.penaltyCoins + ' coins' : '')) : 'Start schoolwork to check in';
            badge.title = value.school?.online ? 'Your school check-in updates as schoolwork syncs.' : 'Saved check-in. Offline schoolwork will sync when you reconnect.';
            const completion = value.school?.completion;
            if (completion) {
                const percent = completion.total ? Math.floor(completion.completed * 100 / completion.total) : 100;
                el('completion-text').textContent = !completion.isSchoolDay ? 'Day off' : completion.known ? `${percent}%` : '—';
                el('completion-ring-fill')?.setAttribute('stroke-dasharray', `${completion.known && completion.isSchoolDay ? percent : 0}, 100`);
                el('completion-badge').title = !completion.isSchoolDay ? 'No required schoolwork on the family calendar today.' : completion.known
                    ? `${completion.completed} of ${completion.total} required subjects and daily activities complete.` : 'Reconnect to check today’s school completion.';
                el('completion-badge').setAttribute('aria-label', el('completion-badge').title);
            }
            el('typing-wpm').textContent = Number.isFinite(typing?.bestWpm) ? String(typing.bestWpm) : '—';
            el('typing-last-practiced').textContent = typing?.lastPracticed ? `Practiced ${new Date(typing.lastPracticed).toLocaleDateString(undefined, { timeZone: model.timeZone })}` : 'Open Typing School';
            el('typing-widget').title = typing?.includesLanHistory ? 'Cloud typing progress includes the transferred original history.' : 'Cloud typing progress. Earlier typing history still awaits transfer.';
            const coinText = Number.isFinite(wallet?.balance) ? wallet.balance.toLocaleString() : '—';
            el('wallet-coins').textContent = coinText;
            // Reserve room for the label and fit the complete balance, including separators.
            el('wallet-coins').style.setProperty('--wallet-width', Math.max(3.6, coinText.length * .66));
            walletLink.setAttribute('aria-label', `${Number.isFinite(wallet?.balance) ? wallet.balance + ' coins. ' : ''}Open Rewards Store`);
            const storeAllowed = !!model.student && !!value.school?.canUseLearningVideos && !value.school?.locked;
            el('store-btn').disabled = !storeAllowed;
            el('wallet-store-btn').disabled = !storeAllowed;
            el('store-btn').title = 'Rewards Store';
            walletLink.disabled = !storeAllowed;
            el('wallet-history-btn').disabled = !storeAllowed;
            const musicBank = model.data?.mediaStats?.music?.bankedSeconds || 0;
            const videoBank = model.data?.mediaStats?.video?.bankedSeconds || 0;
            el('banked-media-display').style.display = musicBank + videoBank > 0 ? 'flex' : 'none';
            el('banked-music-text').style.display = musicBank > 0 ? 'inline-flex' : 'none';
            el('banked-video-text').style.display = videoBank > 0 ? 'inline-flex' : 'none';
            el('banked-music-val').textContent = `${Math.floor(musicBank / 60)}m`;
            el('banked-video-val').textContent = `${Math.floor(videoBank / 60)}m`;
            state.dashboardData = { student: model.student, subjects: model.subjects };
            state.isOffline = !value.school?.online;
            const nextHeaderKey = JSON.stringify([model.student, model.timeZone, Math.floor(Date.now() / 60000)]);
            if (headerKey !== nextHeaderKey) {
                (0, student_dashboard_presentation_js_1.renderStudentHeader)(model.student || {}, { timeZone: model.timeZone, onSettings: settings });
                headerKey = nextHeaderKey;
            }
            if (theme !== model.student?.theme && !el('student-settings-modal')) {
                theme = model.student?.theme;
                (0, theme_js_1.applyStudentTheme)(theme || 'default');
            }
            const context = `${identity}:${new Date().toLocaleDateString('en-CA', { timeZone: model.timeZone })}`;
            if (factsContext !== context) {
                factsContext = context;
                factOffset = 0;
                const localDay = new Intl.DateTimeFormat('en-CA', { timeZone: model.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
                (0, student_dashboard_presentation_js_1.renderStudentFacts)({ offset: factOffset, onOffset: offset => { factOffset = offset; }, date: new Date(`${localDay}T12:00:00`) });
            }
            const nextKey = JSON.stringify([model.subjects, identity, value.school?.ready, value.school?.locked, value.school?.canUseLearningVideos,
                model.currentDay, value.school?.accessRecovery, model.data?.mediaStats, model.data?.activityAccess, value.school?.needsRecoveryConfirmation, value.school?.schedule, value.school?.subjects, value.school?.moduleAccess, value.school?.subjectAccess, value.school?.features, value.school?.localStudySeconds]);
            if (cardKey !== nextKey) {
                cardKey = nextKey;
                const assignedModules = new Set(model.subjects.filter(subject => subject.url.startsWith('app://')).map(subject => activityModule(subject.url)));
                const extras = activities.filter(subject => subject.url !== 'app://long-division' && value.school?.features?.[activityModule(subject.url)] !== false && (!value.school?.managedSubjects || !assignedModules.has(activityModule(subject.url)) &&
                    value.school.moduleAccess?.[activityModule(subject.url)]?.code !== 'unassigned'));
                const mediaKey = { 'app://music': 'music', 'app://videos': 'video', 'app://audiobooks': 'audiobook', 'app://games': 'family_game' };
                const subjects = [...model.subjects, ...extras].map(subject => {
                    const moduleStatus = model.currentDay ? model.data?.mediaStats?.[mediaKey[subject.url]] : null;
                    const availability = access({ ...subject, moduleStatus });
                    const clock = value => { const [h, m] = value.split(':').map(Number); return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + (h < 12 ? ' AM' : ' PM'); };
                    return { ...subject, moduleStatus, availabilityText: availability.allowed ? '' : availability.reason,
                        scheduleText: subject.scheduleStart && subject.scheduleEnd ? clock(subject.scheduleStart) + ' – ' + clock(subject.scheduleEnd) : '' };
                });
                // The overview keeps parent-enabled rewards discoverable even when
                // their locked activity cards are omitted from the optional shelf.
                const overview = visibleCloudSubjects(subjects, value.school, () => ({ allowed: true }), model.currentDay ? model.data?.activityAccess : null);
                daySubjects = [...overview.filter(subject => subject.planPlacement === 'school'),
                    ...combinedCreativeSubjects(overview.filter(subject => subject.planPlacement !== 'school'), access)].map(subject => ({
                    ...subject, hiddenOnDashboard: canHideStudentModule(subject) && hiddenModules.has(studentModuleKey(subject))
                }));
                const eligible = combinedCreativeSubjects(visibleCloudSubjects(subjects, value.school, access, model.currentDay ? model.data?.activityAccess : null), access);
                const { shown, hidden } = splitStudentModules(eligible, hiddenModules);
                cardList.render(shown);
                renderHiddenModules(hidden);
            }
            day.render({ studentId: model.student?.id, school, subjects: daySubjects, date: model.date, getAccess: access });
            renderKey = nextRenderKey;
        }
    };
    return desk;
}

},
"renderer/js/cloud-student-day.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountStudentDay = mountStudentDay;
const cloud_student_rendering_js_1 = require("renderer/js/cloud-student-rendering.js");
const cloud_student_day_model_js_1 = require("renderer/js/cloud-student-day-model.js");
const node = (tag, text = '', className = '') => {
    const result = document.createElement(tag);
    result.textContent = text;
    result.className = className;
    return result;
};
const icon = name => {
    const result = node('i');
    result.dataset.lucide = name;
    result.setAttribute('aria-hidden', 'true');
    return result;
};
const text = (element, value) => { if (element.textContent !== value)
    element.textContent = value; };
function mountStudentDay({ openSubject }) {
    const dashboard = document.getElementById('dashboard-screen');
    const row = node('div', '', 'cloud-day-row');
    row.hidden = true;
    dashboard.querySelector('.widgets-grid').after(row);
    const planner = dashboard.querySelector('.cloud-planner-summary');
    if (planner)
        row.append(planner); // Retain the planner's controls and event handlers.
    const panel = node('section', '', 'student-day');
    panel.setAttribute('aria-labelledby', 'student-day-title');
    const heading = node('header', '', 'student-day-heading');
    const title = node('h3', 'Your day');
    title.id = 'student-day-title';
    heading.append(icon('sun'), title);
    panel.append(heading);
    row.append(panel);
    let identity = null;
    const sections = [];
    function section(label, symbol) {
        const details = node('details', '', 'student-day-section');
        const summary = node('summary', '', 'student-day-summary');
        const badge = node('span', '', 'student-day-icon');
        badge.append(icon(symbol));
        const copy = node('span', '', 'student-day-copy'), status = node('span', '', 'student-day-status');
        copy.append(node('strong', label), status);
        summary.append(badge, copy, icon('chevron-down'));
        const body = node('div', '', 'student-day-body'), note = node('p', '', 'student-day-note'), list = node('div', '', 'student-day-list');
        body.append(note, list);
        details.append(summary, body);
        panel.append(details);
        const value = { details, status, note, list, records: new Map() };
        sections.push(value);
        return value;
    }
    const schoolSection = section('Schoolwork', 'graduation-cap');
    const chores = dashboard.querySelector('.student-chore-card');
    if (chores) {
        chores.dataset.overview = 'true';
        panel.append(chores);
    }
    const rewardsSection = section('Rewards', 'gift');
    (0, cloud_student_rendering_js_1.renderPendingIcons)(panel);
    function renderSection(target, model, kind, getAccess) {
        const focus = document.activeElement, hadFocus = target.list.contains(focus);
        text(target.status, model.title);
        text(target.note, model.note);
        const retained = new Map();
        for (const entry of model.rows) {
            const allowed = entry.subject && getAccess(entry.subject).allowed === true;
            let record = target.records.get(entry.id);
            if (!record) {
                const button = node('button', '', 'student-day-item');
                button.type = 'button';
                button.dataset.dayItem = entry.id;
                const copy = node('span', '', 'student-day-item-copy');
                const name = node('strong'), description = node('span');
                const state = node('span', '', 'student-day-item-state');
                copy.append(name, description);
                button.append(copy, state);
                record = { button, name, description, state, entry };
                button.addEventListener('click', () => {
                    // Re-read the current row and permissions; a host update can arrive
                    // while details are open. Opening then uses the existing card handler.
                    const current = record.entry;
                    if (current.subject)
                        openSubject(current.subject);
                });
            }
            record.entry = entry;
            const { button, name, description, state } = record;
            text(name, entry.name);
            const detail = kind === 'rewards' ? entry.detail : !allowed && entry.subject
                ? getAccess(entry.subject).reason || 'Unavailable right now.'
                : !entry.known ? 'Completion not confirmed yet' : entry.detail || (entry.done ? 'Ready to revisit' : 'Still to do');
            text(description, detail);
            text(state, kind === 'rewards' ? allowed ? 'Open' : 'Locked' : entry.done ? 'Done' : allowed ? 'Open' : 'Check');
            button.disabled = !allowed;
            button.dataset.done = String(entry.done === true);
            button.setAttribute('aria-label', `${allowed ? 'Open' : 'Unavailable:'} ${entry.name}. ${detail}`);
            retained.set(entry.id, record);
        }
        for (const [id, record] of target.records)
            if (!retained.has(id))
                record.button.remove();
        [...retained.values()].forEach(({ button }, index) => {
            if (target.list.children[index] !== button)
                target.list.insertBefore(button, target.list.children[index] || null);
        });
        target.records = retained;
        if (hadFocus && (!focus.isConnected || focus.disabled))
            target.details.querySelector('summary').focus({ preventScroll: true });
        else if (hadFocus && document.activeElement !== focus)
            focus.focus({ preventScroll: true });
    }
    return {
        render({ studentId, school, subjects, date, getAccess }) {
            row.hidden = !studentId;
            if (identity !== studentId) {
                identity = studentId;
                for (const section of sections) {
                    section.details.open = false;
                    section.list.replaceChildren();
                    section.records.clear();
                }
            }
            if (!studentId)
                return;
            renderSection(schoolSection, (0, cloud_student_day_model_js_1.schoolDaySummary)(school, subjects, date), 'school', getAccess);
            renderSection(rewardsSection, (0, cloud_student_day_model_js_1.rewardDaySummary)(subjects, getAccess), 'rewards', getAccess);
        }
    };
}

},
"renderer/js/cloud-student-rendering.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderPendingIcons = renderPendingIcons;
exports.createDashboardCardList = createDashboardCardList;
// Update placeholders only. Lucide's document-wide createIcons also replaces
// existing SVGs, which invalidates unchanged cards on every host status event.
function renderPendingIcons(root = document) {
    const lucide = window.lucide;
    if (!lucide)
        return;
    for (const placeholder of root.querySelectorAll('i[data-lucide]')) {
        const name = placeholder.getAttribute('data-lucide');
        const key = name.replace(/(^|[-_\s]+)(\w)/g, (_, prefix, letter) => letter.toUpperCase());
        const icon = lucide.icons[key];
        if (!icon)
            continue;
        const attrs = Object.fromEntries([...placeholder.attributes].map(attribute => [attribute.name, attribute.value]));
        const accessibility = Object.keys(attrs).some(attribute => attribute.startsWith('aria-') || attribute === 'role' || attribute === 'title')
            ? {} : { 'aria-hidden': 'true' };
        placeholder.replaceWith(lucide.createElement(icon, {
            ...accessibility, ...attrs, class: `lucide lucide-${name} ${attrs.class || ''}`.trim()
        }));
    }
}
function createDashboardCardList({ createSubjectCard, getAccess, decorateOptionalCard }) {
    let cards = new Map();
    return {
        clear() { cards.clear(); },
        render(subjects) {
            const next = new Map();
            const main = document.getElementById('main-subjects-container');
            const other = document.getElementById('subjects-container');
            const groups = new Map([[main, []], [other, []]]);
            for (const subject of subjects) {
                // Include access in the key: a retained card must never keep an old
                // allowed/denied click handler after a parent changes the rules.
                const key = JSON.stringify([subject, getAccess(subject)]);
                const previous = cards.get(subject.id);
                const card = previous?.key === key ? previous.card : createSubjectCard(subject);
                const isSchool = subject.planPlacement === 'school';
                if (previous?.card !== card) {
                    card.classList.toggle('main-subject-card', isSchool);
                    card.classList.toggle('required-schoolwork', isSchool);
                    card.classList.toggle('completed-schoolwork', isSchool && subject.today_completed === true);
                    if (isSchool) {
                        const label = document.createElement('span');
                        label.className = 'schoolwork-label';
                        label.textContent = 'Required schoolwork';
                        card.querySelector('.subject-card-header')?.after(label);
                    }
                }
                const element = previous?.key === key ? previous.element
                    : isSchool ? card : decorateOptionalCard?.(subject, card) || card;
                next.set(subject.id, { key, card, element });
                groups.get(isSchool ? main : other).push(element);
            }
            const focused = document.activeElement;
            const focusedId = focused?.classList.contains('subject-card') ? focused.dataset.subjectId : null;
            for (const [container, desired] of groups) {
                const keep = new Set(desired);
                for (const card of [...container.children])
                    if (!keep.has(card))
                        card.remove();
                desired.forEach((card, index) => {
                    if (container.children[index] !== card)
                        container.insertBefore(card, container.children[index] || null);
                });
            }
            cards = next;
            if (focusedId && !focused.isConnected)
                cards.get(focusedId)?.card.focus({ preventScroll: true });
        }
    };
}

},
"renderer/js/cloud-student-day-model.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schoolDaySummary = schoolDaySummary;
exports.rewardDaySummary = rewardDaySummary;
exports.compactChoreSummary = compactChoreSummary;
// Display-only summaries. Completion and access decisions come from the host.
function schoolDaySummary(school, subjects, date) {
    const completion = school?.completion;
    const current = completion?.date === date;
    const known = current && completion.known === true;
    if (current && completion.isSchoolDay === false) {
        return { title: 'No required schoolwork today', note: 'Your family calendar has today off. Optional activities still follow your parent’s rules.', rows: [] };
    }
    const records = new Map((completion?.subjects || []).map(row => [row.subjectId, row]));
    const required = subjects.filter(subject => known ? records.get(subject.id)?.required === true
        : subject.planPlacement === 'school' && subject.plannedToday !== false);
    const rows = required.map(subject => ({
        id: subject.id, name: subject.name, subject,
        done: known && records.get(subject.id)?.completed === true,
        known, detail: subject.daily_goal_minutes > 0 && Number.isFinite(subject.today_seconds)
            ? `${Math.floor(subject.today_seconds / 60)} of ${subject.daily_goal_minutes} min` : ''
    }));
    // Spelling, vocabulary and poems can be daily requirements without their own
    // assigned subject. Match the host's de-duplication so the count stays honest.
    if (known) {
        for (const requirement of completion.requirements || []) {
            if (!requirement.required || required.some(subject => subject.url === `app://${requirement.module}`))
                continue;
            const subject = subjects.find(row => row.url === `app://${requirement.module}`);
            const names = { spelling: 'Spelling', vocabulary: 'Vocabulary', poems: 'Poem memorization' };
            rows.push({ id: `requirement:${requirement.module}`, name: subject?.name || names[requirement.module] || 'Daily practice',
                subject, done: requirement.completed === true, known: true, detail: '' });
        }
    }
    rows.sort((a, b) => Number(a.done) - Number(b.done));
    const total = completion?.total, completed = completion?.completed;
    const countKnown = known && Number.isSafeInteger(total) && Number.isSafeInteger(completed) && completed >= 0 && completed <= total;
    const remaining = countKnown ? total - completed : null;
    const title = !countKnown ? 'Checking today’s progress'
        : total === 0 ? 'No required schoolwork today'
            : remaining === 0 ? 'Schoolwork finished!' : `${remaining} left · ${completed} of ${total} done`;
    const note = !countKnown ? 'Connect or refresh to confirm today’s completion. Your saved schoolwork is still here.'
        : school.online === false ? 'Showing saved progress. New work will appear after it syncs.'
            : remaining === 0 ? 'You’re caught up with today’s schoolwork. Rewards have their own rules below.'
                : 'Choose an activity to continue. Finished work stays available to revisit.';
    return { title, note, rows };
}
function rewardDaySummary(subjects, getAccess) {
    const eligible = subjects.filter(subject => subject.planPlacement !== 'school' && (subject.is_reward || subject.planPlacement === 'after_school'
        || ['app://music', 'app://videos', 'app://audiobooks', 'app://games'].includes(subject.url)));
    const rows = eligible.filter(subject => !subject.hiddenOnDashboard).map(subject => {
        const access = getAccess(subject);
        const remaining = subject.moduleStatus?.remainingSeconds;
        const detail = access.allowed
            ? Number.isFinite(remaining) ? `${Math.max(0, Math.ceil(remaining / 60))} min left` : 'Available now'
            : [access.reason || 'Not available right now.', subject.scheduleText].filter(Boolean).join(' · ');
        return { id: subject.id, name: subject.name, subject, allowed: access.allowed === true, detail };
    });
    const available = rows.filter(row => row.allowed).length;
    return { title: !rows.length ? eligible.length ? 'Rewards are hidden' : 'No rewards assigned' : available === rows.length ? 'Ready when you are'
            : available ? `${available} available · ${rows.length - available} locked` : 'See what needs to happen first',
        note: !rows.length ? eligible.length ? 'Restore an activity from Hidden modules below to show it here.' : 'Rewards your parent enables will appear here.' : 'Availability follows your parent’s schoolwork, chore, time and permission settings.', rows };
}
function compactChoreSummary(items, pending = false) {
    if (pending)
        return 'Check-off saved · waiting to sync';
    if (!Array.isArray(items))
        return 'Checking your chores';
    const ready = items.filter(row => row.status !== 'upcoming' && !['submitted', 'approved', 'excused'].includes(row.status) && row.available).length;
    const waiting = items.filter(row => row.status === 'submitted').length;
    const upcoming = items.filter(row => row.status === 'upcoming').length;
    const other = items.filter(row => !['submitted', 'approved', 'excused', 'upcoming'].includes(row.status) && !row.available).length;
    const parts = [ready && `${ready} to do — open to mark done`, waiting && `${waiting} waiting for approval`,
        upcoming && `${upcoming} coming up`, other && `${other} to check`].filter(Boolean);
    return parts.join(' · ') || 'All caught up';
}

},
"renderer/js/shared/student-subject-card.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStudentCardRenderer = createStudentCardRenderer;
// Shared ORIGINAL student card renderer. LAN and Cloud inject their transport/state;
// neither side imports the other's bootstrap, credentials, or server.
const student_markup_js_1 = require("renderer/js/shared/student-markup.js");
function createStudentCardRenderer({ state, formatTime, getScheduleWindowState, getDashboardSchoolCompletion, openSubject, escapeHtml, getAccessState }) {
    function getSubjectIconHtml(icon, name = '') {
        if (!icon)
            icon = '📚';
        const lucideMap = {
            // Writing / Language Arts
            'pencil': 'pencil', 'edit': 'pencil', 'writing': 'pen-tool', 'journal': 'notebook',
            'composition': 'pen-tool', 'essay': 'file-text', 'grammar': 'spell-check',
            'spelling': 'spell-check', 'language': 'languages', 'english': 'languages',
            'spanish': 'languages',
            // Reading / Books
            'book': 'book-open', 'reading': 'book-open', 'literature': 'book-open',
            'bible': 'book-marked', 'scripture': 'book-marked', 'devotion': 'heart',
            // Curriculum
            'abeka': 'book-open', 'curriculum': 'layers',
            // Math
            'calculator': 'calculator', 'math': 'calculator', 'algebra': 'sigma',
            'geometry': 'triangle', 'arithmetic': 'hash',
            // Science
            'science': 'flask-conical', 'physics': 'atom', 'chemistry': 'flask-conical',
            'biology': 'leaf', 'nature': 'leaf',
            // Arts
            'music': 'music', 'art': 'palette', 'drawing': 'palette', 'craft': 'scissors',
            'coloring': 'paintbrush', 'painting': 'paintbrush', 'color': 'paintbrush',
            // History / Social Studies
            'history': 'landmark', 'social': 'globe', 'geography': 'globe',
            'civics': 'building-2', 'government': 'building-2',
            // Technology
            'typing': 'keyboard', 'computer': 'monitor', 'coding': 'code-2',
            'programming': 'code-2', 'technology': 'monitor',
            // Assessment
            'quiz': 'clipboard-list', 'test': 'clipboard-list', 'exam': 'clipboard-list',
            // Other
            'game': 'gamepad-2', 'games': 'gamepad-2', 'store': 'shopping-cart',
            'notebook': 'notebook', 'notes': 'notebook',
            'physical': 'dumbbell', 'pe': 'dumbbell', 'exercise': 'dumbbell',
        };
        const key = (icon || '').toLowerCase().trim();
        const nameKey = (name || '').toLowerCase().trim();
        const directIcons = new Set(['brain', 'brain-circuit', 'quote', 'printer', 'clipboard-check', 'book-a', 'book-open', 'book-marked', 'flask-conical', 'spell-check', 'map', 'notebook', 'keyboard', 'gamepad-2', 'graduation-cap', 'palette', 'music', 'languages', 'calculator', 'video']);
        // Saved subjects use Lucide names outside the original short lookup list.
        const registryKey = key.replace(/(^|-)([a-z])/g, (_match, _separator, letter) => letter.toUpperCase());
        let lucideName = /^[a-z][a-z0-9-]*$/.test(key) && Object.hasOwn(window.lucide?.icons || {}, registryKey)
            ? key : directIcons.has(key) ? key : null;
        for (const [k, v] of lucideName ? [] : Object.entries(lucideMap)) {
            if (key.includes(k) || nameKey.includes(k)) {
                lucideName = v;
                break;
            }
        }
        if (lucideName) {
            return `<i data-lucide="${lucideName}" style="width:26px; height:26px; vertical-align:middle; stroke-width:2.2;"></i>`;
        }
        return /^[a-z][a-z0-9 -]*$/i.test(icon)
            ? '<i data-lucide="book-open" aria-hidden="true" style="width:26px;height:26px;"></i>'
            : escapeHtml(icon);
    }
    function createSubjectCard(subject) {
        // Theme colors and numeric metadata may now originate in a remote snapshot.
        subject = { ...subject, color: /^#[\da-f]{3,8}$/i.test(subject.color || '') ? subject.color : '#38bdf8',
            daily_goal_minutes: Number.isFinite(Number(subject.daily_goal_minutes)) ? Math.max(subject.timeSource === 'cloud' ? 0 : 1, Number(subject.daily_goal_minutes)) : 30 };
        const access = getAccessState?.(subject);
        const card = document.createElement('div');
        card.className = 'subject-card';
        const isWorksheetLibrary = subject.url === 'app://worksheets';
        if (isWorksheetLibrary)
            card.classList.add('worksheet-library-card');
        const isLearningVideos = subject.url === 'app://learning-videos';
        if (isLearningVideos)
            card.classList.add('learning-videos-card');
        const isSchoolPortal = Number(subject.is_school_portal) === 1;
        const portalCourses = Array.isArray(subject.portal_courses) ? subject.portal_courses : [];
        const requiredPortalCourses = portalCourses.filter(course => !course?.upcoming);
        const completedPortalCourses = requiredPortalCourses.filter(course => course?.completed).length;
        if (isSchoolPortal)
            card.classList.add('school-portal-card');
        // ===== SCHEDULE CHECK (time window) =====
        let isScheduleLocked = false;
        let unlockTimeStr = '';
        if (!getAccessState && subject.schedule_start && subject.schedule_end) {
            const now = new Date();
            const nowMins = now.getHours() * 60 + now.getMinutes();
            const schedule = getScheduleWindowState({
                nowMinutes: nowMins,
                startTime: subject.schedule_start,
                endTime: subject.schedule_end
            });
            if (schedule.configured && !schedule.allowed) {
                isScheduleLocked = true;
                const fmt = t => new Date(`1970-01-01T${t}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                unlockTimeStr = fmt(subject.schedule_start);
            }
        }
        // ===== PREREQ CHECK (must complete another subject first) =====
        const isPrereqLocked = !getAccessState && !!(subject.unlock_after_subject_id &&
            subject.unlock_after_subject_name &&
            !subject.unlock_after_completed);
        const prereqName = subject.unlock_after_subject_name || '';
        const isDailyPracticeLocked = !!subject.dailyPracticeCompleted;
        const isDailyPracticeMastered = !!subject.dailyPracticeMastered;
        const calendar = state.dashboardData?.schoolCalendar;
        const isAfterSchoolLocked = !getAccessState && !!(!subject.quick_unlocked
            && subject.access_tier === 'after_school'
            && calendar?.is_school_day
            && !getDashboardSchoolCompletion().done);
        const isOfflineLocked = !getAccessState && state.isOffline
            && window.BODEE_OFFLINE_POLICY?.isOfflineSchoolSubjectAllowed(subject) !== true;
        const isLocked = access?.allowed === false || isDailyPracticeLocked || isScheduleLocked || isPrereqLocked || isAfterSchoolLocked || isOfflineLocked;
        if (access?.allowed === false)
            card.classList.add('prereq-locked');
        if (subject.today_completed || isDailyPracticeLocked) {
            card.classList.add('completed');
        }
        if (subject.today_completed && isSchoolPortal) {
            card.classList.add('completed-portal-reopenable');
        }
        if (isScheduleLocked && !isPrereqLocked) {
            card.classList.add('schedule-locked');
        }
        if (isPrereqLocked) {
            card.classList.add('prereq-locked');
        }
        if (isAfterSchoolLocked) {
            card.classList.add('prereq-locked');
        }
        if (isOfflineLocked)
            card.classList.add('prereq-locked');
        card.style.cssText = `--card-color: ${subject.color}; cursor:${isDailyPracticeLocked || isOfflineLocked ? 'not-allowed' : 'pointer'}`;
        // Build the lock pill HTML
        let lockPillHtml = '';
        if (access?.allowed === false) {
            lockPillHtml = `<div class="lock-pill lock-pill--prereq">🔒 ${escapeHtml(access.reason)}</div>`;
        }
        else if (isDailyPracticeMastered) {
            lockPillHtml = '<div class="lock-pill lock-pill--prereq">🏆 All available questions mastered</div>';
        }
        else if (isDailyPracticeLocked) {
            lockPillHtml = '<div class="lock-pill lock-pill--prereq"><i data-lucide="check-circle-2" aria-hidden="true"></i><span>Complete for today · Back tomorrow</span></div>';
        }
        else if (isAfterSchoolLocked) {
            lockPillHtml = '<div class="lock-pill lock-pill--prereq">🔒 Finish school first</div>';
        }
        else if (isOfflineLocked) {
            lockPillHtml = '<div class="lock-pill lock-pill--prereq">🔒 Parent computer offline</div>';
        }
        else if (isScheduleLocked) {
            lockPillHtml = `<div class="lock-pill lock-pill--time">⏰ Unlocks at ${unlockTimeStr}</div>`;
        }
        else if (isPrereqLocked) {
            lockPillHtml = `<div class="lock-pill lock-pill--prereq">🔒 Complete ${escapeHtml(prereqName)} first</div>`;
        }
        else if (subject.today_completed) {
            lockPillHtml = '<div class="lock-pill lock-pill--complete"><i data-lucide="check-circle-2" aria-hidden="true"></i><span>Complete for today · Open again</span></div>';
        }
        const portalProgressHtml = portalCourses.length > 0 ? `
    <div class="portal-course-progress" aria-label="${completedPortalCourses} of ${requiredPortalCourses.length} Abeka lessons complete today">
      <div class="portal-course-progress-summary">
        <span>Today's Abeka lessons</span>
        <strong>${completedPortalCourses} of ${requiredPortalCourses.length}</strong>
      </div>
      <div class="portal-course-list">
        ${portalCourses.map(course => {
            const completed = !!course?.completed, upcoming = course?.upcoming === true;
            const courseName = escapeHtml(course?.course_name || 'Abeka class');
            const lessonLabel = escapeHtml(course?.lesson_label || course?.course_name || 'Abeka lesson');
            return `<span class="portal-course-chip ${completed ? 'is-complete' : upcoming ? 'is-upcoming' : 'is-pending'}" title="${lessonLabel}">
            <span class="portal-course-status" aria-hidden="true">${completed ? '✓' : upcoming ? '›' : '○'}</span>
            <span class="portal-course-name">${courseName}${upcoming ? ' · Upcoming' : ''}</span>
          </span>`;
        }).join('')}
      </div>
    </div>
  ` : '';
        const moduleStatus = subject.moduleStatus;
        // Zero usage is still tracked; it adds no useful information to an unused
        // activity card. Preserve unavailable records and meaningful goals/limits.
        const cloudGoalText = subject.daily_goal_minutes > 0
            ? subject.today_seconds === null ? `${subject.daily_goal_minutes}min goal`
                : `${Math.max(0, Math.ceil((subject.daily_goal_minutes * 60 - (subject.today_seconds || 0)) / 60))}m to daily goal`
            : isSchoolPortal ? 'Finish today’s lessons'
                : ['app://spelling', 'app://vocabulary', 'app://poems'].includes(subject.url) ? 'Finish assigned work' : '';
        const formattedUsage = formatTime(subject.today_seconds || 0);
        const cloudUsageHtml = subject.today_seconds === null
            ? '<div class="subject-meta"><span class="subject-time">Study time unavailable</span></div>'
            : subject.today_seconds > 0
                ? `<div class="subject-usage" aria-label="Time used today: ${escapeHtml(formattedUsage)}"><span class="subject-usage-label"><i data-lucide="clock-3" aria-hidden="true"></i>Time used today</span><strong>${escapeHtml(formattedUsage)}</strong></div>`
                : '';
        const cloudGoalHtml = cloudGoalText ? `<div class="subject-meta"><span class="subject-time">${escapeHtml(cloudGoalText)}</span></div>` : '';
        const subjectMetaHtml = moduleStatus
            ? `<div class="subject-meta"><strong class="subject-time">${Math.ceil(moduleStatus.remainingSeconds / 60)}m left</strong>${moduleStatus.usedSeconds > 0 ? `<span class="subject-time">${formatTime(moduleStatus.usedSeconds)} used today</span>` : ''}</div>
      <div class="subject-progress-bar" aria-label="Time used today"><div class="subject-progress-fill" style="width:${Math.min(100, moduleStatus.usedSeconds / Math.max(1, moduleStatus.limitSeconds) * 100)}%;background:${subject.color}"></div></div>
      <div class="cloud-subject-record-note">${escapeHtml(moduleStatus.window)} · ${moduleStatus.limitMinutes}m daily</div>
      ${moduleStatus.bankedSeconds ? '<div class="cloud-subject-record-note">+' + Math.ceil(moduleStatus.bankedSeconds / 60) + 'm banked</div>' : ''}
      ${moduleStatus.dailyBonusSeconds ? '<div class="cloud-subject-record-note">+' + Math.ceil(moduleStatus.dailyBonusSeconds / 60) + 'm added today</div>' : ''}
      ${!isLocked && moduleStatus.availability && !/^available now[.!]?$/i.test(moduleStatus.availability.trim()) ? '<div class="cloud-subject-record-note">' + escapeHtml(moduleStatus.availability) + '</div>' : ''}`
            : subject.cloudActivity === true
                ? `${subject.description ? '<div class="subject-meta">' + escapeHtml(subject.description) + '</div>' : ''}${subject.scheduleText ? '<div class="cloud-subject-record-note">' + escapeHtml(subject.scheduleText) + '</div>' : ''}`
                : subject.timeSource === 'cloud'
                    ? `${cloudUsageHtml}${cloudGoalHtml}
       ${subject.today_seconds === null || subject.daily_goal_minutes <= 0 ? '' : `<div class="subject-progress-bar" aria-label="Received study time toward daily time goal"><div class="subject-progress-fill" style="width:${Math.min(100, subject.today_seconds / (subject.daily_goal_minutes * 60) * 100)}%;background:${subject.color};"></div></div>`}
       ${(!subject.planPlacement || subject.planPlacement === 'school') && !subject.today_completed ? `<div class="cloud-subject-record-note">${subject.completionKnown ? isSchoolPortal ? 'Waiting for lesson completion' : 'Schoolwork in progress' : 'Lesson completion unavailable'}</div>` : ''}`
                    : isWorksheetLibrary
                        ? `<div class="subject-meta"><span class="subject-time">Pages for schoolwork</span><span class="subject-time">Print one copy</span></div>`
                        : isLearningVideos
                            ? `<div class="subject-meta"><span class="subject-time">${formatTime(subject.today_seconds || 0)} learned today</span><span class="subject-time">Always available</span></div>
        <div class="learning-videos-card-note">Parent-approved lessons · No leisure video time used</div>`
                            : `<div class="subject-meta">
        <span class="subject-time">${formatTime(subject.today_seconds || 0)} today</span>
        <span class="subject-time">${subject.daily_goal_minutes}min goal</span>
      </div>
      <div class="subject-progress-bar">
        <div class="subject-progress-fill" style="
          width: ${Math.min(100, ((subject.today_seconds || 0) / (Math.max(1, subject.daily_goal_minutes) * 60)) * 100)}%;
          background: ${subject.color};
        "></div>
      </div>`;
        (0, student_markup_js_1.setStudentMarkup)(card, `
    ${isLocked ? '<span class="lock-badge">🔒</span>' : ''}
    <div class="subject-card-header">
      <span class="subject-icon">${getSubjectIconHtml(subject.icon, subject.name)}</span>
      <span class="subject-name">${escapeHtml(subject.name)}</span>
    </div>
    ${subjectMetaHtml}
    ${subject.timeSource === 'cloud' && !moduleStatus && !isLocked && subject.availabilityText ? `<div class="cloud-subject-record-note">${escapeHtml(subject.availabilityText)}</div>` : ''}
    ${subject.scheduleText && !moduleStatus && !subject.cloudActivity ? `<div class="cloud-subject-record-note">${escapeHtml(subject.scheduleText)}</div>` : ''}
    ${portalProgressHtml}
    ${lockPillHtml}
  `);
        card.dataset.subjectId = subject.id;
        card.setAttribute('role', 'button');
        card.tabIndex = 0;
        card.setAttribute('aria-label', subject.name || 'Open subject');
        card.setAttribute('aria-disabled', String(isLocked));
        card.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                card.click();
            }
        });
        card.addEventListener('click', () => {
            if (access?.allowed === false) {
                window.showToast?.(access.reason, false, 4000);
                return;
            }
            if (isOfflineLocked) {
                if (window.showToast)
                    window.showToast('This activity needs the parent computer. Assigned online school portals are still available.', false, 4000);
                return;
            }
            if (isDailyPracticeLocked) {
                const message = isDailyPracticeMastered
                    ? '🏆 You mastered all available questions!'
                    : '✅ Complete for today — come back tomorrow!';
                if (window.showToast)
                    window.showToast(message, false, 3000);
                return;
            }
            // Completion is a status, never an access lock. Children may reopen any
            // completed subject for review, corrections, tests, or additional work.
            if (isAfterSchoolLocked) {
                if (window.showToast)
                    window.showToast('📚 Finish today\'s required schoolwork to unlock this!', false, 3000);
                return;
            }
            if (isScheduleLocked) {
                if (window.showToast)
                    window.showToast(`⏰ This unlocks at ${unlockTimeStr} today!`, false, 3000);
                return;
            }
            if (isPrereqLocked) {
                // Show friendly explanation toast
                if (window.showToast)
                    window.showToast(`📚 Finish ${prereqName} for today to unlock this!`, false, 3000);
                return;
            }
            openSubject(subject);
        });
        return card;
    }
    return { createSubjectCard, getSubjectIconHtml };
}

},
"renderer/js/shared/student-markup.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setStudentMarkup = setStudentMarkup;
// Original authored presentation uses inline styles. Apply them through the DOM
// so the Cloud shell can retain a strict CSP without allowing inline scripts or
// inline HTML style attributes. Callers must escape all non-authored text.
function setStudentMarkup(element, markup) {
    const styles = [];
    element.innerHTML = markup.replace(/\sstyle="([^"]*)"/g, (_match, value) => {
        styles.push(value);
        return ` data-student-style="${styles.length - 1}"`;
    });
    element.querySelectorAll('[data-student-style]').forEach(node => {
        node.style.cssText = styles[Number(node.dataset.studentStyle)];
        node.removeAttribute('data-student-style');
    });
}

},
"renderer/js/shared/student-dashboard-presentation.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderStudentHeader = renderStudentHeader;
exports.renderStudentFacts = renderStudentFacts;
exports.renderStudentSubjects = renderStudentSubjects;
const facts_js_1 = require("renderer/js/kiosk/facts.js");
// Extracted from kiosk/dashboard.js. Both transports render the same header,
// local fact browser and subject placement into the original dashboard DOM.
function renderStudentHeader(student, { timeZone = 'America/Chicago', onSettings } = {}) {
    const avatar = document.getElementById('dash-avatar');
    const avatarVal = student.avatar;
    if (avatarVal && (avatarVal.startsWith('data:') || avatarVal.startsWith('http') || avatarVal.startsWith('blob:'))) {
        if (avatar.querySelector('img')?.getAttribute('src') !== avatarVal) {
            const image = document.createElement('img');
            image.src = avatarVal;
            image.alt = 'Profile picture';
            image.style.cssText = 'width:48px;height:48px;object-fit:cover;border-radius:50%;';
            image.onerror = () => { if (image.parentNode === avatar)
                avatar.textContent = '👤'; };
            avatar.replaceChildren(image);
        }
    }
    else if (avatar.textContent !== (avatarVal || '👤'))
        avatar.textContent = avatarVal || '👤';
    avatar.style.cursor = 'pointer';
    avatar.title = 'Settings & Themes';
    avatar.setAttribute('role', 'button');
    avatar.setAttribute('aria-label', 'Settings & Themes');
    avatar.tabIndex = 0;
    avatar.onclick = onSettings;
    avatar.onkeydown = event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSettings?.();
        }
    };
    const now = new Date();
    const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(now));
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    document.getElementById('dash-greeting').textContent = student.name ? `${greeting}, ${student.name}!` : 'Welcome to BodeeGuard';
    document.getElementById('dash-date').textContent = now.toLocaleDateString('en-US', { timeZone, weekday: 'long', month: 'long', day: 'numeric' });
    document.getElementById('dash-clock').textContent = now.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit' });
}
function renderStudentFacts({ offset = 0, onOffset = () => { }, date = new Date() } = {}) {
    const previousButton = document.getElementById('fact-prev');
    const nextButton = document.getElementById('fact-next');
    previousButton.setAttribute('aria-label', 'Previous day');
    previousButton.title = 'Previous day';
    nextButton.setAttribute('aria-label', 'Next day');
    const updateFact = () => {
        const targetDate = new Date(date);
        targetDate.setDate(targetDate.getDate() + offset);
        const widget = document.getElementById('fact-widget');
        const fact = facts_js_1.christianHistoryFacts[`${targetDate.getMonth() + 1}-${targetDate.getDate()}`];
        if (fact) {
            const yearsAgo = date.getFullYear() - fact.year;
            document.getElementById('fact-title').textContent = offset === 0 ? `On this day ${yearsAgo} years ago...` : `On ${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${yearsAgo} years ago...`;
            document.getElementById('fact-text').textContent = fact.text;
            widget.style.display = 'flex';
        }
        else
            widget.style.display = 'none';
        const viewingToday = offset >= 0;
        nextButton.disabled = viewingToday;
        nextButton.title = viewingToday ? 'You are viewing today' : 'Next day';
        onOffset(offset);
    };
    previousButton.onclick = () => { offset--; updateFact(); };
    nextButton.onclick = () => { if (offset < 0) {
        offset++;
        updateFact();
    } };
    updateFact();
}
function renderStudentSubjects({ subjects, bonusStatus = {}, createSubjectCard, groupBySchool = false }) {
    const mainContainer = document.getElementById('main-subjects-container');
    const container = document.getElementById('subjects-container');
    mainContainer?.replaceChildren();
    container.replaceChildren();
    const nonRewardSubjects = groupBySchool ? subjects : subjects.filter(subject => !subject.is_reward);
    const practiceStatusByUrl = new Map([
        ['app://logic', { completed: !!bonusStatus.logicCompleted, mastered: !!bonusStatus.logicMastered }],
        ['app://geography', { completed: !!bonusStatus.geoCompleted, mastered: !!bonusStatus.geoMastered }],
        ['app://words', { completed: !!bonusStatus.wordsCompleted, mastered: !!bonusStatus.wordsMastered }],
        ['app://spelling', { completed: !!bonusStatus.spellingCompleted, mastered: !!bonusStatus.spellingMastered }]
    ]);
    nonRewardSubjects.forEach(subject => {
        const practiceStatus = practiceStatusByUrl.get(subject.url) || {};
        const card = createSubjectCard({ ...subject, dailyPracticeCompleted: !!practiceStatus.completed, dailyPracticeMastered: !!practiceStatus.mastered });
        if ((groupBySchool ? subject.planPlacement === 'school' : Number(subject.is_school_portal) === 1 || /abeka|writing/i.test(subject.name) || subject.url === 'app://learning-videos') && mainContainer) {
            card.classList.add('main-subject-card');
            mainContainer.appendChild(card);
        }
        else
            container.appendChild(card);
    });
    return { mainContainer, container, nonRewardSubjects };
}

},
"renderer/js/kiosk/facts.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.christianHistoryFacts = void 0;
// Describe specific historical actions; see docs/daily-history-editorial.md.
exports.christianHistoryFacts = {
    "8-1": { year: 1820, text: "Mary Slessor, a courageous missionary to Nigeria who stopped the practice of abandoning twins, was born in Scotland." },
    "8-3": { year: 1492, text: "Christopher Columbus set sail from Spain, noting in his journal his desire to spread the Christian faith to new lands." },
    "8-4": { year: 1904, text: "The first ever Vacation Bible School (VBS) was held in New York City by Dr. Robert Boville." },
    "8-5": { year: 1604, text: "John Eliot, the 'Apostle to the Indians' who translated the Bible into the Algonquian language, was born." },
    "8-6": { year: 1801, text: "The Cane Ridge Revival began in Kentucky, drawing over 10,000 people and sparking the Second Great Awakening." },
    "8-7": { year: 1536, text: "The city of Geneva officially voted to adopt the Protestant Reformation." },
    "8-8": { year: 1892, text: "Sunday school leader John W. B. Allen, a pioneer in children's Christian education, was born." },
    "8-9": { year: 1888, text: "Adoniram Judson Gordon founded Gordon College to train young men and women for missionary work." },
    "8-10": { year: 1891, text: "The first edition of the Christian journal 'The Expository Times' was published." },
    "8-11": { year: 1253, text: "Clare of Assisi, one of the first followers of St. Francis and founder of the Order of Poor Ladies, passed away." },
    "8-12": { year: 1938, text: "Cameron Townsend founded Wycliffe Bible Translators to help translate the Bible into every language." },
    "8-13": { year: 1541, text: "John Calvin returned to Geneva to establish a strict, reformed Christian society." },
    "8-14": { year: 1598, text: "The first Christian church in what is now the United States was established in San Juan, Puerto Rico." },
    "8-15": { year: 1534, text: "Ignatius of Loyola and six companions took vows that led to the founding of the Society of Jesus (Jesuits)." },
    "8-16": { year: 1968, text: "The United Methodist Church was formed through the merger of two major Methodist denominations." },
    "8-17": { year: 1761, text: "William Carey, known as the 'father of modern Protestant missions', was born in England." },
    "8-18": { year: 1951, text: "Campus Crusade for Christ (now Cru) was founded by Bill and Vonette Bright at UCLA." },
    "8-19": { year: 1662, text: "Blaise Pascal, the brilliant mathematician and Christian philosopher, passed away." },
    "8-20": { year: 1912, text: "William Booth, the passionate founder of the Salvation Army, passed away." },
    "8-21": { year: 1756, text: "The first Thanksgiving Day in the American colonies strictly for giving thanks to God (not a harvest festival) was held in Massachusetts." },
    "8-22": { year: 1572, text: "The tragic St. Bartholomew's Day massacre began in France, a dark day for French Protestants (Huguenots)." },
    "8-23": { year: 1836, text: "George Müller opened his first orphanage in Bristol, England, relying entirely on prayer for funding." },
    "8-24": { year: 1899, text: "The Gideons International, famous for placing Bibles in hotel rooms worldwide, was founded by three traveling salesmen." },
    "8-25": { year: 1803, text: "The first camp meeting in American history concluded in Kentucky, sparking widespread revivals." },
    "8-26": { year: 1910, text: "Mother Teresa, famous for her lifelong dedication to caring for the poor in Kolkata, India, was born." },
    "8-27": { year: 1962, text: "The first translation of the New Testament in modern Spanish (Dios Habla Hoy) was published." },
    "8-28": { year: 430, text: "Augustine of Hippo, one of the most influential early church fathers and author of 'City of God', passed away." },
    "8-29": { year: 1522, text: "Martin Luther's translation of the New Testament into German (the 'September Testament') was nearing completion." },
    "8-30": { year: 1906, text: "The Azusa Street Revival, the primary catalyst for the worldwide Pentecostal movement, was in full swing in Los Angeles." },
    "8-31": { year: 1628, text: "John Bunyan, author of the famous Christian allegory 'The Pilgrim's Progress', passed away." },
    // September
    "9-1": { year: 1957, text: "Billy Graham concluded a sixteen-week New York City crusade attended by nearly two million people, sharing the gospel with a huge and diverse city." },
    "9-2": { year: 1857, text: "French missionary François Coillard sailed for southern Africa, where he would spend decades teaching, translating, and serving local communities." },
    "9-3": { year: 1924, text: "Isobel Kuhn enrolled at Moody Bible Institute, a step that prepared her for many years of missionary service among the Lisu people of Asia." },
    "9-4": { year: 1771, text: "Francis Asbury sailed for America, where his tireless travels helped spread Methodist preaching and organize growing churches." },
    "9-5": { year: 1651, text: "Baptist preacher Obadiah Holmes endured punishment rather than surrender his convictions, and his courage strengthened the cause of religious liberty." },
    "9-6": { year: 1620, text: "The Mayflower sailed from England carrying Pilgrims who hoped to build a community where they could worship according to conscience." },
    "9-7": { year: 1785, text: "William Fox promoted Sunday schools so working children could learn to read, study the Bible, and gain an education." },
    "9-8": { year: 1741, text: "Missionary Johann Philipp Fabricius arrived in India, where he helped revise the Tamil Bible and prepared hymns for Tamil-speaking Christians." },
    "9-9": { year: 1519, text: "Philip Melanchthon presented teachings that emphasized the authority of Scripture and salvation by God's grace." },
    "9-10": { year: 1898, text: "Alexander Crummell died after years of preaching, teaching in Liberia, and serving St. Luke's Church in Washington, D.C." },
    "9-11": { year: 1818, text: "John Williams and his wife began missionary work on Raiatea, helping establish churches and train Pacific Island Christians to serve others." },
    "9-12": { year: 1217, text: "Members of the Dominican order arrived in Paris, where study and preaching became central parts of their Christian mission." },
    "9-13": { year: 1865, text: "Missionary Robert Jermain Thomas joined an expedition toward Korea, carrying Christian books and hoping to share the Scriptures." },
    "9-14": { year: 1741, text: "George Frideric Handel completed the music for Messiah after only about twenty-four days of concentrated work." },
    "9-15": { year: 1853, text: "Antoinette Brown was ordained, becoming the first woman ordained by a major Protestant denomination in the United States." },
    "9-16": { year: 1902, text: "Thomas Barnardo died after building homes and ministries that cared for thousands of poor and homeless children." },
    "9-17": { year: 1179, text: "Hildegard of Bingen died after serving as a Christian teacher, writer, composer, and counselor whose works still inspire readers and musicians." },
    "9-18": { year: 1884, text: "Jerry McAuley died after founding the Water Street Mission, where people struggling with poverty and addiction found food, shelter, and hope." },
    "9-19": { year: 1853, text: "Hudson Taylor sailed for China, beginning a missionary life marked by prayer, cultural understanding, and trust in God's provision." },
    "9-20": { year: 1838, text: "Malagasy Christian Marie Rafaravavy escaped persecution and later helped others learn about the faith that had given her courage." },
    "9-21": { year: 1802, text: "Absalom Jones purchased his freedom and later became the first African American priest in the Episcopal Church." },
    "9-22": { year: 1931, text: "After a long search for truth, C. S. Lewis embraced Christianity and later explained the faith through beloved books and broadcasts." },
    "9-23": { year: 1857, text: "Jeremiah Lanphier began a small noon prayer meeting in New York City that helped spark a widespread revival of prayer." },
    "9-24": { year: 1794, text: "Ten Orthodox missionaries arrived on Kodiak Island, beginning a lasting Christian mission among Alaska Native peoples." },
    "9-25": { year: 1392, text: "Sergius of Radonezh died after encouraging prayer, peace, humble service, and renewal in the Russian church." },
    "9-26": { year: 1899, text: "Missionary Ernst Faber died after decades of studying Chinese culture and writing Christian works for Chinese readers." },
    "9-27": { year: 1600, text: "English pastor John Smyth began work that would help shape the early Baptist movement and its emphasis on believer's baptism." },
    "9-28": { year: 1832, text: "Evangelist Charles Finney survived a cholera outbreak and continued preaching, teaching, and encouraging Christian reform." },
    "9-29": { year: 1770, text: "George Whitefield preached for the last time after decades of open-air evangelism during the Great Awakening." },
    "9-30": { year: 420, text: "Jerome died after completing the Latin Vulgate, a Bible translation that served Western Christians for more than a thousand years." },
    // October
    "10-1": { year: 1529, text: "At the Marburg Colloquy, Protestant leaders sought unity and agreed on fourteen of fifteen major statements of belief." },
    "10-2": { year: 1528, text: "William Tyndale published The Obedience of a Christian Man, teaching that Scripture should guide both personal faith and public life." },
    "10-3": { year: 1852, text: "Thomas Gallaudet died after pioneering Christian education and worship opportunities for Deaf people." },
    "10-4": { year: 1582, text: "Teresa of Ávila died after renewing convent life and writing influential books about prayer and wholehearted devotion to God." },
    "10-5": { year: 1582, text: "The Gregorian calendar was introduced to correct the calendar and improve the calculation of important church dates such as Easter." },
    "10-6": { year: 1895, text: "A small holiness congregation was organized in Los Angeles, one of the groups that later helped form the Church of the Nazarene." },
    "10-7": { year: 1787, text: "Henry Melchior Muhlenberg died after helping organize Lutheran churches, schools, and ministers across colonial America." },
    "10-8": { year: 1664, text: "Baptist pastor Benjamin Keach defended a children's primer that taught reading through Christian lessons, showing his concern for young learners." },
    "10-9": { year: 1842, text: "Missionary educator James Lloyd Breck began serving frontier communities and became known for planting churches and schools." },
    "10-10": { year: 1530, text: "William Tracy's Christian testimony emphasized salvation through faith in Christ rather than human merit." },
    "10-11": { year: 1718, text: "The New Jerusalem Church was dedicated at Tranquebar, India, becoming an important center for worship, education, and Bible translation." },
    "10-12": { year: 1845, text: "Elizabeth Fry died after years of visiting prisons and working to improve conditions for women, children, and other vulnerable people." },
    "10-13": { year: 1652, text: "John Eliot continued preaching among Native Americans and preparing Christian materials in their own language." },
    "10-14": { year: 1829, text: "Alexander Duff survived a shipwreck on his way to India and went on to build schools that combined Christian teaching with broad education." },
    "10-15": { year: 1900, text: "Bethel Bible School opened in Topeka, Kansas, becoming an important early setting in the history of the modern Pentecostal movement." },
    "10-16": { year: 1812, text: "Henry Martyn died after translating the New Testament into Persian and working on other Bible translations for Asian readers." },
    "10-17": { year: 1532, text: "Pope Clement VII ordered that Jewish people in his territories be treated humanely, an important reminder to defend neighbors from injustice." },
    "10-18": { year: 1814, text: "The people of Pitcairn Island received amnesty after a remarkable community renewal shaped by Bible reading and Christian teaching." },
    "10-19": { year: 1893, text: "Missionary John Nevius died after promoting churches that were self-governing, self-supporting, and active in sharing the gospel." },
    "10-20": { year: 1893, text: "Church historian Philip Schaff died after producing major works that helped readers understand Christianity across many centuries and traditions." },
    "10-21": { year: 1528, text: "Reformer Johann Brenz urged authorities to treat persecuted Anabaptists with patience and kindness rather than violence." },
    "10-22": { year: 1808, text: "Baptist leader Benjamin Randall died after helping organize churches that emphasized freely offered grace and active evangelism." },
    "10-23": { year: 1803, text: "Henry Martyn was ordained for ministry before beginning his influential missionary and Bible-translation work." },
    "10-24": { year: 1648, text: "The Peace of Westphalia ended long religious wars in Europe and extended legal recognition to several major Christian groups." },
    "10-25": { year: 1890, text: "Emma Whittemore founded the Door of Hope, a Christian home that offered protection, practical help, and a new beginning to vulnerable women." },
    "10-26": { year: 1973, text: "Linguist Kenneth Pike was honored for methods that helped missionaries study unwritten languages and translate the Bible more accurately." },
    "10-27": { year: 312, text: "Before the Battle of the Milvian Bridge, Constantine reported seeing a sign connected with Christ, an event that changed the Roman Empire's relationship with Christianity." },
    "10-28": { year: 1646, text: "John Eliot preached one of the earliest recorded Christian worship services in a Native American language in New England." },
    "10-29": { year: 1907, text: "Dutch Christians honored Abraham Kuyper, whose work as a pastor, educator, writer, and statesman connected faith with every area of life." },
    "10-30": { year: 1650, text: "The nickname 'Quaker' was first used for followers of George Fox, who stressed inward faith, truthful living, and peace." },
    "10-31": { year: 1517, text: "Martin Luther circulated his Ninety-Five Theses, helping begin the Protestant Reformation and a renewed debate about Scripture and grace." },
    // November
    "11-1": { year: 1512, text: "Michelangelo's newly painted Sistine Chapel ceiling was opened to the public, using magnificent art to tell biblical stories." },
    "11-2": { year: 1752, text: "Johann Albrecht Bengel died after careful study of New Testament manuscripts that helped later scholars understand the biblical text." },
    "11-3": { year: 1631, text: "John Eliot arrived in Boston and later became a pioneering missionary and Bible translator among Native Americans." },
    "11-4": { year: 1859, text: "Guido Verbeck arrived in Japan, where he served as a missionary, teacher, translator, and adviser during a time of great change." },
    "11-5": { year: 1818, text: "Pliny Fisk was ordained and soon traveled to the Middle East to distribute Scriptures, study languages, and begin missionary work." },
    "11-6": { year: 1789, text: "John Carroll was confirmed as the first Roman Catholic bishop in the United States and helped build churches and schools." },
    "11-7": { year: 739, text: "Willibrord died after decades of missionary work among the Frisians and other peoples of northwestern Europe." },
    "11-8": { year: 1828, text: "Missionary Marie Gobat crossed the Egyptian desert with her family, showing courage and perseverance in service." },
    "11-9": { year: 1895, text: "Amy Carmichael arrived in India, where she would serve for more than fifty years and create a safe home for vulnerable children." },
    "11-10": { year: 1828, text: "Lott Cary died after rising from slavery to become a pastor, physician, educator, and missionary leader in Liberia." },
    "11-11": { year: 619, text: "John the Almsgiver died after becoming famous for generosity to people who were poor, hungry, sick, or displaced." },
    "11-12": { year: 1615, text: "Richard Baxter was born; he later became a pastor and writer known for practical Christian teaching and care for his community." },
    "11-13": { year: 387, text: "Monica, the praying mother of Augustine, died after seeing her son turn to Christ and begin a life of influential Christian service." },
    "11-14": { year: 1716, text: "Gottfried Wilhelm Leibniz died after combining major achievements in mathematics and philosophy with sustained reflection on Christian belief." },
    "11-15": { year: 1280, text: "Albertus Magnus died after a life of teaching that encouraged Christians to study both Scripture and the natural world." },
    "11-16": { year: 1093, text: "Margaret of Scotland died after promoting education, caring for the poor, and encouraging Christian renewal in her kingdom." },
    "11-17": { year: 680, text: "Hilda of Whitby died after leading an influential Christian community known for learning, hospitality, and training church leaders." },
    "11-18": { year: 1758, text: "Quaker reformer John Woolman continued speaking against slavery and urging Christians to treat every person with dignity." },
    "11-19": { year: 1672, text: "Richard Baxter preached despite laws restricting his ministry, continuing to teach with courage and concern for his neighbors." },
    "11-20": { year: 1542, text: "Spain issued the New Laws to protect Indigenous peoples after years of advocacy by Bartolomé de las Casas and others." },
    "11-21": { year: 1620, text: "The Mayflower Compact was signed, promising that the settlers would work together under agreed laws for the good of the community." },
    "11-22": { year: 1755, text: "Sandy Creek Baptist Church was organized in North Carolina and became a center that trained and sent many preachers." },
    "11-23": { year: 615, text: "Missionary Columbanus died after founding monasteries that became centers of worship, learning, and service across Europe." },
    "11-24": { year: 1531, text: "Reformer Johannes Oecolampadius died after helping bring Bible teaching and church renewal to Basel." },
    "11-25": { year: 1535, text: "The Ursuline community was founded to educate girls and care for people in need." },
    "11-26": { year: 1883, text: "Sojourner Truth died after a remarkable life of Christian faith, abolition work, and courageous advocacy for women and formerly enslaved people." },
    "11-27": { year: 1542, text: "Margaretha Blaurer died after serving refugees, the sick, and the poor as an early Protestant deaconess." },
    "11-28": { year: 1660, text: "The Royal Society was founded by scholars, many of whom believed that studying creation could honor its Creator." },
    "11-29": { year: 1226, text: "Louis IX was crowned king of France and later became known for personal devotion, charity, and efforts to administer justice." },
    "11-30": { year: 722, text: "Boniface was consecrated as a missionary bishop and went on to organize churches and Christian education in German-speaking lands." },
    // December
    "12-1": { year: 1881, text: "Titus Coan died after decades of missionary service during a remarkable season of Christian revival in Hawaii." },
    "12-2": { year: 1697, text: "St. Paul's Cathedral in London was dedicated, becoming a lasting place of worship and a symbol of rebuilding after the Great Fire." },
    "12-3": { year: 1552, text: "Francis Xavier died after carrying the Christian message to India, Southeast Asia, and Japan." },
    "12-4": { year: 1674, text: "Missionary explorer Jacques Marquette established contact and ministry across the Great Lakes region while learning from Indigenous communities." },
    "12-5": { year: 633, text: "A church council led by Isidore of Seville opposed forced conversions and encouraged the use of hymns in worship." },
    "12-6": { year: 1273, text: "Thomas Aquinas stopped writing after a profound spiritual experience, leaving behind works that shaped Christian thought for centuries." },
    "12-7": { year: 374, text: "Ambrose was consecrated bishop of Milan and became a courageous preacher, hymnwriter, and defender of the poor." },
    "12-8": { year: 1808, text: "Young Adoniram Judson dedicated his life to God, beginning a journey that eventually led to missionary service and Bible translation in Burma." },
    "12-9": { year: 1835, text: "George Müller announced plans for an orphanage that would care for children through prayer, generosity, and practical love." },
    "12-10": { year: 1822, text: "Christian composer César Franck was born; his sacred music later enriched churches and concert halls." },
    "12-11": { year: 1825, text: "Samuel Ajayi Crowther was baptized after being rescued from slavery and later became a missionary, bishop, and Bible translator in Africa." },
    "12-12": { year: 1733, text: "Three missionaries were ordained to serve Native American communities, combining preaching with education and practical help." },
    "12-13": { year: 1948, text: "Missionary Jim Elliot wrote about trusting God completely, a conviction that shaped his later service in Ecuador." },
    "12-14": { year: 1872, text: "John Geddie died after serving in the Pacific, translating Scripture, training local leaders, and helping establish churches." },
    "12-15": { year: 1512, text: "French scholar Jacques Lefèvre d'Étaples taught that people are made right with God by faith, helping prepare the way for reform." },
    "12-16": { year: 1873, text: "Missionary Robert A. Jaffray was born; he later planted churches, trained workers, and launched new missions across Asia." },
    "12-17": { year: 1836, text: "Pastor John Rippon responded to a painful church division with patience and grace, helping his congregation heal." },
    "12-18": { year: 1957, text: "Dorothy L. Sayers died after using detective stories, essays, plays, and radio dramas to explore Christian truth with imagination." },
    "12-19": { year: 1903, text: "Sundar Singh experienced a life-changing vision of Christ and became a widely traveled Indian Christian teacher." },
    "12-20": { year: 1560, text: "The first General Assembly of the Church of Scotland met to organize worship, leadership, education, and care for the poor." },
    "12-21": { year: 1870, text: "Black Methodists elected their first bishops while organizing the denomination now known as the Christian Methodist Episcopal Church." },
    "12-22": { year: 1838, text: "John and Hannah Hunt arrived in Fiji, where they served through preaching, education, medicine, and Bible translation." },
    "12-23": { year: 1531, text: "Heinrich Bullinger accepted the main preaching role in Zurich and guided the Reformed church there for more than forty years." },
    "12-24": { year: 1223, text: "Francis of Assisi arranged a living nativity scene to help ordinary families picture the humility of Jesus' birth." },
    "12-25": { year: 336, text: "The earliest surviving record of Christians celebrating Jesus' birth on December 25 comes from Rome." },
    "12-26": { year: 1790, text: "Sattyanadan Pillai was ordained as an early Indian Protestant pastor and missionary, serving Tamil-speaking communities." },
    "12-27": { year: 537, text: "Hagia Sophia was dedicated in Constantinople, becoming one of the most remarkable church buildings in history." },
    "12-28": { year: 1733, text: "Aaron was ordained as an early Indian Protestant minister, serving and teaching fellow Indians in their own language." },
    "12-29": { year: 1640, text: "Scientist Robert Boyle experienced a spiritual turning point and later used both his wealth and learning to support Bible translation and Christian missions." },
    "12-30": { year: 1944, text: "Corrie ten Boom was released from Ravensbrück concentration camp and later traveled widely teaching forgiveness and hope in Christ." },
    "12-31": { year: 1871, text: "George Leslie Mackay arrived in Taiwan, where he became a missionary, dentist, educator, and trainer of local Christian leaders." },
    // January
    "1-1": { year: 1519, text: "Ulrich Zwingli began preaching through the Bible in Zurich, helping ordinary people hear Scripture explained passage by passage." },
    "1-2": { year: 1792, text: "Hymnwriter Edward Perronet died; his best-known hymn, 'All Hail the Power of Jesus' Name,' continues to call worshipers to honor Christ." },
    "1-3": { year: 1853, text: "Presbyterians in Chicago publicly condemned slavery, reminding Christians that faith must oppose injustice." },
    "1-4": { year: 1934, text: "German church leaders resisted Nazi attempts to control Christian teaching and silence faithful pastors." },
    "1-5": { year: 1811, text: "Cyrus Hamlin was born; he later served as a missionary, educator, engineer, and founder of institutions in the Ottoman Empire." },
    "1-6": { year: 1493, text: "Swedish reformer Olaus Petri was born; he later preached the Reformation message and helped translate the Bible into Swedish." },
    "1-7": { year: 367, text: "Athanasius listed the same twenty-seven New Testament books Christians use today in his annual Easter letter." },
    "1-8": { year: 1958, text: "African Christians led by Ajuoga organized an independent church shaped by local leadership, worship, and evangelism." },
    "1-9": { year: 1885, text: "Samuel Brengle surrendered his ambitions to God and later became a beloved Salvation Army teacher on holiness and humble service." },
    "1-10": { year: 1915, text: "Mary Slessor died after decades of missionary work in Nigeria, where she protected children, settled disputes, and shared the gospel." },
    "1-11": { year: 1857, text: "Eli Smith died after years of missionary printing, language study, and important work toward an accurate Arabic Bible." },
    "1-12": { year: 1525, text: "Zurich leaders redirected former monastery resources to schools and care for the poor, putting church reform into practical action." },
    "1-13": { year: 1501, text: "The Czech Brethren printed one of the earliest known Protestant hymnbooks in a language other than Latin." },
    "1-14": { year: 1236, text: "Sava of Serbia died after organizing churches, promoting education, and helping establish a lasting Serbian Christian tradition." },
    "1-15": { year: 1868, text: "William Chalmers Burns died in China after years of revival preaching, missionary travel, and partnership with Chinese Christians." },
    "1-16": { year: 1756, text: "Isaac Backus experienced a spiritual conversion and later became a leading Baptist advocate for religious liberty in America." },
    "1-17": { year: 356, text: "Antony of Egypt died after a long life of prayer and simple living that inspired Christian communities for centuries." },
    "1-18": { year: 1815, text: "Constantin von Tischendorf was born; he later searched libraries and monasteries for ancient Bible manuscripts." },
    "1-19": { year: 1563, text: "The Heidelberg Catechism was published, teaching Christian faith through clear questions and answers for churches and families." },
    "1-20": { year: 1788, text: "Andrew Bryan purchased his freedom and became a pastor who helped establish an influential African American Baptist congregation." },
    "1-21": { year: 1525, text: "A small group in Zurich practiced believer's baptism, helping begin the Anabaptist movement and its emphasis on voluntary faith." },
    "1-22": { year: 1867, text: "Ambatonakanga Memorial Church opened in Madagascar, honoring Christians who had remained faithful during persecution." },
    "1-23": { year: 1890, text: "Joseph Hardy Neesima died after founding Doshisha, a Christian school that grew into a major university in Japan." },
    "1-24": { year: 1628, text: "Jonas Michaelius sailed for New Netherland and became the first minister of the Dutch Reformed congregation in what is now New York City." },
    "1-25": { year: 1964, text: "Missionary Ruth Hege survived a violent attack and continued trusting God while serving people in a difficult setting." },
    "1-26": { year: 1800, text: "Johann Gerhard Oncken was born; he later became a pioneer of Baptist churches and evangelism across continental Europe." },
    "1-27": { year: 1978, text: "Christian prisoners in Uganda testified to God's faithfulness, encouraging one another despite hardship and fear." },
    "1-28": { year: 1544, text: "Menno Simons published a defense of peaceful Anabaptist belief, emphasizing discipleship, holiness, and love for enemies." },
    "1-29": { year: 1523, text: "Ulrich Zwingli presented sixty-seven articles that summarized his call for church teaching to be tested by Scripture." },
    "1-30": { year: 1536, text: "Menno Simons publicly left the Roman Catholic priesthood and began guiding peaceful Anabaptist congregations." },
    "1-31": { year: 366, text: "Athanasius returned to Alexandria after exile, continuing his defense of historic Christian teaching about Jesus Christ." },
    // February
    "2-1": { year: 1822, text: "Mother Anne-Marie Javouhey sailed for Senegal, beginning new missionary and educational work in West Africa." },
    "2-2": { year: 1876, text: "John James Ransom arrived in Brazil, where he helped establish Methodist churches, schools, and Christian publishing." },
    "2-3": { year: 1943, text: "Four military chaplains gave away their life jackets as the troopship Dorchester sank, calmly helping others and praying together." },
    "2-4": { year: 1798, text: "Elizabeth Fry experienced a deep spiritual change that later inspired her pioneering work for prisoners and their families." },
    "2-5": { year: 1864, text: "Fanny Crosby wrote her first hymn verses for composer William Bradbury, beginning a partnership that produced many beloved songs." },
    "2-6": { year: 1812, text: "Adoniram Judson and four other missionaries were ordained before sailing as some of America's earliest foreign missionaries." },
    "2-7": { year: 1856, text: "Daniel Bliss arrived in Syria and began nearly fifty years of missionary, educational, and university work." },
    "2-8": { year: 1786, text: "Philip Quaque, one of the earliest ordained African Anglican ministers, spoke against the cruel treatment of enslaved Africans." },
    "2-9": { year: 1958, text: "Young pastor David Wilkerson chose to spend late-night television time in prayer, a decision that led him to serve troubled youth in New York City." },
    "2-10": { year: 1927, text: "John Sung experienced a powerful renewal of faith and became one of the most influential Chinese evangelists of the twentieth century." },
    "2-11": { year: 1680, text: "Princess Elizabeth of the Palatinate offered refuge and protection to persecuted Protestants, using her position to defend conscience." },
    "2-12": { year: 1915, text: "Fanny Crosby died after writing thousands of gospel hymns that helped generations sing about faith, assurance, and service." },
    "2-13": { year: 1626, text: "English Christian Giles Randall endured persecution while encouraging believers to seek a sincere, Christ-centered faith." },
    "2-14": { year: 869, text: "Cyril died after working with his brother Methodius to translate Christian teaching for Slavic peoples and develop a writing system." },
    "2-15": { year: 1621, text: "Christian composer Michael Praetorius died after creating sacred music and explaining the instruments and musical practices of his time." },
    "2-16": { year: 1497, text: "Philip Melanchthon was born; he later became a gifted teacher and wrote clear summaries of Lutheran theology." },
    "2-17": { year: 1821, text: "Missionary Levi Parsons arrived in Jerusalem, helping begin a lasting Protestant presence in the Holy Land." },
    "2-18": { year: 1678, text: "John Bunyan's Pilgrim's Progress was published, using an unforgettable adventure story to picture the Christian journey." },
    "2-19": { year: 441, text: "Mesrop Mashtots died after creating the Armenian alphabet and helping translate the Bible so his people could read Scripture." },
    "2-20": { year: 1895, text: "Frederick Douglass, an author and speaker who wrote about his escape from slavery and argued for its abolition, died." },
    "2-21": { year: 1945, text: "Eric Liddell died in a wartime prison camp after serving as a missionary, teacher, athlete, and caring leader to fellow prisoners." },
    "2-22": { year: 1906, text: "Meetings connected with the Azusa Street Revival began in Los Angeles, helping spread the modern Pentecostal movement around the world." },
    "2-23": { year: 1719, text: "Bartholomäus Ziegenbalg died after serving in India and translating the New Testament into Tamil." },
    "2-24": { year: 1873, text: "Japan removed its old public ban on Christianity, allowing believers greater freedom to worship and organize churches." },
    "2-25": { year: 1095, text: "Anselm became Archbishop of Canterbury and later wrote influential works that joined careful reasoning with deep Christian devotion." },
    "2-26": { year: 1915, text: "Frank Laubach began missionary service that eventually led to a simple literacy method used to teach millions of people to read." },
    "2-27": { year: 1838, text: "William J. Kirkpatrick was born; he later composed music for many gospel hymns sung in churches and evangelistic meetings." },
    "2-28": { year: 1797, text: "Mary Lyon was born; she later founded Mount Holyoke Female Seminary to give women a rigorous education and prepare many for Christian service." },
    // March
    "3-1": { year: 1543, text: "William Farel helped establish Protestant worship and Bible teaching in Geneva during the Reformation." },
    "3-2": { year: 1724, text: "Henry Venn was born; he later became a pastor, author, and leader in the evangelical revival within the Church of England." },
    "3-3": { year: 1870, text: "Lettie Burd Cowman was born; she later served as a missionary and wrote the devotional classic Streams in the Desert." },
    "3-4": { year: 1583, text: "Bernard Gilpin died after decades of preaching, educating poor children, and serving remote communities in northern England." },
    "3-5": { year: 1558, text: "Anabaptist printer Thomas von Imbroek remained faithful to his convictions under persecution, leaving writings that encouraged other believers." },
    "3-6": { year: 1831, text: "Friedrich von Bodelschwingh was born; he later built Christian communities that cared for people with disabilities, illness, and poverty." },
    "3-7": { year: 202, text: "Felicitas and other Christians in Carthage were remembered for courageously holding to their faith during Roman persecution." },
    "3-8": { year: 1698, text: "Thomas Bray organized libraries for poorly supplied pastors, helping Christian books and education reach distant communities." },
    "3-9": { year: 1915, text: "Armenian Christians faced terrible persecution, and their endurance became a lasting testimony to faith amid suffering." },
    "3-10": { year: 1913, text: "Harriet Tubman died after escaping slavery, rescuing many others, and serving courageously as a Christian abolitionist and nurse." },
    "3-11": { year: 1812, text: "A fire destroyed years of William Carey's translation work in India, but he and his coworkers patiently began rebuilding it." },
    "3-12": { year: 1663, text: "August Hermann Francke was born; he later founded schools, an orphanage, and ministries supported by prayer and generosity." },
    "3-13": { year: 483, text: "Pope Felix III defended what he believed to be faithful Christian teaching during a time of serious church division." },
    "3-14": { year: 1644, text: "Roger Williams received a charter for Rhode Island, where he promoted civil government alongside broad religious freedom." },
    "3-15": { year: 1411, text: "Jan Hus was excommunicated, yet he continued calling the church to reform and to place biblical truth above human power." },
    "3-16": { year: 1930, text: "H. A. Ironside preached his first sermon as pastor of Moody Memorial Church, beginning years of clear Bible teaching there." },
    "3-17": { year: 1737, text: "Boston held one of America's earliest recorded public celebrations honoring Patrick, the missionary associated with bringing Christianity to Ireland." },
    "3-18": { year: 1963, text: "Henrietta Mears died after influencing thousands of young people through Christian education, camps, publishing, and discipleship." },
    "3-19": { year: 1263, text: "Hugh of Saint-Cher died after helping produce an early Bible concordance that made words and passages easier to locate." },
    "3-20": { year: 1858, text: "Johannes Gossner died after training and sending ordinary Christian workers as missionaries to many parts of the world." },
    "3-21": { year: 1748, text: "John Newton cried to God during a dangerous storm, beginning the spiritual change that eventually shaped his ministry and the hymn 'Amazing Grace.'" },
    "3-22": { year: 1869, text: "Missionary Mary Rigg continued a life of Christian service marked by courage, teaching, and care for communities far from home." },
    "3-23": { year: 332, text: "Gregory the Illuminator died after helping establish Christianity in Armenia, one of the world's earliest Christian nations." },
    "3-24": { year: 1803, text: "Egerton Ryerson was born; he later served as a Methodist minister and helped build a broad public education system in Canada." },
    "3-25": { year: 1877, text: "Caroline Chisholm died after helping immigrant families in Australia find work, shelter, and safety." },
    "3-26": { year: 687, text: "Cuthbert of Lindisfarne died after a life of prayer, pastoral care, and missionary travel in northern England." },
    "3-27": { year: 718, text: "Rupert of Salzburg died after missionary work that helped establish churches and Christian communities along the Danube." },
    "3-28": { year: 1288, text: "Rabban Bar Sauma, a Christian monk from China, visited Rome during an extraordinary journey that connected Eastern and Western Christians." },
    "3-29": { year: 1824, text: "Hans Nielsen Hauge died after inspiring a Norwegian lay revival that encouraged Bible reading, preaching, honest work, and care for neighbors." },
    "3-30": { year: 1533, text: "Thomas Cranmer was consecrated Archbishop of Canterbury and later helped shape English worship and Bible-based reform." },
    "3-31": { year: 306, text: "Young Christian Apphianus was remembered for boldly opposing idol worship during a time of Roman persecution." },
    // April
    "4-1": { year: 1787, text: "Richard Allen and other Black Christians organized the Free African Society, offering mutual aid, worship, and practical care in Philadelphia." },
    "4-2": { year: 2007, text: "A widely discussed essay renewed public interest in teaching students about the Bible's enormous influence on history, literature, and culture." },
    "4-3": { year: 33, text: "Some scholars propose this as the date of Jesus Christ's crucifixion, the central event Christians remember as God's saving love displayed at the cross." },
    "4-4": { year: 1779, text: "Charles Simeon experienced a deep Christian conversion and later became a pastor who trained generations of faithful Bible teachers." },
    "4-5": { year: 1566, text: "Dutch nobles protested religious oppression, helping begin a movement for greater freedom of conscience in the Netherlands." },
    "4-6": { year: 1528, text: "Christian artist Albrecht Dürer died after creating prints and paintings that made biblical stories vivid for ordinary people." },
    "4-7": { year: 1927, text: "A season of prayer and spiritual renewal strengthened Lillian Trasher's orphanage ministry in Egypt." },
    "4-8": { year: 1943, text: "Missionary Mary Reed died after voluntarily spending decades serving people affected by leprosy in India." },
    "4-9": { year: 1557, text: "Mikael Agricola died after translating the New Testament into Finnish and helping establish written Finnish for schools and churches." },
    "4-10": { year: 1802, text: "Johann Peter Lange was born; he later became a pastor, theologian, and editor of a widely used Bible commentary." },
    "4-11": { year: 1833, text: "Rowland Hill died after decades of energetic evangelistic preaching and support for Sunday schools and vaccination." },
    "4-12": { year: 627, text: "Hilda of Whitby was baptized and later became an abbess who encouraged education, music, and the training of church leaders." },
    "4-13": { year: 1742, text: "Handel's Messiah received its first public performance in Dublin, raising money for charities and filling the hall with biblical music." },
    "4-14": { year: 966, text: "Mieszko I was baptized, a traditional milestone in the spread of Christianity and literacy in Poland." },
    "4-15": { year: 1862, text: "Lelia Naylor Morris was born; she later wrote more than a thousand hymns and gospel songs." },
    "4-16": { year: 1529, text: "French reformer Louis de Berquin refused to abandon his convictions, becoming remembered for courage under persecution." },
    "4-17": { year: 341, text: "Simeon of Seleucia and fellow Christians were remembered for remaining faithful during persecution in Persia." },
    "4-18": { year: 1870, text: "Isabella Thoburn began educational work in India that grew into an important Christian college for women." },
    "4-19": { year: 1012, text: "Archbishop Alphege died after refusing to let poor people be burdened with a huge ransom for his release." },
    "4-20": { year: 1529, text: "The name 'Protestant' came into wider use after princes at the Diet of Speyer protested restrictions on religious reform." },
    "4-21": { year: 1814, text: "Angela Burdett-Coutts was born; she later used her wealth to support schools, housing, churches, hospitals, and help for the poor." },
    "4-22": { year: 1723, text: "Johann Sebastian Bach was appointed to lead music at Leipzig's main churches, where he created many of his greatest sacred works." },
    "4-23": { year: 1822, text: "James Brainerd Taylor committed himself wholeheartedly to Christian ministry and became an earnest young evangelist." },
    "4-24": { year: 1875, text: "Samuel Tregelles died after carefully comparing ancient Bible manuscripts to help establish a more accurate Greek New Testament." },
    "4-25": { year: 1452, text: "Girolamo Savonarola was born; he later preached against corruption and called Florence to moral and spiritual reform." },
    "4-26": { year: 1564, text: "William Shakespeare was baptized; his plays would become filled with biblical language, moral questions, and themes familiar to Christian audiences." },
    "4-27": { year: 1667, text: "John Milton sold the publishing rights to Paradise Lost, his great poem about creation, temptation, sin, and redemption." },
    "4-28": { year: 1801, text: "Lord Shaftesbury was born; he later led Christian campaigns for safer factories, schools, housing, and protection of children." },
    "4-29": { year: 1380, text: "Catherine of Siena died after serving the sick, writing about faith, and working for peace and reform in the church." },
    "4-30": { year: 1822, text: "Hannibal Goodwin was born; the pastor-inventor later developed flexible photographic film while seeking better teaching tools." },
    // May
    "5-1": { year: 418, text: "Church leaders meeting in North Africa strongly taught that salvation begins with God's grace rather than being earned by human effort." },
    "5-2": { year: 1611, text: "The King James Bible was first published, giving generations of English readers a memorable and influential translation of Scripture." },
    "5-3": { year: 1891, text: "Missionary Friedrich Crämer died after years of Christian teaching and service among Native American communities." },
    "5-4": { year: 1873, text: "Father Damien arrived at Molokai, where he chose to live among and care for people who had been isolated because of leprosy." },
    "5-5": { year: 1861, text: "Frances Willard was baptized and later became a major Christian reformer advocating education, temperance, and greater opportunities for women." },
    "5-6": { year: 878, text: "King Alfred defeated a Viking army and later promoted Christian learning, law, and the translation of useful books into English." },
    "5-7": { year: 1253, text: "William of Rubruck began a remarkable missionary journey across Asia, meeting many cultures and reporting on Christian communities in the East." },
    "5-8": { year: 1604, text: "Jacobus Arminius presented teachings that shaped a major Protestant discussion about grace, human responsibility, and salvation." },
    "5-9": { year: 1687, text: "Matthew Henry entered pastoral ministry and later wrote a warm, practical Bible commentary used by families and preachers for centuries." },
    "5-10": { year: 601, text: "Comgall of Bangor died after founding a monastery that became a center of prayer, learning, and missionary training." },
    "5-11": { year: 1881, text: "Zenas Loftis was born; he later served as a missionary doctor and explorer in Tibet." },
    "5-12": { year: 1721, text: "Hans and Gertrude Egede sailed to begin missionary work in Greenland, learning the local language and serving Inuit communities." },
    "5-13": { year: 641, text: "Eligius became bishop of Noyon and used his gifts as a craftsman, teacher, and missionary to serve people in northern Europe." },
    "5-14": { year: 1888, text: "The Woman's Missionary Union was organized, with Annie Armstrong helping mobilize women and children for prayer, giving, and missions." },
    "5-15": { year: 1872, text: "Thomas Hastings died after a lifetime of composing hymns, training church musicians, and improving congregational singing." },
    "5-16": { year: 1835, text: "David Nasmith organized Christian city-mission work that inspired practical ministries to poor and neglected neighborhoods." },
    "5-17": { year: 1928, text: "John Flynn's Flying Doctor Service began in Australia, carrying medical help to families living far from hospitals." },
    "5-18": { year: 1843, text: "The Free Church of Scotland was formed by ministers and congregations who believed the church should be free from government control." },
    "5-19": { year: 804, text: "Alcuin of York died after helping renew Christian schools, libraries, handwriting, and scholarship across Charlemagne's empire." },
    "5-20": { year: 1867, text: "James and Jane Chalmers arrived in Rarotonga, beginning missionary service that emphasized learning local languages and training island Christians." },
    "5-21": { year: 1738, text: "Charles Wesley experienced a powerful assurance of faith and soon wrote hymns that helped the Methodist revival sing its message." },
    "5-22": { year: 1877, text: "Lionel Fletcher was born; he later became a well-known evangelist who preached across Britain and beyond." },
    "5-23": { year: 1618, text: "The Defenestration of Prague helped begin the Thirty Years' War, a sobering reminder that religious disagreement must never excuse violence." },
    "5-24": { year: 1861, text: "Mary Webb died after organizing women for missions and serving faithfully despite living with a serious disability." },
    "5-25": { year: 709, text: "Aldhelm died while traveling on a preaching journey after serving as a teacher, poet, bishop, and builder of churches." },
    "5-26": { year: 735, text: "The scholar Bede died after a lifetime of teaching, writing church history, and helping others understand Scripture." },
    "5-27": { year: 1676, text: "Paul Gerhardt died after writing hymns of trust and comfort that strengthened Christians through hardship and war." },
    "5-28": { year: 1611, text: "Martin Rinkart began pastoral service and later wrote 'Now Thank We All Our God' amid years of war, disease, and loss." },
    "5-29": { year: 1453, text: "After Constantinople fell, Christian scholars carried Greek manuscripts and learning westward, helping preserve important ancient texts." },
    "5-30": { year: 339, text: "Eusebius of Caesarea died after preserving documents and stories that became a foundational history of the early church." },
    "5-31": { year: 1700, text: "Alexander Cruden was born; he later created a detailed Bible concordance that helped readers find words and passages in Scripture." },
    // June
    "6-1": { year: 1909, text: "Rosa Young opened a school for Black children in rural Alabama and later helped establish many churches and schools across the region." },
    "6-2": { year: 1780, text: "Anti-Catholic Gordon Riots erupted in London, a tragic reminder that religious fear and prejudice can lead to terrible injustice." },
    "6-3": { year: 1894, text: "William Passavant died after founding hospitals, orphanages, schools, and deaconess ministries that joined Christian faith with compassionate service." },
    "6-4": { year: 1513, text: "Niels Hemmingsen was born; he later became an influential Lutheran teacher whose books were read across Europe." },
    "6-5": { year: 1908, text: "Fredrik Franson died after recruiting and training missionaries and encouraging Christians to carry the gospel across national boundaries." },
    "6-6": { year: 1844, text: "George Williams and other young workers founded the YMCA in London to support spiritual growth, friendship, education, and healthy living." },
    "6-7": { year: 1891, text: "Charles Spurgeon preached his final sermon after decades of clear gospel preaching, pastor training, publishing, and care for orphans." },
    "6-8": { year: 1981, text: "Martyn Lloyd-Jones died after a long ministry of Bible preaching that influenced pastors and churches around the world." },
    "6-9": { year: 1834, text: "William Carey died after translating Scripture, training Indian leaders, promoting education, and helping launch the modern missionary movement." },
    "6-10": { year: 1341, text: "A church council affirmed Gregory Palamas's teaching about prayer and knowing God, shaping Eastern Orthodox spirituality." },
    "6-11": { year: 1904, text: "Anna Stone died after serving in China as a Christian physician and helping women receive medical care and education." },
    "6-12": { year: 1773, text: "Phillis Wheatley's poems were approved for publication, making her the first African American woman to publish a book and displaying a faith shaped by Scripture." },
    "6-13": { year: 1812, text: "John Hunt was born; he later became a missionary in Fiji and helped translate the New Testament into Fijian." },
    "6-14": { year: 372, text: "Gregory of Nyssa became a bishop and later helped explain historic Christian teaching with unusual depth and imagination." },
    "6-15": { year: 822, text: "Eigil of Fulda died after serving as a monk, teacher, and biographer who preserved the story of his Christian community." },
    "6-16": { year: 1855, text: "William Booth and Catherine Mumford married, forming a remarkable ministry partnership that later gave rise to the Salvation Army." },
    "6-17": { year: 1722, text: "Moravian refugees settled at Herrnhut, a community that later became famous for prayer, unity, and worldwide missions." },
    "6-18": { year: 373, text: "Ephrem the Syrian died after teaching Christian truth through poems and hymns that earned him the title 'Harp of the Spirit.'" },
    "6-19": { year: 325, text: "The Council of Nicaea presented a creed affirming that Jesus Christ is truly divine, a confession still used by Christians worldwide." },
    "6-20": { year: 1779, text: "Dorothy Ann Thrupp was born; she later wrote hymns including 'Savior, Like a Shepherd Lead Us.'" },
    "6-21": { year: 1931, text: "Onesimos Nesib died after translating the Bible into Oromo and helping Ethiopian readers receive Scripture in their own language." },
    "6-22": { year: 1874, text: "Lydia Baxter died after writing gospel songs that encouraged believers to trust and speak about Jesus." },
    "6-23": { year: 679, text: "Etheldreda died after founding the Christian community at Ely, which became a center of worship and service." },
    "6-24": { year: 1687, text: "Johann Albrecht Bengel was born; he later became a careful New Testament scholar and a warm Christian teacher." },
    "6-25": { year: 1773, text: "Eliphalet Nott was born; he later served as a pastor, educator, and long-time college president who encouraged moral and practical learning." },
    "6-26": { year: 1977, text: "Tim Severin completed a voyage in a small leather boat to test whether the ancient missionary Brendan's Atlantic journey could have been possible." },
    "6-27": { year: 444, text: "Cyril of Alexandria died after becoming one of the early church's most influential teachers about the person of Jesus Christ." },
    "6-28": { year: 202, text: "Tradition remembers Irenaeus, a pastor and theologian who defended apostolic teaching and explained the unity of the Bible's story." },
    "6-29": { year: 67, text: "Christian tradition remembers the apostle Paul, whose missionary journeys and New Testament letters carried the gospel across the Roman world." },
    "6-30": { year: 1905, text: "A spiritual revival began at Pandita Ramabai's community for women in India, leading to prayer, repentance, and renewed Christian service." },
    // July
    "7-1": { year: 1798, text: "Mary Webb was baptized and later became a leading organizer who helped women and children support Christian missions around the world." },
    "7-2": { year: 1865, text: "William Booth preached in a tent in East London, beginning the mission that grew into the Salvation Army and served people in deep need." },
    "7-3": { year: 1721, text: "Hans Egede landed in Greenland with a missionary party and began learning the language and serving Inuit communities." },
    "7-4": { year: 1832, text: "The hymn 'America' was first sung publicly by children at Park Street Church in Boston." },
    "7-5": { year: 1835, text: "Richard Chenevix Trench entered Christian ministry and later became an influential Bible scholar, teacher, and writer about language." },
    "7-6": { year: 1813, text: "Granville Sharp died after helping win an important legal victory against slavery in England and supporting Bible scholarship." },
    "7-7": { year: 1873, text: "Lottie Moon was appointed as a missionary to China, where her service inspired generations to pray and give for missions." },
    "7-8": { year: 1663, text: "Rhode Island received a royal charter protecting religious freedom even when neighbors held different beliefs." },
    "7-9": { year: 1737, text: "Moravian missionary Georg Schmidt arrived in South Africa and taught Khoikhoi neighbors to read while sharing the Christian faith." },
    "7-10": { year: 1888, text: "Toyohiko Kagawa was born; he later lived among poor families in Japan and served them through evangelism, education, cooperatives, and peace work." },
    "7-11": { year: 1924, text: "Eric Liddell won the Olympic 400-meter race after refusing to compete on Sunday, acting according to his conscience." },
    "7-12": { year: 1941, text: "After prayer, Bakht Singh and his coworkers founded an Indian-led church in Madras that helped multiply local congregations across Asia." },
    "7-13": { year: 1813, text: "Adoniram and Ann Judson arrived in Rangoon, beginning years of missionary service and the translation of the Bible into Burmese." },
    "7-14": { year: 1857, text: "Ting Ang was baptized as the first Methodist convert in China and became part of a growing local Christian witness." },
    "7-15": { year: 1852, text: "Hawaiian Christians sailed as missionaries to the Caroline Islands, eager to share the faith that had transformed their own communities." },
    "7-16": { year: 1581, text: "Jesuit missionary Edmund Campion was captured after secretly serving English Catholics during a time of persecution." },
    "7-17": { year: 180, text: "Twelve Christians at Scilli in North Africa courageously refused emperor worship and remained faithful to Christ." },
    "7-18": { year: 1504, text: "Heinrich Bullinger was born; he later guided the church in Zurich and wrote extensively to teach and encourage Christians across Europe." },
    "7-19": { year: 1799, text: "The Rosetta Stone was discovered, eventually allowing scholars such as Champollion to read ancient Egyptian writing and better understand the biblical world." },
    "7-20": { year: 1727, text: "Jonathan Edwards and Sarah Pierpont married and built a home remembered for faith, learning, hospitality, and affection." },
    "7-21": { year: 1648, text: "The New England Company was organized to support education and Christian mission among Native American communities." },
    "7-22": { year: 601, text: "Mellitus and fellow missionaries likely left Rome for England, carrying supplies and letters to strengthen the young English church." },
    "7-23": { year: 1764, text: "Revival preacher Gilbert Tennent died after calling many listeners during the Great Awakening to sincere faith and holy living." },
    "7-24": { year: 1874, text: "Oswald Chambers was born; his teaching was later gathered into My Utmost for His Highest, one of the world's best-known devotionals." },
    "7-25": { year: 1843, text: "William H. Brett was ordained and later translated the New Testament into Arawak and other languages of Guiana." },
    "7-26": { year: 1833, text: "Friends told the dying William Wilberforce that Parliament had voted to abolish slavery throughout most of the British Empire." },
    "7-27": { year: 916, text: "Clement of Ohrid died after teaching Christian faith, training leaders, and advancing literacy among Slavic peoples." },
    "7-28": { year: 1881, text: "J. Gresham Machen was born; he later became a New Testament scholar and defender of historic Christian belief." },
    "7-29": { year: 1685, text: "Quaker leader Robert Barclay asked that prisoners of conscience be allowed to leave the country rather than remain jailed for their beliefs." },
    "7-30": { year: 1922, text: "G. K. Chesterton was received into the Roman Catholic Church and continued writing imaginative defenses of Christian faith." },
    "7-31": { year: 1556, text: "Ignatius of Loyola died after founding the Society of Jesus, whose schools and missionaries served across the world." }
};

},
"renderer/js/admin/cloud-activity-colors.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cardColor = void 0;
exports.activityAccent = activityAccent;
// Keep parent activity accents consistent with the built-in student cards.
const activityColors = {
    'app://audiobooks': '#fb923c', 'app://music': '#c084fc', 'app://videos': '#fbbf24',
    'app://writing': '#ec4899', 'app://word-processor': '#ec4899', 'app://journal': '#ec4899', 'app://notebook': '#ec4899',
    'app://reading': '#22c55e', 'app://typing': '#38bdf8', 'app://logic': '#a78bfa', 'app://words': '#f472b6',
    'app://spelling': '#f97316', 'app://vocabulary': '#70cbb5', 'app://poems': '#f7c948',
    'app://quizzes': '#818cf8', 'app://worksheets': '#38bdf8', 'app://geography': '#22c55e',
    'app://learning-videos': '#22d3ee', 'app://spanish': '#fb923c', 'app://coloring': '#f472b6',
    'app://coloring-studio': '#34d399', 'app://piano': '#a78bfa', 'app://math-coach': '#38bdf8', 'app://long-division': '#34d399', 'app://games': '#f7c948'
};
const cardColor = subject => /^#[\da-f]{3,8}$/i.test(subject.color || '') ? subject.color : '#38bdf8';
exports.cardColor = cardColor;
function activityAccent(subject) {
    const color = (0, exports.cardColor)(subject);
    return color.toLowerCase() === '#38bdf8' ? activityColors[subject.url] || color : color;
}

},
"renderer/js/shared/student-theme-dialog.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showStudentThemeDialog = showStudentThemeDialog;
const student_markup_js_1 = require("renderer/js/shared/student-markup.js");
function showStudentThemeDialog({ state, applyStudentTheme, saveTheme, onError }) {
    document.getElementById('student-settings-modal')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'student-settings-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Customize Your Desk');
    const originalStudentId = state.currentStudent?.id;
    const previousFocus = document.activeElement;
    let saving = false;
    overlay.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
    z-index: 10000; display: flex; align-items: center; justify-content: center;
    animation: fadeIn 0.2s ease-out;
  `;
    const modal = document.createElement('div');
    modal.className = 'theme-picker-card';
    modal.style.cssText = `
    background: var(--bg-secondary); border: 1px solid var(--border-glass);
    border-radius: var(--radius-xl); padding: 30px; width: 720px; max-width: 92%;
    max-height: 90vh; overflow-y: auto;
    box-shadow: var(--shadow-float);
  `;
    (0, student_markup_js_1.setStudentMarkup)(modal, `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <h2 style="margin:0; font-size:1.5rem; color:var(--text-primary);">Customize Your Desk</h2>
      <button id="close-settings" aria-label="Close theme chooser" style="background:none; border:none; color:var(--text-muted); cursor:pointer;">
        <i data-lucide="x" style="width:24px;height:24px;"></i>
      </button>
    </div>
    <p style="color:var(--text-secondary); margin-bottom:20px;">Choose a complete desk style. Hover to preview the whole room, then click to keep it.</p>
    <div id="theme-grid" style="display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:16px; margin-bottom:8px;">
    </div>
    <p id="theme-save-status" role="status"></p>
  `);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    if (window.lucide)
        window.lucide.createIcons({ root: overlay });
    const originalTheme = state.dashboardData?.student?.theme || state.currentStudent?.theme || 'default';
    const closeWithoutSaving = () => {
        if (saving)
            return;
        applyStudentTheme(originalTheme);
        overlay.remove();
        previousFocus?.focus();
    };
    document.getElementById('close-settings').onclick = closeWithoutSaving;
    overlay.addEventListener('click', event => {
        if (event.target === overlay)
            closeWithoutSaving();
    });
    overlay.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeWithoutSaving();
        }
        if (event.key !== 'Tab')
            return;
        const buttons = [...overlay.querySelectorAll('button:not(:disabled)')];
        const first = buttons[0], last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
        }
    });
    const themes = [
        { id: 'default', name: 'Midnight Studio', icon: '🌙', color: '#38bdf8', description: 'Cool glass, blueprints, and calm night colors', preview: 'radial-gradient(circle at 20% 15%,#38bdf8 0 3%,transparent 25%),linear-gradient(145deg,#07111f,#102d48)' },
        { id: 'pink', name: 'Candy Pop', icon: '🍭', color: '#db2777', description: 'Bright paper, rounded cards, and playful dots', preview: 'radial-gradient(circle,#db2777 0 4%,transparent 5%) 0 0/20px 20px,#fff2f7' },
        { id: 'teal', name: 'Ocean Lab', icon: '🌊', color: '#2dd4bf', description: 'Deep water, glowing aqua, and rolling waves', preview: 'radial-gradient(ellipse at 50% 110%,#2dd4bf 0 18%,transparent 19%),linear-gradient(160deg,#032d3a,#08677a)' },
        { id: 'dark-green', name: 'Forest Cabin', icon: '🌲', color: '#84cc16', description: 'Woodland greens, sturdy panels, and warm gold', preview: 'repeating-linear-gradient(92deg,rgba(255,255,255,.05) 0 2px,transparent 2px 13px),linear-gradient(145deg,#13251a,#355d3e)' },
        { id: 'orange', name: 'Sunset Arcade', icon: '🕹️', color: '#f97316', description: 'Sharp neon panels with orange and hot pink', preview: 'linear-gradient(30deg,rgba(250,204,21,.22) 12%,transparent 13% 87%,rgba(249,115,22,.25) 88%),linear-gradient(145deg,#1b1028,#5b1d52)' },
        { id: 'purple', name: 'Cosmic Station', icon: '🪐', color: '#a855f7', description: 'Star fields, violet glass, and galaxy glow', preview: 'radial-gradient(circle,#fff 0 1px,transparent 1.5px) 0 0/24px 24px,radial-gradient(circle at 25% 30%,#7e22ce,transparent 38%),#090619' },
        { id: 'aurora', name: 'Aurora Drift', icon: '🌌', color: '#22d3ee', description: 'Icy lights, glassy borders, and a northern glow', preview: 'radial-gradient(circle at 20% 10%,#67e8f9 0 12%,transparent 13%),radial-gradient(circle at 80% 90%,#38bdf8 0 8%,transparent 9%),linear-gradient(155deg,#021827,#092c45)' },
        { id: 'crimson', name: 'Crimson Forge', icon: '🔥', color: '#ef4444', description: 'Bold red accents on warm, moody studio panels', preview: 'linear-gradient(30deg,rgba(248,113,113,.24) 12%,transparent 13% 87%,rgba(251,191,36,.24) 88%),linear-gradient(145deg,#22070f,#4d101b)' },
        { id: 'sunset-gold', name: 'Sunset Gold', icon: '🌅', color: '#f59e0b', description: 'Soft apricot dusk with golden sunshine highlights', preview: 'radial-gradient(circle at 18% 12%,#fbbf24 0 15%,transparent 16%),radial-gradient(circle at 85% 85%,#f97316 0 12%,transparent 13%),linear-gradient(155deg,#31110b,#7a2505)' }
    ];
    const grid = document.getElementById('theme-grid');
    themes.forEach(t => {
        const btn = document.createElement('button');
        const isActive = originalTheme === t.id;
        btn.className = `theme-choice${isActive ? ' active' : ''}`;
        btn.style.cssText = `
      --choice-color:${t.color}; background:var(--theme-surface); border:1px solid ${isActive ? t.color : 'var(--theme-border)'};
      border-radius:16px; padding:0; cursor:pointer; color:var(--theme-text);
      display:flex; flex-direction:column; transition:all .2s;
    `;
        btn.dataset.theme = t.id;
        (0, student_markup_js_1.setStudentMarkup)(btn, `
      <div style="height:72px;width:100%;background:${t.preview};position:relative;border-bottom:1px solid rgba(127,127,127,.2);">
        <span style="position:absolute;right:10px;top:9px;font-size:25px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.25));">${t.icon}</span>
        <div style="position:absolute;left:10px;right:44px;bottom:10px;display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:5px;">
          <span style="height:18px;background:${t.color};border-radius:5px;opacity:.9;"></span>
          <span style="height:18px;background:rgba(255,255,255,.55);border-radius:5px;"></span>
          <span style="height:18px;background:rgba(255,255,255,.28);border-radius:5px;"></span>
        </div>
      </div>
      <span style="padding:11px 12px 2px;font-weight:800;font-size:.9rem;width:100%;color:var(--theme-text);">${isActive ? '✓ ' : ''}${t.name}</span>
      <span style="padding:0 12px 12px;font-size:.68rem;line-height:1.35;color:var(--theme-text-secondary);width:100%;">${t.description}</span>
    `);
        btn.addEventListener('mouseenter', () => applyStudentTheme(t.id));
        btn.addEventListener('mouseleave', () => {
            if (overlay.isConnected)
                applyStudentTheme(originalTheme);
        });
        btn.onclick = async () => {
            if (saving)
                return;
            saving = true;
            overlay.querySelectorAll('button').forEach(button => { button.disabled = true; });
            document.getElementById('theme-save-status').textContent = 'Saving your desk…';
            try {
                await saveTheme(t.id);
                if (!overlay.isConnected || state.currentStudent?.id !== originalStudentId)
                    return;
                state.dashboardData.student.theme = t.id;
                state.currentStudent.theme = t.id;
                applyStudentTheme(t.id);
                overlay.remove();
                previousFocus?.focus();
                // Notify other windows/iframes if necessary
                window.postMessage({ type: 'THEME_CHANGED', theme: t.id }, '*');
            }
            catch (err) {
                if (!overlay.isConnected || state.currentStudent?.id !== originalStudentId)
                    return;
                applyStudentTheme(originalTheme);
                onError?.(err);
                document.getElementById('theme-save-status').textContent = 'Could not save your theme. Reconnect and try again.';
            }
            finally {
                saving = false;
                overlay.querySelectorAll('button').forEach(button => { button.disabled = false; });
            }
        };
        grid.appendChild(btn);
    });
    document.getElementById('close-settings').focus();
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
"renderer/js/cloud-student-daily.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountCloudDailyQuestions = mountCloudDailyQuestions;
// Keep the original verse/riddle DOM, option layout and answer feedback.
function mountCloudDailyQuestions({ api, preview = false }) {
    const el = id => document.getElementById(id), node = (tag, text = '') => { const value = document.createElement(tag); value.textContent = text; return value; };
    const bar = node('div'), status = node('p'), refreshButton = node('button', 'Refresh daily questions'), retryButton = node('button', 'Retry saved answer'), discardButton = node('button', 'Discard local retry…');
    bar.className = 'daily-cloud-sync';
    bar.id = 'daily-question-sync';
    status.setAttribute('role', 'status');
    bar.append(status, refreshButton, retryButton, discardButton);
    el('verse-widget').append(bar);
    let studentId = null, generation = 0, busy = false, pending = null, data = null, verseOffset = 0, dayKey = null, localDay = null, visible = false, featureKey = null;
    let dayFormatter, timeZone;
    const setControl = (button, property, value) => { if (button[property] !== value)
        button[property] = value; };
    const current = (who, epoch) => who === studentId && epoch === generation;
    function controls() {
        for (const button of [...el('verse-options').querySelectorAll('button'), ...el('riddle-options').querySelectorAll('button')])
            setControl(button, 'disabled', !studentId || busy || !!pending || button.dataset.answered === 'true' || button.dataset.canAnswer !== 'true');
        for (const button of [retryButton, discardButton])
            setControl(button, 'hidden', !pending);
        for (const button of [retryButton, discardButton, refreshButton])
            setControl(button, 'disabled', busy || !studentId);
        setControl(el('verse-prev'), 'disabled', busy || !studentId || verseOffset <= -366);
        setControl(el('verse-next'), 'disabled', busy || !studentId || verseOffset >= 0);
    }
    function reset() {
        pending = data = null;
        verseOffset = 0;
        dayKey = null;
        for (const kind of ['verse', 'riddle']) {
            el(`${kind}-widget`).style.display = 'flex';
            el(`${kind}-text`).textContent = 'Connect to load today’s question.';
            el(`${kind}-options`).replaceChildren();
            el(`${kind}-reward-msg`).style.display = 'none';
        }
        el('verse-ref').textContent = '';
        el('verse-question-container').style.display = 'none';
        status.textContent = '';
        controls();
    }
    function renderQuestion(record) {
        const kind = record.kind, answer = record.answer, container = el(`${kind}-options`), reward = el(`${kind}-reward-msg`);
        el(`${kind}-text`).textContent = `“${record.text}”`;
        el(`${kind}-widget`).style.display = 'flex';
        container.replaceChildren();
        if (kind === 'verse') {
            el('verse-ref').textContent = record.reference;
            el('verse-question').textContent = record.question;
            el('verse-question-container').style.display = verseOffset === 0 ? 'block' : 'none';
        }
        for (const [index, text] of record.options.entries()) {
            const button = node('button', text);
            button.className = `daily-answer-option ${kind}`;
            button.dataset.canAnswer = String(record.canAnswer);
            button.dataset.answered = String(!!answer);
            if (answer) {
                if (index === answer.correctIndex) {
                    button.classList.add('correct');
                    button.textContent = `✓ ${text}`;
                }
                else if (index === answer.selectedIndex) {
                    button.classList.add('incorrect');
                    button.textContent = `✕ ${text}`;
                }
            }
            else if (pending?.questionId === record.id && pending.selectedIndex === index)
                button.classList.add('pending');
            button.addEventListener('click', () => void submit(record, index));
            container.append(button);
        }
        reward.style.display = answer ? 'flex' : 'none';
        reward.classList.toggle('daily-wrong', !!answer && !answer.correct);
        if (record.origin === 'legacy') {
            reward.classList.remove('daily-wrong');
            (kind === 'verse' ? el('verse-reward-text') : reward).textContent = `Original Admin record · ${answer.coins} coins recorded previously. No new coins were added.`;
            return;
        }
        if (answer) {
            const text = preview ? (answer.correct ? 'Correct! Test answer only; no coins awarded.' : `The correct answer was: ${record.options[answer.correctIndex]}.`) : answer.correct ? `Correct! You earned ${answer.coins} coins${answer.streakBonus ? ` (+${answer.streakBonus} streak bonus)` : ''}.` : `The correct answer was: ${record.options[answer.correctIndex]}.`;
            (kind === 'verse' ? el('verse-reward-text') : reward).textContent = `${text}${kind === 'riddle' && answer.explanation ? ` — ${answer.explanation}` : ''}`;
        }
    }
    function render() { for (const record of data?.questions || [])
        renderQuestion(record); controls(); }
    async function load() {
        if (!studentId || busy || !visible)
            return;
        const who = studentId, epoch = generation, offset = verseOffset;
        busy = true;
        controls();
        try {
            const saved = await api.dailyQuestions('pending', { studentId: who });
            if (!current(who, epoch))
                return;
            pending = saved;
            controls();
            const value = await api.dailyQuestions('list', { studentId: who, verseOffset: offset });
            if (!current(who, epoch))
                return;
            pending = saved;
            data = value;
            dayKey = `${who}:${value.date}`;
            render();
            status.textContent = pending ? 'An answer is saved on this computer. Retry it before answering another question.' : preview ? 'Try today’s questions. Test answers do not earn coins.' : 'Answer today’s questions to earn coins.';
        }
        catch (error) {
            if (current(who, epoch)) {
                status.textContent = error.message;
                data = null;
                for (const kind of ['verse', 'riddle'])
                    el(`${kind}-options`).replaceChildren();
            }
        }
        finally {
            busy = false;
            controls();
            if (!current(who, epoch) && studentId && visible)
                void load();
        }
    }
    async function submit(record, selectedIndex) {
        if (!studentId || busy || pending || !record.canAnswer || !visible)
            return;
        const who = studentId, epoch = generation;
        busy = true;
        controls();
        status.textContent = 'Saving your answer…';
        try {
            const value = await api.dailyQuestions('command', { studentId: who, questionId: record.id, selectedIndex });
            if (!current(who, epoch))
                return;
            data.questions = data.questions.map(question => question.id === record.id ? value.question : question);
            pending = null;
            render();
            status.textContent = preview ? 'Test answer saved only in this preview.' : 'Your answer and reward are saved in the cloud.';
        }
        catch (error) {
            if (current(who, epoch)) {
                try {
                    const saved = await api.dailyQuestions('pending', { studentId: who });
                    if (current(who, epoch))
                        pending = saved;
                }
                catch { /* The main process retains the original queue. */ }
                if (current(who, epoch)) {
                    status.textContent = error.message;
                    render();
                }
            }
        }
        finally {
            busy = false;
            controls();
            if (!current(who, epoch) && studentId && visible)
                void load();
        }
    }
    async function resolve(kind) {
        if (!studentId || busy || !pending)
            return;
        if (kind === 'discard' && !window.confirm('Discard the saved retry? An answer already received by the cloud and its coins stay in history. An unsent answer will be lost.'))
            return;
        const who = studentId, epoch = generation, id = pending.id;
        busy = true;
        controls();
        try {
            await api.dailyQuestions(kind, { studentId: who, id });
            if (current(who, epoch))
                pending = null;
        }
        catch (error) {
            if (current(who, epoch))
                status.textContent = error.message;
        }
        finally {
            busy = false;
            controls();
        }
        if (studentId && visible && (!current(who, epoch) || !pending))
            await load();
    }
    refreshButton.addEventListener('click', load);
    retryButton.addEventListener('click', () => void resolve('retry'));
    discardButton.addEventListener('click', () => void resolve('discard'));
    for (const [id, delta] of [['verse-prev', -1], ['verse-next', 1]])
        el(id).addEventListener('click', () => { if (busy || !studentId)
            return; verseOffset = Math.max(-366, Math.min(0, verseOffset + delta)); generation++; void load(); });
    window.addEventListener('cloud-student-status', event => {
        const school = event.detail.school, next = school?.canUseLearningVideos && !school.locked ? school.student?.id || null : null;
        const enabled = { verse: school?.features?.verse !== false, riddle: school?.features?.riddle !== false };
        const key = JSON.stringify(enabled);
        if (key !== featureKey) {
            featureKey = key;
            generation++;
            reset();
        }
        for (const kind of ['verse', 'riddle'])
            setControl(el(`${kind}-widget`), 'hidden', !enabled[kind]);
        const barParent = enabled.verse ? el('verse-widget') : el('riddle-widget');
        if (bar.parentElement !== barParent)
            barParent.append(bar);
        setControl(bar, 'hidden', !enabled.verse && !enabled.riddle);
        if (studentId !== next) {
            studentId = next;
            generation++;
            reset();
        }
        const nextTimeZone = school?.timeZone || 'America/Chicago';
        if (timeZone !== nextTimeZone) {
            timeZone = nextTimeZone;
            dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
        }
        localDay = dayFormatter.format(new Date());
        if (studentId && visible && dayKey !== `${studentId}:${localDay}`)
            void load();
        controls();
    });
    window.addEventListener('cloud-student-surface', event => {
        const nextVisible = event.detail === 'dashboard-screen';
        if (visible === nextVisible)
            return;
        visible = nextVisible;
        if (visible && studentId)
            void load();
    });
    reset();
}

},
"renderer/js/cloud-student-reading.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountCloudReading = mountCloudReading;
/* global document, window, crypto */
const BOOK_EMOJIS = ['📖', '📚', '🔖', '🦁', '🐉', '🚀', '🌊', '🏰', '✝️', '🎶', '🌿', '🦋', '⚔️', '🔮', '🌙', '⭐', '🎯', '🦊', '🐬', '🌸'];
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
function mountCloudReading({ api }) {
    const root = document.getElementById('student-reading-panel');
    if (!root)
        return;
    const el = id => document.getElementById(`reading-${id}`);
    let studentId = null, generation = 0, books = [], activeBook = null, pending = null, busy = false, confirmResolver = null;
    const visible = () => !root.hidden && !root.inert;
    function closeModals() {
        for (const id of ['add-modal', 'log-modal', 'confirm-modal'])
            el(id).style.display = 'none';
        activeBook = null;
        if (confirmResolver) {
            confirmResolver(false);
            confirmResolver = null;
        }
    }
    function reset() {
        closeModals();
        books = [];
        pending = null;
        for (const id of ['stats-bar', 'reading-grid', 'finished-grid', 'status', 'wallet', 'pending-description'])
            el(id).replaceChildren();
        for (const field of root.querySelectorAll('input'))
            field.value = '';
        el('pending').hidden = true;
        el('header-sub').textContent = 'Refresh your bookshelf.';
    }
    function controls() {
        for (const button of root.querySelectorAll('button')) {
            if (button.hasAttribute('data-student-home'))
                continue;
            button.disabled = busy || !studentId || !!pending && !['retry', 'discard', 'closeModals', 'confirmResolve'].includes(button.dataset.readingAction) && button.id !== 'reading-refresh';
        }
    }
    function renderShelf() {
        const reading = books.filter(book => book.status === 'reading'), finished = books.filter(book => book.status === 'finished');
        const active = reading.concat(books.filter(book => book.status === 'paused'));
        const pages = books.reduce((sum, book) => sum + book.pages_read, 0);
        el('stats-bar').innerHTML = [[reading.length, 'Reading Now', '📖'], [finished.length, 'Finished', '✅'], [pages.toLocaleString(), 'Total Pages Read', '📄']]
            .map(([count, label, emoji]) => `<div class="stat-pill">${emoji} <strong>${esc(count)}</strong><span>${label}</span></div>`).join('');
        el('header-sub').textContent = books.length ? `${books.length} book${books.length === 1 ? '' : 's'} in your library` : 'Start your bookshelf below!';
        function card(book) {
            const badge = book.status === 'finished' ? '✅ Finished' : book.status === 'paused' ? '⏸ Paused' : '📖 Reading';
            const percent = book.total_pages > 0 ? Math.min(100, Math.round(book.pages_read / book.total_pages * 100)) : null;
            const action = (name, label, style = '') => `<button class="card-btn ${style}" data-reading-action="${name}" data-book="${esc(book.id)}">${label}</button>`;
            return `<div class="book-card ${esc(book.status)}"><div class="book-cover-row"><div class="book-emoji">${esc(book.emoji || '📖')}</div><div class="book-meta"><div class="book-title">${esc(book.title)}</div><div class="book-author">${esc(book.author || '—')}</div><span class="book-status-badge badge-${esc(book.status)}">${badge}</span></div></div>` +
                (percent === null ? `<div class="progress-count">${book.pages_read} pages read</div>` : `<div class="progress-row"><div class="progress-labels"><span>${book.pages_read} pages read</span><span>${percent}%</span></div><div class="progress-track"><div class="progress-fill ${percent >= 100 ? 'done' : ''}" data-percent="${percent}"></div></div></div>`) +
                `<div class="card-actions">${book.status === 'finished' ? '' : action('openLogReading', '+ Log Pages', 'primary') + action('markFinished', '🏁 Done')}${action('deleteBook', '🗑', 'danger')}</div></div>`;
        }
        el('reading-grid').innerHTML = active.length ? active.map(card).join('') : '<div class="empty-state"><div class="empty-icon">📖</div><div class="empty-title">No books yet!</div><div class="empty-sub">Click <strong>+ Add Book</strong> to start tracking your reading.</div></div>';
        el('finished-grid').innerHTML = finished.map(card).join('');
        el('reading-section').style.display = 'block';
        el('finished-section').style.display = finished.length ? 'block' : 'none';
        for (const bar of root.querySelectorAll('[data-percent]'))
            bar.style.width = `${bar.dataset.percent}%`;
    }
    async function refreshPending(who, epoch) {
        const result = await api.reading('pending', { studentId: who });
        if (studentId !== who || generation !== epoch)
            return;
        pending = result;
        el('pending').hidden = !result;
        el('pending-description').textContent = result ? `Saved on this computer, awaiting confirmation: ${result.kind}${result.title ? ` — ${result.title}` : ''}${result.pages ? ` — ${result.pages} pages` : ''}${result.note ? ` — ${result.note}` : ''}.` : '';
    }
    async function refresh(who, epoch) {
        let result;
        try {
            result = await api.reading('list', { studentId: who });
        }
        catch (error) {
            if (studentId === who && generation === epoch) {
                books = [];
                el('reading-grid').replaceChildren();
                el('finished-grid').replaceChildren();
                el('stats-bar').replaceChildren();
                el('wallet').textContent = '';
            }
            throw error;
        }
        if (studentId !== who || generation !== epoch)
            return;
        books = result.books;
        renderShelf();
        const wallet = result.wallet;
        el('wallet').textContent = `🪙 ${wallet.balance} coins · ${wallet.totalEarned} earned in total`;
        el('status').textContent = 'Shelf saved in your family’s cloud account. Earlier LAN reading history has not been transferred.';
    }
    async function run(action) {
        if (busy || !studentId || !visible())
            return;
        const who = studentId, epoch = generation;
        busy = true;
        controls();
        try {
            await action(who, epoch);
        }
        catch (error) {
            if (who === studentId && epoch === generation)
                el('status').textContent = error.message || 'Reading could not finish saving. Retry the saved change.';
        }
        finally {
            try {
                if (who === studentId && epoch === generation)
                    await refreshPending(who, epoch);
            }
            catch (_) { /* Preserve the existing notice when local storage is unavailable. */ }
            busy = false;
            controls();
        }
    }
    async function change(who, epoch, command) {
        const result = await api.reading('command', { ...command, studentId: who });
        if (studentId !== who || generation !== epoch)
            return;
        closeModals();
        await refresh(who, epoch);
        if (studentId === who && generation === epoch && result.completionBonus)
            el('status').textContent = `🎉 You finished the book! +${result.completionBonus} coins saved.`;
    }
    function confirm(title, message, label) {
        el('confirm-title').textContent = title;
        el('confirm-msg').textContent = message;
        el('confirm-ok-btn').textContent = label;
        el('confirm-modal').style.display = 'flex';
        return new Promise(resolve => { confirmResolver = resolve; });
    }
    const actions = {
        openAddBook() {
            for (const id of ['add-title', 'add-author', 'add-pages'])
                el(id).value = '';
            el('add-emoji').value = '📖';
            el('add-emoji-picker').innerHTML = BOOK_EMOJIS.map(emoji => `<button type="button" class="emoji-opt ${emoji === '📖' ? 'selected' : ''}" data-reading-action="pickEmoji" data-emoji="${emoji}">${emoji}</button>`).join('');
            el('add-modal').style.display = 'flex';
            el('add-title').focus();
        },
        pickEmoji(button) {
            el('add-emoji').value = button.dataset.emoji;
            for (const item of root.querySelectorAll('.emoji-opt'))
                item.classList.toggle('selected', item === button);
        },
        closeModals,
        confirmResolve(button) {
            const resolve = confirmResolver;
            confirmResolver = null;
            el('confirm-modal').style.display = 'none';
            resolve?.(button.dataset.value === 'true');
        },
        saveBook() {
            if (!el('add-title').value.trim()) {
                el('add-title').focus();
                return;
            }
            const command = { kind: 'add', bookId: crypto.randomUUID(), title: el('add-title').value.trim(), author: el('add-author').value.trim(), emoji: el('add-emoji').value.trim() || '📖', totalPages: Number(el('add-pages').value || 0) };
            if (!Number.isInteger(command.totalPages) || command.totalPages < 0 || command.totalPages > 100000) {
                el('add-pages').focus();
                return;
            }
            return run((who, epoch) => change(who, epoch, command));
        },
        openLogReading(button) {
            activeBook = books.find(book => book.id === button.dataset.book);
            if (!activeBook)
                return;
            el('log-modal-title').textContent = `📖 Log Reading — ${activeBook.title}`;
            el('log-pages').value = '';
            el('log-note').value = '';
            el('log-modal').style.display = 'flex';
            el('log-pages').focus();
        },
        saveSession() {
            const pages = Number(el('log-pages').value);
            if (!activeBook || !Number.isInteger(pages) || pages < 1 || pages > 100000) {
                el('log-pages').focus();
                return;
            }
            const command = { kind: 'session', bookId: activeBook.id, revision: activeBook.revision, pages, note: el('log-note').value.trim() };
            return run((who, epoch) => change(who, epoch, command));
        },
        async markFinished(button) { await confirmedBookChange(button, 'finish', 'Mark as Finished?', 'Finish this book? Its first completion earns 10 coins.', '🏁 Mark Done!'); },
        async deleteBook(button) { await confirmedBookChange(button, 'remove', 'Remove Book?', 'Remove this book from your shelf? Its saved reading sessions and coin records will be retained.', '🗑 Remove'); },
        retry() {
            return run(async (who, epoch) => {
                await api.reading('retry', { studentId: who });
                if (studentId !== who || generation !== epoch)
                    return;
                closeModals();
                await refresh(who, epoch);
            });
        },
        async discard() {
            const record = pending, who = studentId, epoch = generation;
            if (!record || !await confirm('Discard saved change?', 'Refresh and check your shelf first: a lost reply may mean this change is already saved online. Discarding removes only this computer’s retry copy.', 'Discard retry copy'))
                return;
            if (who !== studentId || epoch !== generation)
                return;
            return run(async () => { await api.reading('discard', { studentId: who, id: record.id }); closeModals(); });
        }
    };
    async function confirmedBookChange(button, kind, title, message, label) {
        const book = books.find(item => item.id === button.dataset.book), who = studentId, epoch = generation;
        if (!book || !await confirm(title, `${book.title} — ${message}`, label) || studentId !== who || generation !== epoch)
            return;
        return run(() => change(who, epoch, { kind, bookId: book.id, revision: book.revision }));
    }
    root.addEventListener('click', event => {
        const button = event.target.closest('[data-reading-action]');
        if (!button || button.disabled || !visible() || !studentId)
            return;
        Promise.resolve(actions[button.dataset.readingAction]?.(button)).catch(error => { el('status').textContent = error.message; });
    });
    el('refresh').addEventListener('click', () => run(refresh));
    root.addEventListener('keydown', event => {
        if (!visible() || busy)
            return;
        if (event.key === 'Escape')
            closeModals();
        if (event.key === 'Enter' && event.target.tagName === 'INPUT' && !pending) {
            event.preventDefault();
            if (el('add-modal').style.display === 'flex')
                actions.saveBook();
            else if (el('log-modal').style.display === 'flex')
                actions.saveSession();
        }
    });
    window.addEventListener('cloud-student-status', event => {
        const school = event.detail.school;
        const next = school?.canUseLearningVideos && !school.locked ? school.student?.id || null : null;
        if (next !== studentId) {
            studentId = next;
            generation++;
            reset();
        }
        controls();
    });
    window.addEventListener('cloud-student-surface', event => { if (event.detail !== 'student-reading-panel')
        closeModals(); });
    reset();
    controls();
}

},
"renderer/js/cloud-learning-challenges.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountLearningChallenges = mountLearningChallenges;
const cloud_student_rendering_js_1 = require("renderer/js/cloud-student-rendering.js");
/* global document, window, Audio, URL, Blob, atob, SpeechSynthesisUtterance */
const labels = { math: 'Math', spelling: 'Spelling', vocabulary: 'Vocabulary', mixed: 'Mixed practice' };
const icons = { math: 'calculator', spelling: 'spell-check', vocabulary: 'book-open', mixed: 'shuffle' };
const node = (tag, text = '', cls = '') => { const el = document.createElement(tag); el.textContent = text; el.className = cls; return el; };
function mountLearningChallenges({ api, open }) {
    const root = document.getElementById('student-challenges-panel');
    if (!root)
        return;
    let studentId = null, epoch = 0, busy = false, value = null, pending = null, subject = 'mixed', count = 10, audio = null, audioUrl = null, voiceEpoch = 0, skipTimer = null, skipButton = null, skipDeadline = 0, openingTimer = null;
    const status = node('p', '', 'challenge-status');
    status.setAttribute('role', 'status');
    const content = node('div', '', 'challenge-content'), retryBox = node('div', '', 'challenge-retry');
    retryBox.hidden = true;
    root.append(status, retryBox, content);
    const buttons = [];
    for (const target of [document.getElementById('wallet-store-btn'), document.querySelector('#student-store-panel .store-header')]) {
        if (!target)
            continue;
        const button = node('button', '', 'challenge-entry');
        button.type = 'button';
        button.disabled = true;
        const icon = node('i');
        icon.dataset.lucide = 'sparkles';
        icon.setAttribute('aria-hidden', 'true');
        button.append(icon, node('span', 'Earn coins'));
        button.addEventListener('click', () => open());
        buttons.push(button);
        if (target.id === 'wallet-store-btn')
            target.after(button);
        else
            target.append(button);
        (0, cloud_student_rendering_js_1.renderPendingIcons)(button);
    }
    function stopVoice() { voiceEpoch++; window.speechSynthesis?.cancel(); if (audio) {
        audio.pause();
        audio = null;
    } if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        audioUrl = null;
    } }
    function clearOpening() { if (openingTimer !== null)
        window.clearTimeout(openingTimer); openingTimer = null; }
    function scheduleOpeningCheck(failed = false) { clearOpening(); const ms = value?.schoolBlock && value?.timeOpening?.recheckAfterMs; if (visible() && !document.hidden && Number.isFinite(ms) && ms > 0)
        openingTimer = window.setTimeout(() => { openingTimer = null; if (visible() && !document.hidden)
            void load(); }, failed ? 60000 : Math.max(1000, Math.min(60000, ms))); }
    function clearSkip() { if (skipTimer !== null)
        window.clearInterval(skipTimer); skipTimer = null; skipButton = null; }
    function updateSkip() { if (!skipButton)
        return; const remaining = Math.max(0, Math.ceil((skipDeadline - window.performance.now()) / 1000)); skipButton.textContent = remaining ? 'Skip in ' + remaining + 's' : 'Skip this question'; skipButton.disabled = busy || !!pending || !visible() || remaining > 0; if (!remaining && skipTimer !== null) {
        window.clearInterval(skipTimer);
        skipTimer = null;
    } }
    function setBusy(on) { busy = on; root.setAttribute('aria-busy', String(on)); for (const el of content.querySelectorAll('button,input,select')) {
        if (on) {
            el.dataset.wasDisabled = String(el.disabled);
            el.disabled = true;
        }
        else if (el.dataset.wasDisabled !== undefined) {
            el.disabled = el.dataset.wasDisabled === 'true';
            delete el.dataset.wasDisabled;
        }
    } updateSkip(); }
    const visible = () => !root.hidden && !root.inert && !!studentId;
    const current = (who, token) => who === studentId && token === epoch && visible();
    const errorText = error => String(error.message || 'Could not connect.').replace(/^Error invoking remote method '[^']+': Error: /, '');
    function button(text, fn, cls = 'challenge-secondary') { const b = node('button', text, cls); b.type = 'button'; b.addEventListener('click', fn); return b; }
    function retryNotice() {
        retryBox.replaceChildren();
        retryBox.hidden = !pending;
        if (!pending)
            return;
        retryBox.append(node('strong', 'Your latest step is saved on this computer.'), node('p', 'Reconnect and retry. If it already reached your wallet, retrying will not pay it twice.'), button('Retry saved step', () => load(true)));
        const details = node('details'), summary = node('summary', 'Still unable to continue?');
        details.append(summary, node('p', 'Discard only the local retry and load the server’s saved progress. Coins already earned stay in your wallet.'), button('Discard retry and reload', async () => {
            if (busy)
                return;
            setBusy(true);
            try {
                await api.challenges('discard', { studentId, id: pending.id });
                pending = null;
                busy = false;
                await load();
            }
            catch (e) {
                status.textContent = errorText(e);
            }
            finally {
                setBusy(false);
            }
        }));
        retryBox.append(details);
    }
    async function load(retry = false) {
        if (!visible() || busy && !retry)
            return;
        clearOpening();
        let loaded = false;
        const who = studentId, token = epoch;
        setBusy(true);
        status.textContent = 'Loading your learning challenges…';
        try {
            pending = await api.challenges('pending', { studentId: who });
            if (retry && pending)
                await api.challenges('retry', { studentId: who });
            const data = await api.challenges('list', { studentId: who });
            if (!current(who, token))
                return;
            value = data;
            pending = await api.challenges('pending', { studentId: who });
            status.textContent = '';
            loaded = true;
            render();
            retryNotice();
        }
        catch (e) {
            if (current(who, token)) {
                status.textContent = errorText(e) + ' Reconnect, then try again.';
                retryNotice();
                content.append(button('Try again', () => load()));
            }
        }
        finally {
            if (current(who, token)) {
                setBusy(false);
                scheduleOpeningCheck(!loaded);
                if (pending)
                    for (const b of content.querySelectorAll('button,input,select'))
                        b.disabled = true;
            }
            else {
                busy = false;
                if (visible())
                    void load();
            }
        }
    }
    async function command(kind, extra = {}) {
        if (!visible() || busy || pending)
            return;
        stopVoice();
        const who = studentId, token = epoch, session = value?.session;
        setBusy(true);
        status.textContent = 'Saving…';
        try {
            const data = await api.challenges('command', { studentId: who, kind, ...(session?.status === 'active' ? { sessionId: session.id, questionId: session.question.id } : {}), ...extra });
            if (!current(who, token))
                return;
            value = data;
            status.textContent = (kind === 'answer' || kind === 'skip') ? data.session.feedback.message : '';
            render();
            if (kind === 'answer' || kind === 'skip')
                content.querySelector('.challenge-next')?.focus();
            else
                content.querySelector('input, .challenge-question')?.focus();
        }
        catch (e) {
            if (current(who, token)) {
                status.textContent = errorText(e);
                pending = await api.challenges('pending', { studentId: who }).catch(() => pending);
                retryNotice();
            }
        }
        finally {
            if (current(who, token)) {
                setBusy(false);
                if (pending)
                    for (const b of content.querySelectorAll('button,input,select'))
                        b.disabled = true;
            }
            else {
                busy = false;
                if (visible())
                    void load();
            }
        }
    }
    async function speak() {
        if (busy || !value?.session?.question)
            return;
        stopVoice();
        const token = voiceEpoch, who = studentId;
        const session = value.session;
        status.textContent = 'Preparing audio…';
        function local(text) { if (!window.speechSynthesis)
            throw Error('Audio is unavailable. Try the speaker again.'); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'en-US'; utterance.rate = .85; window.speechSynthesis.speak(utterance); status.textContent = 'Using this computer’s voice while online narration is unavailable.'; }
        try {
            const response = await api.challenges('audio', { studentId: who, sessionId: session.id, questionId: session.question.id });
            if (token !== voiceEpoch || who !== studentId || !visible())
                return;
            if (response.voice === 'local') {
                local(response.speech);
                return;
            }
            audioUrl = URL.createObjectURL(new Blob([Uint8Array.from(atob(response.data), c => c.charCodeAt(0))], { type: 'audio/mpeg' }));
            audio = new Audio(audioUrl);
            try {
                await audio.play();
                status.textContent = '';
            }
            catch (_) {
                if (token === voiceEpoch)
                    local(response.speech);
            }
        }
        catch (e) {
            if (token === voiceEpoch && visible())
                status.textContent = errorText(e);
        }
    }
    function header() {
        const hero = node('header', '', 'challenge-hero'), title = node('div');
        title.append(node('p', 'A little practice. A little progress.', 'challenge-eyebrow'), node('h1', 'Earn coins'), node('p', 'Try a challenge. Learn from mistakes. Keep every coin you earn.'));
        hero.append(title, node('div', (value.wallet?.balance ?? 0) + ' coins', 'challenge-wallet'));
        content.append(hero);
        const daily = node('div', '', 'challenge-daily');
        daily.append(node('strong', value.earnedToday + ' / ' + value.dailyCap + ' coins today'), node('span', value.roundsToday + ' / ' + value.dailyRounds + ' rounds'));
        const progress = node('progress');
        progress.max = value.dailyCap;
        progress.value = value.earnedToday;
        progress.setAttribute('aria-label', 'Today’s challenge coins');
        daily.append(progress);
        content.append(daily);
        if (value.streakStats) {
            const stats = node('div', '', 'challenge-records');
            stats.append(node('span', 'Personal best: ' + value.streakStats.personalBest + ' in a row'), node('span', 'Today’s best: ' + value.streakStats.todayBest), node('span', 'Streak bonuses today: +' + value.streakStats.todayBonusCoins + ' coins'));
            content.append(stats);
        }
    }
    function home() {
        const box = node('div', '', 'challenge-card');
        box.append(node('h2', 'Choose your challenge'), node('p', '10 or 20 questions. Correct on your own: ' + value.rewards.correctCoins + ' coins. With a hint or a successful retry: ' + value.rewards.supportedCoins + ' coins. Answer every question correctly, including corrections, for a ' + value.rewards.completionBonus + '-coin bonus. Daily limits apply.'));
        if (value.rewards.streakStepCoins)
            box.append(node('p', 'Build a streak: each correct answer on your own adds ' + value.rewards.streakStepCoins + ' bonus coins to the next answer, up to ' + (value.rewards.correctCoins + value.rewards.streakMaxBonusCoins) + ' coins per answer. Hints, mistakes, and skips restart the streak; earned coins stay yours. Each new round starts a new streak.', 'challenge-fine'));
        if (value.streakDifficulty)
            box.append(node('p', 'Three correct answers in a subject raise the challenge; six raise it again. Each subject builds its own difficulty streak. A hint, mistake, or skip eases the next question back to your starting practice level.', 'challenge-fine'));
        const choices = node('div', '', 'challenge-subjects');
        for (const key of [...value.subjects, ...(value.subjects.length > 1 ? ['mixed'] : [])]) {
            const b = button('', () => { subject = key; render(); }, 'challenge-subject');
            b.setAttribute('aria-pressed', String(subject === key));
            const icon = node('i');
            icon.dataset.lucide = icons[key];
            icon.setAttribute('aria-hidden', 'true');
            b.append(icon, node('strong', labels[key]));
            if (key !== 'mixed')
                b.append(node('small', value.levels[key] === 0 ? 'Kindergarten practice' : 'Grade ' + value.levels[key] + ' practice'));
            choices.append(b);
        }
        box.append(choices);
        const lengths = node('div', '', 'challenge-lengths');
        lengths.setAttribute('role', 'group');
        lengths.setAttribute('aria-label', 'Questions per round');
        for (const n of [10, 20]) {
            const b = button(n + ' questions', () => { count = n; render(); });
            b.setAttribute('aria-pressed', String(n === count));
            lengths.append(b);
        }
        box.append(lengths);
        const start = button('Start ' + count + ' questions', () => command('start', { subject, count }), 'challenge-primary');
        start.disabled = !value.canStart;
        box.append(start);
        if (!value.canStart)
            box.append(node('p', value.reason || (value.remaining === 0 ? 'You reached today’s coin limit. Come back tomorrow!' : 'All of today’s rounds are finished. Come back tomorrow!'), 'challenge-notice'));
        box.append(node('p', 'Levels adjust as you practice. Your parent can choose a starting level for each subject. Challenges do not replace schoolwork or unlock rewards on their own.', 'challenge-fine'));
        content.append(box);
        if (value.recent?.length) {
            const history = node('div', '', 'challenge-history');
            history.append(node('h2', 'Today’s progress'));
            for (const row of value.recent)
                history.append(node('p', labels[row.subject] + ' · ' + row.correct + '/' + row.count + ' without help · ' + row.recovered + ' corrected · ' + (row.skipped || 0) + ' skipped · Best streak: ' + (row.streak?.best || 0) + ' · +' + row.coins + ' coins'));
            content.append(history);
        }
    }
    function round(session) {
        const q = session.question, card = node('section', '', 'challenge-card');
        card.append(node('div', labels[q.subject] + ' · ' + session.answered + ' / ' + session.count + ' questions finished · +' + session.coins + ' coins', 'challenge-eyebrow'));
        if (session.streak) {
            const streak = node('div', '', 'challenge-streak');
            streak.setAttribute('aria-label', 'This round’s streak');
            for (const [icon, text] of [['flame', session.streak.current + ' in a row'], ['trophy', 'Round best: ' + session.streak.best], ['coins', 'Streak coins: +' + session.streak.bonusCoins]]) {
                const chip = node('span'), symbol = node('i');
                symbol.dataset.lucide = icon;
                symbol.setAttribute('aria-hidden', 'true');
                chip.append(symbol, document.createTextNode(text));
                streak.append(chip);
            }
            card.append(streak);
        }
        if (q.correction)
            card.append(node('p', 'Try it again from memory. A correct retry keeps your streak and earns the supported reward.', 'challenge-revisit'));
        if (q.difficulty) {
            const d = q.difficulty, detail = d.mode === 'recall' ? 'Type the word without answer choices' : d.mode === 'longer-word' ? 'A longer word from your list' : 'Grade ' + q.grade + ' practice';
            card.append(node('p', 'Streak challenge · ' + d.subjectStreak + ' ' + labels[q.subject].toLowerCase() + ' answers in a row · ' + detail, 'challenge-difficulty challenge-revisit'));
        }
        if (q.source)
            card.append(node('p', q.source, 'challenge-fine'));
        const title = node('h2', q.prompt, 'challenge-question');
        title.tabIndex = -1;
        card.append(title);
        const tools = node('div', '', 'challenge-tools');
        tools.append(button(q.type === 'spelling' ? 'Hear the word' : 'Read aloud', speak));
        if (!session.feedback && !q.assisted)
            tools.append(button('Give me a hint', () => command('hint')));
        card.append(tools);
        if (q.assisted)
            card.append(node('p', q.hint, 'challenge-hint'));
        if (session.feedback) {
            const f = session.feedback, feedback = node('div', '', f.correct ? 'challenge-feedback correct' : 'challenge-feedback');
            feedback.append(node('strong', f.message), node('p', f.explanation));
            if (!f.correct)
                feedback.append(node('p', 'Start a new streak on your next answer. Your best streak is saved.', 'challenge-fine'));
            card.append(feedback, button(session.step >= session.totalSteps ? 'See my results' : 'Next question', () => command('next'), 'challenge-primary challenge-next'));
        }
        else {
            const form = node('form'), label = node('label', 'Your answer');
            label.htmlFor = 'challenge-answer';
            let answer;
            if (q.type === 'choice') {
                const select = node('div', '', 'challenge-answers');
                select.setAttribute('role', 'group');
                select.setAttribute('aria-label', 'Choose your answer');
                for (const word of q.choices) {
                    const b = button(word, () => { answer = word; for (const el of select.children)
                        el.setAttribute('aria-pressed', String(el === b)); });
                    b.setAttribute('aria-pressed', 'false');
                    select.append(b);
                }
                form.append(select);
            }
            else {
                const input = node('input');
                input.id = 'challenge-answer';
                input.maxLength = 120;
                input.required = true;
                input.type = 'text';
                input.autocomplete = 'off';
                input.spellcheck = false;
                input.setAttribute('autocorrect', 'off');
                input.setAttribute('autocapitalize', 'none');
                input.setAttribute('aria-label', 'Your answer');
                input.addEventListener('input', () => { answer = input.value; });
                form.append(label, input);
            }
            const submit = node('button', 'Check answer', 'challenge-primary');
            submit.type = 'submit';
            form.append(submit, node('p', 'Up to ' + q.maxCoins + ' coins for this answer.' + (q.streakBonusCoins ? ' Includes +' + q.streakBonusCoins + ' streak bonus.' : '') + ' No coins lost for mistakes.', 'challenge-fine'));
            form.addEventListener('submit', event => { event.preventDefault(); if (!answer?.trim()) {
                status.textContent = 'Choose or enter an answer first.';
                return;
            } void command('answer', { answer }); });
            card.append(form);
            if (Number.isFinite(q.skipAfterMs)) {
                const skipArea = node('div', '', 'challenge-skip-area');
                skipButton = button('Skip this question', () => command('skip'), 'challenge-secondary challenge-skip');
                skipButton.setAttribute('aria-describedby', 'challenge-skip-help');
                const help = node('p', 'Try the question first. After 8 seconds you can skip and see the explanation. No coins for a skip; it counts toward your round.', 'challenge-fine');
                help.id = 'challenge-skip-help';
                skipArea.append(skipButton, help);
                card.append(skipArea);
                skipDeadline = window.performance.now() + q.skipAfterMs;
                updateSkip();
                if (q.skipAfterMs > 0)
                    skipTimer = window.setInterval(updateSkip, 250);
            }
        }
        content.append(card);
    }
    function schoolNotice() {
        const card = node('section', '', 'challenge-card challenge-school-block'), school = value.schoolBlock, opening = school && value.timeOpening;
        if (opening)
            card.append(node('p', 'School finished OR ' + opening.label, 'challenge-revisit'), node('p', 'Whichever comes first, every day · ' + opening.timeZone, 'challenge-fine'));
        if (school?.known) {
            card.append(node('p', 'Schoolwork · ' + school.completed + ' of ' + school.total + ' finished', 'challenge-eyebrow'), node('h2', 'Schoolwork still to finish'));
            const list = node('ul', '', 'challenge-school-list');
            for (const row of school.remaining) {
                const item = node('li'), icon = node('i');
                icon.dataset.lucide = 'circle-dashed';
                icon.setAttribute('aria-hidden', 'true');
                const text = node('div');
                text.append(node('strong', row.title), node('p', row.detail));
                item.append(icon, text);
                list.append(item);
            }
            card.append(list, node('p', 'Already finished? Open that activity to sync, then check again. If it still looks wrong, ask your parent to check it.', 'challenge-fine'));
        }
        else
            card.append(node('p', value.reason));
        card.append(button('Check again', () => load(), 'challenge-secondary challenge-school-refresh'));
        content.append(card);
        (0, cloud_student_rendering_js_1.renderPendingIcons)(card);
        scheduleOpeningCheck();
    }
    function render() {
        stopVoice();
        clearSkip();
        clearOpening();
        content.replaceChildren();
        if (!value)
            return;
        if (!value.subjects.includes(subject) && subject !== 'mixed' || value.subjects.length === 1)
            subject = value.subjects[0];
        header();
        if (value.reason) {
            schoolNotice();
            return;
        }
        if (value.session?.status === 'active')
            round(value.session);
        else if (value.session?.status === 'completed') {
            const s = value.session, card = node('section', '', 'challenge-card challenge-results');
            card.append(node('p', 'Round complete', 'challenge-eyebrow'), node('h2', 'You earned ' + s.coins + ' coins!'), node('p', s.correct + ' of ' + s.count + ' correct without help · ' + s.recovered + ' corrected · ' + (s.skipped || 0) + ' skipped.'), node('p', s.completionBonus ? 'Includes your ' + s.completionBonus + '-coin completion bonus.' : 'Your earnings are already in your wallet.'), button('Choose another challenge', () => { value.session = null; render(); }, 'challenge-primary'));
            card.insertBefore(node('p', 'Best streak this round: ' + (s.streak?.best || 0) + ' · Streak bonuses: +' + (s.streak?.bonusCoins || 0) + ' coins.', 'challenge-result-streak'), card.lastChild);
            content.append(card);
        }
        else
            home();
        window.lucide?.createIcons();
    }
    window.addEventListener('cloud-student-status', event => {
        const school = event.detail.school, next = school?.canUseLearningVideos && !school.locked ? school.student?.id || null : null;
        if (next !== studentId) {
            studentId = next;
            epoch++;
            value = null;
            pending = null;
            stopVoice();
            clearSkip();
            clearOpening();
            content.replaceChildren();
            retryBox.replaceChildren();
            status.textContent = '';
            for (const b of buttons)
                b.disabled = !studentId;
        }
    });
    window.addEventListener('cloud-student-surface', event => {
        epoch++;
        stopVoice();
        clearSkip();
        clearOpening();
        if (event.detail === 'student-challenges-panel' && !busy)
            void load();
    });
    document.addEventListener('visibilitychange', () => { clearOpening(); if (!document.hidden && visible() && value?.schoolBlock && value?.timeOpening)
        void load(); });
    return { load };
}

},
"renderer/js/cloud-student-store.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountCloudStore = mountCloudStore;
const student_store_js_1 = require("renderer/js/shared/student-store.js");
const cloud_student_coin_history_js_1 = require("renderer/js/cloud-student-coin-history.js");
/* global document, window */
function mountCloudStore({ api }) {
    const root = document.getElementById('student-store-panel');
    if (!root)
        return;
    const el = id => document.getElementById(`store-${id}`);
    let studentId = null, generation = 0, pending = null, busy = false;
    const current = (who, epoch) => studentId === who && generation === epoch;
    let view = 'rewards', historyBusy = false, catalogRequests = 0;
    function controls() { for (const name of ['refresh', 'retry', 'discard', 'history-toggle', 'rewards-toggle'])
        el(name).disabled = busy || historyBusy || catalogRequests > 0 || !studentId; }
    const history = (0, cloud_student_coin_history_js_1.mountCoinHistory)({ api, getStudentId: () => studentId, canShow: () => view === 'history' && !root.hidden && !root.inert,
        onBusy: value => { historyBusy = value; controls(); } });
    function showView(next) {
        if (view !== next)
            history.clear();
        view = next;
        store.cancel();
        el('rewards-view').hidden = next !== 'rewards';
        el('history-view').hidden = next !== 'history';
        for (const name of ['rewards', 'history'])
            el(name + '-toggle').setAttribute('aria-pressed', String(name === next));
        el('refresh').textContent = next === 'history' ? 'Refresh history' : 'Refresh Store';
        el('status').hidden = next === 'history';
    }
    async function loadHistory() {
        const who = studentId, epoch = generation;
        try {
            await pendingState(who, epoch);
        }
        catch { /* History can still load confirmed changes. */ }
        if (current(who, epoch) && view === 'history')
            await history.refresh();
    }
    el('history-toggle').addEventListener('click', () => { showView('history'); void loadHistory(); });
    el('rewards-toggle').addEventListener('click', () => { showView('rewards'); void store.refresh(); });
    async function pendingState(who, epoch) {
        const value = await api.store('pending', { studentId: who });
        if (!current(who, epoch))
            return;
        pending = value;
        el('pending').hidden = !value;
        el('pending-description').textContent = value ? `A ${value.price}-coin purchase is saved locally, awaiting confirmation. Retry it before buying another reward.` : '';
    }
    const store = (0, student_store_js_1.mountStudentStore)({ root, idPrefix: 'store-', isVisible: () => view === 'rewards' && !root.hidden && !root.inert && !!studentId,
        transport: {
            error: error => String(error.message || 'The Store could not finish saving.').replace(/^Error invoking remote method '[^']+': Error: /, ''),
            hasPending: () => !!pending,
            async list() {
                catalogRequests++;
                controls();
                try {
                    const who = studentId, epoch = generation;
                    await pendingState(who, epoch);
                    const value = await api.store('list', { studentId: who });
                    if (!current(who, epoch))
                        throw new Error('The assigned child changed.');
                    el('status').textContent = 'Extra time stays saved until you use it. Schoolwork, required chores, schedules and parent locks still apply. Check Your day for why a reward is locked.';
                    el('receipts').replaceChildren(...value.redemptions.slice(0, 50).map(record => {
                        const row = document.createElement('p');
                        row.textContent = `${record.item.name} · ${record.coins_spent} coins · ${record.status}`;
                        return row;
                    }));
                    el('banks').textContent = value.banks.map(bank => `${bank.scope === 'family_game' ? 'Family Games' : bank.scope}: ${Math.floor(bank.seconds / 60)}m ${bank.seconds % 60}s banked`).join(' · ');
                    return { balance: value.wallet.balance, items: value.items.map(item => ({ ...item, available: item.usable })) };
                }
                finally {
                    catalogRequests--;
                    controls();
                }
            },
            async purchase(item) {
                const who = studentId, epoch = generation;
                busy = true;
                controls();
                try {
                    const value = await api.store('command', { studentId: who, kind: 'purchase', itemId: item.id, revision: item.revision, price: item.price });
                    if (!current(who, epoch))
                        throw new Error('The assigned child changed.');
                    return { requires_parent: value.redemption.status === 'pending', reward_name: value.rewardName, time_grant: { minutes: item.time_minutes } };
                }
                finally {
                    if (current(who, epoch)) {
                        try {
                            await pendingState(who, epoch);
                        }
                        catch (_) { /* Keep existing saved-change notice. */ }
                    }
                    busy = false;
                    controls();
                }
            }
        } });
    el('refresh').addEventListener('click', () => view === 'history' ? loadHistory() : store.refresh());
    async function resolve(kind) {
        if (busy || !studentId)
            return;
        const who = studentId, epoch = generation, id = pending?.id;
        busy = true;
        controls();
        try {
            await api.store(kind, { studentId: who, id });
            if (current(who, epoch)) {
                if (view === 'history')
                    await loadHistory();
                else
                    await store.refresh();
            }
        }
        catch (error) {
            if (current(who, epoch))
                el(view === 'history' ? 'history-status' : 'status').textContent = error.message;
        }
        finally {
            busy = false;
            controls();
        }
    }
    el('retry').addEventListener('click', () => resolve('retry'));
    const dialog = document.createElement('dialog');
    dialog.id = 'store-discard-dialog';
    const explanation = document.createElement('p');
    explanation.textContent = 'Refresh and check Your rewards first. A lost reply may mean this purchase is already saved online. Discarding removes only this computer’s retry copy; it does not refund a purchase.';
    const cancel = document.createElement('button');
    cancel.textContent = 'Keep saved purchase';
    cancel.addEventListener('click', () => dialog.close());
    const discard = document.createElement('button');
    discard.textContent = 'Discard retry copy';
    discard.addEventListener('click', () => { dialog.close(); void resolve('discard'); });
    dialog.append(explanation, cancel, discard);
    root.append(dialog);
    el('discard').addEventListener('click', () => { if (pending)
        dialog.showModal(); });
    window.addEventListener('cloud-student-status', event => {
        const school = event.detail.school, next = school?.canUseLearningVideos && !school.locked ? school.student?.id || null : null;
        if (studentId !== next) {
            studentId = next;
            generation++;
            pending = null;
            dialog.close();
            history.clear();
            showView('rewards');
            store.clear();
            for (const name of ['status', 'receipts', 'banks', 'pending-description'])
                el(name).replaceChildren();
            el('pending').hidden = true;
        }
        controls();
    });
    window.addEventListener('cloud-student-surface', event => { if (event.detail !== 'student-store-panel') {
        dialog.close();
        history.clear();
        showView('rewards');
        store.cancel();
    } });
    controls();
}

},
"renderer/js/shared/student-store.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountStudentStore = mountStudentStore;
/* global CSS */
// Original Rewards Store card rendering and two-step purchase confirmation,
// shared by the existing child and cloud child through explicit transports.
function mountStudentStore({ root, transport, idPrefix = '', isVisible = () => true, onPurchase = () => { } }) {
    const document = { getElementById: id => root.querySelector(`#${idPrefix}${id}`), querySelector: selector => root.querySelector(selector), querySelectorAll: selector => root.querySelectorAll(selector) };
    const groups = ['time', 'privilege', 'cash'];
    let balance = null, storeItems = [], purchaseInFlight = false, pendingConfirmItemId = null, generation = 0, toastTimer, lastError = false;
    const legacyIconByValue = { audiobook30: '📚', music30: '🎵', video15: '📺', 'dessert-choice': '🍪', 'family-game': '🎲', 'chore-trade': '🔄', 'dinner-choice': '🍕', 'later-bedtime-30': '🌙', 'family-outing': '🚗', cash1: '💵', cash5: '💰' };
    function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }
    function paint() {
        document.getElementById('coin-balance').textContent = balance == null ? '—' : balance.toLocaleString();
        groups.forEach(group => renderGroup(group, storeItems.filter(item => item.type === group)));
    }
    async function loadStore() {
        const epoch = generation;
        try {
            const data = await transport.list();
            if (epoch !== generation || !isVisible())
                return;
            balance = Number.isFinite(data.balance) ? data.balance : null;
            storeItems = data.items;
            paint();
            if (lastError && !transport.hasPending?.()) {
                document.getElementById('toast').classList.remove('show');
                lastError = false;
            }
        }
        catch (error) {
            if (epoch === generation) {
                balance = null;
                storeItems = [];
                paint();
                showToast(transport.error?.(error) || error.message, true);
            }
        }
    }
    function renderGroup(group, items) {
        const grid = document.getElementById(`${group}-grid`), section = document.getElementById(`${group}-section`);
        section.hidden = items.length === 0;
        grid.innerHTML = items.map(item => {
            const canAfford = balance !== null && balance >= item.price, parentApproval = item.type !== 'time';
            const unavailable = item.available === false || item.pending || item.redeemed_today || transport.hasPending?.();
            const confirming = pendingConfirmItemId === item.id;
            const confirmNote = item.type === 'time' ? 'Your coins will be deducted. Unused time stays banked until you use it. Buying time does not bypass schoolwork, chores, schedules or parent locks.' : 'Your coins will be deducted and Mom or Dad will receive your request.';
            const buttonText = balance === null ? 'Refresh to check your balance' : item.available === false ? (item.availability_label || 'Unavailable') : item.pending ? 'Waiting for Parent'
                : item.redeemed_today ? 'Daily Limit Reached' : canAfford ? (confirming ? `Confirm — spend ${Number(item.price).toLocaleString()}` : 'Redeem Reward') : `Need ${(item.price - balance).toLocaleString()} more`;
            return `<article class="store-card${item.available === false ? ' coming-later' : ''}${confirming ? ' confirming' : ''}" data-type="${escapeHtml(item.type)}">
        <div class="item-preview">${escapeHtml(item.icon || legacyIconByValue[item.value] || '🎁')}</div>
        <div class="item-name">${escapeHtml(item.name)}</div><div class="item-desc">${escapeHtml(item.description)}</div>
        ${item.available === false ? '<span class="coming-later-badge">Unavailable</span>' : parentApproval ? '<span class="parent-badge">Parent approval</span>' : ''}
        <div class="item-price"><span>🪙</span><span class="item-price-amount">${Number(item.price).toLocaleString()}</span></div>
        <button class="item-action" data-item-id="${escapeHtml(item.id)}" ${canAfford && !unavailable && !purchaseInFlight ? '' : 'disabled'}>${buttonText}</button>
        ${confirming ? `<button class="cancel-action" data-cancel-purchase type="button">Cancel</button><div class="confirm-note">${confirmNote}</div>` : ''}</article>`;
        }).join('');
        grid.querySelectorAll('[data-item-id]').forEach(button => button.addEventListener('click', () => purchaseItem(button.dataset.itemId)));
        grid.querySelectorAll('[data-cancel-purchase]').forEach(button => button.addEventListener('click', () => { pendingConfirmItemId = null; paint(); }));
    }
    async function purchaseItem(itemId) {
        if (purchaseInFlight || !isVisible() || transport.hasPending?.())
            return;
        const item = storeItems.find(candidate => candidate.id === itemId);
        if (!item || item.available === false || balance == null || item.price > balance)
            return;
        if (pendingConfirmItemId !== itemId) {
            pendingConfirmItemId = itemId;
            paint();
            document.querySelector(`[data-item-id="${CSS.escape(itemId)}"]`)?.focus();
            return;
        }
        const epoch = generation;
        purchaseInFlight = true;
        paint();
        try {
            const data = await transport.purchase(item);
            if (epoch !== generation)
                return;
            pendingConfirmItemId = null;
            showToast(data.requires_parent ? `✅ Request sent to Mom or Dad: ${data.reward_name}` : `🎉 ${data.time_grant?.minutes || ''} minutes banked until you use them!`);
            await onPurchase(data);
        }
        catch (error) {
            if (epoch === generation) {
                pendingConfirmItemId = null;
                showToast(transport.error?.(error) || error.message, true);
            }
        }
        finally {
            purchaseInFlight = false;
            if (epoch === generation && isVisible())
                await loadStore();
        }
    }
    function showToast(message, isError = false) {
        lastError = isError;
        const toast = document.getElementById('toast');
        clearTimeout(toastTimer);
        toast.textContent = message;
        toast.style.borderColor = isError ? 'var(--red)' : 'var(--gold)';
        toast.classList.add('show');
        toastTimer = setTimeout(() => toast.classList.remove('show'), 5000);
    }
    function clear() { generation++; pendingConfirmItemId = null; storeItems = []; balance = null; clearTimeout(toastTimer); document.getElementById('toast').textContent = ''; paint(); }
    return { refresh: loadStore, clear, cancel: () => { pendingConfirmItemId = null; paint(); }, paint };
}

},
"renderer/js/cloud-student-coin-history.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountCoinHistory = mountCoinHistory;
const cloud_student_rendering_js_1 = require("renderer/js/cloud-student-rendering.js");
/* global document */
function mountCoinHistory({ api, getStudentId, canShow, onBusy }) {
    const el = id => document.getElementById('store-history-' + id);
    let generation = 0, busy = false, nextCursor = null, entries = new Set();
    function clear() {
        generation++;
        busy = false;
        nextCursor = null;
        entries = new Set();
        onBusy(false);
        el('list').replaceChildren();
        el('status').textContent = '';
        el('opening').hidden = true;
        el('updated').textContent = '';
        el('more').hidden = true;
    }
    function row(entry, timeZone) {
        const item = document.createElement('li');
        item.className = 'coin-history-row';
        const icon = document.createElement('i');
        icon.dataset.lucide = entry.category === 'earned' ? 'circle-plus' : entry.category === 'refund' ? 'rotate-ccw' : entry.amount < 0 ? 'circle-minus' : 'coins';
        const copy = document.createElement('div');
        copy.className = 'coin-history-copy';
        const title = document.createElement('strong');
        title.textContent = entry.title;
        const detail = document.createElement('p');
        detail.textContent = entry.detail;
        const date = document.createElement('time');
        date.dateTime = entry.createdAt;
        date.textContent = new Intl.DateTimeFormat(undefined, { timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.createdAt));
        copy.append(title, detail, date);
        const amount = document.createElement('div');
        amount.className = 'coin-history-amount';
        const value = document.createElement('strong');
        value.textContent = (entry.amount > 0 ? '+' : entry.amount < 0 ? '−' : '') + Math.abs(entry.amount).toLocaleString();
        const label = document.createElement('span');
        label.textContent = ({ earned: 'Earned', spent: 'Spent', refund: 'Refunded', deduction: 'Deducted', adjustment: 'Adjusted' })[entry.category] || 'Adjusted';
        amount.append(value, label);
        item.append(icon, copy, amount);
        return item;
    }
    async function load(older = false) {
        const who = getStudentId();
        if (!who || busy || !canShow() || older && !nextCursor)
            return;
        const epoch = generation, current = () => epoch === generation && who === getStudentId() && canShow();
        busy = true;
        onBusy(true);
        el('more').disabled = true;
        el('status').textContent = 'Loading coin history…';
        try {
            const value = await api.store('list', { studentId: who, view: 'history', ...(older ? { cursor: nextCursor } : {}) });
            if (!current())
                return;
            const history = value.coinHistory;
            if (!history || !Array.isArray(history.entries))
                throw new Error('Coin history needs the latest service update. Your coins are unchanged.');
            // Build the complete page before replacing prior confirmed entries.
            const fresh = history.entries.filter(entry => !older || !entries.has(entry.id));
            const nodes = fresh.map(entry => row(entry, history.timeZone));
            if (!older) {
                entries = new Set();
                el('list').replaceChildren();
            }
            fresh.forEach(entry => entries.add(entry.id));
            el('list').append(...nodes);
            (0, cloud_student_rendering_js_1.renderPendingIcons)(el('list'));
            nextCursor = history.nextCursor;
            el('more').hidden = !nextCursor;
            document.getElementById('store-coin-balance').textContent = value.wallet.balance.toLocaleString();
            el('opening').hidden = value.wallet.openingBalance == null;
            el('opening').textContent = value.wallet.openingBalance == null ? '' : value.wallet.openingBalance.toLocaleString() + ' starting coins from earlier history. Those earlier transactions are not listed individually.';
            el('updated').textContent = 'Updated ' + new Intl.DateTimeFormat(undefined, { timeZone: history.timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value.receivedAt)) + ' · ' + history.timeZone;
            el('status').textContent = entries.size ? 'Confirmed changes, newest first. Work still waiting to sync appears after it is saved online.' : 'No coin changes yet. Confirmed earnings and purchases will appear here.';
        }
        catch (error) {
            if (current())
                el('status').textContent = (entries.size ? 'Showing the last loaded entries. ' : '') + String(error.message || 'Reconnect to load coin history.').replace(/^Error invoking remote method '[^']+': Error: /, '') + ' Use Refresh to try again.';
        }
        finally {
            if (epoch === generation) {
                busy = false;
                onBusy(false);
                el('more').disabled = false;
            }
        }
    }
    el('more').addEventListener('click', () => void load(true));
    return { clear, refresh: () => load(false) };
}

},
"renderer/js/cloud-school-break.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountCloudSchoolBreak = mountCloudSchoolBreak;
function mountCloudSchoolBreak({ api, onError }) {
    const dialog = document.createElement('dialog');
    dialog.id = 'cloud-school-break';
    dialog.className = 'cloud-school-break';
    dialog.setAttribute('aria-labelledby', 'cloud-break-title');
    dialog.setAttribute('aria-describedby', 'cloud-break-description');
    dialog.innerHTML = `<div class="cloud-break-icon"><i data-lucide="coffee" aria-hidden="true"></i></div>
    <p class="cloud-break-eyebrow">TAKE A BREATHER</p>
    <h2 id="cloud-break-title">You're on a break</h2>
    <p id="cloud-break-description">School time is paused. Your lesson is waiting right where you left it.</p>
    <div id="cloud-break-timer" role="timer" aria-label="Time on break">00:00</div>
    <p class="cloud-break-hint">Stretch, get some water, and come back when you're ready.</p>
    <p id="cloud-break-error" role="alert"></p>
    <button id="cloud-break-resume" type="button"><i data-lucide="play" aria-hidden="true"></i>Resume school</button>
    <button id="cloud-break-dashboard" type="button"><i data-lucide="house" aria-hidden="true"></i>Back to dashboard</button>`;
    document.body.append(dialog);
    const timer = dialog.querySelector('#cloud-break-timer');
    const error = dialog.querySelector('#cloud-break-error');
    const resume = dialog.querySelector('#cloud-break-resume');
    const dashboard = dialog.querySelector('#cloud-break-dashboard');
    let startedAt = null, interval = null, busy = false;
    function tick() {
        const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
        timer.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
    // Escape must not dismiss the pause screen while the host still considers
    // this a break. Only an explicit Resume starts school time again.
    dialog.addEventListener('cancel', event => event.preventDefault());
    async function action(operation) {
        if (busy)
            return;
        busy = true;
        resume.disabled = dashboard.disabled = true;
        error.textContent = '';
        try {
            await operation();
        }
        catch (failure) {
            if (dialog.open)
                error.textContent = failure.message;
            else
                onError(failure);
        }
        finally {
            busy = false;
            resume.disabled = dashboard.disabled = false;
        }
    }
    resume.addEventListener('click', () => action(() => api.schoolBreak(false)));
    dashboard.addEventListener('click', () => action(() => api.pause()));
    return {
        start: () => action(() => api.schoolBreak(true)),
        render(value) {
            const session = value.session;
            const paused = session?.onBreak && session.subjectId && Number.isFinite(session.breakStartedAt)
                && value.school?.ready && !value.school.locked && value.applicationReady !== false;
            if (paused) {
                startedAt = session.breakStartedAt;
                if (!dialog.open) {
                    error.textContent = '';
                    dialog.showModal();
                    resume.focus();
                }
                tick();
                // Display-only timer: no IPC, polling, saved checkpoints or cloud calls.
                if (interval === null)
                    interval = window.setInterval(tick, 1000);
            }
            else {
                if (interval !== null)
                    window.clearInterval(interval);
                interval = null;
                startedAt = null;
                if (dialog.open)
                    dialog.close();
            }
        }
    };
}

},
"renderer/js/cloud-student-planner.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountCloudStudentPlanner = mountCloudStudentPlanner;
const cloud_student_rendering_js_1 = require("renderer/js/cloud-student-rendering.js");
const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
const prettyDate = date => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
const shiftDate = (date, days) => {
    const parsed = Date.parse(`${date || ''}T12:00:00Z`);
    return Number.isFinite(parsed) ? new Date(parsed + days * 86400000).toISOString().slice(0, 10) : '';
};
function mountCloudStudentPlanner({ api }) {
    const dashboard = document.getElementById('dashboard-screen');
    const launch = document.createElement('button');
    launch.id = 'dash-planner-btn';
    launch.type = 'button';
    launch.className = 'header-btn cloud-planner-launch';
    launch.innerHTML = `${icon('calendar-check')}<span>Planner</span><b hidden></b>`;
    document.querySelector('.header-right').prepend(launch);
    const schoolLaunch = document.createElement('button');
    schoolLaunch.id = 'toolbar-planner';
    schoolLaunch.type = 'button';
    schoolLaunch.className = 'toolbar-btn';
    schoolLaunch.innerHTML = `${icon('calendar-plus')} Planner`;
    document.getElementById('toolbar-notes').before(schoolLaunch);
    const summary = document.createElement('section');
    summary.className = 'cloud-planner-summary';
    summary.hidden = true;
    summary.setAttribute('aria-label', 'Your planner');
    summary.innerHTML = `<div class="planner-summary-heading">${icon('calendar-days')}<div><h3>My planner</h3><p id="planner-summary-count"></p></div></div><div id="planner-upcoming"></div><button id="planner-summary-open" type="button">${icon('plus')} Add assignment</button>`;
    dashboard.querySelector('.widgets-grid').after(summary);
    const dialog = document.createElement('dialog');
    dialog.id = 'cloud-planner';
    dialog.className = 'cloud-planner';
    dialog.setAttribute('aria-labelledby', 'planner-title');
    dialog.innerHTML = `<header class="planner-heading"><div class="planner-heading-icon">${icon('calendar-check')}</div><div><p>MAKE ROOM FOR WHAT'S NEXT</p><h2 id="planner-title">My planner</h2></div><button id="planner-close" type="button" aria-label="Close planner">${icon('x')}</button></header>
    <div id="planner-message" role="status"></div>
    <div id="planner-discard" class="planner-discard" hidden><p>You have unsaved changes.</p><button id="planner-keep" type="button">Keep editing</button><button id="planner-discard-confirm" type="button">Discard changes</button></div>
    <div class="planner-layout">
      <section class="planner-agenda" aria-label="Assignments"><div class="planner-agenda-toolbar"><h3>Your assignments</h3><select id="planner-filter" aria-label="Show assignments"><option value="open">To do</option><option value="completed">Completed</option><option value="all">All</option></select><button id="planner-new" type="button">${icon('plus')} New</button></div><div id="planner-list"></div></section>
      <form id="planner-form" class="planner-editor"><h3 id="planner-editor-title">Add an assignment</h3><fieldset id="planner-fields">
        <label>Assignment<input id="planner-task-title" required maxlength="160" placeholder="e.g. History paper or study for a quiz" autocomplete="off"></label>
        <div class="planner-field-pair"><label>Subject<input id="planner-subject" maxlength="80" list="planner-subjects" placeholder="e.g. History" autocomplete="off"><datalist id="planner-subjects"></datalist></label><label>Type<select id="planner-kind"><option value="homework">Homework</option><option value="test">Test or quiz</option><option value="paper">Paper</option><option value="project">Project</option><option value="study">Study</option><option value="other">Other</option></select></label></div>
        <div class="planner-field-pair"><label>Due date<input id="planner-date" type="date" required min="2000-01-01" max="2099-12-31"></label><label>Remind me<select id="planner-reminder"><option value="before-and-due">Day before &amp; due day</option><option value="due-day">On the due day</option><option value="off">No reminders</option></select></label></div>
        <label>Notes <span class="planner-optional">optional</span><textarea id="planner-notes" maxlength="2000" rows="4" placeholder="Pages to read, what to study, or instructions from the lesson…"></textarea></label>
        <p class="planner-reminder-hint">${icon('bell')} Reminders appear after 8 AM in your family’s time zone, or when you next open BodeeGuard. Overdue assignments get one reminder a day until you mark them done.</p>
        <div class="planner-form-actions"><button id="planner-save" class="planner-primary" type="submit">${icon('save')} Save assignment</button><button id="planner-reset" type="button">Clear</button></div>
      </fieldset></form>
    </div><footer class="planner-footer">${icon('hard-drive')} Saved on this computer. Your lesson stays open while you plan.</footer>`;
    document.body.append(dialog);
    const el = id => document.getElementById(id), icons = () => (0, cloud_student_rendering_js_1.renderPendingIcons)();
    const fields = ['title', 'subject', 'kind', 'date', 'reminder', 'notes'];
    const field = name => el(name === 'title' ? 'planner-task-title' : `planner-${name}`);
    let latest = null, current = null, identity = null, editing = null, dirty = false, busy = false, confirmAction = null, loading = false, summaryKey = '';
    function message(text, failure = false) { el('planner-message').textContent = text; el('planner-message').classList.toggle('planner-error', failure); }
    function confirmDiscard(action) {
        if (busy || loading)
            return;
        if (!dirty) {
            action();
            return;
        }
        el('planner-discard').querySelector('p').textContent = 'You have unsaved changes.';
        el('planner-discard-confirm').textContent = 'Discard changes';
        confirmAction = action;
        el('planner-discard').hidden = false;
        el('planner-keep').focus();
    }
    function close() { if (dialog.open)
        dialog.close(); el('planner-discard').hidden = true; confirmAction = null; }
    function reset(task = null) {
        editing = task?.id || null;
        dirty = false;
        confirmAction = null;
        el('planner-discard').hidden = true;
        const subject = latest?.school?.subjects?.find(s => s.id === latest?.session?.subjectId)?.title || '';
        const values = task ? { title: task.title, subject: task.subject, kind: task.kind, date: task.dueDate, reminder: task.reminder, notes: task.notes }
            : { title: '', subject, kind: 'homework', date: shiftDate(current?.date || latest?.planner?.date, 4), reminder: 'before-and-due', notes: '' };
        for (const name of fields)
            field(name).value = values[name];
        el('planner-editor-title').textContent = task ? 'Edit assignment' : 'Add an assignment';
        field('title').focus();
    }
    function button(text, symbol, action, label) {
        const node = document.createElement('button');
        node.type = 'button';
        node.innerHTML = icon(symbol);
        node.append(document.createTextNode(text));
        if (label)
            node.setAttribute('aria-label', label);
        node.addEventListener('click', action);
        return node;
    }
    function renderList() {
        const list = el('planner-list');
        list.replaceChildren();
        const filter = el('planner-filter').value;
        const tasks = (current?.tasks || []).filter(t => filter === 'all' || (filter === 'completed') === Boolean(t.completedAt));
        if (!tasks.length) {
            const empty = document.createElement('div');
            empty.className = 'planner-empty';
            empty.innerHTML = `${icon('notebook-pen')}<h4>${filter === 'completed' ? 'Finished work will appear here' : 'A little planning goes a long way'}</h4><p>${filter === 'completed' ? 'Mark an assignment complete when it is done.' : 'Add the assignments and dates mentioned in your lessons.'}</p>`;
            list.append(empty);
        }
        let group;
        for (const task of tasks) {
            if (group !== task.status) {
                group = task.status;
                const heading = document.createElement('h4');
                heading.className = 'planner-group-title';
                heading.textContent = { overdue: 'Overdue', today: 'Due today', tomorrow: 'Due tomorrow', upcoming: 'Coming up', completed: 'Completed' }[group];
                list.append(heading);
            }
            const card = document.createElement('article');
            card.className = `planner-task planner-task-${task.status}`;
            card.dataset.taskId = task.id;
            const title = document.createElement('h4');
            title.textContent = task.title;
            const meta = document.createElement('p');
            meta.className = 'planner-task-meta';
            meta.textContent = [task.subject, task.kind === 'test' ? 'Test or quiz' : task.kind, prettyDate(task.dueDate)].filter(Boolean).join(' · ');
            card.append(title, meta);
            if (task.notes) {
                const notes = document.createElement('p');
                notes.className = 'planner-task-notes';
                notes.textContent = task.notes;
                card.append(notes);
            }
            const actions = document.createElement('div');
            actions.className = 'planner-task-actions';
            actions.append(button(task.completedAt ? 'Reopen' : 'Done', task.completedAt ? 'undo-2' : 'check', () => confirmDiscard(() => change('complete', { id: task.id, completed: !task.completedAt })), `${task.completedAt ? 'Reopen' : 'Complete'} ${task.title}`), button('Edit', 'pencil', () => confirmDiscard(() => { reset(task); message(''); }), `Edit ${task.title}`), button('Remove', 'trash-2', () => confirmDiscard(() => {
                confirmAction = () => change('remove', { id: task.id });
                el('planner-discard').hidden = false;
                el('planner-discard').querySelector('p').textContent = `Remove “${task.title}” from your planner?`;
                el('planner-discard-confirm').textContent = 'Remove assignment';
                el('planner-keep').focus();
            }), `Remove ${task.title}`));
            card.append(actions);
            list.append(card);
        }
        icons();
    }
    function setBusy(value) {
        busy = value;
        el('planner-fields').disabled = value;
        el('planner-new').disabled = value;
        for (const b of el('planner-list').querySelectorAll('button'))
            b.disabled = value;
        dialog.setAttribute('aria-busy', String(value));
    }
    async function change(kind, input) {
        if (busy || !current)
            return;
        const who = identity;
        setBusy(true);
        message('Saving…');
        try {
            const result = await api.planner(kind, { ...input, studentId: who, revision: current.revision });
            if (identity !== who)
                return;
            current = result;
            reset();
            renderList();
            message(kind === 'remove' ? 'Assignment removed.' : kind === 'complete' ? input.completed ? 'Well done! Assignment completed.' : 'Assignment reopened.' : 'Assignment saved.');
        }
        catch (error) {
            if (identity === who)
                message(error.message, true);
        }
        finally {
            setBusy(false);
        }
    }
    async function open(taskId = null) {
        if (busy || loading || !latest?.planner?.canOpen)
            return;
        loading = true;
        const who = identity;
        try {
            const result = await api.planner('open', { studentId: who });
            if (identity !== who || !latest?.planner?.canOpen)
                return;
            current = result;
            dialog.showModal();
            el('planner-fields').disabled = false;
            renderList();
            message(current.error || '', !!current.error);
            if (!dirty)
                reset(taskId ? current.tasks.find(t => t.id === taskId) : null);
            else
                field('title').focus();
        }
        catch (error) {
            if (identity === who) {
                dialog.showModal();
                el('planner-fields').disabled = true;
                message(error.message, true);
            }
        }
        finally {
            loading = false;
        }
    }
    launch.addEventListener('click', () => open());
    schoolLaunch.addEventListener('click', () => open());
    el('planner-summary-open').addEventListener('click', () => open());
    el('planner-close').addEventListener('click', () => confirmDiscard(close));
    dialog.addEventListener('cancel', event => { event.preventDefault(); confirmDiscard(close); });
    el('planner-new').addEventListener('click', () => confirmDiscard(() => { reset(); message(''); }));
    el('planner-reset').addEventListener('click', () => confirmDiscard(() => reset()));
    el('planner-keep').addEventListener('click', () => { el('planner-discard').hidden = true; confirmAction = null; field('title').focus(); });
    el('planner-discard-confirm').addEventListener('click', () => { const action = confirmAction; dirty = false; confirmAction = null; el('planner-discard').hidden = true; action?.(); });
    el('planner-filter').addEventListener('change', renderList);
    el('planner-form').addEventListener('input', () => {
        dirty = true;
        el('planner-discard').querySelector('p').textContent = 'You have unsaved changes.';
        el('planner-discard-confirm').textContent = 'Discard changes';
    });
    el('planner-form').addEventListener('submit', event => {
        event.preventDefault();
        if (!el('planner-form').reportValidity())
            return;
        change('save', { id: editing || crypto.randomUUID(), title: field('title').value, subject: field('subject').value,
            kind: field('kind').value, dueDate: field('date').value, reminder: field('reminder').value, notes: field('notes').value });
    });
    return {
        render(value) {
            latest = value;
            const model = value.planner;
            const nextIdentity = model?.studentId || null;
            if (identity !== nextIdentity) {
                identity = nextIdentity;
                close();
                current = null;
                editing = null;
                dirty = false;
                for (const name of fields)
                    field(name).value = '';
                el('planner-list').replaceChildren();
                summaryKey = '';
            }
            const allowed = Boolean(model?.canOpen && !value.school?.locked && value.applicationReady !== false);
            if (launch.disabled !== !allowed)
                launch.disabled = !allowed;
            const schoolDisabled = !allowed || Boolean(value.session?.onBreak);
            if (schoolLaunch.disabled !== schoolDisabled)
                schoolLaunch.disabled = schoolDisabled;
            if (!allowed || value.session?.onBreak)
                close();
            if (summary.hidden !== !allowed)
                summary.hidden = !allowed;
            const key = JSON.stringify([model, value.school?.assignedSubjects]);
            if (key !== summaryKey) {
                summaryKey = key;
                const count = (model?.counts?.today || 0) + (model?.counts?.overdue || 0), badge = launch.querySelector('b');
                badge.hidden = !count;
                badge.textContent = String(count);
                el('planner-summary-count').textContent = model?.error ? model.error : count ? `${model.counts.today} due today · ${model.counts.overdue} overdue` : model?.counts?.open ? `${model.counts.open} assignment${model.counts.open === 1 ? '' : 's'} ahead` : 'Keep track of homework, tests and papers.';
                const upcoming = el('planner-upcoming');
                upcoming.replaceChildren();
                for (const task of model?.tasks || []) {
                    const b = button('', task.status === 'overdue' ? 'circle-alert' : 'calendar', () => open(task.id));
                    const label = document.createElement('span');
                    label.textContent = task.title;
                    const due = document.createElement('small');
                    due.textContent = `${task.dueLabel} · ${prettyDate(task.dueDate)}`;
                    b.append(label, due);
                    upcoming.append(b);
                }
                const options = el('planner-subjects');
                options.replaceChildren();
                for (const name of new Set((value.school?.assignedSubjects || value.school?.subjects || []).map(s => s.title))) {
                    const option = document.createElement('option');
                    option.value = name;
                    options.append(option);
                }
                icons();
            }
        }
    };
}

},
"renderer/js/cloud-student-chores.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountCloudStudentChores = mountCloudStudentChores;
const cloud_student_day_model_js_1 = require("renderer/js/cloud-student-day-model.js");
const cloud_student_rendering_js_1 = require("renderer/js/cloud-student-rendering.js");
const el = (tag, text = '', cls = '') => { const node = document.createElement(tag); node.textContent = text; node.className = cls; return node; };
const icon = name => { const node = el('i'); node.setAttribute('data-lucide', name); node.setAttribute('aria-hidden', 'true'); return node; };
const button = (label, run, cls = '') => { const node = el('button', label, cls); node.type = 'button'; node.onclick = event => void run(event); return node; };
const timeLabel = value => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value || '');
    if (!match)
        return value || '';
    const hour = Number(match[1]);
    return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? 'AM' : 'PM'}`;
};
const dateLabel = value => {
    if (!/^\d{4}-\d\d-\d\d$/.test(value || ''))
        return value || '';
    const date = new Date(`${value}T12:00:00`);
    return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
};
function mountCloudStudentChores({ api }) {
    let studentId = null, policy = null, data = null, pending = null, busy = false, key = '', opener = null;
    const card = button('', open, 'student-chore-card');
    card.hidden = true;
    const cardIcon = el('span', '', 'student-chore-card-icon');
    cardIcon.append(icon('list-checks'));
    const cardCopy = el('span', '', 'student-chore-card-copy');
    const cardTitle = el('strong', 'My chores');
    const cardSummary = el('span', 'Open to see chores and mark them done');
    cardCopy.append(cardTitle, cardSummary);
    card.append(cardIcon, cardCopy, icon('chevron-right'));
    document.querySelector('#dashboard-screen .dashboard-header')?.after(card);
    const shortcut = button('', open, 'header-btn student-chores-shortcut');
    shortcut.title = 'My chores';
    shortcut.setAttribute('aria-label', 'My chores');
    shortcut.append(icon('list-checks'));
    shortcut.hidden = true;
    document.querySelector('.header-right')?.append(shortcut);
    const dialog = el('dialog', '', 'student-chores-dialog');
    dialog.setAttribute('aria-labelledby', 'student-chores-title');
    const header = el('div', '', 'student-chores-header');
    const heading = el('div', '', 'student-chores-heading');
    const headingIcon = el('span', '', 'student-chores-heading-icon');
    headingIcon.append(icon('list-checks'));
    const headingCopy = el('div');
    const title = el('h2', 'My chores');
    title.id = 'student-chores-title';
    headingCopy.append(title, el('p', 'Mark each chore done when you finish it. We will remind you near its start and if it stays unfinished.'));
    heading.append(headingIcon, headingCopy);
    const actions = el('div', '', 'student-chores-header-actions');
    const refresh = button('', load, 'student-chores-icon-button');
    refresh.title = 'Refresh chores';
    refresh.setAttribute('aria-label', 'Refresh chores');
    refresh.append(icon('refresh-cw'));
    const close = button('Close', () => dialog.close(), 'student-chores-icon-button student-chores-close');
    close.title = 'Close chores';
    close.setAttribute('aria-label', 'Close chores');
    close.prepend(icon('x'));
    actions.append(refresh, close);
    header.append(heading, actions);
    const message = el('p', '', 'student-chores-message');
    message.setAttribute('role', 'status');
    message.setAttribute('aria-live', 'polite');
    const list = el('div', '', 'student-chores-list');
    dialog.append(header, message, list);
    document.body.append(dialog);
    dialog.addEventListener('close', () => opener?.focus());
    (0, cloud_student_rendering_js_1.renderPendingIcons)(card);
    (0, cloud_student_rendering_js_1.renderPendingIcons)(shortcut);
    (0, cloud_student_rendering_js_1.renderPendingIcons)(header);
    function renderSummary(items) {
        if (card.dataset.overview === 'true') {
            const summary = (0, cloud_student_day_model_js_1.compactChoreSummary)(Array.isArray(data?.items) || Array.isArray(policy?.items) ? items : undefined, pending);
            if (cardSummary.textContent !== summary)
                cardSummary.textContent = summary;
            return;
        }
        const ready = items.filter(row => row.available && row.status !== 'submitted');
        const upcoming = items.filter(row => row.status === 'upcoming');
        const waiting = items.filter(row => row.status === 'submitted').length;
        const summary = ready.length ? `${ready[0].definition?.title || 'A chore'} is ready — open to mark done${ready.length > 1 ? ` · ${ready.length} total` : ''}` :
            waiting ? `${waiting} waiting for parent approval` :
                upcoming.length ? `${upcoming[0].definition?.title || 'A chore'} starts at ${timeLabel(upcoming[0].definition?.startTime)}` : 'All caught up';
        if (cardSummary.textContent !== summary)
            cardSummary.textContent = summary;
    }
    function render() {
        list.replaceChildren();
        const items = data?.items || policy?.items || [];
        renderSummary(items);
        if (pending) {
            const saved = el('section', '', 'student-chores-saved');
            saved.append(icon('cloud-off'), el('p', 'Your check-off is saved on this computer. Send it when you are connected; rewards wait until the server confirms it.'));
            const savedActions = el('div', '', 'student-chores-saved-actions');
            savedActions.append(button('Send saved check-off', () => run('retry')), button('Clear saved check-off', () => run('discard', { requestId: pending.requestId })));
            saved.append(savedActions);
            list.append(saved);
        }
        const groups = [['Today', items.filter(row => row.status !== 'upcoming' && row.date)], ['Coming up', items.filter(row => row.status === 'upcoming')], ['Completed', (data?.history || []).filter(row => row.status === 'approved' || row.status === 'excused').slice(0, 20)]];
        for (const [name, rows] of groups) {
            if (!rows.length)
                continue;
            const group = el('section', '', 'student-chores-group');
            group.append(el('h3', name));
            for (const row of rows) {
                const def = row.definition || {}, section = el('article', '', `student-chores-item student-chores-item-${row.status || 'open'}`);
                const top = el('div', '', 'student-chores-item-top');
                const description = el('div', '', 'student-chores-item-heading');
                description.append(el('h4', def.title || 'Chore'));
                const time = [dateLabel(row.date), [timeLabel(def.startTime), timeLabel(def.dueTime)].filter(Boolean).join('–')].filter(Boolean).join(' · ');
                if (time)
                    description.append(el('p', time, 'student-chores-time'));
                top.append(description);
                if (Number(def.coins) > 0) {
                    const coins = el('span', `+${def.coins} coins`, 'student-chores-coins');
                    coins.prepend(icon('coins'));
                    top.append(coins);
                }
                section.append(top);
                if (def.instructions)
                    section.append(el('p', def.instructions, 'student-chores-instructions'));
                const labels = { submitted: 'Waiting for parent approval', upcoming: 'Upcoming', overdue: 'Past the deadline', returned: 'Try again', approved: 'Done', excused: 'Excused', open: 'Ready to do' };
                const state = el('div', '', `student-chores-state student-chores-state-${row.status || 'open'}`);
                state.append(icon(row.status === 'approved' || row.status === 'excused' ? 'circle-check' : row.status === 'submitted' ? 'hourglass' : 'clock-3'), el('span', labels[row.status] || 'Ready to do'));
                section.append(state);
                if (row.note)
                    section.append(el('p', row.note, 'student-chores-note'));
                if (row.penaltyAssessed)
                    section.append(el('p', row.penaltyRefunded ? 'Your parent refunded the missed check-off deduction.' : row.penaltyAmount ? `${row.penaltyAmount} coins were deducted for missing the deadline.` : 'The deadline passed; there were no coins to deduct.', 'student-chores-note'));
                if (row.blocking && Array.isArray(def.targets) && def.targets.length)
                    section.append(el('p', `${def.targets.join(', ')} ${def.targets.length === 1 ? 'is' : 'are'} paused until ${def.approvalRequired ? 'your parent approves this chore' : 'you finish this chore'}.`, 'student-chores-restriction'));
                if (!['submitted', 'approved', 'excused'].includes(row.status)) {
                    const done = button('Mark done', () => run('submit', { id: row.id, date: row.date, revision: row.revision }), 'student-chores-done');
                    done.prepend(icon('check'));
                    done.disabled = !row.available || !!pending || busy;
                    section.append(done);
                    if (!row.available && row.status === 'upcoming')
                        section.append(el('p', `You can mark this done starting at ${timeLabel(def.startTime)}.`, 'student-chores-help'));
                    else if (pending)
                        section.append(el('p', 'Send or clear your saved check-off first.', 'student-chores-help'));
                }
                group.append(section);
            }
            list.append(group);
        }
        if (!items.some(row => row.date) && !data?.history?.length) {
            const empty = el('div', '', 'student-chores-empty');
            empty.append(icon('sparkles'), el('p', 'No chores assigned right now.'));
            list.append(empty);
        }
        (0, cloud_student_rendering_js_1.renderPendingIcons)(list);
    }
    async function run(kind, input = {}) {
        if (busy || !studentId)
            return;
        const who = studentId;
        busy = true;
        refresh.disabled = true;
        list.querySelectorAll('button').forEach(control => { control.disabled = true; });
        try {
            const result = await api.chores(kind, { ...input, studentId: who });
            if (who !== studentId)
                return;
            if (Array.isArray(result?.items))
                data = result;
            pending = await api.chores('pending', { studentId: who });
            message.textContent = kind === 'submit' || kind === 'retry' ? 'Check-off saved. Your parent will approve it if needed.' : 'Chores updated.';
        }
        catch (error) {
            if (who === studentId) {
                message.textContent = error.message;
                pending = await api.chores('pending', { studentId: who }).catch(() => pending);
            }
        }
        finally {
            busy = false;
            refresh.disabled = false;
            if (who === studentId)
                render();
        }
    }
    function load() { return run('list'); }
    function open(event) { if (!policy?.enabled)
        return; opener = event?.currentTarget || card; message.textContent = ''; render(); if (!dialog.open)
        dialog.showModal(); void load(); }
    window.addEventListener('cloud-student-status', event => {
        const school = event.detail?.school, next = school?.student?.id || null;
        if (studentId !== next) {
            studentId = next;
            data = null;
            pending = null;
            key = '';
            if (dialog.open)
                dialog.close();
        }
        policy = school?.chores;
        const hidden = !studentId || !policy?.enabled;
        if (card.hidden !== hidden)
            card.hidden = hidden;
        if (shortcut.hidden !== hidden)
            shortcut.hidden = hidden;
        if (hidden) {
            if (dialog.open)
                dialog.close();
            return;
        }
        const items = policy.items || [];
        renderSummary(items);
        const nextKey = JSON.stringify([policy.revision, items.map(row => [row.id, row.status, row.available, row.blocking])]);
        if (key !== nextKey) {
            key = nextKey;
            data = null;
            if (dialog.open) {
                render();
                void load();
            }
        }
    });
}

},
"renderer/js/cloud-student-sleep.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountCloudStudentSleep = mountCloudStudentSleep;
function mountCloudStudentSleep({ api }) {
    const button = document.getElementById('dash-sleep-btn');
    button.type = 'button';
    button.setAttribute('aria-label', 'Put this computer to sleep');
    const dialog = document.createElement('dialog');
    dialog.id = 'cloud-student-sleep';
    dialog.className = 'cloud-student-sleep';
    dialog.setAttribute('aria-labelledby', 'cloud-sleep-title');
    dialog.setAttribute('aria-describedby', 'cloud-sleep-help');
    dialog.innerHTML = `<i data-lucide="moon" aria-hidden="true"></i>
    <h2 id="cloud-sleep-title">Computer sleeps in</h2>
    <p id="cloud-sleep-countdown" role="timer">10 seconds</p>
    <progress max="10" value="10" aria-label="Time until sleep"></progress>
    <p id="cloud-sleep-help">Your work stays open. You can cancel before the countdown ends.</p>
    <button id="cloud-sleep-cancel" type="button">Don't go to sleep</button>`;
    document.body.append(dialog);
    const title = dialog.querySelector('h2'), count = dialog.querySelector('[role="timer"]');
    const help = dialog.querySelector('#cloud-sleep-help'), cancel = dialog.querySelector('button');
    const progress = dialog.querySelector('progress');
    let timer = null, deadline = 0, busy = false, generation = 0;
    function stopTimer() { window.clearInterval(timer); timer = null; }
    function close() {
        stopTimer();
        generation++;
        busy = false;
        if (dialog.open)
            dialog.close();
    }
    async function sleep() {
        stopTimer();
        busy = true;
        const ticket = ++generation;
        title.textContent = 'Going to sleep…';
        count.textContent = '';
        progress.hidden = true;
        cancel.disabled = true;
        help.textContent = 'Waiting for Windows. When you come back, tap the power button once to wake your computer.';
        try {
            const result = await api.sleepComputer();
            if (ticket !== generation)
                return;
            if (result?.success !== true)
                throw Error(result?.error || 'Windows could not confirm sleep. Please try again.');
            close();
        }
        catch (error) {
            if (ticket !== generation)
                return;
            busy = false;
            title.textContent = 'Sleep could not start';
            count.textContent = 'Computer is still awake';
            help.textContent = error.message;
            cancel.textContent = 'Back to dashboard';
            cancel.disabled = false;
        }
    }
    function tick() {
        const seconds = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
        count.textContent = `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
        progress.value = seconds;
        if (!seconds)
            void sleep();
    }
    button.addEventListener('click', () => {
        if (dialog.open || busy)
            return;
        deadline = performance.now() + 10000;
        title.textContent = 'Computer sleeps in';
        help.textContent = 'Your work stays open. You can cancel before the countdown ends.';
        cancel.textContent = "Don't go to sleep";
        cancel.disabled = false;
        progress.hidden = false;
        tick();
        dialog.showModal();
        cancel.focus();
        timer = window.setInterval(tick, 100);
    });
    cancel.addEventListener('click', () => { if (!busy)
        close(); });
    dialog.addEventListener('cancel', event => { event.preventDefault(); if (!busy)
        close(); });
    // A queued close event from the previous countdown may arrive after reopen.
    dialog.addEventListener('close', () => { if (!dialog.open)
        stopTimer(); });
    // A system/lid sleep during the countdown must not re-trigger sleep on wake.
    api.onPowerState?.(state => { if (state === 'resume' || state === 'suspend' && !busy)
        close(); });
    window.addEventListener('cloud-student-status', event => {
        if (!busy && (event.detail.applicationReady === false || event.detail.school?.locked))
            close();
    });
    window.addEventListener('cloud-student-surface', close);
    window.addEventListener('pagehide', close);
}

},
"renderer/js/cloud-school-close-dialog.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountCloudSchoolClose = mountCloudSchoolClose;
/* global document, window */
// Keep this confirmation in the protected shell. A native window.confirm blocks
// the renderer and can contend with kiosk foreground recovery for its parent.
function mountCloudSchoolClose({ api, button, getStatus, onError }) {
    const dialog = document.createElement('dialog');
    dialog.id = 'cloud-school-close';
    dialog.className = 'cloud-school-close';
    dialog.setAttribute('aria-labelledby', 'cloud-school-close-title');
    dialog.setAttribute('aria-describedby', 'cloud-school-close-help');
    dialog.innerHTML = '<button type="button" id="cloud-school-close-dismiss" aria-label="Keep school paused">×</button>' +
        '<h2 id="cloud-school-close-title">Close this school page?</h2>' +
        '<p id="cloud-school-close-help">Your paused video or unfinished answers may be lost. Choose Keep school paused to come back to them later.</p>' +
        '<div class="cloud-school-close-actions"><button type="button" id="cloud-school-close-keep" autofocus>Keep school paused</button>' +
        '<button type="button" id="cloud-school-close-end">Close school page</button></div>';
    document.body.append(dialog);
    const keep = dialog.querySelector('#cloud-school-close-keep');
    let pending = null, busy = false;
    function identity(value) {
        const session = value?.session, child = value?.school?.student?.id;
        if (!child || value.applicationReady === false || value.school.locked || !session?.subjectId || !session.suspended || session.generation == null)
            return null;
        return { child, subject: session.subjectId, generation: session.generation };
    }
    function same(value) {
        const current = identity(value);
        return Boolean(pending && current && pending.child === current.child && pending.subject === current.subject && pending.generation === current.generation);
    }
    function close() {
        pending = null;
        if (dialog.open)
            dialog.close();
    }
    button.addEventListener('click', () => {
        if (dialog.open || busy)
            return;
        pending = identity(getStatus());
        if (!pending)
            return;
        dialog.showModal();
        keep.focus({ preventScroll: true });
    });
    keep.addEventListener('click', close);
    dialog.querySelector('#cloud-school-close-dismiss').addEventListener('click', close);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('click', event => {
        const bounds = dialog.getBoundingClientRect();
        if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom))
            close();
    });
    dialog.querySelector('#cloud-school-close-end').addEventListener('click', async () => {
        if (!dialog.open || busy || !same(getStatus())) {
            close();
            return;
        }
        // Dismiss before the asynchronous host call: even a failed/slow checkpoint
        // cannot trap the child behind disabled modal buttons. Send exactly once.
        close();
        busy = true;
        button.disabled = true;
        try {
            await api.pause(true);
        }
        catch (error) {
            onError(error);
        }
        finally {
            busy = false;
            button.disabled = false;
        }
    });
    window.addEventListener('cloud-student-surface', close);
    window.addEventListener('pagehide', close);
    return { render(value) { if (dialog.open && !same(value))
            close(); } };
}

},
"renderer/js/cloud-white-noise.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountWhiteNoise = mountWhiteNoise;
const cloud_student_rendering_js_1 = require("renderer/js/cloud-student-rendering.js");
function mountWhiteNoise({ api }) {
    const element = (tag, text = '', className = '') => { const node = document.createElement(tag); node.textContent = text; node.className = className; return node; };
    const button = (label, glyph) => { const node = element('button', '', 'toolbar-btn'); node.type = 'button'; const icon = element('i'); icon.dataset.lucide = glyph; icon.setAttribute('aria-hidden', 'true'); node.append(icon, element('span', label)); return node; };
    const dialog = element('dialog', '', 'white-noise-dialog'), header = element('div', '', 'white-noise-heading');
    const title = element('h2', 'White Noise');
    title.id = 'white-noise-title';
    dialog.setAttribute('aria-labelledby', title.id);
    const close = button('Keep studying', 'x');
    close.addEventListener('click', () => dialog.close());
    header.append(title, close);
    const intro = element('p', 'Choose a sound below, then press Play. The first play downloads the MP3 once so it can keep working offline. White Noise can stay on during Abeka. No music time is used.');
    const tools = element('div', '', 'white-noise-tools'), refresh = button('Refresh tracks', 'refresh-cw');
    const panelToggle = button('Choose a sound below', 'play');
    panelToggle.classList.add('white-noise-primary');
    const panelPlayIcon = panelToggle.querySelector('i');
    panelPlayIcon.className = 'white-noise-panel-play-icon';
    const panelPauseIcon = element('i', '', 'white-noise-panel-pause-icon');
    panelPauseIcon.dataset.lucide = 'pause';
    panelPauseIcon.setAttribute('aria-hidden', 'true');
    panelToggle.prepend(panelPauseIcon);
    const volumeLabel = element('label', 'Volume'), volume = element('input');
    volume.type = 'range';
    volume.min = '0';
    volume.max = '100';
    volume.value = '25';
    volume.setAttribute('aria-label', 'White Noise volume');
    volumeLabel.append(volume);
    const status = element('p', '', 'white-noise-status');
    status.setAttribute('role', 'status');
    const tracks = element('div', '', 'white-noise-tracks');
    tools.append(panelToggle, volumeLabel, refresh);
    dialog.append(header, intro, tools, status, tracks);
    document.body.append(dialog);
    const audio = element('audio');
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = .25;
    dialog.append(audio);
    const dock = element('div', '', 'white-noise-dock');
    dock.hidden = true;
    dock.setAttribute('role', 'group');
    dock.setAttribute('aria-label', 'White Noise controls');
    const launcher = button('White Noise', 'waves');
    launcher.id = 'white-noise-launcher';
    launcher.title = 'Open White Noise';
    launcher.setAttribute('aria-label', 'Open White Noise');
    launcher.setAttribute('aria-haspopup', 'dialog');
    launcher.querySelector('span').className = 'white-noise-launcher-label';
    const toggle = button('Pause White Noise', 'pause');
    toggle.id = 'white-noise-toggle';
    toggle.hidden = true;
    toggle.querySelector('span').hidden = true;
    toggle.querySelector('i').className = 'white-noise-pause-icon';
    const playIcon = element('i', '', 'white-noise-play-icon');
    playIcon.dataset.lucide = 'play';
    playIcon.setAttribute('aria-hidden', 'true');
    toggle.append(playIcon);
    dock.append(launcher, toggle);
    document.body.append(dock);
    let allowed = false, identity = '', familiar = false, playingId = null, selectedTitle = '', loading = false, sourceUrl = null, generation = 0, library = [], initializedVolume = false, catalogLoaded = false;
    const familiarKey = () => `bodeeguard.white-noise.opened:${identity}`;
    function updateButtons() {
        panelToggle.disabled = !playingId || loading;
        panelToggle.classList.toggle('is-paused', audio.paused);
        panelToggle.querySelector('span').textContent = !playingId ? 'Choose a sound below' : audio.paused ? `Play ${selectedTitle}` : `Pause ${selectedTitle}`;
        dock.hidden = !allowed || dialog.open;
        dock.classList.toggle('is-familiar', familiar);
        dock.classList.toggle('is-playing', !audio.paused);
        launcher.setAttribute('aria-expanded', String(dialog.open));
        launcher.title = playingId ? `${audio.paused ? 'Paused' : 'Playing'}: ${selectedTitle} · White Noise` : 'Open White Noise';
        toggle.hidden = !playingId;
        toggle.disabled = loading;
        toggle.classList.toggle('is-paused', audio.paused);
        const toggleLabel = audio.paused ? 'Play White Noise' : 'Pause White Noise';
        toggle.title = toggleLabel;
        toggle.setAttribute('aria-label', toggleLabel);
        for (const node of tracks.querySelectorAll('button')) {
            const selected = node.dataset.id === playingId, action = node.querySelector('.white-noise-track-action');
            node.disabled = loading || !allowed;
            node.classList.toggle('white-noise-selected', selected && !audio.paused);
            node.setAttribute('aria-pressed', String(selected && !audio.paused));
            if (action && selected && sourceUrl)
                action.textContent = audio.paused ? 'Play now · saved on this computer' : 'Pause now';
        }
        refresh.disabled = loading;
    }
    function release() { generation++; audio.pause(); audio.removeAttribute('src'); audio.load(); if (sourceUrl)
        URL.revokeObjectURL(sourceUrl); sourceUrl = null; playingId = null; selectedTitle = ''; updateButtons(); }
    function stopSelected() { if (!sourceUrl)
        return; audio.pause(); audio.currentTime = 0; status.textContent = `${selectedTitle} stopped. Press Play when you are ready.`; updateButtons(); }
    async function togglePlayback() {
        if (!allowed || !playingId || loading)
            return;
        if (!sourceUrl) {
            const track = library.find(item => item.id === playingId);
            if (track)
                await prepare(track, true);
            return;
        }
        try {
            if (audio.paused)
                await audio.play();
            else
                audio.pause();
            status.textContent = audio.paused ? 'White Noise paused. Press Play to continue.' : 'Sound keeps playing while you study.';
        }
        catch (error) {
            status.textContent = error.message;
        }
        finally {
            updateButtons();
        }
    }
    async function prepare(track, autoplay) {
        if (!allowed || loading)
            return;
        if (playingId === track.id && sourceUrl) {
            if (autoplay)
                await togglePlayback();
            return;
        }
        release();
        playingId = track.id;
        selectedTitle = track.title;
        const attempt = generation;
        loading = true;
        status.textContent = track.cached ? 'Opening saved track…' : `Downloading ${track.title} once for this computer…`;
        updateButtons();
        try {
            const result = await api.whiteNoise({ action: 'audio', id: track.id });
            if (attempt !== generation || !allowed)
                return;
            sourceUrl = URL.createObjectURL(new Blob([result.bytes], { type: 'audio/mpeg' }));
            audio.src = sourceUrl;
            track.cached = true;
            if (autoplay) {
                await audio.play();
                status.textContent = 'Playing ' + track.title + '. You can close this panel and keep studying.';
            }
            else
                status.textContent = `${track.title} is ready. Press Play to begin.`;
            const action = [...tracks.querySelectorAll('button')].find(node => node.dataset.id === track.id)?.querySelector('.white-noise-track-action');
            if (action)
                action.textContent = autoplay ? 'Pause now' : 'Play now · saved on this computer';
        }
        catch (error) {
            if (attempt === generation) {
                release();
                status.textContent = error.message;
            }
        }
        finally {
            loading = false;
            updateButtons();
        }
    }
    async function play(track) { if (playingId === track.id && sourceUrl) {
        await togglePlayback();
        return;
    } await prepare(track, true); }
    async function load(force = false) {
        if (!allowed || loading)
            return;
        loading = true;
        const attempt = generation;
        if (dialog.open)
            status.textContent = 'Opening White Noise…';
        updateButtons();
        try {
            const result = await api.whiteNoise({ action: 'list', refresh: force });
            if (!allowed || attempt !== generation)
                return;
            library = result.tracks;
            catalogLoaded = true;
            if (playingId && !library.some(track => track.id === playingId))
                release();
            if (!initializedVolume && Number.isFinite(result.volume)) {
                audio.volume = result.volume;
                volume.value = String(Math.round(result.volume * 100));
                initializedVolume = true;
            }
            tracks.replaceChildren();
            for (const track of library) {
                const choice = button(track.title, 'play');
                choice.dataset.id = track.id;
                const action = element('small', track.cached ? 'Play now · saved on this computer' : 'Download & play · saves for offline use', 'white-noise-track-action');
                choice.append(action);
                choice.addEventListener('click', () => void play(track).catch(error => { status.textContent = error.message; }));
                tracks.append(choice);
            }
            status.textContent = !library.length ? 'Your parent can add MP3 tracks in White Noise on the parent dashboard.' : result.offline ? 'Showing your saved library. Choose a sound and press Play.' : playingId ? (audio.paused ? 'White Noise paused. Press Play to continue.' : 'Sound keeps playing while you study.') : 'Choose a sound below. BodeeGuard downloads it the first time you press it.';
            (0, cloud_student_rendering_js_1.renderPendingIcons)(tracks);
        }
        catch (error) {
            if (attempt === generation)
                status.textContent = error.message;
        }
        finally {
            loading = false;
            updateButtons();
        }
    }
    async function restore() {
        if (!allowed || loading || playingId)
            return;
        loading = true;
        const attempt = generation;
        updateButtons();
        try {
            const result = await api.whiteNoise({ action: 'selection' });
            if (!allowed || attempt !== generation)
                return;
            if (!initializedVolume && Number.isFinite(result.volume)) {
                audio.volume = result.volume;
                volume.value = String(Math.round(result.volume * 100));
                initializedVolume = true;
            }
            if (result.track) {
                library = [result.track];
                playingId = result.track.id;
                selectedTitle = result.track.title;
                updateButtons();
                if (result.track.cached) {
                    loading = false;
                    await prepare(result.track, false);
                }
            }
        }
        catch (error) {
            if (attempt === generation && dialog.open)
                status.textContent = error.message;
        }
        finally {
            loading = false;
            updateButtons();
            if (dialog.open && !catalogLoaded)
                void load();
        }
    }
    function open() {
        if (!allowed)
            return;
        if (!dialog.open)
            dialog.showModal();
        if (!familiar) {
            familiar = true;
            try {
                localStorage.setItem(familiarKey(), '1');
            }
            catch { /* A cosmetic hint must not prevent playback. */ }
        }
        updateButtons();
        if (!catalogLoaded)
            void load();
    }
    dialog.addEventListener('close', () => { updateButtons(); if (allowed)
        launcher.focus({ preventScroll: true }); });
    launcher.addEventListener('click', open);
    toggle.addEventListener('click', () => void togglePlayback());
    panelToggle.addEventListener('click', () => void togglePlayback());
    refresh.addEventListener('click', () => void load(true));
    volume.addEventListener('input', () => { audio.volume = Number(volume.value) / 100; });
    volume.addEventListener('change', () => { void api.whiteNoise({ action: 'volume', volume: audio.volume }).catch(() => { status.textContent = 'Volume changed, but it could not be saved on this computer.'; }); });
    audio.addEventListener('error', () => { if (sourceUrl) {
        release();
        status.textContent = 'This MP3 could not play. Ask your parent to check the file.';
    } });
    audio.addEventListener('pause', updateButtons);
    audio.addEventListener('play', updateButtons);
    api.onPowerState?.(state => { if (state === 'suspend')
        stopSelected(); });
    window.addEventListener('beforeunload', release);
    return { open, render(value) {
            const nextIdentity = JSON.stringify([value.account?.deviceId, value.school?.student?.id]);
            const nextAllowed = value.whiteNoise?.allowed === true && value.applicationReady !== false && Boolean(value.school?.student?.id) && value.startup?.state !== 'loading';
            if (nextIdentity === identity && nextAllowed === allowed)
                return;
            if (nextIdentity !== identity) {
                familiar = false;
                try {
                    familiar = localStorage.getItem(`bodeeguard.white-noise.opened:${nextIdentity}`) === '1';
                }
                catch { /* The introduction can still be dismissed for this session. */ }
            }
            if (nextIdentity !== identity || !nextAllowed) {
                if (sourceUrl || loading || playingId)
                    release();
                if (dialog.open)
                    dialog.close();
                if (nextIdentity !== identity) {
                    tracks.replaceChildren();
                    library = [];
                    initializedVolume = false;
                    catalogLoaded = false;
                }
                identity = nextIdentity;
            }
            allowed = nextAllowed;
            updateButtons();
            if (allowed)
                void restore();
        } };
}

},
"renderer/js/cloud-student-bug-report.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountStudentBugReport = mountStudentBugReport;
function mountStudentBugReport({ api }) {
    const dialog = document.createElement('dialog');
    dialog.className = 'cloud-bug-dialog';
    dialog.id = 'student-bug-report';
    dialog.setAttribute('aria-labelledby', 'student-bug-title');
    dialog.innerHTML = '<button type="button" class="cloud-bug-close" aria-label="Close report">×</button><h2 id="student-bug-title">Report a problem</h2><p>Your parent will get this screenshot. They can help or send it to BodeeGuard.</p><img class="cloud-bug-preview" alt="Screenshot to send to your parent"><label for="student-bug-note">What happened? <small>Optional</small></label><textarea id="student-bug-note" rows="3" maxlength="3000" placeholder="I clicked… and then…"></textarea><p class="cloud-bug-status" role="status" aria-live="polite"></p><div class="cloud-bug-actions"><button type="button" data-action="discard">Cancel report</button><button type="button" data-action="send">Send to my parent</button></div>';
    document.body.append(dialog);
    const note = dialog.querySelector('textarea'), status = dialog.querySelector('[role=status]'), preview = dialog.querySelector('img'), send = dialog.querySelector('[data-action=send]'), discard = dialog.querySelector('[data-action=discard]');
    let current = null, blobUrl = null, busy = false, child = null;
    function clear() { current = null; note.value = ''; note.disabled = false; if (blobUrl)
        URL.revokeObjectURL(blobUrl); blobUrl = null; preview.removeAttribute('src'); }
    function render(value) { current = value; if (blobUrl)
        URL.revokeObjectURL(blobUrl); blobUrl = URL.createObjectURL(new Blob([Uint8Array.from(atob(value.data), c => c.charCodeAt(0))], { type: 'image/jpeg' })); preview.src = blobUrl; note.value = value.description; note.disabled = value.frozen; send.textContent = value.frozen ? 'Retry sending' : 'Send to my parent'; status.textContent = value.error || (value.frozen ? 'This report is saved on this computer and waiting to send.' : 'Only this BodeeGuard screen is included. Check it before sending.'); }
    async function open() { if (busy)
        return; busy = true; try {
        if (!current)
            render(await api.bugReport('capture'));
        dialog.showModal();
        note.focus({ preventScroll: true });
    }
    catch (error) {
        window.showToast?.(error.message);
    }
    finally {
        busy = false;
    } }
    for (const target of [document.querySelector('.cloud-header-device'), document.querySelector('#subject-toolbar .toolbar-actions')]) {
        if (!target)
            continue;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = target.classList.contains('cloud-header-device') ? 'header-btn cloud-bug-button' : 'toolbar-btn cloud-bug-button';
        button.title = 'Report a problem';
        button.setAttribute('aria-label', 'Report a problem');
        button.innerHTML = '<i data-lucide="bug" aria-hidden="true"></i><span>Report a problem</span>';
        button.addEventListener('click', () => void open());
        target.append(button);
    }
    dialog.querySelector('.cloud-bug-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('cancel', event => { event.preventDefault(); dialog.close(); });
    discard.addEventListener('click', async () => { if (busy)
        return; busy = true; try {
        await api.bugReport('discard', { id: current.id });
        clear();
        dialog.close();
    }
    catch (error) {
        status.textContent = error.message;
    }
    finally {
        busy = false;
    } });
    send.addEventListener('click', async () => {
        if (busy || !current)
            return;
        busy = true;
        send.disabled = discard.disabled = true;
        note.disabled = true;
        status.textContent = 'Sending to your parent…';
        try {
            const result = await api.bugReport('send', { id: current.id, description: note.value });
            if (result?.sent) {
                clear();
                status.textContent = 'Sent to your parent. Thank you for telling them!';
                send.hidden = discard.hidden = true;
            }
            else {
                current.frozen = true;
                current.description = note.value;
                send.textContent = 'Retry sending';
                status.textContent = result?.error || 'Saved here. We will try again when connected.';
            }
        }
        catch (error) {
            status.textContent = error.message;
            note.disabled = current?.frozen === true;
        }
        finally {
            busy = false;
            send.disabled = discard.disabled = false;
        }
    });
    dialog.addEventListener('close', () => { send.hidden = discard.hidden = false; });
    api.onBugReport?.(value => { if (value.sent && current?.id === value.id) {
        clear();
        status.textContent = 'Sent to your parent. Thank you for telling them!';
        send.hidden = discard.hidden = true;
        if (!dialog.open)
            window.showToast?.('Problem report sent to your parent.');
    } });
    window.addEventListener('cloud-student-status', event => { const next = event.detail?.school?.student?.id; if (child && next !== child) {
        dialog.close();
        clear();
    } child = next; });
    window.addEventListener('pagehide', () => { if (blobUrl)
        URL.revokeObjectURL(blobUrl); });
}

},
"renderer/js/cloud-student-messages.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const student_messages_js_1 = require("renderer/js/shared/student-messages.js");
const message_thread_js_1 = require("renderer/js/message-thread.js");
const message_reactions_js_1 = require("renderer/js/message-reactions.js");
const cloud_student_chat_layout_js_1 = require("renderer/js/cloud-student-chat-layout.js");
const api = window.cloudPilot, el = id => document.getElementById(id);
let state = null, older = [], cursor;
const visible = () => !el('student-messages-panel').hidden && !document.hidden;
const conversationVisible = () => visible() && (!matchMedia('(max-width:700px)').matches || panel.classList.contains('student-chat-open'));
const panel = el('student-messages-panel');
const privateTools = el('message-refresh').parentElement;
privateTools.id = 'message-private-tools';
const tabs = document.createElement('div');
tabs.className = 'family-message-tabs';
tabs.setAttribute('role', 'group');
tabs.setAttribute('aria-label', 'Choose a conversation');
tabs.innerHTML = '<button id="message-private-tab" type="button" aria-pressed="true">Mom &amp; Dad</button><button id="message-family-tab" type="button" aria-pressed="false">Family conversation</button>';
privateTools.before(tabs);
const privateChat = panel.querySelector('.chat-wrapper');
const familyChat = document.createElement('div');
familyChat.id = 'family-chat-wrapper';
familyChat.className = 'family-chat-wrapper';
familyChat.hidden = true;
familyChat.innerHTML = '<header><i data-lucide="users" aria-hidden="true"></i><div><h1>Family conversation</h1><p>Messages here are visible to all children and parents.</p></div></header><div id="family-history" role="log" aria-label="Family messages"></div><div class="family-compose"><p id="family-message-permission">Only parents can post here right now.</p><form id="family-message-form" hidden><label for="family-message-input">Message everyone</label><div><textarea id="family-message-input" maxlength="2000" rows="2" placeholder="Message the family…"></textarea><button id="family-message-send" type="submit"><i data-lucide="send" aria-hidden="true"></i> Send</button></div></form><p id="family-message-status" role="status"></p><button id="family-message-older" type="button" disabled>Older family messages</button></div>';
privateChat.after(familyChat);
window.lucide?.createIcons();
const groupTabs = document.createElement('div');
groupTabs.className = 'message-group-tabs';
groupTabs.setAttribute('aria-label', 'Your group conversations');
tabs.after(groupTabs);
const siblingPicker = document.createElement('div');
siblingPicker.className = 'message-sibling-picker';
siblingPicker.hidden = true;
const siblingLabel = document.createElement('label');
siblingLabel.textContent = 'Chat with a sibling';
siblingLabel.htmlFor = 'message-sibling-select';
const siblingSelect = document.createElement('select');
siblingSelect.id = 'message-sibling-select';
const siblingStart = document.createElement('button');
siblingStart.type = 'button';
siblingStart.textContent = 'Open chat';
const siblingStatus = document.createElement('span');
siblingStatus.setAttribute('role', 'status');
siblingPicker.append(siblingLabel, siblingSelect, siblingStart, siblingStatus);
groupTabs.after(siblingPicker);
const siblingGroupPicker = document.createElement('details');
siblingGroupPicker.className = 'message-sibling-group-picker';
siblingGroupPicker.hidden = true;
const siblingGroupSummary = document.createElement('summary');
siblingGroupSummary.textContent = 'Start a sibling group';
const siblingGroupChoices = document.createElement('div');
siblingGroupChoices.className = 'message-sibling-group-choices';
const siblingGroupStart = document.createElement('button');
siblingGroupStart.type = 'button';
siblingGroupStart.textContent = 'Open group chat';
const siblingGroupStatus = document.createElement('p');
siblingGroupStatus.setAttribute('role', 'status');
siblingGroupPicker.append(siblingGroupSummary, siblingGroupChoices, siblingGroupStart, siblingGroupStatus);
siblingPicker.after(siblingGroupPicker);
const groupChat = document.createElement('div');
groupChat.className = 'family-chat-wrapper';
groupChat.hidden = true;
groupChat.innerHTML = '<header><i data-lucide="users" aria-hidden="true"></i><div><h1 id="group-chat-title">Group conversation</h1><p id="group-chat-people"></p></div></header><div id="group-history" role="log" aria-label="Group messages"></div><div class="family-compose"><p id="group-message-permission"></p><form id="group-message-form"><label for="group-message-input">Message this group</label><div><textarea id="group-message-input" maxlength="2000" rows="2" placeholder="Message the group…"></textarea><button id="group-message-send" type="submit"><i data-lucide="send" aria-hidden="true"></i> Send</button></div></form><p id="group-message-status" role="status"></p><button id="group-message-older" type="button" disabled>Older group messages</button></div>';
familyChat.after(groupChat);
window.lucide?.createIcons();
let familyView = false, olderFamily = [], familyCursor, pendingFamily = null;
const familyRows = (0, message_thread_js_1.createMessageThread)(el('family-history'));
let groups = [], siblings = [], peerMessagingEnabled = false, selectedGroup = null, groupPage = null, olderGroup = [], groupCursor, pendingGroup = null, groupLoading = false, groupFetchedAt = 0, groupsFetchedAt = 0, groupsLoading = false;
const groupRows = (0, message_thread_js_1.createMessageThread)(el('group-history'));
const groupDrafts = new Map();
const layout = (0, cloud_student_chat_layout_js_1.mountChildChatLayout)({ panel, tabs, groupTabs, privateChat, familyChat, groupChat, privateTools, siblingPicker, siblingGroupPicker, onFilter: () => renderGroupTabs(), onBackToChats: () => { reportMessageView(); void controller.refresh(); } });
let soundSaving = false;
layout.onSoundToggle(async () => {
    const studentId = state?.studentId;
    if (!studentId || soundSaving)
        return;
    soundSaving = true;
    layout.setSoundMuted(state.notificationSoundMuted === true, false);
    try {
        const result = await api.setMessageSoundMuted(state.notificationSoundMuted !== true, studentId);
        if (state?.studentId === studentId && result.studentId === studentId) {
            state.notificationSoundMuted = result.notificationSoundMuted;
            layout.setSoundMuted(result.notificationSoundMuted);
        }
    }
    catch (error) {
        el('message-status').textContent = error.message || 'Message sound setting could not be saved.';
    }
    finally {
        soundSaving = false;
        layout.setSoundMuted(state?.notificationSoundMuted === true, Boolean(state?.studentId));
    }
});
let messageViewActive = false;
function keepGroupDraft() { if (selectedGroup)
    groupDrafts.set(selectedGroup, el('group-message-input').value); }
function showConversation() { layout.showConversation(); }
function reportMessageView() {
    if (!state?.studentId || !api.messageView)
        return;
    const key = conversationVisible() ? selectedGroup ? 'group:' + selectedGroup : familyView ? 'family' : 'private' : null;
    if (!key && !messageViewActive)
        return;
    messageViewActive = Boolean(key);
    const messages = selectedGroup ? groupPage?.messages || [] : familyView ? state.familyMessages || [] : state.messages || [];
    void api.messageView(key, state.studentId, messages.slice(-1000).map(message => message.id)).catch(() => { });
}
const viewTimer = setInterval(reportMessageView, 5000);
window.addEventListener('unload', () => clearInterval(viewTimer));
function showView(family) {
    if (family && state?.familyAvailable === false)
        family = false;
    keepGroupDraft();
    familyRows.pause();
    groupRows.pause();
    showConversation();
    familyView = family;
    selectedGroup = null;
    groupPage = null;
    olderGroup = [];
    groupCursor = undefined;
    groupRows.clear();
    el('message-private-tab').setAttribute('aria-pressed', String(!family));
    el('message-family-tab').setAttribute('aria-pressed', String(family));
    privateTools.hidden = family;
    privateChat.hidden = family;
    familyChat.hidden = !family;
    groupChat.hidden = true;
    renderGroupTabs();
    reportMessageView();
    void controller.refresh();
    if (family) {
        renderFamily();
        void api.syncMessages().then(async () => refresh(await api.status())).catch(() => { });
    }
}
el('message-private-tab').addEventListener('click', () => showView(false));
el('message-family-tab').addEventListener('click', () => showView(true));
function groupName(group) {
    return (group.kind === 'siblings' ? group.members.filter(member => member.studentId !== state?.studentId) : group.members).map(member => member.name).join(', ') || 'Sibling chat';
}
function renderGroupTabs() {
    const query = layout.query();
    const archived = layout.archived();
    for (const [id, name] of [['message-private-tab', 'Mom & Dad'], ['message-family-tab', 'Family conversation']])
        el(id).hidden = archived || id === 'message-family-tab' && state?.familyAvailable === false || !name.toLowerCase().includes(query);
    groupTabs.replaceChildren(...groups.filter(group => Boolean(group.closedAt) === archived && groupName(group).toLowerCase().includes(query)).map(group => {
        const button = document.createElement('button');
        button.type = 'button';
        layout.decorateConversation(button, groupName(group), group.closedAt ? 'Closed · read only' : group.kind === 'siblings' && group.members.length === 2 ? 'Sibling' : group.members.length + ' people · Group', 'users');
        button.title = groupName(group);
        button.dataset.groupId = group.id;
        button.setAttribute('aria-pressed', String(selectedGroup === group.id));
        button.addEventListener('click', () => openGroup(group.id));
        return button;
    }));
    groupTabs.hidden = false;
    layout.update({ empty: !groupTabs.children.length && el('message-private-tab').hidden && el('message-family-tab').hidden, canStart: peerMessagingEnabled && siblings.length > 0, online: Boolean(state?.online) });
    siblingPicker.hidden = !peerMessagingEnabled || !siblings.length;
    siblingGroupPicker.hidden = !peerMessagingEnabled || siblings.length < 2;
    const chosenSibling = siblingSelect.value;
    siblingSelect.replaceChildren(...siblings.map(sibling => {
        const option = document.createElement('option');
        option.value = sibling.studentId;
        option.textContent = sibling.name;
        return option;
    }));
    if (siblings.some(sibling => sibling.studentId === chosenSibling))
        siblingSelect.value = chosenSibling;
    const chosen = new Set([...siblingGroupChoices.querySelectorAll('input:checked')].map(input => input.value));
    siblingGroupChoices.replaceChildren(...siblings.map(sibling => {
        const label = document.createElement('label'), input = document.createElement('input');
        input.type = 'checkbox';
        input.value = sibling.studentId;
        input.checked = chosen.has(sibling.studentId);
        label.append(input, document.createTextNode(sibling.name));
        return label;
    }));
}
function openGroup(groupId) {
    keepGroupDraft();
    familyRows.pause();
    groupRows.pause();
    showConversation();
    layout.closeNewChat();
    el('group-message-input').value = groupDrafts.get(groupId) || '';
    el('group-message-status').textContent = '';
    selectedGroup = groupId;
    familyView = false;
    groupPage = null;
    olderGroup = [];
    groupCursor = undefined;
    groupRows.clear();
    privateTools.hidden = true;
    privateChat.hidden = true;
    familyChat.hidden = true;
    groupChat.hidden = false;
    el('message-private-tab').setAttribute('aria-pressed', 'false');
    el('message-family-tab').setAttribute('aria-pressed', 'false');
    renderGroupTabs();
    renderGroup();
    reportMessageView();
    void controller.refresh();
    void loadGroup();
}
async function startSiblingChat(recipientStudentIds, button, status) {
    const studentId = state?.studentId;
    if (!studentId || !recipientStudentIds.length || !peerMessagingEnabled)
        return;
    button.disabled = true;
    status.textContent = 'Opening chat…';
    try {
        const result = await api.startSiblingChat(recipientStudentIds, studentId);
        if (state?.studentId !== studentId)
            return;
        groups = [result.group, ...groups.filter(group => group.id !== result.group.id)];
        status.textContent = result.group.closedAt ? 'Your parent closed this chat. You can read earlier messages.' : '';
        openGroup(result.group.id);
    }
    catch (error) {
        status.textContent = error.message;
    }
    finally {
        button.disabled = false;
    }
}
siblingStart.addEventListener('click', () => { if (siblingSelect.value)
    void startSiblingChat([siblingSelect.value], siblingStart, siblingStatus); });
siblingGroupStart.addEventListener('click', () => {
    const selected = [...siblingGroupChoices.querySelectorAll('input:checked')].map(input => input.value);
    if (selected.length < 2) {
        siblingGroupStatus.textContent = 'Choose at least two siblings for a group chat.';
        return;
    }
    void startSiblingChat(selected, siblingGroupStart, siblingGroupStatus);
});
async function loadGroups() {
    if (!state?.studentId || groupsLoading)
        return;
    groupsLoading = true;
    groupsFetchedAt = Date.now();
    const studentId = state.studentId;
    try {
        const result = await api.messageGroups(studentId);
        if (state?.studentId !== studentId)
            return;
        groups = result.groups;
        peerMessagingEnabled = result.peerMessagingEnabled === true;
        siblings = Array.isArray(result.siblings) ? result.siblings : [];
        renderGroupTabs();
        if (selectedGroup && !groups.some(group => group.id === selectedGroup))
            showView(false);
        else if (selectedGroup)
            renderGroup();
    }
    catch (error) {
        if (selectedGroup)
            el('group-message-status').textContent = error.message;
    }
    finally {
        groupsLoading = false;
    }
}
async function loadGroup(before) {
    if (!selectedGroup || groupLoading === selectedGroup || !state?.studentId)
        return;
    groupLoading = selectedGroup;
    groupFetchedAt = Date.now();
    const groupId = selectedGroup, studentId = state.studentId;
    try {
        const result = await api.groupMessages(groupId, before, studentId);
        if (selectedGroup !== groupId || state?.studentId !== studentId)
            return;
        if (before) {
            olderGroup = [...result.messages, ...olderGroup];
            groupCursor = result.nextBefore;
        }
        else
            groupPage = result;
        renderGroup();
        reportMessageView();
    }
    catch (error) {
        if (selectedGroup === groupId)
            el('group-message-status').textContent = error.message;
    }
    finally {
        if (groupLoading === groupId)
            groupLoading = false;
    }
}
function renderGroup() {
    if (!selectedGroup || !groupPage && !groups.some(group => group.id === selectedGroup))
        return;
    const group = groups.find(item => item.id === selectedGroup) || groupPage?.group;
    el('group-chat-title').textContent = groupName(group);
    el('group-chat-people').textContent = group.closedAt ? 'Archived conversation' : group.members.length + ' people · ' + (group.kind === 'siblings' ? 'Sibling chat' : 'Group chat');
    const history = el('group-history'), atBottom = history.scrollHeight - history.scrollTop - history.clientHeight < 40;
    const messages = [...new Map([...olderGroup, ...(groupPage?.messages || [])].map(message => [message.id, message])).values()];
    if (messages.length && history.textContent === 'No group messages yet.')
        history.replaceChildren();
    groupRows.update(messages, { fingerprint: message => JSON.stringify([message.sender, message.senderName, message.body, message.attachment]),
        refresh: (row, message) => row.messageReactions.update(message.reactions),
        create: message => {
            const row = document.createElement('article');
            row.className = 'family-message' + (message.authorStudentId === state?.studentId ? ' mine' : '');
            const name = document.createElement('strong');
            name.textContent = message.authorStudentId === state?.studentId ? 'You' : message.senderName || 'Mom & Dad';
            const body = document.createElement('p');
            body.textContent = message.body;
            const time = document.createElement('small');
            time.textContent = new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            time.title = new Date(message.createdAt).toLocaleString();
            row.append(name, body);
            const attachment = message.attachment ? window.cloudFileTools.attachment(message.attachment, () => api.readFile(message.attachment.id)) : null;
            if (attachment)
                row.append(attachment);
            row.append(time);
            const currentGroup = selectedGroup;
            const reactions = (0, message_reactions_js_1.createMessageReactions)({ messageElement: row, onReact: async (emoji) => {
                    if (selectedGroup !== currentGroup || !visible())
                        throw new Error('Reopen this group before reacting.');
                    const result = await api.reactMessage(message.id, emoji, state?.studentId, true, currentGroup);
                    if (selectedGroup !== currentGroup || result.id !== message.id || !result.saved)
                        throw new Error('The reaction could not be confirmed.');
                    olderGroup = olderGroup.map(item => item.id === message.id ? { ...item, reactions: result.reactions } : item);
                    if (groupPage)
                        groupPage = { ...groupPage, version: null, messages: groupPage.messages.map(item => item.id === message.id ? { ...item, reactions: result.reactions } : item) };
                    renderGroup();
                    return result.reactions;
                } });
            row.messageReactions = reactions;
            row.append(reactions.node);
            return { node: row, dispose: () => { reactions.dispose(); attachment?.dispose?.(); } };
        } });
    if (!messages.length)
        history.textContent = 'No group messages yet.';
    if (atBottom)
        history.scrollTop = history.scrollHeight;
    const open = !group.closedAt && peerMessagingEnabled && groupPage?.childrenCanPost === true;
    el('group-message-form').hidden = !open;
    el('group-message-permission').textContent = open ? '' :
        group.closedAt ? 'Your parent closed this chat. Earlier messages remain available.' :
            peerMessagingEnabled ? 'Loading chat permissions…' : 'Sibling messaging is off. Earlier messages remain available.';
    el('group-message-older').disabled = !(groupCursor === undefined ? groupPage?.nextBefore : groupCursor);
}
el('group-message-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const groupId = selectedGroup, studentId = state?.studentId;
    if (!groupId || !studentId || !peerMessagingEnabled || groupPage?.group?.closedAt)
        return;
    const input = el('group-message-input'), body = input.value.trim();
    if (!body)
        return;
    if (!pendingGroup || pendingGroup.body !== body || pendingGroup.groupId !== groupId)
        pendingGroup = { id: crypto.randomUUID(), body, groupId };
    const sent = pendingGroup, button = el('group-message-send');
    button.disabled = true;
    try {
        const result = await api.sendGroupMessage(groupId, sent.body, sent.id, studentId);
        if (state?.studentId !== studentId)
            return;
        if (result.id !== sent.id || !result.saved)
            throw Error('The group message could not be confirmed.');
        if (pendingGroup === sent)
            pendingGroup = null;
        if (groupDrafts.get(groupId)?.trim() === body)
            groupDrafts.delete(groupId);
        if (selectedGroup !== groupId)
            return;
        if (input.value.trim() === body)
            input.value = '';
        el('group-message-status').textContent = 'Sent';
        await loadGroup();
        if (!groupChat.hidden && visible())
            input.focus({ preventScroll: true });
    }
    catch (error) {
        if (selectedGroup === groupId && state?.studentId === studentId)
            el('group-message-status').textContent = `${error.message} Your draft is retained for retry.`;
    }
    finally {
        button.disabled = false;
    }
});
el('group-message-older').addEventListener('click', () => { const before = groupCursor === undefined ? groupPage?.nextBefore : groupCursor; if (before)
    void loadGroup(before); });
function renderFamily() {
    if (!familyView)
        return;
    const messages = [...new Map([...olderFamily, ...(state?.familyMessages || [])].map(message => [message.id, message])).values()];
    const history = el('family-history'), atBottom = history.scrollHeight - history.scrollTop - history.clientHeight < 40;
    if (messages.length && history.textContent === 'No family messages yet.')
        history.replaceChildren();
    familyRows.update(messages, { fingerprint: message => JSON.stringify([message.sender, message.senderName, message.body, message.attachment]),
        refresh: (row, message) => row.messageReactions.update(message.reactions),
        create: message => {
            const row = document.createElement('article');
            row.className = 'family-message' + (message.authorStudentId && message.authorStudentId === state?.studentId ? ' mine' : '');
            const name = document.createElement('strong');
            name.textContent = message.authorStudentId === state?.studentId ? 'You' : message.senderName || 'Mom & Dad';
            const body = document.createElement('p');
            body.textContent = message.body;
            const time = document.createElement('small');
            time.textContent = new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            time.title = new Date(message.createdAt).toLocaleString();
            row.append(name, body);
            const attachment = message.attachment ? window.cloudFileTools.attachment(message.attachment, () => api.readFile(message.attachment.id)) : null;
            if (attachment)
                row.append(attachment);
            row.append(time);
            const reactions = (0, message_reactions_js_1.createMessageReactions)({ messageElement: row, onReact: async (emoji) => {
                    if (!familyView || !visible())
                        throw new Error('Reopen the family conversation before reacting.');
                    const result = await api.reactMessage(message.id, emoji, state?.studentId, true);
                    if (result.id !== message.id || !result.saved)
                        throw new Error('The reaction could not be confirmed.');
                    olderFamily = olderFamily.map(item => item.id === message.id ? { ...item, reactions: result.reactions } : item);
                    if (state)
                        state = { ...state, familyMessages: (state.familyMessages || []).map(item => item.id === message.id ? { ...item, reactions: result.reactions } : item) };
                    renderFamily();
                    return result.reactions;
                } });
            row.messageReactions = reactions;
            row.append(reactions.node);
            return { node: row, dispose: () => { reactions.dispose(); attachment?.dispose?.(); } };
        } });
    if (!messages.length)
        history.textContent = 'No family messages yet.';
    if (atBottom)
        history.scrollTop = history.scrollHeight;
    const canPost = Boolean(state?.familyChildrenCanPost);
    el('family-message-form').hidden = !canPost;
    el('family-message-permission').textContent = canPost ? '' : 'Only parents can post here right now. You can still message Mom & Dad privately.';
    const familyStatus = el('family-message-status');
    if (state?.familyError)
        familyStatus.textContent = state.familyError;
    else if (familyStatus.textContent === 'Family conversation is temporarily unavailable. Private messages still work.')
        familyStatus.textContent = '';
    el('family-message-older').disabled = !(familyCursor === undefined ? state?.familyNextBefore : familyCursor);
}
el('family-message-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state?.studentId || !state.familyChildrenCanPost)
        return;
    const input = el('family-message-input'), body = input.value.trim();
    if (!body)
        return;
    if (!pendingFamily || pendingFamily.body !== body)
        pendingFamily = { id: crypto.randomUUID(), body };
    const sent = pendingFamily, studentId = state.studentId, button = el('family-message-send');
    button.disabled = true;
    el('family-message-status').textContent = 'Sending to the family…';
    try {
        const result = await api.sendFamilyMessage(sent.body, sent.id, studentId);
        if (state?.studentId !== studentId || result.id !== sent.id || !result.saved)
            throw new Error('The family message could not be confirmed. Check the thread before retrying.');
        pendingFamily = null;
        if (input.value.trim() === body)
            input.value = '';
        el('family-message-status').textContent = 'Saved for the family.';
        await api.syncMessages();
        refresh(await api.status());
        if (familyView && visible())
            input.focus({ preventScroll: true });
    }
    catch (error) {
        el('family-message-status').textContent = `${error.message} Your draft is retained; retry uses the same message ID.`;
    }
    finally {
        button.disabled = false;
    }
});
el('family-message-older').addEventListener('click', async () => {
    const before = familyCursor === undefined ? state?.familyNextBefore : familyCursor;
    if (!before)
        return;
    const studentId = state?.studentId;
    el('family-message-older').disabled = true;
    try {
        const page = await api.olderFamilyMessages(before);
        if (state?.studentId !== studentId)
            return;
        olderFamily = [...page.messages, ...olderFamily];
        familyCursor = page.nextBefore;
        renderFamily();
    }
    catch (error) {
        el('family-message-status').textContent = error.message;
    }
    finally {
        el('family-message-older').disabled = !(familyCursor === undefined ? state?.familyNextBefore : familyCursor);
    }
});
function rows() {
    const unique = new Map([...older, ...(state?.messages || []), ...(state?.pending || []).map(message => ({ ...message, pending: true, sender: 'child' }))].map(message => [message.id, message]));
    return [...unique.values()].map(message => ({ id: message.id, role: message.sender, content: message.body, created_at: message.createdAt,
        attachment: message.attachment, pending: message.pending, reactions: message.reactions,
        delivery: message.pending ? 'Waiting to send' : message.receivedAt ? 'Received' : 'Saved online' }));
}
const controller = (0, student_messages_js_1.mountStudentMessages)({ isVisible: () => conversationVisible() && !familyView && !selectedGroup, transport: {
        studentId: () => state?.studentId,
        history: async () => ({ messages: rows(), status: state?.error || (state?.online ? '' : 'Offline · Your messages will send when you reconnect.') }),
        react: async (messageId, emoji, studentId) => {
            if (!studentId || state?.studentId !== studentId)
                throw new Error('The child assignment changed. Reopen Messages.');
            const result = await api.reactMessage(messageId, emoji, studentId);
            if (state?.studentId !== studentId)
                throw new Error('The child assignment changed. Reopen Messages.');
            older = older.map(message => message.id === result.id ? { ...message, reactions: result.reactions } : message);
            await controller.refresh();
            return result;
        },
        sendText: body => api.sendMessage(body, undefined, state?.studentId),
        sendVoice: input => api.sendVoiceMessage(input, state?.studentId),
        sendAttachment: async (body, file) => {
            const child = state?.studentId;
            const input = await window.cloudFileTools.encode(file, 'message');
            if (!child || state?.studentId !== child)
                throw new Error('The child assignment changed. Reopen Messages.');
            return api.sendMessageAttachment(body, input, child);
        },
        beforeRecord: () => api.allowMessageRecording(),
        file: async (id) => {
            const result = await api.readFile(id);
            if (!result.file?.mime || typeof result.data !== 'string' || result.data.length > 2796204)
                throw new Error('The attachment could not be verified.');
            const bytes = Uint8Array.from(atob(result.data), char => char.charCodeAt(0));
            if (bytes.length !== result.file.size)
                throw new Error('The attachment size did not match.');
            return { blob: new Blob([bytes], { type: result.file.mime }), mime: result.file.mime, original: result };
        },
        openFile: result => window.cloudFileTools.preview(async () => result.original)
    } });
function refresh(value) {
    const assignmentChanged = state?.studentId !== value.messaging?.studentId;
    if (assignmentChanged) {
        groupDrafts.clear();
        layout.reset();
        el('family-message-input').value = '';
        el('group-message-input').value = '';
        older = [];
        cursor = undefined;
        olderFamily = [];
        familyCursor = undefined;
        pendingFamily = null;
        familyRows.clear();
        groups = [];
        siblings = [];
        peerMessagingEnabled = false;
        selectedGroup = null;
        groupPage = null;
        olderGroup = [];
        groupCursor = undefined;
        pendingGroup = null;
        groupsFetchedAt = 0;
        groupFetchedAt = 0;
        groupRows.clear();
        el('group-history').replaceChildren();
        el('group-chat-people').textContent = '';
        renderGroupTabs();
        window.cloudFileTools.close();
    }
    state = value.messaging;
    if (state?.familyAvailable === false && familyView)
        showView(false);
    else
        renderGroupTabs();
    layout.setSoundMuted(state?.notificationSoundMuted === true, Boolean(state?.studentId) && !soundSaving);
    if (assignmentChanged) {
        showView(false);
        layout.showListOnSmallScreen();
    }
    layout.setOnline(Boolean(state?.online));
    el('message-older').disabled = !(cursor === undefined ? state?.nextBefore : cursor);
    renderFamily();
    if (visible() && Date.now() - groupsFetchedAt > 15000)
        void loadGroups();
    if (visible() && selectedGroup && Date.now() - groupFetchedAt > 8000)
        void loadGroup();
    void controller.refresh().then(reportMessageView);
}
el('message-refresh').addEventListener('click', async () => {
    try {
        older = [];
        cursor = undefined;
        await api.syncMessages();
        refresh(await api.status());
    }
    catch (error) {
        el('message-status').textContent = error.message;
    }
});
el('message-older').addEventListener('click', async () => {
    const before = cursor === undefined ? state?.nextBefore : cursor;
    if (!before)
        return;
    const studentId = state.studentId;
    el('message-older').disabled = true;
    try {
        const page = await api.olderMessages(before);
        if (state?.studentId !== studentId)
            return;
        older = [...page.messages, ...older];
        cursor = page.nextBefore;
        await controller.refresh();
    }
    catch (error) {
        el('message-status').textContent = error.message;
    }
    finally {
        el('message-older').disabled = !(cursor === undefined ? state?.nextBefore : cursor);
    }
});
window.addEventListener('cloud-student-surface', () => { reportMessageView(); void controller.refresh(); if (visible()) {
    void loadGroups();
    if (selectedGroup)
        void loadGroup();
}
else
    window.cloudFileTools.close(); });
document.addEventListener('visibilitychange', () => { reportMessageView(); void controller.refresh(); if (visible()) {
    void loadGroups();
    if (selectedGroup)
        void loadGroup();
} });
el('msg-input').addEventListener('input', function () { this.style.height = '0'; this.style.height = `${this.scrollHeight}px`; });
api.onStatus(refresh);
api.status().then(refresh).catch(error => { el('message-status').textContent = error.message; });
for (const prefix of ['family', 'group'])
    el(prefix + '-message-input').addEventListener('keydown', event => {
        if (event.key !== 'Enter' || event.shiftKey || event.isComposing)
            return;
        event.preventDefault();
        const send = el(prefix + '-message-send');
        if (!send.disabled)
            el(prefix + '-message-form').requestSubmit();
    });
window.addEventListener('resize', () => { reportMessageView(); void controller.refresh(); });

},
"renderer/js/shared/student-messages.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountStudentMessages = mountStudentMessages;
const child_emoji_picker_js_1 = require("renderer/js/kiosk/child-emoji-picker.js");
const voice_recording_js_1 = require("renderer/js/voice-recording.js");
const message_thread_js_1 = require("renderer/js/message-thread.js");
const message_reactions_js_1 = require("renderer/js/message-reactions.js");
function mountStudentMessages({ transport, isVisible = () => !document.hidden }) {
    const urlParams = new URLSearchParams(window.location.search);
    const themeClass = urlParams.get('theme');
    if (themeClass)
        document.documentElement.className = themeClass;
    let studentId = transport.studentId();
    let rendered = null, loading = null;
    const attachmentUrls = new Set();
    let recordedBlob = null;
    let recordedDurationSeconds = 0;
    const messageThread = (0, message_thread_js_1.createMessageThread)(document.getElementById('history-container'));
    const voiceRecorder = (0, voice_recording_js_1.createVoiceRecorder)({ beforeRecord: async () => {
            if (!studentId || !isVisible())
                throw Error('Open Messages before recording.');
            await transport.beforeRecord?.();
        }, onChange: value => {
            recordedBlob = value.blob;
            recordedDurationSeconds = value.seconds;
            const audio = document.getElementById('recording-audio');
            if (value.url && audio.getAttribute('src') !== value.url)
                audio.src = value.url;
            if (!value.url) {
                audio.pause();
                audio.removeAttribute('src');
            }
            document.getElementById('recording-preview').style.display = value.phase === 'ready' ? 'flex' : 'none';
            document.getElementById('recording-duration').textContent = formatRecordingTime(value.seconds);
            const button = document.getElementById('record-btn');
            button.classList.toggle('recording', value.phase === 'recording');
            button.disabled = !studentId || ['requesting', 'finishing'].includes(value.phase);
            button.setAttribute('aria-label', value.phase === 'recording' ? 'Stop recording' : 'Record voice message');
            button.innerHTML = `<i data-lucide="${value.phase === 'recording' ? 'square' : 'mic'}" style="width:21px;height:21px;"></i>`;
            window.lucide?.createIcons();
            setRecordingStatus(value.error || ({ recording: `Recording ${formatRecordingTime(value.seconds)} / 1:00 · tap stop when finished`, requesting: 'Opening microphone…', finishing: 'Preparing your recording…', ready: 'Listen first, then send or discard.' }[value.phase] || ''));
        } });
    function focusMessageInput({ onlyIfUnfocused = false } = {}) {
        const input = document.getElementById('msg-input');
        if (!input || input.disabled || document.hidden)
            return;
        if (onlyIfUnfocused && ![document.body, document.documentElement, input].includes(document.activeElement))
            return;
        try {
            window.focus();
        }
        catch (_) { }
        window.requestAnimationFrame(() => {
            try {
                input.focus({ preventScroll: true });
            }
            catch {
                input.focus();
            }
        });
    }
    window.addEventListener('message', event => {
        if (event.source !== window.parent || event.origin !== window.location.origin)
            return;
        if (event.data?.type === 'KIOSK_FOCUS_TARGET' && event.data.selector === '#msg-input') {
            focusMessageInput();
        }
    });
    // Recover the composer after Electron, Alt+Tab, or a kiosk overlay temporarily
    // moves focus back to the parent window. Do not steal focus from the recorder
    // or another intentional control inside Messages.
    window.addEventListener('focus', () => focusMessageInput({ onlyIfUnfocused: true }));
    window.addEventListener('pageshow', () => focusMessageInput({ onlyIfUnfocused: true }));
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden)
            focusMessageInput({ onlyIfUnfocused: true });
    });
    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = String(value || '');
        return div.innerHTML;
    }
    function formatRecordingTime(seconds) {
        const value = Math.max(0, Math.floor(seconds));
        return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
    }
    async function loadMessageHistory() {
        const container = document.getElementById('history-container');
        if (!container || !studentId || !isVisible())
            return;
        const requestedStudent = studentId;
        try {
            const { messages, status = '' } = await transport.history();
            if (studentId !== requestedStudent || !isVisible())
                return;
            setMessageStatus(status);
            const key = JSON.stringify(messages);
            if (key === rendered)
                return;
            rendered = key;
            if (messages.length === 0) {
                messageThread.clear();
                container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted);">No messages yet</div>';
                return;
            }
            if (!container.querySelector('.msg-bubble'))
                container.replaceChildren();
            const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 40;
            messageThread.update(messages, {
                fingerprint: msg => JSON.stringify([msg.role, msg.content, msg.attachment, msg.audio_url, msg.audio_duration_seconds, msg.family_broadcast, Boolean(msg.pending)]),
                refresh: (row, msg) => {
                    row.messageReactions?.update(msg.reactions);
                    row.querySelector('.msg-meta time').textContent = `${new Date(msg.created_at).toLocaleDateString()} ${new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${msg.delivery ? ' · ' + msg.delivery : ''}`;
                },
                create: msg => {
                    const isParent = msg.role === 'parent';
                    const isFamilyBroadcast = isParent && Number(msg.family_broadcast) === 1;
                    const div = document.createElement('div');
                    div.className = `msg-bubble ${isParent ? 'msg-parent' : 'msg-child'}${isFamilyBroadcast ? ' msg-family-broadcast' : ''}`;
                    const audioHtml = msg.attachment
                        ? `${escapeHtml(msg.content)}<br><button type="button" class="voice-message-btn" data-file-id="${escapeHtml(msg.attachment.id)}" ${msg.attachment.removed || msg.pending ? 'disabled' : ''}>${escapeHtml(msg.attachment.mime?.startsWith('audio/') ? '▶ Voice message' : msg.attachment.name)}${msg.pending ? ' · Waiting to send' : msg.attachment.removed ? ' · Removed' : ''}</button>`
                        : msg.audio_url
                            ? `<button type="button" class="voice-message-btn" data-audio-url="${escapeHtml(msg.audio_url)}">▶ Voice message · ${formatRecordingTime(msg.audio_duration_seconds || 0)}</button>`
                            : escapeHtml(msg.content);
                    div.innerHTML = `
        <div class="msg-meta">
          ${isParent ? `<span>${escapeHtml(msg.sender || 'Mom & Dad')}</span>` : '<span>You</span>'}
          <time style="opacity:0.5; font-size:10px; font-weight:normal;"></time>
        </div>
        ${isFamilyBroadcast ? '<div class="msg-audience">📣 Sent to everyone</div>' : ''}
        <div class="msg-content">${audioHtml}</div>
      `;
                    if (transport.react && !msg.pending) {
                        const child = studentId;
                        div.messageReactions = (0, message_reactions_js_1.createMessageReactions)({ messageElement: div, otherParent: 'Mom & Dad', onReact: async (emoji) => {
                                if (studentId !== child || !isVisible())
                                    throw new Error('Reopen Messages before reacting.');
                                const result = await transport.react(msg.id, emoji, child);
                                if (studentId !== child)
                                    throw new Error('The child assignment changed. Reopen Messages.');
                                return result.reactions;
                            } });
                        div.append(div.messageReactions.node);
                    }
                    return { node: div, dispose: () => { div.messageReactions?.dispose(); const url = div.dataset.attachmentUrl; if (url) {
                            URL.revokeObjectURL(url);
                            attachmentUrls.delete(url);
                        } } };
                }
            });
            // Scroll to bottom
            if (atBottom)
                container.scrollTop = container.scrollHeight;
        }
        catch (err) {
            if (studentId !== requestedStudent || !isVisible())
                return;
            console.error('Error loading messages:', err);
            setMessageStatus('Messages could not refresh. Your current conversation is still here.');
        }
    }
    document.getElementById('history-container')?.addEventListener('click', async (event) => {
        const attachment = event.target.closest('[data-file-id]');
        if (attachment && !attachment.disabled) {
            const requestedStudent = studentId;
            attachment.disabled = true;
            try {
                const result = await transport.file(attachment.dataset.fileId);
                if (studentId !== requestedStudent || !isVisible() || !attachment.isConnected)
                    return;
                const url = URL.createObjectURL(result.blob);
                attachmentUrls.add(url);
                attachment.closest('.msg-bubble').dataset.attachmentUrl = url;
                const viewer = document.createElement(result.mime.startsWith('audio/') ? 'audio' : result.mime.startsWith('image/') ? 'img' : 'a');
                if (viewer.tagName === 'A') {
                    viewer.textContent = 'Open PDF';
                    viewer.href = url;
                    viewer.target = '_blank';
                    viewer.rel = 'noopener';
                }
                else
                    viewer.src = url;
                viewer.controls = true;
                viewer.style.maxWidth = '100%';
                if (viewer.tagName === 'A' && transport.openFile) {
                    viewer.removeAttribute('href');
                    viewer.addEventListener('click', () => transport.openFile(result));
                }
                attachment.replaceWith(viewer);
                if (viewer.tagName === 'A' && !transport.openFile) {
                    viewer.textContent = 'PDF saved in Papers';
                }
                if (viewer.tagName === 'AUDIO')
                    void viewer.play().catch(() => { });
            }
            catch (error) {
                setMessageStatus(error.message);
            }
            finally {
                attachment.disabled = false;
            }
            return;
        }
        const button = event.target.closest('[data-audio-url]');
        if (!button)
            return;
        const existing = button.parentElement.querySelector('audio');
        if (existing) {
            existing.paused ? existing.play() : existing.pause();
            return;
        }
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.autoplay = true;
        audio.src = button.dataset.audioUrl;
        button.replaceWith(audio);
    });
    function setRecordingStatus(message = '') {
        const status = document.getElementById('recording-status');
        status.textContent = message;
        status.style.display = message ? 'block' : 'none';
    }
    function setMessageStatus(message = '') {
        const status = document.getElementById('message-status');
        if (status)
            status.textContent = message;
    }
    function resetRecordingPreview() { voiceRecorder.cancel(); }
    document.getElementById('record-btn')?.addEventListener('click', () => {
        if (voiceRecorder.state().phase === 'recording')
            voiceRecorder.stop();
        else
            void voiceRecorder.start();
    });
    document.getElementById('discard-recording-btn')?.addEventListener('click', resetRecordingPreview);
    document.getElementById('send-recording-btn')?.addEventListener('click', async () => {
        if (!recordedBlob || !studentId)
            return;
        const sendButton = document.getElementById('send-recording-btn');
        sendButton.disabled = true;
        setRecordingStatus('Sending voice message...');
        const originalBlob = recordedBlob, requestedStudent = studentId;
        try {
            const audioBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
                reader.onerror = reject;
                reader.readAsDataURL(originalBlob);
            });
            if (studentId !== requestedStudent || recordedBlob !== originalBlob)
                return;
            await transport.sendVoice({ data: audioBase64, mime: originalBlob.type, durationSeconds: recordedDurationSeconds });
            if (studentId !== requestedStudent || recordedBlob !== originalBlob)
                return;
            resetRecordingPreview();
            await loadMessageHistory();
        }
        catch (error) {
            setRecordingStatus(error.message || 'Failed to send voice message. Please try again.');
        }
        finally {
            sendButton.disabled = false;
        }
    });
    // Quick chip clicks
    document.querySelectorAll('.quick-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById('msg-input');
            if (input) {
                input.value = btn.dataset.msg;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.focus();
            }
        });
    });
    const input = document.getElementById('msg-input');
    if (input) {
        (0, child_emoji_picker_js_1.mountChildEmojiPicker)(document.getElementById('message-emoji-picker'), input);
        input.addEventListener('pointerdown', () => focusMessageInput());
        input.addEventListener('input', () => {
            const validation = (0, child_emoji_picker_js_1.validateChildEmojiMessage)(input.value);
            setMessageStatus(validation.valid ? '' : validation.error);
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const sendBtn = document.getElementById('send-btn');
                if (sendBtn && !sendBtn.disabled) {
                    sendBtn.click();
                }
            }
        });
    }
    // Send message
    const sendBtn = document.getElementById('send-btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', async () => {
            const input = document.getElementById('msg-input');
            const msg = input.value.trim();
            const fileInput = document.getElementById('message-file'), file = fileInput?.files[0];
            if ((!msg && !file) || !studentId)
                return;
            const emojiValidation = (0, child_emoji_picker_js_1.validateChildEmojiMessage)(msg);
            if (!emojiValidation.valid) {
                setMessageStatus(emojiValidation.error);
                input.focus();
                return;
            }
            const requestedStudent = studentId;
            const wasComposing = [input, sendBtn].includes(document.activeElement);
            let sent = false;
            sendBtn.disabled = true;
            if (fileInput)
                fileInput.disabled = true;
            sendBtn.innerHTML = '<i data-lucide="loader-2" style="width:20px;height:20px;animation:spin 1s linear infinite;"></i>';
            if (window.lucide)
                window.lucide.createIcons();
            try {
                if (file)
                    await transport.sendAttachment(msg, file);
                else
                    await transport.sendText(msg);
                if (studentId !== requestedStudent)
                    return;
                sent = true;
                if (input.value.trim() === msg)
                    input.value = '';
                if (fileInput)
                    fileInput.value = '';
                input.style.height = 0; // reset auto-height
                setMessageStatus('');
                await loadMessageHistory();
            }
            catch (err) {
                console.error('Error sending message:', err);
                setMessageStatus(err.message || 'Failed to send message. Please try again.');
            }
            finally {
                sendBtn.disabled = false;
                if (fileInput)
                    fileInput.disabled = false;
                sendBtn.innerHTML = '<i data-lucide="send" style="width:20px;height:20px;margin-left:2px;"></i>';
                if (window.lucide)
                    window.lucide.createIcons();
                if (sent && wasComposing && studentId === requestedStudent && isVisible() && !document.hidden &&
                    [document.body, document.documentElement, input, sendBtn].includes(document.activeElement)) {
                    try {
                        input.focus({ preventScroll: true });
                    }
                    catch (_) {
                        input.focus();
                    }
                }
            }
        });
    }
    function refresh() {
        const nextStudent = transport.studentId();
        if (studentId !== nextStudent) {
            studentId = nextStudent;
            rendered = null;
            resetRecordingPreview();
            messageThread.clear();
            document.getElementById('msg-input').value = '';
            const fileInput = document.getElementById('message-file');
            if (fileInput)
                fileInput.value = '';
            document.getElementById('history-container').replaceChildren();
            for (const url of attachmentUrls)
                URL.revokeObjectURL(url);
            attachmentUrls.clear();
        }
        for (const id of ['msg-input', 'send-btn', 'record-btn'])
            document.getElementById(id).disabled = !studentId || id === 'record-btn' && ['requesting', 'finishing'].includes(voiceRecorder.state().phase);
        if (!isVisible()) {
            if (['requesting', 'recording', 'finishing'].includes(voiceRecorder.state().phase))
                voiceRecorder.cancel();
            messageThread.pause();
            return Promise.resolve();
        }
        if (!loading)
            loading = loadMessageHistory().finally(() => { loading = null; });
        return loading;
    }
    const poll = window.setInterval(refresh, 30000);
    window.addEventListener('pagehide', () => {
        window.clearInterval(poll);
        voiceRecorder.cancel();
        messageThread.clear();
        for (const url of attachmentUrls)
            URL.revokeObjectURL(url);
        attachmentUrls.clear();
    });
    void refresh();
    return { refresh };
}

},
"renderer/js/kiosk/child-emoji-picker.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateChildEmojiMessage = validateChildEmojiMessage;
exports.mountChildEmojiPicker = mountChildEmojiPicker;
const emojiPolicy = window.BODEE_CHILD_EMOJI;
function validateChildEmojiMessage(value) {
    return emojiPolicy?.validateChildMessageEmojis(value) || { valid: true, disallowed: [], error: '' };
}
function mountChildEmojiPicker(container, input, options = {}) {
    if (!container || !input || !emojiPolicy)
        return null;
    const toggleLabel = options.toggleLabel || 'Add a kid-safe emoji';
    const panelLabel = options.panelLabel || 'Kid-safe emoji';
    const usePortal = options.portal === true;
    container.classList.add('child-emoji-picker');
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'child-emoji-toggle';
    toggle.setAttribute('aria-label', toggleLabel);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '😊';
    const panel = document.createElement('div');
    panel.className = 'child-emoji-panel';
    if (usePortal)
        panel.classList.add('child-emoji-panel--portal');
    panel.id = `${container.id || 'child-emoji-picker'}-panel`;
    panel.hidden = true;
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', panelLabel);
    toggle.setAttribute('aria-controls', panel.id);
    emojiPolicy.SAFE_CHILD_EMOJI_GROUPS.forEach(group => {
        const section = document.createElement('section');
        const heading = document.createElement('p');
        heading.className = 'child-emoji-group-title';
        heading.textContent = group.name;
        const grid = document.createElement('div');
        grid.className = 'child-emoji-grid';
        group.emojis.forEach(emoji => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'child-emoji-option';
            button.setAttribute('aria-label', `Add ${emoji}`);
            button.textContent = emoji;
            button.addEventListener('click', () => {
                const start = Number.isInteger(input.selectionStart) ? input.selectionStart : input.value.length;
                const end = Number.isInteger(input.selectionEnd) ? input.selectionEnd : start;
                const nextLength = input.value.length - (end - start) + emoji.length;
                if (input.maxLength > 0 && nextLength > input.maxLength)
                    return;
                input.setRangeText(emoji, start, end, 'end');
                input.dispatchEvent(new Event('input', { bubbles: true }));
                setOpen(false);
                input.focus();
            });
            grid.appendChild(button);
        });
        section.append(heading, grid);
        panel.appendChild(section);
    });
    const positionPortalPanel = () => {
        if (!usePortal || panel.hidden)
            return;
        const margin = 12;
        const gap = 9;
        const toggleRect = toggle.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        const roomAbove = toggleRect.top - gap - margin;
        const roomBelow = window.innerHeight - toggleRect.bottom - gap - margin;
        const openAbove = roomAbove >= Math.min(panelRect.height, 180) || roomAbove >= roomBelow;
        const top = openAbove
            ? Math.max(margin, toggleRect.top - gap - panelRect.height)
            : Math.min(window.innerHeight - margin - panelRect.height, toggleRect.bottom + gap);
        const left = Math.min(Math.max(margin, toggleRect.left), Math.max(margin, window.innerWidth - margin - panelRect.width));
        panel.style.top = `${Math.max(margin, top)}px`;
        panel.style.left = `${left}px`;
    };
    const setOpen = open => {
        panel.hidden = !open;
        if (open)
            positionPortalPanel();
        toggle.setAttribute('aria-expanded', String(open));
        container.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', () => setOpen(panel.hidden));
    panel.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            setOpen(false);
            toggle.focus();
        }
    });
    const handleOutsidePointer = event => {
        if (!container.contains(event.target) && !panel.contains(event.target))
            setOpen(false);
    };
    const handleViewportChange = () => positionPortalPanel();
    document.addEventListener('pointerdown', handleOutsidePointer);
    if (usePortal) {
        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('scroll', handleViewportChange, true);
    }
    container.replaceChildren(toggle);
    if (usePortal)
        document.body.appendChild(panel);
    else
        container.appendChild(panel);
    return {
        close: () => setOpen(false),
        destroy: () => {
            document.removeEventListener('pointerdown', handleOutsidePointer);
            if (usePortal) {
                window.removeEventListener('resize', handleViewportChange);
                window.removeEventListener('scroll', handleViewportChange, true);
                panel.remove();
            }
        }
    };
}

},
"renderer/js/voice-recording.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeVoiceRecording = finalizeVoiceRecording;
exports.createVoiceRecorder = createVoiceRecorder;
require("renderer/lib/fix-webm-duration.js");
const LIMIT = 60, MAX_BYTES = 2 * 1024 * 1024;
async function finalizeVoiceRecording(blob, durationMs) {
    if (!blob.size || blob.size > MAX_BYTES)
        throw Error('Record a voice message up to 60 seconds and 2 MB.');
    const mime = blob.type.split(';')[0];
    if (mime === 'audio/webm')
        return window.ysFixWebmDuration(blob, durationMs, { logger: false });
    if (['audio/ogg', 'audio/wav', 'audio/mpeg'].includes(mime))
        return blob;
    // Safari can record AAC/MP4. Convert once on the parent's device to a small
    // mono WAV accepted by every child, without paying for server transcoding.
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    try {
        const decoded = await context.decodeAudioData(await blob.arrayBuffer());
        if (!decoded.duration || decoded.duration > LIMIT + 1)
            throw Error('Record a voice message of up to 60 seconds.');
        const count = Math.min(LIMIT * 16000, Math.ceil(decoded.duration * 16000));
        const offline = new OfflineAudioContext(1, count, 16000), source = offline.createBufferSource();
        source.buffer = decoded;
        source.connect(offline.destination);
        source.start();
        const samples = (await offline.startRendering()).getChannelData(0);
        const bytes = new ArrayBuffer(44 + count * 2), view = new DataView(bytes);
        const text = (at, value) => [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
        text(0, 'RIFF');
        view.setUint32(4, bytes.byteLength - 8, true);
        text(8, 'WAVE');
        text(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, 16000, true);
        view.setUint32(28, 32000, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        text(36, 'data');
        view.setUint32(40, count * 2, true);
        for (let i = 0; i < count; i++) {
            const sample = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(44 + i * 2, sample * (sample < 0 ? 32768 : 32767), true);
        }
        return new Blob([bytes], { type: 'audio/wav' });
    }
    finally {
        await context.close();
    }
}
function createVoiceRecorder({ onChange, beforeRecord = async () => { } }) {
    let version = 0, recorder = null, stream = null, timer = null;
    let state = { phase: 'idle', seconds: 0, blob: null, url: null, error: '' };
    const emit = patch => { state = { ...state, ...patch }; onChange(state); };
    function release() { clearInterval(timer); timer = null; stream?.getTracks().forEach(track => track.stop()); stream = null; }
    function cancel() {
        version++;
        const old = recorder;
        recorder = null;
        if (old?.state === 'recording')
            old.stop();
        release();
        if (state.url)
            URL.revokeObjectURL(state.url);
        emit({ phase: 'idle', seconds: 0, blob: null, url: null, error: '' });
    }
    async function start() {
        if (['requesting', 'recording', 'finishing'].includes(state.phase))
            return;
        cancel();
        const attempt = version;
        emit({ phase: 'requesting' });
        try {
            if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
                throw Error('This browser cannot record audio. Attach an audio file instead.');
            await beforeRecord();
            if (attempt !== version)
                return;
            const acquired = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            if (attempt !== version) {
                acquired.getTracks().forEach(track => track.stop());
                return;
            }
            stream = acquired;
            const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
            const captured = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 64000 });
            recorder = captured;
            const chunks = [], started = performance.now();
            let stoppedAt = 0;
            captured.addEventListener('dataavailable', event => { if (event.data.size)
                chunks.push(event.data); });
            captured.addEventListener('error', () => { if (attempt === version) {
                cancel();
                emit({ error: 'Recording failed. Check microphone access and try again.' });
            } });
            captured.addEventListener('stop', async () => {
                if (attempt !== version)
                    return;
                release();
                emit({ phase: 'finishing' });
                try {
                    const duration = Math.min(LIMIT * 1000, (stoppedAt || performance.now()) - started);
                    const blob = await finalizeVoiceRecording(new Blob(chunks, { type: captured.mimeType }), duration);
                    if (attempt !== version)
                        return;
                    emit({ phase: 'ready', blob, url: URL.createObjectURL(blob), seconds: Math.max(1, Math.round(duration / 1000)) });
                }
                catch (error) {
                    if (attempt === version) {
                        cancel();
                        emit({ error: error.message });
                    }
                }
            }, { once: true });
            captured.stopVoice = () => { if (captured.state === 'recording') {
                stoppedAt = performance.now();
                captured.stop();
            } };
            captured.start();
            emit({ phase: 'recording' });
            timer = setInterval(() => { const seconds = Math.floor((performance.now() - started) / 1000); emit({ seconds: Math.min(LIMIT, seconds) }); if (seconds >= LIMIT)
                captured.stopVoice(); }, 200);
        }
        catch (error) {
            if (attempt !== version)
                return;
            cancel();
            emit({ error: error.name === 'NotAllowedError' ? 'Allow microphone access for BodeeGuard in your browser, then try again.' : error.message });
        }
    }
    return { start, stop: () => recorder?.stopVoice(), cancel, state: () => state };
}

},
"renderer/lib/fix-webm-duration.js":function(require,module,exports){
(function (name, definition) {
    if (typeof define === 'function' && define.amd) { // RequireJS / AMD
        define(definition);
    }
    else if (typeof module !== 'undefined' && module.exports) { // CommonJS / Node.js
        module.exports = definition();
    }
    else { // Direct include
        window.ysFixWebmDuration = definition();
    }
})('fix-webm-duration', function () {
    /*
     * This is the list of possible WEBM file sections by their IDs.
     * Possible types: Container, Binary, Uint, Int, String, Float, Date
     */
    var sections = {
        0xa45dfa3: { name: 'EBML', type: 'Container' },
        0x286: { name: 'EBMLVersion', type: 'Uint' },
        0x2f7: { name: 'EBMLReadVersion', type: 'Uint' },
        0x2f2: { name: 'EBMLMaxIDLength', type: 'Uint' },
        0x2f3: { name: 'EBMLMaxSizeLength', type: 'Uint' },
        0x282: { name: 'DocType', type: 'String' },
        0x287: { name: 'DocTypeVersion', type: 'Uint' },
        0x285: { name: 'DocTypeReadVersion', type: 'Uint' },
        0x6c: { name: 'Void', type: 'Binary' },
        0x3f: { name: 'CRC-32', type: 'Binary' },
        0xb538667: { name: 'SignatureSlot', type: 'Container' },
        0x3e8a: { name: 'SignatureAlgo', type: 'Uint' },
        0x3e9a: { name: 'SignatureHash', type: 'Uint' },
        0x3ea5: { name: 'SignaturePublicKey', type: 'Binary' },
        0x3eb5: { name: 'Signature', type: 'Binary' },
        0x3e5b: { name: 'SignatureElements', type: 'Container' },
        0x3e7b: { name: 'SignatureElementList', type: 'Container' },
        0x2532: { name: 'SignedElement', type: 'Binary' },
        0x8538067: { name: 'Segment', type: 'Container' },
        0x14d9b74: { name: 'SeekHead', type: 'Container' },
        0xdbb: { name: 'Seek', type: 'Container' },
        0x13ab: { name: 'SeekID', type: 'Binary' },
        0x13ac: { name: 'SeekPosition', type: 'Uint' },
        0x549a966: { name: 'Info', type: 'Container' },
        0x33a4: { name: 'SegmentUID', type: 'Binary' },
        0x3384: { name: 'SegmentFilename', type: 'String' },
        0x1cb923: { name: 'PrevUID', type: 'Binary' },
        0x1c83ab: { name: 'PrevFilename', type: 'String' },
        0x1eb923: { name: 'NextUID', type: 'Binary' },
        0x1e83bb: { name: 'NextFilename', type: 'String' },
        0x444: { name: 'SegmentFamily', type: 'Binary' },
        0x2924: { name: 'ChapterTranslate', type: 'Container' },
        0x29fc: { name: 'ChapterTranslateEditionUID', type: 'Uint' },
        0x29bf: { name: 'ChapterTranslateCodec', type: 'Uint' },
        0x29a5: { name: 'ChapterTranslateID', type: 'Binary' },
        0xad7b1: { name: 'TimecodeScale', type: 'Uint' },
        0x489: { name: 'Duration', type: 'Float' },
        0x461: { name: 'DateUTC', type: 'Date' },
        0x3ba9: { name: 'Title', type: 'String' },
        0xd80: { name: 'MuxingApp', type: 'String' },
        0x1741: { name: 'WritingApp', type: 'String' },
        // 0xf43b675: { name: 'Cluster', type: 'Container' },
        0x67: { name: 'Timecode', type: 'Uint' },
        0x1854: { name: 'SilentTracks', type: 'Container' },
        0x18d7: { name: 'SilentTrackNumber', type: 'Uint' },
        0x27: { name: 'Position', type: 'Uint' },
        0x2b: { name: 'PrevSize', type: 'Uint' },
        0x23: { name: 'SimpleBlock', type: 'Binary' },
        0x20: { name: 'BlockGroup', type: 'Container' },
        0x21: { name: 'Block', type: 'Binary' },
        0x22: { name: 'BlockVirtual', type: 'Binary' },
        0x35a1: { name: 'BlockAdditions', type: 'Container' },
        0x26: { name: 'BlockMore', type: 'Container' },
        0x6e: { name: 'BlockAddID', type: 'Uint' },
        0x25: { name: 'BlockAdditional', type: 'Binary' },
        0x1b: { name: 'BlockDuration', type: 'Uint' },
        0x7a: { name: 'ReferencePriority', type: 'Uint' },
        0x7b: { name: 'ReferenceBlock', type: 'Int' },
        0x7d: { name: 'ReferenceVirtual', type: 'Int' },
        0x24: { name: 'CodecState', type: 'Binary' },
        0x35a2: { name: 'DiscardPadding', type: 'Int' },
        0xe: { name: 'Slices', type: 'Container' },
        0x68: { name: 'TimeSlice', type: 'Container' },
        0x4c: { name: 'LaceNumber', type: 'Uint' },
        0x4d: { name: 'FrameNumber', type: 'Uint' },
        0x4b: { name: 'BlockAdditionID', type: 'Uint' },
        0x4e: { name: 'Delay', type: 'Uint' },
        0x4f: { name: 'SliceDuration', type: 'Uint' },
        0x48: { name: 'ReferenceFrame', type: 'Container' },
        0x49: { name: 'ReferenceOffset', type: 'Uint' },
        0x4a: { name: 'ReferenceTimeCode', type: 'Uint' },
        0x2f: { name: 'EncryptedBlock', type: 'Binary' },
        0x654ae6b: { name: 'Tracks', type: 'Container' },
        0x2e: { name: 'TrackEntry', type: 'Container' },
        0x57: { name: 'TrackNumber', type: 'Uint' },
        0x33c5: { name: 'TrackUID', type: 'Uint' },
        0x3: { name: 'TrackType', type: 'Uint' },
        0x39: { name: 'FlagEnabled', type: 'Uint' },
        0x8: { name: 'FlagDefault', type: 'Uint' },
        0x15aa: { name: 'FlagForced', type: 'Uint' },
        0x1c: { name: 'FlagLacing', type: 'Uint' },
        0x2de7: { name: 'MinCache', type: 'Uint' },
        0x2df8: { name: 'MaxCache', type: 'Uint' },
        0x3e383: { name: 'DefaultDuration', type: 'Uint' },
        0x34e7a: { name: 'DefaultDecodedFieldDuration', type: 'Uint' },
        0x3314f: { name: 'TrackTimecodeScale', type: 'Float' },
        0x137f: { name: 'TrackOffset', type: 'Int' },
        0x15ee: { name: 'MaxBlockAdditionID', type: 'Uint' },
        0x136e: { name: 'Name', type: 'String' },
        0x2b59c: { name: 'Language', type: 'String' },
        0x6: { name: 'CodecID', type: 'String' },
        0x23a2: { name: 'CodecPrivate', type: 'Binary' },
        0x58688: { name: 'CodecName', type: 'String' },
        0x3446: { name: 'AttachmentLink', type: 'Uint' },
        0x1a9697: { name: 'CodecSettings', type: 'String' },
        0x1b4040: { name: 'CodecInfoURL', type: 'String' },
        0x6b240: { name: 'CodecDownloadURL', type: 'String' },
        0x2a: { name: 'CodecDecodeAll', type: 'Uint' },
        0x2fab: { name: 'TrackOverlay', type: 'Uint' },
        0x16aa: { name: 'CodecDelay', type: 'Uint' },
        0x16bb: { name: 'SeekPreRoll', type: 'Uint' },
        0x2624: { name: 'TrackTranslate', type: 'Container' },
        0x26fc: { name: 'TrackTranslateEditionUID', type: 'Uint' },
        0x26bf: { name: 'TrackTranslateCodec', type: 'Uint' },
        0x26a5: { name: 'TrackTranslateTrackID', type: 'Binary' },
        0x60: { name: 'Video', type: 'Container' },
        0x1a: { name: 'FlagInterlaced', type: 'Uint' },
        0x13b8: { name: 'StereoMode', type: 'Uint' },
        0x13c0: { name: 'AlphaMode', type: 'Uint' },
        0x13b9: { name: 'OldStereoMode', type: 'Uint' },
        0x30: { name: 'PixelWidth', type: 'Uint' },
        0x3a: { name: 'PixelHeight', type: 'Uint' },
        0x14aa: { name: 'PixelCropBottom', type: 'Uint' },
        0x14bb: { name: 'PixelCropTop', type: 'Uint' },
        0x14cc: { name: 'PixelCropLeft', type: 'Uint' },
        0x14dd: { name: 'PixelCropRight', type: 'Uint' },
        0x14b0: { name: 'DisplayWidth', type: 'Uint' },
        0x14ba: { name: 'DisplayHeight', type: 'Uint' },
        0x14b2: { name: 'DisplayUnit', type: 'Uint' },
        0x14b3: { name: 'AspectRatioType', type: 'Uint' },
        0xeb524: { name: 'ColourSpace', type: 'Binary' },
        0xfb523: { name: 'GammaValue', type: 'Float' },
        0x383e3: { name: 'FrameRate', type: 'Float' },
        0x61: { name: 'Audio', type: 'Container' },
        0x35: { name: 'SamplingFrequency', type: 'Float' },
        0x38b5: { name: 'OutputSamplingFrequency', type: 'Float' },
        0x1f: { name: 'Channels', type: 'Uint' },
        0x3d7b: { name: 'ChannelPositions', type: 'Binary' },
        0x2264: { name: 'BitDepth', type: 'Uint' },
        0x62: { name: 'TrackOperation', type: 'Container' },
        0x63: { name: 'TrackCombinePlanes', type: 'Container' },
        0x64: { name: 'TrackPlane', type: 'Container' },
        0x65: { name: 'TrackPlaneUID', type: 'Uint' },
        0x66: { name: 'TrackPlaneType', type: 'Uint' },
        0x69: { name: 'TrackJoinBlocks', type: 'Container' },
        0x6d: { name: 'TrackJoinUID', type: 'Uint' },
        0x40: { name: 'TrickTrackUID', type: 'Uint' },
        0x41: { name: 'TrickTrackSegmentUID', type: 'Binary' },
        0x46: { name: 'TrickTrackFlag', type: 'Uint' },
        0x47: { name: 'TrickMasterTrackUID', type: 'Uint' },
        0x44: { name: 'TrickMasterTrackSegmentUID', type: 'Binary' },
        0x2d80: { name: 'ContentEncodings', type: 'Container' },
        0x2240: { name: 'ContentEncoding', type: 'Container' },
        0x1031: { name: 'ContentEncodingOrder', type: 'Uint' },
        0x1032: { name: 'ContentEncodingScope', type: 'Uint' },
        0x1033: { name: 'ContentEncodingType', type: 'Uint' },
        0x1034: { name: 'ContentCompression', type: 'Container' },
        0x254: { name: 'ContentCompAlgo', type: 'Uint' },
        0x255: { name: 'ContentCompSettings', type: 'Binary' },
        0x1035: { name: 'ContentEncryption', type: 'Container' },
        0x7e1: { name: 'ContentEncAlgo', type: 'Uint' },
        0x7e2: { name: 'ContentEncKeyID', type: 'Binary' },
        0x7e3: { name: 'ContentSignature', type: 'Binary' },
        0x7e4: { name: 'ContentSigKeyID', type: 'Binary' },
        0x7e5: { name: 'ContentSigAlgo', type: 'Uint' },
        0x7e6: { name: 'ContentSigHashAlgo', type: 'Uint' },
        0xc53bb6b: { name: 'Cues', type: 'Container' },
        0x3b: { name: 'CuePoint', type: 'Container' },
        0x33: { name: 'CueTime', type: 'Uint' },
        0x37: { name: 'CueTrackPositions', type: 'Container' },
        0x77: { name: 'CueTrack', type: 'Uint' },
        0x71: { name: 'CueClusterPosition', type: 'Uint' },
        0x70: { name: 'CueRelativePosition', type: 'Uint' },
        0x32: { name: 'CueDuration', type: 'Uint' },
        0x1378: { name: 'CueBlockNumber', type: 'Uint' },
        0x6a: { name: 'CueCodecState', type: 'Uint' },
        0x5b: { name: 'CueReference', type: 'Container' },
        0x16: { name: 'CueRefTime', type: 'Uint' },
        0x17: { name: 'CueRefCluster', type: 'Uint' },
        0x135f: { name: 'CueRefNumber', type: 'Uint' },
        0x6b: { name: 'CueRefCodecState', type: 'Uint' },
        0x941a469: { name: 'Attachments', type: 'Container' },
        0x21a7: { name: 'AttachedFile', type: 'Container' },
        0x67e: { name: 'FileDescription', type: 'String' },
        0x66e: { name: 'FileName', type: 'String' },
        0x660: { name: 'FileMimeType', type: 'String' },
        0x65c: { name: 'FileData', type: 'Binary' },
        0x6ae: { name: 'FileUID', type: 'Uint' },
        0x675: { name: 'FileReferral', type: 'Binary' },
        0x661: { name: 'FileUsedStartTime', type: 'Uint' },
        0x662: { name: 'FileUsedEndTime', type: 'Uint' },
        0x43a770: { name: 'Chapters', type: 'Container' },
        0x5b9: { name: 'EditionEntry', type: 'Container' },
        0x5bc: { name: 'EditionUID', type: 'Uint' },
        0x5bd: { name: 'EditionFlagHidden', type: 'Uint' },
        0x5db: { name: 'EditionFlagDefault', type: 'Uint' },
        0x5dd: { name: 'EditionFlagOrdered', type: 'Uint' },
        0x36: { name: 'ChapterAtom', type: 'Container' },
        0x33c4: { name: 'ChapterUID', type: 'Uint' },
        0x1654: { name: 'ChapterStringUID', type: 'String' },
        0x11: { name: 'ChapterTimeStart', type: 'Uint' },
        0x12: { name: 'ChapterTimeEnd', type: 'Uint' },
        0x18: { name: 'ChapterFlagHidden', type: 'Uint' },
        0x598: { name: 'ChapterFlagEnabled', type: 'Uint' },
        0x2e67: { name: 'ChapterSegmentUID', type: 'Binary' },
        0x2ebc: { name: 'ChapterSegmentEditionUID', type: 'Uint' },
        0x23c3: { name: 'ChapterPhysicalEquiv', type: 'Uint' },
        0xf: { name: 'ChapterTrack', type: 'Container' },
        0x9: { name: 'ChapterTrackNumber', type: 'Uint' },
        0x0: { name: 'ChapterDisplay', type: 'Container' },
        0x5: { name: 'ChapString', type: 'String' },
        0x37c: { name: 'ChapLanguage', type: 'String' },
        0x37e: { name: 'ChapCountry', type: 'String' },
        0x2944: { name: 'ChapProcess', type: 'Container' },
        0x2955: { name: 'ChapProcessCodecID', type: 'Uint' },
        0x50d: { name: 'ChapProcessPrivate', type: 'Binary' },
        0x2911: { name: 'ChapProcessCommand', type: 'Container' },
        0x2922: { name: 'ChapProcessTime', type: 'Uint' },
        0x2933: { name: 'ChapProcessData', type: 'Binary' },
        0x254c367: { name: 'Tags', type: 'Container' },
        0x3373: { name: 'Tag', type: 'Container' },
        0x23c0: { name: 'Targets', type: 'Container' },
        0x28ca: { name: 'TargetTypeValue', type: 'Uint' },
        0x23ca: { name: 'TargetType', type: 'String' },
        0x23c5: { name: 'TagTrackUID', type: 'Uint' },
        0x23c9: { name: 'TagEditionUID', type: 'Uint' },
        0x23c4: { name: 'TagChapterUID', type: 'Uint' },
        0x23c6: { name: 'TagAttachmentUID', type: 'Uint' },
        0x27c8: { name: 'SimpleTag', type: 'Container' },
        0x5a3: { name: 'TagName', type: 'String' },
        0x47a: { name: 'TagLanguage', type: 'String' },
        0x484: { name: 'TagDefault', type: 'Uint' },
        0x487: { name: 'TagString', type: 'String' },
        0x485: { name: 'TagBinary', type: 'Binary' }
    };
    function doInherit(newClass, baseClass) {
        newClass.prototype = Object.create(baseClass.prototype);
        newClass.prototype.constructor = newClass;
    }
    function WebmBase(name, type) {
        this.name = name || 'Unknown';
        this.type = type || 'Unknown';
    }
    WebmBase.prototype.updateBySource = function () { };
    WebmBase.prototype.setSource = function (source) {
        this.source = source;
        this.updateBySource();
    };
    WebmBase.prototype.updateByData = function () { };
    WebmBase.prototype.setData = function (data) {
        this.data = data;
        this.updateByData();
    };
    function WebmUint(name, type) {
        WebmBase.call(this, name, type || 'Uint');
    }
    doInherit(WebmUint, WebmBase);
    function padHex(hex) {
        return hex.length % 2 === 1 ? '0' + hex : hex;
    }
    WebmUint.prototype.updateBySource = function () {
        // use hex representation of a number instead of number value
        this.data = '';
        for (var i = 0; i < this.source.length; i++) {
            var hex = this.source[i].toString(16);
            this.data += padHex(hex);
        }
    };
    WebmUint.prototype.updateByData = function () {
        var length = this.data.length / 2;
        this.source = new Uint8Array(length);
        for (var i = 0; i < length; i++) {
            var hex = this.data.substr(i * 2, 2);
            this.source[i] = parseInt(hex, 16);
        }
    };
    WebmUint.prototype.getValue = function () {
        return parseInt(this.data, 16);
    };
    WebmUint.prototype.setValue = function (value) {
        this.setData(padHex(value.toString(16)));
    };
    function WebmFloat(name, type) {
        WebmBase.call(this, name, type || 'Float');
    }
    doInherit(WebmFloat, WebmBase);
    WebmFloat.prototype.getFloatArrayType = function () {
        return this.source && this.source.length === 4 ? Float32Array : Float64Array;
    };
    WebmFloat.prototype.updateBySource = function () {
        var byteArray = this.source.reverse();
        var floatArrayType = this.getFloatArrayType();
        var floatArray = new floatArrayType(byteArray.buffer);
        this.data = floatArray[0];
    };
    WebmFloat.prototype.updateByData = function () {
        var floatArrayType = this.getFloatArrayType();
        var floatArray = new floatArrayType([this.data]);
        var byteArray = new Uint8Array(floatArray.buffer);
        this.source = byteArray.reverse();
    };
    WebmFloat.prototype.getValue = function () {
        return this.data;
    };
    WebmFloat.prototype.setValue = function (value) {
        this.setData(value);
    };
    function WebmContainer(name, type) {
        WebmBase.call(this, name, type || 'Container');
    }
    doInherit(WebmContainer, WebmBase);
    WebmContainer.prototype.readByte = function () {
        return this.source[this.offset++];
    };
    WebmContainer.prototype.readUint = function () {
        var firstByte = this.readByte();
        var bytes = 8 - firstByte.toString(2).length;
        var value = firstByte - (1 << (7 - bytes));
        for (var i = 0; i < bytes; i++) {
            // don't use bit operators to support x86
            value *= 256;
            value += this.readByte();
        }
        return value;
    };
    WebmContainer.prototype.updateBySource = function () {
        this.data = [];
        for (this.offset = 0; this.offset < this.source.length; this.offset = end) {
            var id = this.readUint();
            var len = this.readUint();
            var end = Math.min(this.offset + len, this.source.length);
            var data = this.source.slice(this.offset, end);
            var info = sections[id] || { name: 'Unknown', type: 'Unknown' };
            var ctr = WebmBase;
            switch (info.type) {
                case 'Container':
                    ctr = WebmContainer;
                    break;
                case 'Uint':
                    ctr = WebmUint;
                    break;
                case 'Float':
                    ctr = WebmFloat;
                    break;
            }
            var section = new ctr(info.name, info.type);
            section.setSource(data);
            this.data.push({
                id: id,
                idHex: id.toString(16),
                data: section
            });
        }
    };
    WebmContainer.prototype.writeUint = function (x, draft) {
        for (var bytes = 1, flag = 0x80; x >= flag && bytes < 8; bytes++, flag *= 0x80) { }
        if (!draft) {
            var value = flag + x;
            for (var i = bytes - 1; i >= 0; i--) {
                // don't use bit operators to support x86
                var c = value % 256;
                this.source[this.offset + i] = c;
                value = (value - c) / 256;
            }
        }
        this.offset += bytes;
    };
    WebmContainer.prototype.writeSections = function (draft) {
        this.offset = 0;
        for (var i = 0; i < this.data.length; i++) {
            var section = this.data[i], content = section.data.source, contentLength = content.length;
            this.writeUint(section.id, draft);
            this.writeUint(contentLength, draft);
            if (!draft) {
                this.source.set(content, this.offset);
            }
            this.offset += contentLength;
        }
        return this.offset;
    };
    WebmContainer.prototype.updateByData = function () {
        // run without accessing this.source to determine total length - need to know it to create Uint8Array
        var length = this.writeSections('draft');
        this.source = new Uint8Array(length);
        // now really write data
        this.writeSections();
    };
    WebmContainer.prototype.getSectionById = function (id) {
        for (var i = 0; i < this.data.length; i++) {
            var section = this.data[i];
            if (section.id === id) {
                return section.data;
            }
        }
        return null;
    };
    function WebmFile(source) {
        WebmContainer.call(this, 'File', 'File');
        this.setSource(source);
    }
    doInherit(WebmFile, WebmContainer);
    WebmFile.prototype.fixDuration = function (duration, options) {
        var logger = options && options.logger;
        if (logger === undefined) {
            logger = function (message) {
                console.log(message);
            };
        }
        else if (!logger) {
            logger = function () { };
        }
        var segmentSection = this.getSectionById(0x8538067);
        if (!segmentSection) {
            logger('[fix-webm-duration] Segment section is missing');
            return false;
        }
        var infoSection = segmentSection.getSectionById(0x549a966);
        if (!infoSection) {
            logger('[fix-webm-duration] Info section is missing');
            return false;
        }
        var timeScaleSection = infoSection.getSectionById(0xad7b1);
        if (!timeScaleSection) {
            logger('[fix-webm-duration] TimecodeScale section is missing');
            return false;
        }
        var durationSection = infoSection.getSectionById(0x489);
        if (durationSection) {
            if (durationSection.getValue() <= 0) {
                logger(`[fix-webm-duration] Duration section is present, but the value is ${durationSection.getValue()}`);
                durationSection.setValue(duration);
            }
            else {
                logger(`[fix-webm-duration] Duration section is present, and the value is ${durationSection.getValue()}`);
                return false;
            }
        }
        else {
            logger('[fix-webm-duration] Duration section is missing');
            // append Duration section
            durationSection = new WebmFloat('Duration', 'Float');
            durationSection.setValue(duration);
            infoSection.data.push({
                id: 0x489,
                data: durationSection
            });
        }
        // set default time scale to 1 millisecond (1000000 nanoseconds)
        timeScaleSection.setValue(1000000);
        infoSection.updateByData();
        segmentSection.updateByData();
        this.updateByData();
        return true;
    };
    WebmFile.prototype.toBlob = function (mimeType) {
        return new Blob([this.source.buffer], { type: mimeType || 'video/webm' });
    };
    function fixWebmDuration(blob, duration, callback, options) {
        // The callback may be omitted - then the third argument is options
        if (typeof callback === "object") {
            options = callback;
            callback = undefined;
        }
        if (!callback) {
            return new Promise(function (resolve) {
                fixWebmDuration(blob, duration, resolve, options);
            });
        }
        try {
            var reader = new FileReader();
            reader.onloadend = function () {
                try {
                    var file = new WebmFile(new Uint8Array(reader.result));
                    if (file.fixDuration(duration, options)) {
                        blob = file.toBlob(blob.type);
                    }
                }
                catch (ex) {
                    // ignore
                }
                callback(blob);
            };
            reader.readAsArrayBuffer(blob);
        }
        catch (ex) {
            callback(blob);
        }
    }
    // Support AMD import default
    fixWebmDuration.default = fixWebmDuration;
    return fixWebmDuration;
});

},
"renderer/js/message-thread.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMessageThread = createMessageThread;
// Preserve media elements when receipts or neighboring messages change. Moving
// an existing audio element through replaceChildren can interrupt its playback.
function createMessageThread(container) {
    const rows = new Map();
    function dispose(row) { row.node.querySelectorAll('audio').forEach(audio => audio.pause()); row.dispose?.(); row.node.remove(); }
    function clear() { for (const row of rows.values())
        dispose(row); rows.clear(); container.replaceChildren(); }
    function update(messages, { fingerprint, create, refresh }) {
        const keep = new Set(messages.map(message => message.id));
        for (const [id, row] of rows)
            if (!keep.has(id)) {
                dispose(row);
                rows.delete(id);
            }
        let previous = null;
        for (const message of messages) {
            const key = fingerprint(message);
            let row = rows.get(message.id);
            if (row && row.key !== key) {
                dispose(row);
                rows.delete(message.id);
                row = null;
            }
            if (!row) {
                row = { ...create(message), key };
                rows.set(message.id, row);
            }
            refresh(row.node, message);
            const expected = previous ? previous.nextSibling : container.firstChild;
            if (row.node !== expected)
                container.insertBefore(row.node, expected);
            previous = row.node;
        }
    }
    return { update, clear, pause: () => container.querySelectorAll('audio').forEach(audio => audio.pause()) };
}

},
"renderer/js/message-reactions.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MESSAGE_REACTIONS = void 0;
exports.createMessageReactions = createMessageReactions;
// Fixed choices keep the reaction picker small and consistent for parents and kids.
exports.MESSAGE_REACTIONS = Object.freeze([
    { emoji: '👍', label: 'Thumbs up' }, { emoji: '😂', label: 'Laughing' },
    { emoji: '❤️', label: 'Love' }, { emoji: '🎉', label: 'Celebrate' },
    { emoji: '😮', label: 'Surprised' }, { emoji: '😢', label: 'Sad' }
]);
let openReactionPicker = null;
function createMessageReactions({ onReact, messageElement, otherParent = 'Parent', otherChild = 'Child' }) {
    const node = document.createElement('div');
    node.className = 'message-reactions';
    const badges = document.createElement('div');
    badges.className = 'message-reaction-badges';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'message-reaction-trigger';
    const smile = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    smile.setAttribute('viewBox', '0 0 24 24');
    smile.setAttribute('fill', 'none');
    smile.setAttribute('stroke', 'currentColor');
    smile.setAttribute('stroke-width', '1.8');
    smile.setAttribute('stroke-linecap', 'round');
    smile.setAttribute('aria-hidden', 'true');
    for (const d of ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', 'M8 14s1.5 2 4 2 4-2 4-2', 'M9 9h.01', 'M15 9h.01']) {
        const path = document.createElementNS(smile.namespaceURI, 'path');
        path.setAttribute('d', d);
        smile.append(path);
    }
    trigger.append(smile);
    trigger.title = 'React to this message';
    trigger.setAttribute('aria-label', 'React to this message');
    trigger.setAttribute('aria-expanded', 'false');
    const picker = document.createElement('div');
    picker.className = 'message-reaction-picker';
    picker.hidden = true;
    picker.setAttribute('role', 'toolbar');
    picker.setAttribute('aria-label', 'Choose a message reaction');
    picker.id = 'reaction-picker-' + crypto.randomUUID();
    trigger.setAttribute('aria-controls', picker.id);
    const feedback = document.createElement('span');
    feedback.className = 'message-reaction-feedback';
    feedback.setAttribute('role', 'status');
    feedback.hidden = true;
    node.append(badges, trigger, feedback);
    let reactions = [], busy = false, disposed = false, key = '', holdTimer = null, press = null, suppressClickUntil = 0;
    const buttons = new Map(), listeners = new AbortController();
    const owns = target => target instanceof Node && (node.contains(target) || picker.contains(target));
    const interactive = target => target instanceof Element && target.closest('button,a,input,textarea,select,audio,video,[contenteditable=true]');
    function cancelHold() { clearTimeout(holdTimer); holdTimer = null; press = null; }
    function close(restoreFocus = false) {
        cancelHold();
        picker.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        messageElement?.classList.remove('message-reaction-open');
        if (openReactionPicker === close)
            openReactionPicker = null;
        document.removeEventListener('pointerdown', outside, true);
        document.removeEventListener('scroll', dismiss, true);
        window.removeEventListener('resize', dismiss);
        if (restoreFocus && !disposed && trigger.isConnected)
            trigger.focus({ preventScroll: true });
    }
    function dismiss() { close(); }
    function outside(event) { if (!owns(event.target))
        close(); }
    function open(keyboard = false) {
        if (busy || disposed || !node.isConnected)
            return;
        if (openReactionPicker && openReactionPicker !== close)
            openReactionPicker();
        openReactionPicker = close;
        if (!picker.isConnected)
            document.body.append(picker);
        picker.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        messageElement?.classList.add('message-reaction-open');
        const box = (messageElement || node).getBoundingClientRect(), size = picker.getBoundingClientRect(), viewport = window.visualViewport;
        const left = viewport?.offsetLeft || 0, top = viewport?.offsetTop || 0, width = viewport?.width || innerWidth, height = viewport?.height || innerHeight;
        picker.style.left = Math.max(left + 8, Math.min(box.left, left + width - size.width - 8)) + 'px';
        picker.style.top = Math.max(top + 8, Math.min(box.top - size.height - 8 >= top + 8 ? box.top - size.height - 8 : box.bottom + 8, top + height - size.height - 8)) + 'px';
        document.addEventListener('pointerdown', outside, true);
        document.addEventListener('scroll', dismiss, true);
        window.addEventListener('resize', dismiss);
        if (keyboard)
            picker.querySelector('button').focus({ preventScroll: true });
    }
    function controls() {
        node.setAttribute('aria-busy', String(busy));
        for (const button of [...node.querySelectorAll('button'), ...picker.querySelectorAll('button')])
            button.disabled = busy;
    }
    function update(value = []) {
        reactions = Array.isArray(value) ? value.filter(item => exports.MESSAGE_REACTIONS.some(choice => choice.emoji === item.emoji) && Number.isInteger(item.count) && item.count > 0) : [];
        const next = JSON.stringify(reactions);
        if (next !== key) {
            key = next;
            badges.replaceChildren();
            for (const reaction of reactions) {
                const choice = exports.MESSAGE_REACTIONS.find(choice => choice.emoji === reaction.emoji);
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'message-reaction-badge';
                button.dataset.emoji = reaction.emoji;
                const badge = document.createElement('span');
                badge.textContent = reaction.emoji + ' ' + reaction.count;
                button.append(badge);
                const people = reaction.mine && reaction.count === 1 ? ['You'] : [...(reaction.from || []).map(role => role === 'parent' ? otherParent : otherChild), reaction.mine ? 'including you' : ''].filter(Boolean);
                button.title = choice.label + ' · ' + [...new Set(people)].join(', ');
                button.setAttribute('aria-label', choice.label + ', ' + reaction.count + (reaction.mine ? ', your reaction. Remove reaction' : '. Add your reaction'));
                button.setAttribute('aria-pressed', String(Boolean(reaction.mine)));
                button.addEventListener('click', () => void react(reaction.emoji));
                badges.append(button);
            }
            for (const [emoji, button] of buttons)
                button.setAttribute('aria-pressed', String(reactions.some(item => item.emoji === emoji && item.mine)));
        }
        messageElement?.classList.toggle('message-has-reaction-badges', reactions.length > 0);
        controls();
    }
    async function react(emoji) {
        if (busy || disposed)
            return;
        const remove = reactions.some(item => item.emoji === emoji && item.mine);
        const restoreFocus = picker.contains(document.activeElement);
        busy = true;
        feedback.hidden = true;
        close();
        controls();
        try {
            const value = await onReact(remove ? null : emoji);
            if (disposed)
                return;
            update(value);
            feedback.textContent = remove ? 'Reaction removed' : 'Reaction saved';
        }
        catch (error) {
            if (disposed)
                return;
            feedback.textContent = error.message || 'Reaction could not send. Reconnect and try again.';
            feedback.hidden = false;
        }
        finally {
            busy = false;
            if (!disposed) {
                controls();
                if (restoreFocus && trigger.isConnected)
                    trigger.focus({ preventScroll: true });
            }
        }
    }
    for (const choice of exports.MESSAGE_REACTIONS) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = choice.emoji;
        button.dataset.emoji = choice.emoji;
        button.setAttribute('aria-label', choice.label);
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', () => void react(choice.emoji));
        buttons.set(choice.emoji, button);
        picker.append(button);
    }
    trigger.addEventListener('click', event => { if (picker.hidden)
        open(event.detail === 0);
    else
        close(); });
    function keydown(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            close(true);
        }
        if (picker.hidden || !picker.contains(event.target))
            return;
        const all = [...buttons.values()], index = all.indexOf(document.activeElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? all.length - 1 : event.key === 'ArrowRight' ? (index + 1) % all.length : event.key === 'ArrowLeft' ? (index + all.length - 1) % all.length : null;
        if (next !== null) {
            event.preventDefault();
            all[next].focus();
        }
    }
    for (const el of [node, picker]) {
        el.addEventListener('keydown', keydown);
        el.addEventListener('focusout', event => { if (!owns(event.relatedTarget))
            close(); });
    }
    if (messageElement) {
        messageElement.classList.add('message-can-react');
        messageElement.addEventListener('pointerdown', event => {
            cancelHold();
            if (busy || event.isPrimary === false || !['touch', 'pen'].includes(event.pointerType) || interactive(event.target))
                return;
            press = { id: event.pointerId, x: event.clientX, y: event.clientY };
            holdTimer = setTimeout(() => { holdTimer = null; suppressClickUntil = Date.now() + 1000; open(); }, 500);
        }, { passive: true, signal: listeners.signal });
        messageElement.addEventListener('pointermove', event => { if (press && (event.pointerId !== press.id || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10))
            cancelHold(); }, { passive: true, signal: listeners.signal });
        for (const type of ['pointerup', 'pointercancel', 'pointerleave'])
            messageElement.addEventListener(type, cancelHold, { passive: true, signal: listeners.signal });
        messageElement.addEventListener('click', event => { if (Date.now() < suppressClickUntil && !interactive(event.target)) {
            event.preventDefault();
            event.stopPropagation();
        } }, { capture: true, signal: listeners.signal });
        messageElement.addEventListener('contextmenu', event => { if (!interactive(event.target)) {
            event.preventDefault();
            cancelHold();
            open();
        } }, { signal: listeners.signal });
    }
    update();
    return { node, update, dispose() { disposed = true; close(); listeners.abort(); picker.remove(); messageElement?.classList.remove('message-can-react', 'message-has-reaction-badges'); } };
}

},
"renderer/js/cloud-student-chat-layout.js":function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountChildChatLayout = mountChildChatLayout;
// Presentation only: conversations keep their existing authenticated transports.
function mountChildChatLayout({ panel, tabs, groupTabs, privateChat, familyChat, groupChat, privateTools, siblingPicker, siblingGroupPicker, onFilter, onBackToChats }) {
    const el = id => document.getElementById(id);
    const bar = document.createElement('header');
    bar.className = 'student-messages-top';
    const home = panel.querySelector('[data-student-home]');
    home.innerHTML = '<i data-lucide="arrow-left" aria-hidden="true"></i><span>Dashboard</span>';
    bar.append(home);
    const title = document.createElement('h1');
    title.textContent = 'Messages';
    bar.append(title);
    const sound = document.createElement('button');
    sound.type = 'button';
    sound.id = 'student-message-sound';
    sound.setAttribute('aria-pressed', 'false');
    bar.append(sound);
    const connection = document.createElement('span');
    connection.className = 'student-chat-connection';
    bar.append(connection);
    const layout = document.createElement('div');
    layout.className = 'student-chat-layout';
    const sidebar = document.createElement('aside');
    sidebar.className = 'student-chat-sidebar';
    sidebar.setAttribute('aria-label', 'Conversations');
    sidebar.innerHTML = '<div class="student-chat-list-heading"><h2>Chats</h2><button id="student-new-chat" type="button" hidden><i data-lucide="square-pen" aria-hidden="true"></i> New chat</button></div><label class="student-chat-search"><i data-lucide="search" aria-hidden="true"></i><input id="student-chat-search" type="search" placeholder="Search chats" aria-label="Search chats"></label><div class="student-chat-filters" role="group" aria-label="Chat list"><button type="button" id="student-current-chats" aria-pressed="true">Chats</button><button type="button" id="student-archived-chats" aria-pressed="false"><i data-lucide="archive" aria-hidden="true"></i> Archived</button></div>';
    const list = document.createElement('nav');
    list.className = 'student-chat-list';
    list.setAttribute('aria-label', 'Choose a conversation');
    list.append(tabs, groupTabs);
    const empty = document.createElement('p');
    empty.className = 'student-chat-empty';
    empty.textContent = 'No conversations here.';
    empty.hidden = true;
    list.append(empty);
    sidebar.append(list);
    const conversation = document.createElement('div');
    conversation.className = 'student-chat-conversation';
    conversation.append(privateChat, familyChat, groupChat);
    layout.append(sidebar, conversation);
    panel.prepend(bar);
    bar.after(layout);
    // Keep the existing audio controls in the header while messaging. Only the
    // buttons move: the player stays mounted, so changing screens cannot stop it.
    const noiseDock = document.querySelector('.white-noise-dock');
    if (noiseDock) {
        const placeNoise = () => { const target = panel.hidden ? document.body : bar; if (noiseDock.parentElement !== target)
            target.append(noiseDock); };
        const noisePlacement = new MutationObserver(placeNoise);
        noisePlacement.observe(panel, { attributes: true, attributeFilter: ['hidden'] });
        placeNoise();
        window.addEventListener('pagehide', () => noisePlacement.disconnect(), { once: true });
    }
    const dialog = document.createElement('dialog');
    dialog.id = 'student-new-chat-dialog';
    dialog.setAttribute('aria-labelledby', 'student-new-chat-title');
    dialog.innerHTML = '<header><div><h2 id="student-new-chat-title">New chat</h2><p>Choose a sibling or start a group.</p></div><button type="button" aria-label="Close new chat"><i data-lucide="x" aria-hidden="true"></i></button></header>';
    dialog.append(siblingPicker, siblingGroupPicker);
    panel.append(dialog);
    dialog.querySelector('header button').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog)
        dialog.close(); });
    el('student-new-chat').addEventListener('click', () => dialog.showModal());
    function decorateConversation(button, name, subtitle, icon) {
        button.className = 'student-chat-contact';
        const avatar = document.createElement('span');
        avatar.className = 'student-chat-avatar';
        const glyph = document.createElement('i');
        glyph.dataset.lucide = icon;
        glyph.setAttribute('aria-hidden', 'true');
        avatar.append(glyph);
        const text = document.createElement('span');
        text.className = 'student-chat-contact-copy';
        const strong = document.createElement('strong');
        strong.textContent = name;
        const small = document.createElement('small');
        small.textContent = subtitle;
        text.append(strong, small);
        button.replaceChildren(avatar, text);
    }
    decorateConversation(el('message-private-tab'), 'Mom & Dad', 'Private conversation', 'heart');
    decorateConversation(el('message-family-tab'), 'Family', 'Everyone at home', 'house');
    for (const chat of [privateChat, familyChat, groupChat]) {
        const header = chat.querySelector('header,.chat-header');
        const back = document.createElement('button');
        back.type = 'button';
        back.className = 'message-list-back';
        back.setAttribute('aria-label', 'Back to chats');
        back.innerHTML = '<i data-lucide="arrow-left" aria-hidden="true"></i>';
        back.addEventListener('click', () => { panel.classList.remove('student-chat-open'); onBackToChats(); el('student-chat-search').focus({ preventScroll: true }); });
        header.prepend(back);
    }
    privateChat.querySelector('.chat-header').append(privateTools);
    el('message-refresh').innerHTML = '<i data-lucide="refresh-cw" aria-hidden="true"></i>';
    el('message-refresh').title = 'Check for new messages';
    el('message-refresh').setAttribute('aria-label', 'Check for new messages');
    for (const [button, chat] of [[el('message-older'), privateChat], [el('family-message-older'), familyChat], [el('group-message-older'), groupChat]]) {
        button.textContent = 'Earlier messages';
        button.classList.add('student-chat-earlier');
        if (chat !== privateChat)
            chat.querySelector('header').append(button);
    }
    const quick = document.createElement('details');
    quick.className = 'student-chat-quick';
    const summary = document.createElement('summary');
    summary.innerHTML = '<i data-lucide="zap" aria-hidden="true"></i> Quick replies';
    quick.append(summary);
    const chips = privateChat.querySelector('.quick-chips');
    chips.before(quick);
    quick.append(chips);
    chips.addEventListener('click', event => { if (event.target.closest('button'))
        quick.open = false; });
    const file = el('message-file'), label = file.closest('label');
    label.className = 'student-chat-attach';
    label.replaceChildren();
    label.title = 'Attach a photo, PDF or audio · up to 2 MB';
    label.innerHTML = '<i data-lucide="paperclip" aria-hidden="true"></i><span class="student-chat-sr">Attach a file</span>';
    label.append(file);
    privateChat.querySelector('.input-row').prepend(label);
    const selection = document.createElement('div');
    selection.className = 'student-chat-file';
    selection.hidden = true;
    const filename = document.createElement('span'), remove = document.createElement('button');
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Remove attachment');
    remove.innerHTML = '<i data-lucide="x" aria-hidden="true"></i>';
    selection.append(filename, remove);
    privateChat.querySelector('.input-row').before(selection);
    const updateFile = () => { selection.hidden = !file.files?.length; filename.textContent = file.files?.[0]?.name || ''; };
    file.addEventListener('change', updateFile);
    remove.addEventListener('click', () => { if (!file.disabled) {
        file.value = '';
        updateFile();
    } });
    // Sending clears the native field; mirror its state without changing send logic.
    const observer = new MutationObserver(() => { remove.disabled = file.disabled; updateFile(); });
    observer.observe(file, { attributes: true, attributeFilter: ['disabled'] });
    window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
    let archived = false;
    function filter(value) { archived = value; el('student-current-chats').setAttribute('aria-pressed', String(!value)); el('student-archived-chats').setAttribute('aria-pressed', String(value)); onFilter(); }
    el('student-current-chats').addEventListener('click', () => filter(false));
    el('student-archived-chats').addEventListener('click', () => filter(true));
    el('student-chat-search').addEventListener('input', onFilter);
    function setOnline(online) { connection.textContent = online ? 'Connected' : 'Offline'; connection.classList.toggle('offline', !online); }
    function setSoundMuted(muted, available = true) {
        sound.disabled = !available;
        sound.setAttribute('aria-pressed', String(muted));
        sound.setAttribute('aria-label', muted ? 'Unmute message sounds' : 'Mute message sounds');
        sound.title = muted ? 'Turn message sounds on' : 'Turn message sounds off';
        sound.innerHTML = '<i data-lucide="' + (muted ? 'bell-off' : 'bell') + '" aria-hidden="true"></i><span>' + (muted ? 'Unmute' : 'Mute') + '</span>';
        window.lucide?.createIcons();
    }
    setSoundMuted(false, false);
    window.lucide?.createIcons();
    return { decorateConversation, setOnline, setSoundMuted, onSoundToggle: callback => sound.addEventListener('click', callback), query: () => el('student-chat-search').value.trim().toLowerCase(), archived: () => archived,
        update: ({ empty: noResults, canStart, online }) => { empty.hidden = !noResults; el('student-new-chat').hidden = !canStart; if (!canStart)
            dialog.close(); setOnline(online); window.lucide?.createIcons(); },
        showConversation: () => panel.classList.add('student-chat-open'), closeNewChat: () => dialog.close(),
        showListOnSmallScreen: () => panel.classList.remove('student-chat-open'),
        reset: () => { dialog.close(); archived = false; el('student-chat-search').value = ''; el('student-current-chats').setAttribute('aria-pressed', 'true'); el('student-archived-chats').setAttribute('aria-pressed', 'false'); }
    };
}

}};const cache={};function require(id){if(cache[id])return cache[id].exports;const module={exports:{}};cache[id]=module;modules[id](require,module,module.exports);return module.exports;}require("renderer/js/preview/dashboard.js");})();