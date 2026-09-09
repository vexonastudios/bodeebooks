export function setupCloudColoringStudio({ endpoint }) {
  const root = document.getElementById('cloud-coloring-studio');
  let active = false, epoch = 0, overview = null;

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
    const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(30000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || 'Coloring Studio could not be updated.');
    return data;
  };
  const dataUrl = async request => {
    const file = await call({ action: 'coloring-image', requestId: request.id });
    if (file.url?.startsWith('https://bodeeguard-cloud-assets.james-7f8.workers.dev/v1/download/')) return file.url;
    if (typeof file.data !== 'string' || file.mime !== 'image/webp') throw Error('The coloring page could not be opened.');
    return `data:${file.mime};base64,${file.data}`;
  };
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
    card.setAttribute('aria-label', 'Family rendering limits');
    const settings = overview.global_settings;
    const daily = number('Daily render limit', settings.family_daily_limit, 1, 30);
    const monthly = number('Monthly render limit', settings.family_monthly_limit, 1, 500);
    const reuse = checkbox('Reuse approved pages without another render', settings.reuse_matching_pages);
    const status = statusNode(), save = button('Save family limits', 'save', true);
    const head = node('div', '', 'cloud-coloring-section-head'), remaining = node('div', '', 'cloud-coloring-remaining');
    remaining.append(node('span', overview.generation_remaining.today + ' left today'), node('span', overview.generation_remaining.month + ' left this month'));
    head.append(heading('h2', 'Family rendering limits', 'gauge'), remaining);
    const fields = node('div', '', 'cloud-coloring-budget-fields');
    fields.append(daily.wrap, monthly.wrap, reuse.wrap, save);
    card.append(head, fields, status);
    saveForm(card, save, status, () => ({ action: 'coloring-global-settings', family_daily_limit: Number(daily.input.value), family_monthly_limit: Number(monthly.input.value), reuse_matching_pages: reuse.input.checked }));
    return card;
  }
  function requestCard(request) {
    const card = node('article', '', 'cloud-coloring-request'), preview = node('div', '', 'cloud-coloring-preview');
    if (request.image_url) {
      const image = node('img', '', 'cloud-coloring-image');
      image.alt = request.title;
      image.loading = 'lazy';
      preview.append(image);
      dataUrl(request).then(url => { image.src = url; }).catch(error => { preview.replaceChildren(node('p', error.message)); });
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
    const actions = {
      pending_parent: [['approve', 'Approve and render', 'check'], ['reject', 'Reject', 'x']],
      pending_image_review: [['approve-image', 'Approve image', 'check'], ['reject-image', 'Reject image', 'x']],
      error: [['retry', 'Retry', 'refresh-cw']],
      completed: [[request.shared_with_family ? 'unshare' : 'share', request.shared_with_family ? 'Stop sharing' : 'Share with family', 'users'], ['delete', 'Delete', 'trash-2']],
    }[request.status] || [];
    const controls = node('div', '', 'cloud-coloring-actions'), status = statusNode();
    for (const [action, label, glyph] of actions) {
      const control = button(label, glyph);
      if (action.startsWith('approve')) control.classList.add('cloud-coloring-approve');
      if (action === 'delete' || action.startsWith('reject')) control.classList.add('cloud-coloring-danger');
      control.onclick = async () => {
        const buttons = [...controls.querySelectorAll('button')];
        buttons.forEach(value => { value.disabled = true; });
        status.textContent = 'Updating…';
        try { await call({ action: 'coloring-request-action', requestId: request.id, requestAction: action }); await load(); }
        catch (error) { buttons.forEach(value => { value.disabled = false; }); status.textContent = error.message; status.dataset.error = 'true'; }
      };
      controls.append(control);
    }
    body.append(controls, status);
    card.append(preview, body);
    return card;
  }
  function render() {
    root.replaceChildren();
    const header = node('div', '', 'tab-header cloud-coloring-header'), reload = button('Refresh', 'refresh-cw');
    reload.onclick = () => void load();
    header.append(heading('h1', 'Coloring Studio', 'palette'), reload);
    root.append(header);
    if (!overview.configured) root.append(node('p', 'New page generation is temporarily unavailable. You can still manage saved pages and settings.', 'cloud-coloring-notice'));
    root.append(globalCard());
    const children = node('section', '', 'cloud-coloring-section');
    children.append(heading('h2', 'Child settings', 'users'));
    const cards = node('div', '', 'cloud-coloring-students');
    overview.students.forEach(student => cards.append(studentCard(student)));
    if (!overview.students.length) cards.append(node('p', 'Add a child to set up Coloring Studio.', 'cloud-coloring-empty'));
    children.append(cards);
    root.append(children);
    const requests = node('section', '', 'cloud-coloring-section'), requestHead = node('div', '', 'cloud-coloring-section-head');
    requestHead.append(heading('h2', 'Requests & family sharing', 'images'), node('span', overview.pending + ' awaiting review', 'cloud-coloring-review-count'));
    requests.append(requestHead);
    const list = node('div', '', 'cloud-coloring-requests');
    overview.requests.forEach(request => list.append(requestCard(request)));
    if (!overview.requests.length) list.append(node('p', 'Your children’s coloring pages will appear here for review and sharing.', 'cloud-coloring-empty'));
    requests.append(list);
    root.append(requests);
    window.lucide?.createIcons();
  }
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
  return { update() {}, setActive(value) { active = value; epoch++; if (value) void load(); } };
}
