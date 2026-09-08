function node(tag,text = '') { const el = document.createElement(tag); el.textContent = text; return el; }
function button(text,callback) { const el = node('button',text); el.type = 'button'; el.addEventListener('click',callback); return el; }
export function setupCloudLearningVideos({ root, parent = false, request: transport, libraryKind = null }) {
  let category=libraryKind || 'learning-videos';
  const request=(kind,input={})=>transport(kind,{...input,category,libraryKind:category});
  root.classList.add('bg-learning-library');
  let active = false, busy = false, generation = 0, videos = [], draft = null, preview = null;
  const controls = node('div'); controls.className = 'bg-video-actions';
  const status = node('p'); status.setAttribute('role','status');
  const list = node('div'); list.className = 'bg-video-grid';
  const editor = node('div'), previewHost = node('div');
  const folder = node('select'); folder.setAttribute('aria-label','Video folder');
  const refresh = button('Refresh',() => load());
  const categorySelect=node('select');categorySelect.setAttribute('aria-label','Media library');
  for(const [id,title]of [['learning-videos','Learning Videos'],['music','Music'],['videos','Videos']]){const option=node('option',title);option.value=id;categorySelect.append(option);}
  categorySelect.onchange=()=>{category=categorySelect.value;generation++;editor.replaceChildren();stopPreview();void load();};
  if(parent&&!libraryKind)controls.append(categorySelect);
  controls.append(refresh,folder);
  if (parent) controls.prepend(button(category==='music'?'Add music':'Add a video',() => edit()));
  root.append(controls,status,editor,previewHost,list);
  const stopPreview = () => { preview?.remove(); preview = null; previewHost.replaceChildren(); };
  function showPreview(video) {
    stopPreview(); preview = document.createElement('iframe'); preview.className = 'bg-video-preview'; preview.title = 'Preview learning video';
    preview.sandbox = 'allow-scripts allow-same-origin'; preview.allow = 'autoplay; encrypted-media; fullscreen'; preview.referrerPolicy = 'strict-origin-when-cross-origin';
    preview.src = `/guard-admin/cloud-learning-player.html#${new URLSearchParams({video:video.youtubeId,start:'0'})}`;
    previewHost.append(button('Close preview',stopPreview),preview);
  }
  function render() {
    const selected = folder.value;
    folder.replaceChildren(node('option','All folders'));
    folder.firstElementChild.value = '';
    for (const value of [...new Set(videos.map(v => v.folder))].sort()) { const option = node('option',value); option.value = value; folder.append(option); }
    folder.value = [...folder.options].some(o => o.value === selected) ? selected : '';
    list.replaceChildren();
    for (const video of videos.filter(v => !folder.value || v.folder === folder.value)) {
      const card = node('article'); card.className = 'bg-video-card';
      card.append(node('h3',video.title),node('p',`${video.folder}${!video.active ? ' · Hidden from children' : ''}`));
      if (!parent) card.append(node('p',video.ended ? 'Previously reached the end · Available to watch again' : video.position ? `Resume at ${Math.floor(video.position/60)}:${String(video.position%60).padStart(2,'0')}` : 'Ready to watch'));
      const actions = node('div'); actions.className = 'bg-video-actions';
      if (parent) actions.append(button('Preview',() => showPreview(video)),button('Edit / hide',() => edit(video)));
      else actions.append(button(video.ended ? 'Watch again' : video.position ? 'Resume video' : 'Watch video',() => run(async () => { await request('play',{videoId:video.id}); status.textContent = 'The learning video is open. Close its window to return here.'; })));
      card.append(actions); list.append(card);
    }
    if (!list.children.length) list.append(node('p',parent ? 'No videos here yet. Add an exact YouTube link and a clear title.' : 'Your parent has not added videos to this folder yet.'));
  }
  async function run(callback) {
    if (busy) return;
    busy = true; root.querySelectorAll('button').forEach(b => { b.disabled = true; });
    try { await callback(); } catch (error) { status.textContent = error.message || 'The library could not connect. Your saved list was not changed.'; }
    finally { busy = false; root.querySelectorAll('button').forEach(b => { b.disabled = false; }); }
  }
  async function fetchList() {
    const current = generation, value = await request('list');
    if (current !== generation || !active) return;
    videos = value.videos; render();
    status.textContent = `${videos.length} ${parent ? 'saved' : 'approved'} videos.${value.pending ? ` ${value.pending} saved positions waiting to sync. ${value.syncMessage || ''}` : ''}`;
  }
  async function load() { await run(fetchList); }
  function edit(video = null) {
    stopPreview(); editor.replaceChildren();
    draft = video ? { ...video, url: video.youtubeId, approved: true } : { id:crypto.randomUUID(),revision:0,title:'',url:'',folder:'General',order:videos.length,active:true,approved:false };
    const form = node('form'); form.append(node('h2',video ? 'Edit learning video' : 'Add a learning video'));
    for (const [name,label,maximum] of [['url','YouTube link or video ID',2048],['title','Title children will see',180],['folder','Folder / topic',60],['order','Order within folder',5]]) {
      const field = node('label',label), input = node('input'); input.name = name; input.value = draft[name]; input.required = name !== 'folder'; input.maxLength = maximum;
      if (name === 'order') { input.type = 'number'; input.min = '0'; input.max = '10000'; }
      if (name === 'url' && video) input.readOnly = true;
      field.append(input); form.append(field);
    }
    for (const [name,label] of [['active','Available to every child in this family'],['approved','I approve this exact video for my children. Unlisted links are welcome; private or restricted videos may not play.']]) {
      const field = node('label',label), input = node('input'); input.name = name; input.type = 'checkbox'; input.checked = draft[name]; input.required = name === 'approved'; field.prepend(input); form.append(field);
    }
    form.append(node('p','Add the video, then use Preview to check playback. Approval is your decision; BodeeGuard does not automatically verify the content or guarantee YouTube availability. Videos are for learning and do not count as school completion.'));
    const save = node('button','Save approved video'); save.type = 'submit';
    form.append(save,button('Cancel',() => { draft = null; editor.replaceChildren(); }));
    form.addEventListener('submit',event => { event.preventDefault(); void run(async () => {
      const values = new FormData(form);
      const input = { ...draft, url:values.get('url'),title:values.get('title'),folder:values.get('folder'),order:Number(values.get('order')),active:values.has('active'),approved:values.has('approved') };
      await request('save',input); draft = null; editor.replaceChildren(); await fetchList(); status.textContent = 'Video saved. Use Preview to check that YouTube can play it.';
    }); });
    editor.append(form); form.querySelector('input').focus();
  }
  folder.addEventListener('change',render);
  return {
    setCategory(value) { if(!['music','videos','learning-videos'].includes(value))return;category=value;categorySelect.value=value;generation++;videos=[];editor.replaceChildren();stopPreview();if(active)void load(); },
    setActive(value) { active = value; if (!value) { generation++; stopPreview(); } else void load(); },
    clear() { generation++; active = false; videos = []; draft = null; editor.replaceChildren(); list.replaceChildren(); status.textContent = ''; stopPreview(); }
  };
}
