const node = (tag, cls = '', text = '') => { const el = document.createElement(tag); el.className = cls; el.textContent = text; return el; };
export const profileIcon = name => { const el = node('i'); el.dataset.lucide = name; el.setAttribute('aria-hidden', 'true'); return el; };
export function studentAvatar(student, className = '') {
  const avatar = node('span', `cloud-student-avatar ${className}`, String(student.name || '?').trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase());
  if (/^[a-f0-9-]{36}$/i.test(student.id) && /^[a-f0-9]{64}$/.test(student.photo_version || '')) {
    const img = node('img'); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
    img.src = `/guard/dashboard/student-photo/?student=${encodeURIComponent(student.id)}&v=${student.photo_version}`;
    img.onerror = () => img.remove(); avatar.append(img);
  }
  return avatar;
}
// A real button keeps the photo shortcut discoverable and keyboard accessible.
// Long press is an additional route; vertical scrolling retains native behavior.
export function studentPhotoShortcut(student, openEditor) {
  const button = node('button', 'cloud-student-photo-shortcut');
  button.type = 'button'; button.dataset.cloudMutation = 'true';
  button.setAttribute('aria-label', `Edit ${student.name}’s profile picture`);
  button.setAttribute('aria-haspopup', 'dialog');
  button.title = 'Tap or hold to change profile picture';
  button.append(studentAvatar(student, 'monitor-avatar'));
  const badge = node('span', 'cloud-student-photo-badge'); badge.append(profileIcon('camera')); button.append(badge);
  let stopPress = () => {}, suppressClickUntil = 0;
  function open() {
    stopPress();
    if (!button.disabled && button.isConnected && !document.getElementById('cloud-editor')?.open) openEditor();
  }
  button.addEventListener('click', event => {
    event.stopPropagation();
    if (Date.now() < suppressClickUntil) { event.preventDefault(); return; }
    open();
  });
  button.addEventListener('pointerdown', event => {
    stopPress(); suppressClickUntil = 0;
    if (event.button !== 0 || !event.isPrimary || button.disabled) return;
    const startX = event.clientX, startY = event.clientY, controller = new AbortController();
    const options = { capture: true, passive: true, signal: controller.signal };
    const timer = setTimeout(() => { suppressClickUntil = Date.now() + 900; open(); }, 500);
    stopPress = () => { clearTimeout(timer); controller.abort(); };
    window.addEventListener('pointermove', move => {
      if (move.pointerId === event.pointerId && Math.hypot(move.clientX - startX, move.clientY - startY) > 10) stopPress();
    }, options);
    for (const type of ['pointerup', 'pointercancel', 'scroll', 'blur']) window.addEventListener(type, stopPress, options);
    button.addEventListener('pointerleave', stopPress, options);
  });
  button.addEventListener('contextmenu', event => { event.preventDefault(); event.stopPropagation(); suppressClickUntil = Date.now() + 900; open(); });
  button.addEventListener('dragstart', event => event.preventDefault());
  return button;
}
export function editStudentProfile({ student, editor, field, mutate, photoOnly = false }) {
  let photo, bitmap, reading = false, generation = 0;
  const panel = node('section', 'cloud-profile-photo'), preview = node('div', 'cloud-profile-preview');
  preview.append(studentAvatar(student));
  const copy = node('div', 'cloud-profile-copy'), controls = node('div', 'cloud-profile-actions');
  const choose = node('button', 'btn btn-secondary'), remove = node('button', 'btn btn-secondary');
  choose.type = remove.type = 'button'; choose.append(profileIcon('image-plus'), document.createTextNode('Choose photo'));
  remove.append(profileIcon('image-off'), document.createTextNode('Remove photo')); remove.disabled = !student.photo_version;
  const file = node('input'); file.type = 'file'; file.accept = 'image/jpeg,image/png,image/webp'; file.hidden = true;
  const error = node('p', 'cloud-profile-error'); error.setAttribute('role', 'status');
  copy.append(node('h3', '', 'Profile picture'), node('p', 'cloud-note', 'Choose a photo, then adjust the crop.'), controls, file, error);
  controls.append(choose, remove); panel.append(preview, copy);
  const crop = node('div', 'cloud-profile-crop'); crop.hidden = true;
  const canvas = node('canvas'); canvas.width = canvas.height = 256; canvas.setAttribute('aria-label', 'Profile picture crop preview');
  const sliders = node('div', 'cloud-profile-sliders');
  const ranges = {};
  for (const [name, label, min, max, value] of [['zoom', 'Zoom', 1, 3, 1], ['x', 'Left / right', 0, 100, 50], ['y', 'Up / down', 0, 100, 50]]) {
    const row = node('label', '', label), input = node('input'); input.type = 'range'; input.min = min; input.max = max; input.step = name === 'zoom' ? '.05' : '1'; input.value = value; input.setAttribute('aria-label', label); row.append(input); sliders.append(row); ranges[name] = input; input.oninput = draw;
  }
  crop.append(canvas, sliders); panel.append(crop);
  function draw() {
    if (!bitmap) return;
    const size = Math.min(bitmap.width, bitmap.height) / Number(ranges.zoom.value);
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 256, 256);
    ctx.drawImage(bitmap, (bitmap.width - size) * Number(ranges.x.value) / 100, (bitmap.height - size) * Number(ranges.y.value) / 100, size, size, 0, 0, 256, 256);
    const data = canvas.toDataURL('image/webp', .8);
    photo = data.split(',')[1];
    const image = node('img'); image.alt = ''; image.src = data; preview.replaceChildren(image);
  }
  choose.onclick = () => file.click();
  remove.onclick = () => { generation++; reading = false; bitmap?.close(); bitmap = null; photo = null; crop.hidden = true; file.value = ''; error.textContent = ''; preview.replaceChildren(studentAvatar({ ...student, photo_version: null })); remove.disabled = true; };
  file.onchange = async () => {
    const selected = file.files?.[0]; if (!selected) return;
    const current = ++generation; reading = true; error.textContent = 'Preparing photo…';
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) || selected.size > 20 * 1024 * 1024) throw Error('Choose a JPG, PNG or WebP photo under 20 MB.');
      const next = await createImageBitmap(selected, { resizeWidth: 1200, resizeQuality: 'high' });
      if (current !== generation) { next.close(); return; }
      bitmap?.close(); bitmap = next;
      ranges.zoom.value = 1; ranges.x.value = ranges.y.value = 50; draw(); crop.hidden = false; remove.disabled = false; error.textContent = '';
    } catch (err) { if (current === generation) error.textContent = err.message || 'This photo could not be opened.'; }
    finally { if (current === generation) reading = false; file.value = ''; }
  };
  const fields = photoOnly ? [panel] : [panel, field('Name', 'name', student.name), field('Grade level (optional)', 'grade', student.grade || '', { required: false, maxLength: 30 })];
  editor(photoOnly ? `${student.name}’s profile picture` : 'Edit Student', fields, async form => {
    if (reading) throw Error('Please wait for your photo to finish preparing.');
    if (photo && photo.length > 88000) throw Error('Choose a simpler photo or zoom out and try again.');
    await mutate('edit-student', { studentId: student.id, name: photoOnly ? student.name : form.get('name'), grade: photoOnly ? student.grade || '' : form.get('grade'), ...(photo !== undefined ? { photo } : {}) });
  });
  const dialog = document.getElementById('cloud-editor');
  dialog.classList.toggle('cloud-profile-photo-editor', photoOnly);
  if (photoOnly && dialog.open) choose.focus({ preventScroll: true });
  dialog.addEventListener('close', () => { generation++; bitmap?.close(); bitmap = null; dialog.classList.remove('cloud-profile-photo-editor'); }, { once: true });
  window.lucide?.createIcons();
}

