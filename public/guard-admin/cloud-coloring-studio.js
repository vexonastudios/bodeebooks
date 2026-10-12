export function setupCloudColoringStudio({ endpoint }) {
  const root = document.getElementById('cloud-coloring-studio');
  let active = false, epoch = 0, overview = null;
  let pendingRead = null, lastPendingRead = 0, pendingController = null;
  const imageReads = new Map();
  const announcePending = pending => document.dispatchEvent(new CustomEvent('cloud-coloring-pending', { detail: { pending } }));

  // Keep text and classes separate so styling names never become page content.
  const node = (tag, text = '', className = '') => {
    const value = document.createElement(tag);
    value.textContent = text;
    value.className = className;
    return value;
  };
  const icon = name => {
    const value = node('i');
    value.setAttribute('data-lucide', name);
    value.setAttribute('aria-hidden', 'true');
    return value;
  };
  function heading(tag, text, glyph) {
    const value = node(tag, '', 'cloud-coloring-heading');
    value.append(icon(glyph), node('span', text));
    return value;
  }
  function button(label, glyph, primary = false) {
    const value = node('button', '', 'btn btn-' + (primary ? 'primary' : 'secondary'));
    value.type = 'button';
    value.append(icon(glyph), node('span', label));
    return value;
  }
  function statusNode() {
    const value = node('p', '', 'cloud-coloring-status');
    value.setAttribute('role', 'status');
    return value;
  }
  const call = async input => {
    const generating = input.action === 'coloring-request-action' && ['approve', 'retry'].includes(input.requestAction);
    const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(generating ? 180000 : 30000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || 'Coloring Studio could not be updated.');
    return data;
  };
  const dataUrl = async (request, thumbnail = true) => {
    const key = request.id + ':' + thumbnail;
    const cached = imageReads.get(key);
    if (cached && cached.expires > Date.now()) return cached.read;
    const entry = { expires: Date.now() + 60000 };
    entry.read = (async () => {
      const file = await call({ action: 'coloring-image', requestId: request.id, thumbnail });
      if (file.url?.startsWith('https://bodeeguard-cloud-assets.james-7f8.workers.dev/v1/download/')) {
        entry.expires = Date.now() + 60000; return file.url;
      }
      if (typeof file.data !== 'string' || file.mime !== 'image/webp') throw Error('The coloring page could not be opened.');
      entry.expires = Infinity;
      return 'data:' + file.mime + ';base64,' + file.data;
    })();
    imageReads.set(key, entry);
    try { return await entry.read; }
    catch (error) { if (imageReads.get(key) === entry) imageReads.delete(key); throw error; }
  };
  async function previewImage(request) {
    const dialog = node('dialog', '', 'cloud-coloring-dialog');
    dialog.setAttribute('aria-label', request.title + ' coloring page');
    const head = node('div', '', 'cloud-coloring-dialog-head'), close = button('Close', 'x');
    head.append(node('h2', request.title), close);
    const image = node('img'); image.alt = request.title; image.hidden = true;
    const status = statusNode(), retry = button('Retry image', 'refresh-cw'); retry.hidden = true;
    const open = async () => {
      status.textContent = 'Opening full-size image…'; status.dataset.error = 'false'; retry.hidden = true;
      image.hidden = true;
      try { const url = await dataUrl(request, false); if (dialog.isConnected) image.src = url; }
      catch (error) { if (dialog.isConnected) failed(error.message); }
    };
    const failed = message => { image.hidden = true; status.textContent = message; status.dataset.error = 'true'; retry.hidden = false; imageReads.delete(request.id + ':false'); };
    image.onload = () => { image.hidden = false; status.textContent = ''; };
    image.onerror = () => failed('The image could not load. Try again to request a fresh preview.');
    retry.onclick = () => void open(); close.onclick = () => dialog.close();
    dialog.append(head, image, status, retry); document.body.append(dialog);
    dialog.addEventListener('close', () => dialog.remove(), { once: true }); dialog.showModal();
    void open(); window.lucide?.createIcons();
  }
  const imageObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting && active && !document.hidden) {
      imageObserver.unobserve(entry.target); entry.target.loadPreview?.();
    }
  }, { rootMargin: '160px' });
  function checkbox(label, checked) {
    const wrap = node('label', '', 'cloud-coloring-toggle'), input = node('input');
    input.type = 'checkbox';
    input.checked = checked === true;
    wrap.append(node('span', label), input);
    return { wrap, input };
  }
  function number(label, value, min, max) {
    const wrap = node('label', '', 'cloud-coloring-field'), input = node('input', '', 'admin-input');
    input.type = 'number';
    input.min = String(min);
    input.max = String(max);
    input.required = true;
    input.value = String(value);
    wrap.append(node('span', label), input);
    return { wrap, input };
  }
  function saveForm(form, save, status, input) {
    save.type = 'submit';
    form.onsubmit = async event => {
      event.preventDefault();
      if (save.disabled) return;
      save.disabled = true;
      status.textContent = 'Saving…';
      status.dataset.error = 'false';
      try {
        await call(input());
        status.textContent = 'Saved.';
        await load();
      } catch (error) {
        status.textContent = error.message;
        status.dataset.error = 'true';
      } finally { save.disabled = false; }
    };
  }
  function studentCard(student) {
    const card = node('form', '', 'cloud-panel cloud-coloring-card');
    card.setAttribute('aria-label', student.name + ' Coloring Studio settings');
    const head = node('div', '', 'cloud-coloring-student-head');
    const avatar = node('span', student.name.slice(0, 1).toUpperCase(), 'cloud-coloring-avatar');
    avatar.setAttribute('aria-hidden', 'true');
    const identity = node('div');
    identity.append(node('h3', student.name), node('p', student.used_today + ' pages used today', 'cloud-coloring-muted'));
    head.append(avatar, identity);
    card.append(head);
    const controls = {
      enabled: checkbox('Enable Coloring Studio', student.settings.enabled),
      daily: number('Daily page limit', student.settings.daily_limit, 1, 10),
      custom: checkbox('Allow child-entered ideas', student.settings.custom_prompts_enabled),
      people: checkbox('Allow people in pages', student.settings.allow_people),
      promptReview: checkbox('Approve child-entered ideas first', student.settings.require_parent_approval),
      imageReview: checkbox('Review finished images first', student.settings.require_image_approval),
    };
    Object.values(controls).forEach(control => card.append(control.wrap));
    const save = button('Save child settings', 'save'), status = statusNode();
    saveForm(card, save, status, () => ({ action: 'coloring-student-settings', studentId: student.id,
      enabled: controls.enabled.input.checked, daily_limit: Number(controls.daily.input.value),
      custom_prompts_enabled: controls.custom.input.checked, allow_people: controls.people.input.checked,
      require_parent_approval: controls.promptReview.input.checked, require_image_approval: controls.imageReview.input.checked }));
    card.append(save, status);
    return card;
  }
  function globalCard() {
    const card = node('form', '', 'cloud-panel cloud-coloring-budget');
    card.setAttribute('aria-label', 'Family sharing & rendering limits');
    const settings = overview.global_settings;
    const daily = number('Daily render limit', settings.family_daily_limit, 1, 30);
    const monthly = number('Monthly render limit', settings.family_monthly_limit, 1, 500);
    const reuse = checkbox('Reuse approved pages without another render', settings.reuse_matching_pages);
    const share = checkbox('Automatically share new pages with all my children', settings.auto_share_with_family);
    share.input.name = 'auto_share_with_family';
    const status = statusNode(), save = button('Save family settings', 'save', true);
    const head = node('div', '', 'cloud-coloring-section-head'), remaining = node('div', '', 'cloud-coloring-remaining');
    remaining.append(node('span', overview.generation_remaining.today + ' left today'), node('span', overview.generation_remaining.month + ' left this month'));
    head.append(heading('h2', 'Family sharing & rendering limits', 'gauge'), remaining);
    const fields = node('div', '', 'cloud-coloring-budget-fields');
    fields.append(daily.wrap, monthly.wrap, reuse.wrap, save);
    const sharing = node('div', '', 'cloud-coloring-sharing-setting');
    sharing.append(share.wrap, node('p', 'When review is required, pages are shared only after you approve the image. Otherwise, they are shared when ready. Applies to future pages; existing pages keep their current sharing.', 'cloud-coloring-muted'));
    card.append(head, sharing, fields, status);
    saveForm(card, save, status, () => ({ action: 'coloring-global-settings', family_daily_limit: Number(daily.input.value), family_monthly_limit: Number(monthly.input.value), reuse_matching_pages: reuse.input.checked, auto_share_with_family: share.input.checked }));
    return card;
  }
  const stageFor = request => ({ pending_image_review: 'images', pending_parent: 'ideas', generating: 'progress', error: 'progress', completed: 'saved' })[request.status];
  const reviewStages = [
    { id: 'images', title: 'Images ready for review', glyph: 'image-check', description: 'Inspect the full page, choose who can see it, then approve or reject the image.', empty: 'No finished images are waiting. Ideas below have not been created yet.' },
    { id: 'ideas', title: 'Ideas to approve', glyph: 'lightbulb', description: 'These are the children’s words, not images. Approve an idea to create its coloring page.', empty: 'No new ideas need your approval.' },
    { id: 'progress', title: 'Creating pages & needs attention', glyph: 'clock', description: 'Follow pages being created or retry a request that failed.', empty: 'No pages are being created or waiting for a retry.' },
  ];
  function updateReviewSections() {
    for (const stage of reviewStages) {
      const rows = overview.requests.filter(request => stageFor(request) === stage.id);
      const section = root.querySelector('[data-review-stage="' + stage.id + '"]');
      if (!section) continue;
      section.querySelector('.cloud-coloring-stage-count').textContent = String(rows.length);
      const list = section.querySelector('.cloud-coloring-requests');
      if (!rows.length && !list.children.length) list.append(node('p', stage.empty, 'cloud-coloring-empty'));
      const shortcut = root.querySelector('[data-review-target="' + stage.id + '"] span');
      if (shortcut) shortcut.textContent = rows.length + ' ' + ({ images: rows.length === 1 ? 'image' : 'images', ideas: rows.length === 1 ? 'idea' : 'ideas', progress: 'in progress / retry' })[stage.id];
    }
  }
  function requestCard(request) {
    const card = node('article', '', 'cloud-coloring-request');
    card.dataset.requestId = request.id; card.dataset.state = request.status;
    let previewReady = request.status === 'pending_parent', updating = false;
    const approveControls = [];
    if (request.image_url || request.status === 'pending_image_review') {
      const artwork = node('div', '', 'cloud-coloring-artwork'), preview = node('div', '', 'cloud-coloring-preview');
      const previewHead = node('div', '', 'cloud-coloring-preview-head');
      const identity = node('div', '', 'cloud-coloring-preview-identity');
      identity.append(node('p', request.student_name || 'Child', 'cloud-coloring-owner'), node('h3', request.title === 'My Coloring Idea' ? 'Coloring idea' : request.title));
      previewHead.append(identity);
      artwork.append(previewHead, preview); card.append(artwork);
      if (request.image_url) {
        const image = node('img', '', 'cloud-coloring-image'); image.alt = request.title; image.decoding = 'async';
        const zoom = button('Enlarge', 'maximize-2'); zoom.classList.add('cloud-coloring-zoom');
        zoom.setAttribute('aria-label', 'Enlarge ' + request.title); zoom.onclick = () => void previewImage(request); previewHead.append(zoom);
        const thumbnail = request.status !== 'pending_image_review';
        const key = request.id + ':' + thumbnail;
        const loading = node('p', 'Loading page…', 'cloud-coloring-preview-loading'); preview.append(loading);
        const failed = message => {
          previewReady = false; approveControls.forEach(control => { control.disabled = true; }); imageReads.delete(key);
          const retry = button('Retry preview', 'refresh-cw'); retry.onclick = () => void preview.loadPreview();
          preview.replaceChildren(icon('image-off'), node('p', message), retry); window.lucide?.createIcons();
        };
        image.onload = () => { if (preview.isConnected) { previewReady = true; approveControls.forEach(control => { control.disabled = updating; }); } };
        image.onerror = () => failed('This image could not load. Approval stays paused until you can see it.');
        preview.loadPreview = async () => {
          preview.replaceChildren(node('p', 'Loading page…', 'cloud-coloring-preview-loading'));
          try {
            const url = await dataUrl(request, thumbnail);
            if (active && preview.isConnected) { preview.replaceChildren(image); image.src = url; }
          } catch (error) { if (active && preview.isConnected) failed(error.message); }
        };
        imageObserver.observe(preview);
      } else {
        preview.append(icon('image-off'), node('p', 'The image is unavailable. Refresh to check again.'));
      }
    }
    const body = node('div', '', 'cloud-coloring-request-body');
    const labels = { pending_parent: 'Idea only · not created yet', pending_image_review: 'Image awaiting approval', completed: 'Approved', error: 'Creation failed', rejected: 'Rejected', generating: 'Creating page' };
    const details = node('p', labels[request.status] || request.status.replaceAll('_', ' '), 'cloud-coloring-badge'); details.dataset.state = request.status;
    if (request.shared_with_family) details.append(node('span', ' · Shared with family'));
    const title = request.title === 'My Coloring Idea' ? 'Coloring idea' : request.title;
    if (!card.querySelector('.cloud-coloring-artwork')) body.append(node('p', request.student_name || 'Child', 'cloud-coloring-owner'), node('h3', title));
    body.append(details);
    if (request.original_prompt) body.append(node('p', request.original_prompt, 'cloud-coloring-prompt'));
    if (request.status === 'pending_parent') body.append(node('p', 'No image exists yet. Creating a new page uses your family’s AI allowance. When image review is enabled, you will approve the finished page separately.', 'cloud-coloring-muted'));
    if (request.safety_reason) body.append(node('p', request.safety_reason, 'cloud-coloring-reason'));
    const share = request.status === 'pending_image_review' ? checkbox('Share approved page with all my children', overview.global_settings.auto_share_with_family) : null;
    if (share) { share.input.name = 'shareWithFamily'; body.append(share.wrap); }
    const actions = {
      pending_parent: [['approve', 'Approve idea & create page', 'sparkles'], ['reject', 'Reject idea', 'x']],
      pending_image_review: [['approve-image', 'Approve image', 'check'], ['reject-image', 'Reject image', 'x']],
      error: [['retry', 'Retry creation', 'refresh-cw']],
      completed: [[request.shared_with_family ? 'unshare' : 'share', request.shared_with_family ? 'Stop sharing' : 'Share with family', 'users'], ['delete', 'Delete', 'trash-2']],
    }[request.status] || [];
    const controls = node('div', '', 'cloud-coloring-actions'), status = statusNode();
    for (const [action, label, glyph] of actions) {
      const control = button(label, glyph); control.dataset.reviewAction = action;
      if (action.startsWith('approve')) { control.classList.add('cloud-coloring-approve'); approveControls.push(control); control.disabled = !previewReady; }
      if (action === 'delete' || action.startsWith('reject')) control.classList.add('cloud-coloring-danger');
      control.onclick = async () => {
        if (updating) return;
        const wasFocused = card.contains(document.activeElement);
        updating = true;
        const buttons = [...controls.querySelectorAll('button')]; buttons.forEach(value => { value.disabled = true; });
        if (share) share.input.disabled = true;
        const creates = ['approve', 'retry'].includes(action);
        status.textContent = creates ? 'Creating page… This may take a minute.' : 'Saving your decision…'; status.dataset.error = 'false';
        try {
          const updated = await call({ action: 'coloring-request-action', requestId: request.id, requestAction: action, ...(share ? { shareWithFamily: share.input.checked } : {}) });
          if (!active || !card.isConnected) return;
          overview.requests = overview.requests.map(row => row.id === request.id ? updated : row);
          card.querySelectorAll('.cloud-coloring-preview').forEach(preview => imageObserver.unobserve(preview));
          const targetStage = stageFor(updated);
          const target = targetStage === 'saved' ? root.querySelector('.cloud-coloring-library .cloud-coloring-requests') : root.querySelector('[data-review-stage="' + targetStage + '"] .cloud-coloring-requests');
          const focused = wasFocused && (document.activeElement === document.body || card.contains(document.activeElement)); card.remove();
          if (target) {
            target.querySelector('.cloud-coloring-empty')?.remove();
            const next = requestCard({ ...updated, student_name: request.student_name }); target.prepend(next);
            if (focused && targetStage === 'images' && creates) { next.scrollIntoView({ block: 'start', behavior: 'smooth' }); next.querySelector('button')?.focus({ preventScroll: true }); }
          }
          const feedback = root.querySelector('.cloud-coloring-review-feedback');
          feedback.textContent = creates && updated.status === 'pending_image_review' ? 'Page created. Review the image above before approving it.' : updated.status === 'completed' ? 'Approved page saved to your family collection.' : ['blocked', 'rejected', 'deleted'].includes(updated.status) ? 'Your decision was saved.' : 'Request updated.';
          updateReviewSections(); window.lucide?.createIcons(); await refreshPending(true);
        } catch (error) {
          updating = false; buttons.forEach(value => { value.disabled = approveControls.includes(value) && !previewReady; }); if (share) share.input.disabled = false;
          status.textContent = error.message; status.dataset.error = 'true';
        }
      };
      controls.append(control);
    }
    body.append(controls, status); card.append(body); return card;
  }
  function render() {
    imageObserver.disconnect();
    root.replaceChildren();
    const header = node('div', '', 'tab-header cloud-coloring-header'), reload = button('Refresh', 'refresh-cw');
    reload.onclick = () => void load();
    const title = node('div'); title.append(heading('h1', 'Coloring Studio', 'palette'), node('p', 'Review the artwork, approve new pages, and browse your family’s collection.', 'cloud-coloring-intro'));
    header.append(title, reload);
    root.append(header);
    if (!overview.configured) root.append(node('p', 'New page generation is temporarily unavailable. You can still manage saved pages and settings.', 'cloud-coloring-notice'));
    const queue = node('div', '', 'cloud-coloring-queue'), total = node('span', overview.pending + ' awaiting your decision', 'cloud-coloring-review-count');
    const shortcuts = node('div', '', 'cloud-coloring-shortcuts');
    for (const stage of reviewStages) {
      const shortcut = button('', stage.glyph); shortcut.dataset.reviewTarget = stage.id;
      shortcut.onclick = () => root.querySelector('[data-review-stage="' + stage.id + '"]')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); shortcuts.append(shortcut);
    }
    queue.append(total, shortcuts); const feedback = statusNode(); feedback.classList.add('cloud-coloring-review-feedback'); root.append(queue, feedback);
    for (const stage of reviewStages) {
      const section = node('section', '', 'cloud-coloring-section cloud-coloring-review'); section.dataset.reviewStage = stage.id;
      const head = node('div', '', 'cloud-coloring-section-head');
      head.append(heading('h2', stage.title, stage.glyph), node('span', '', 'cloud-coloring-stage-count'));
      section.append(head, node('p', stage.description, 'cloud-coloring-muted'));
      const list = node('div', '', 'cloud-coloring-requests');
      overview.requests.filter(request => stageFor(request) === stage.id).forEach(request => list.append(requestCard(request)));
      section.append(list); root.append(section);
    }
    updateReviewSections();
    const library = node('details', '', 'cloud-coloring-section cloud-coloring-library'); library.open = true;
    const libraryHeading = node('summary'); libraryHeading.append(heading('span', 'Saved pages & family sharing', 'images')); library.append(libraryHeading);
    const saved = node('div', '', 'cloud-coloring-requests');
    overview.requests.filter(request => request.status === 'completed').forEach(request => saved.append(requestCard(request)));
    if (!saved.children.length) saved.append(node('p', 'Approved pages appear here. Share or stop sharing any page.', 'cloud-coloring-empty'));
    library.append(node('p', 'Your saved pages, ready to revisit or share with the family.', 'cloud-coloring-muted'), saved); root.append(library);
    const settings = node('details', '', 'cloud-coloring-section cloud-coloring-family-settings'), settingsHeading = node('summary');
    settingsHeading.append(heading('span', 'Family sharing & rendering limits', 'settings-2')); settings.append(settingsHeading, globalCard()); root.append(settings);
    const children = node('details', '', 'cloud-coloring-section cloud-coloring-child-settings');
    const childHeading = node('summary'); childHeading.append(heading('span', 'Child permissions & daily limits', 'users')); children.append(childHeading);
    const cards = node('div', '', 'cloud-coloring-students');
    overview.students.forEach(student => cards.append(studentCard(student)));
    if (!overview.students.length) cards.append(node('p', 'Add a child to set up Coloring Studio.', 'cloud-coloring-empty'));
    children.append(cards); root.append(children);
    announcePending(overview.pending);
    window.lucide?.createIcons();
  }
  async function refreshPending(force = false) {
    if (document.hidden) return;
    if (pendingRead) { await pendingRead; if (!force) return; }
    if (!force && Date.now() - lastPendingRead < 1000) return;
    pendingController = new AbortController();
    const controller = pendingController;
    pendingRead = (async () => {
      try {
        const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store',
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]), headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'coloring-pending' }) });
        const value = await response.json();
        if (!response.ok || controller.signal.aborted || document.hidden || !Number.isSafeInteger(value.pending) || value.pending < 0) return;
        lastPendingRead = Date.now(); announcePending(value.pending);
        if (overview) overview.pending = value.pending;
        const count = root.querySelector('.cloud-coloring-review-count');
        if (count) count.textContent = value.pending + ' awaiting your decision';
        if (active && overview && value.pending > overview.requests.filter(row => ['pending_parent', 'pending_image_review'].includes(row.status)).length && !root.querySelector('.cloud-coloring-new')) {
          const newer = button('New requests available — refresh to review', 'refresh-cw'); newer.classList.add('cloud-coloring-new');
          newer.onclick = () => void load(); root.querySelector('.cloud-coloring-review')?.prepend(newer); window.lucide?.createIcons();
        }
      } catch (_) { /* Keep the last known count; reconnect/manual refresh retries. */ }
      finally { if (pendingController === controller) { pendingRead = null; pendingController = null; } }
    })();
    return pendingRead;
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) pendingController?.abort(); });
  async function load() {
    const current = ++epoch;
    if (!active) return;
    root.setAttribute('aria-busy', 'true');
    root.replaceChildren(node('p', 'Loading Coloring Studio…', 'cloud-coloring-empty'));
    try {
      const value = await call({ action: 'coloring-overview' });
      if (!active || current !== epoch) return;
      overview = value;
      render();
    } catch (error) {
      if (active && current === epoch) {
        const notice = node('div', '', 'cloud-coloring-empty'), retry = button('Try again', 'refresh-cw');
        retry.onclick = () => void load();
        notice.append(node('p', error.message), retry);
        root.replaceChildren(notice);
        window.lucide?.createIcons();
      }
    } finally { if (current === epoch) root.removeAttribute('aria-busy'); }
  }
  return { update() {}, refreshPending, setActive(value) {
    active = value; epoch++;
    document.body.classList.toggle('cloud-coloring-active', value);
    if (value) void load();
    else {
      imageObserver.disconnect(); imageReads.clear();
      document.querySelectorAll('.cloud-coloring-dialog').forEach(dialog => dialog.close());
    }
  } };
}
