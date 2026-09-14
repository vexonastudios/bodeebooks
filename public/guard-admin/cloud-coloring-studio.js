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
    if (imageReads.has(key)) return imageReads.get(key);
    const read = readImage(); imageReads.set(key, read);
    try { return await read; } catch (error) { imageReads.delete(key); throw error; }
    async function readImage() {
    const file = await call({ action: 'coloring-image', requestId: request.id, thumbnail });
    if (file.url?.startsWith('https://bodeeguard-cloud-assets.james-7f8.workers.dev/v1/download/')) return file.url;
    if (typeof file.data !== 'string' || file.mime !== 'image/webp') throw Error('The coloring page could not be opened.');
    return `data:${file.mime};base64,${file.data}`;
    }
  };
  async function previewImage(request) {
    const dialog = node('dialog', '', 'cloud-coloring-dialog'), close = button('Close image', 'x');
    dialog.setAttribute('aria-label', request.title + ' coloring page');
    const image = node('img'); image.alt = request.title;
    const status = statusNode(); status.textContent = 'Opening image…';
    close.onclick = () => dialog.close();
    dialog.append(close, image, status); document.body.append(dialog);
    dialog.addEventListener('close', () => dialog.remove(), { once: true }); dialog.showModal();
    try { const url = await dataUrl(request, false); if (dialog.isConnected) { image.src = url; status.textContent = ''; } }
    catch (error) { status.textContent = error.message; }
    window.lucide?.createIcons();
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
  function requestCard(request) {
    const card = node('article', '', 'cloud-coloring-request'), preview = node('div', '', 'cloud-coloring-preview');
    card.dataset.requestId = request.id;
    let previewReady = !request.image_url;
    const approveControls = [];
    if (request.image_url) {
      const image = node('img', '', 'cloud-coloring-image');
      image.alt = request.title;
      image.loading = 'lazy';
      const zoom = button('View full image', 'maximize-2'); zoom.classList.add('cloud-coloring-zoom');
      zoom.onclick = () => void previewImage(request);
      preview.append(image, zoom);
      image.onload = () => { previewReady = true; approveControls.forEach(control => { control.disabled = false; }); };
      image.onerror = () => {
        imageReads.delete(request.id + ':true');
        const retry = button('Retry preview', 'refresh-cw');
        retry.onclick = () => { preview.replaceChildren(image, zoom); preview.loadPreview(); };
        preview.replaceChildren(node('p', 'The preview could not load.'), retry); window.lucide?.createIcons();
      };
      preview.loadPreview = () => dataUrl(request).then(url => { if (preview.isConnected) image.src = url; }).catch(error => {
        const retry = button('Retry preview', 'refresh-cw'); retry.onclick = () => { preview.replaceChildren(image, zoom); preview.loadPreview(); };
        preview.replaceChildren(node('p', error.message), retry); window.lucide?.createIcons();
      });
      imageObserver.observe(preview);
    } else {
      preview.classList.add('cloud-coloring-placeholder');
      preview.append(icon('image'), node('span', request.status === 'pending_parent' ? 'Awaiting your approval' : 'No preview yet'));
    }
    const body = node('div', '', 'cloud-coloring-request-body');
    const labels = { pending_parent: 'Review idea', pending_image_review: 'Review image', completed: 'Ready', error: 'Needs attention', rejected: 'Rejected', generating: 'Creating page' };
    const details = node('p', labels[request.status] || request.status.replaceAll('_', ' '), 'cloud-coloring-badge');
    details.dataset.state = request.status;
    if (request.shared_with_family) details.append(node('span', ' · Shared with family'));
    body.append(node('p', request.student_name || 'Child', 'cloud-coloring-owner'), node('h3', request.title), details);
    if (request.original_prompt) body.append(node('p', request.original_prompt, 'cloud-coloring-prompt'));
    if (request.safety_reason) body.append(node('p', request.safety_reason, 'cloud-coloring-reason'));
    const share = request.status === 'pending_image_review' ? checkbox('Share with all my children', overview.global_settings.auto_share_with_family) : null;
    if (share) { share.input.name = 'shareWithFamily'; body.append(share.wrap); }
    const actions = {
      pending_parent: [['approve', 'Approve and render', 'check'], ['reject', 'Reject', 'x']],
      pending_image_review: [['approve-image', 'Approve image', 'check'], ['reject-image', 'Reject image', 'x']],
      error: [['retry', 'Retry', 'refresh-cw']],
      completed: [[request.shared_with_family ? 'unshare' : 'share', request.shared_with_family ? 'Stop sharing' : 'Share with family', 'users'], ['delete', 'Delete', 'trash-2']],
    }[request.status] || [];
    const controls = node('div', '', 'cloud-coloring-actions'), status = statusNode();
    for (const [action, label, glyph] of actions) {
      const control = button(label, glyph);
      if (action.startsWith('approve')) { control.classList.add('cloud-coloring-approve'); approveControls.push(control); control.disabled = !previewReady; }
      if (action === 'delete' || action.startsWith('reject')) control.classList.add('cloud-coloring-danger');
      control.onclick = async () => {
        const buttons = [...controls.querySelectorAll('button')];
        buttons.forEach(value => { value.disabled = true; });
        status.textContent = 'Updating…';
        try {
          const updated = await call({ action: 'coloring-request-action', requestId: request.id, requestAction: action, ...(share ? { shareWithFamily: share.input.checked } : {}) });
          if (!active || !card.isConnected) return;
          overview.requests = overview.requests.map(row => row.id === request.id ? updated : row);
          imageObserver.unobserve(preview);
          if (['deleted', 'blocked', 'rejected'].includes(updated.status)) {
            card.replaceChildren(node('p', updated.status === 'deleted' ? 'Page deleted.' : 'Request declined.', 'cloud-coloring-empty'));
          } else card.replaceWith(requestCard({ ...updated, student_name: request.student_name }));
          window.lucide?.createIcons();
          await refreshPending(true);
        }
        catch (error) { buttons.forEach(value => { value.disabled = false; }); status.textContent = error.message; status.dataset.error = 'true'; }
      };
      controls.append(control);
    }
    body.append(controls, status);
    card.append(preview, body);
    return card;
  }
  function render() {
    imageObserver.disconnect();
    root.replaceChildren();
    const header = node('div', '', 'tab-header cloud-coloring-header'), reload = button('Refresh', 'refresh-cw');
    reload.onclick = () => void load();
    header.append(heading('h1', 'Coloring Studio', 'palette'), reload);
    root.append(header);
    if (!overview.configured) root.append(node('p', 'New page generation is temporarily unavailable. You can still manage saved pages and settings.', 'cloud-coloring-notice'));
    const requests = node('section', '', 'cloud-coloring-section cloud-coloring-review'), requestHead = node('div', '', 'cloud-coloring-section-head');
    requestHead.append(heading('h2', 'Awaiting your approval', 'image-check'), node('span', overview.pending + ' awaiting review', 'cloud-coloring-review-count'));
    requests.append(requestHead, node('p', 'Review each image, choose whether to share it with siblings, then approve.', 'cloud-coloring-muted'));
    const list = node('div', '', 'cloud-coloring-requests');
    const pending = overview.requests.filter(request => ['pending_parent', 'pending_image_review', 'generating', 'error'].includes(request.status));
    pending.forEach(request => list.append(requestCard(request)));
    if (!pending.length) list.append(node('p', 'All caught up. No coloring pages need your approval.', 'cloud-coloring-empty'));
    requests.append(list); root.append(requests);
    root.append(globalCard());
    const library = node('details', '', 'cloud-coloring-section cloud-coloring-library');
    const libraryHeading = node('summary'); libraryHeading.append(heading('span', 'Saved pages & family sharing', 'images')); library.append(libraryHeading);
    const saved = node('div', '', 'cloud-coloring-requests');
    overview.requests.filter(request => request.status === 'completed').forEach(request => saved.append(requestCard(request)));
    if (!saved.children.length) saved.append(node('p', 'Approved pages appear here. Share or stop sharing any page.', 'cloud-coloring-empty'));
    library.append(saved); root.append(library);
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
        if (count) count.textContent = value.pending + ' awaiting review';
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