// Destructive profile action stays separate from the reversible Archive action.
export function confirmStudentDeletion({ student, remove }) {
  if (document.getElementById('cloud-delete-student')) return;
  const previous=document.activeElement, dialog=node('dialog','cloud-delete-student');
  dialog.id='cloud-delete-student';dialog.setAttribute('aria-labelledby','cloud-delete-student-title');
  dialog.setAttribute('aria-describedby','cloud-delete-student-description');
  const heading=node('h2','',`Delete ${student.name}?`);heading.id='cloud-delete-student-title';
  const description=node('p','','This removes the student profile from your family and disconnects their assigned computers. Saved school history and shared conversations stay in your family records.');
  description.id='cloud-delete-student-description';
  const note=node('p','cloud-delete-student-note','This cannot be restored. Choose Archive instead if you may want this profile back.');
  const error=node('p','cloud-profile-error');error.setAttribute('role','alert');
  const actions=node('div','cloud-delete-student-actions'),cancel=node('button','btn btn-secondary','No, keep student'),yes=node('button','btn cloud-student-delete','Yes, delete student');
  cancel.type=yes.type='button';cancel.autofocus=true;yes.append(profileIcon('trash-2'));
  let busy=false;
  cancel.onclick=()=>dialog.close();
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  yes.onclick=async()=>{
    if(busy)return;
    busy=true;cancel.disabled=yes.disabled=true;error.textContent='';yes.textContent='Deleting…';dialog.setAttribute('aria-busy','true');
    try {await remove({studentId:student.id,confirmation:true,expectedName:student.name});dialog.close();}
    catch(err){error.textContent=err.message||'The student could not be deleted. Please try again.';}
    finally {busy=false;cancel.disabled=yes.disabled=false;yes.textContent='Yes, delete student';dialog.removeAttribute('aria-busy');}
  };
  dialog.addEventListener('close',()=>{dialog.remove();if(previous?.isConnected)previous.focus({preventScroll:true});else document.querySelector('#students-list button')?.focus({preventScroll:true});},{once:true});
  actions.append(cancel,yes);dialog.append(heading,description,note,error,actions);document.body.append(dialog);dialog.showModal();cancel.focus({preventScroll:true});window.lucide?.createIcons();
}
