// The parent phone layout uses the same authenticated cloud actions as desktop.
import { preparePhotoForUpload } from './parent-photo-upload.js';
export function setupCloudMobile({ navigate, refresh, openSpelling, getSnapshot, mutate, feedback }) {
  const byId = id => document.getElementById(id);
  const make = (tag, className, text = '') => { const el = document.createElement(tag); el.className = className; el.textContent = text; return el; };
  const button = (label, action, className = 'secondary') => {
    const el = make('button', className, label); el.type = 'button'; el.addEventListener('click', action); return el;
  };
  const icon=name=>{const el=make('i','');el.dataset.lucide=name;el.setAttribute('aria-hidden','true');return el;};
  const root = byId('admin-dashboard');
  const main = root.querySelector('.main-content');
  const media = window.matchMedia('(max-width: 900px), (pointer: coarse) and (max-width: 1180px)');
  const expanded = new Set();
  const header = make('header', 'app-header cloud-mobile-only');
  const brand = make('div', '');
  brand.append(make('p', 'eyebrow', 'Parent dashboard'), make('h1', '', 'BodeeGuard'));
  const actions = make('div', 'header-actions');
  const reload = button('', () => void refresh(), 'icon-button'); reload.setAttribute('aria-label', 'Refresh dashboard');reload.append(icon('refresh-cw'));
  const account = make('a', 'text-button', 'Account'); account.href = '/guard/account/'; account.target = '_top';
  actions.append(reload, account); header.append(brand, actions); root.prepend(header);

  const menus = {};
  for (const [id, title] of [['mobile-add', 'Add media & schoolwork'], ['mobile-more', 'More']]) {
    const nav = button(title, () => navigate(id), 'nav-item'); nav.dataset.tab = id; nav.hidden = true;
    root.querySelector('.sidebar-nav').append(nav);
    const section = make('section', 'tab-content cloud-mobile-menu'); section.id = `tab-${id}`;
    section.setAttribute('aria-label', title); section.append(make('h1', '', title));
    const list = make('div', 'more-list'); section.append(list); main.append(section); menus[id] = list;
  }
  const paperNav=button('Paper center',()=>navigate('mobile-papers'),'nav-item');paperNav.dataset.tab='mobile-papers';paperNav.hidden=true;root.querySelector('.sidebar-nav').append(paperNav);
  const paperCenter=make('section','tab-content cloud-mobile-menu');paperCenter.id='tab-mobile-papers';
  paperCenter.append(make('p','eyebrow','Camera-first schoolwork'),make('h1','','Paper center'),make('p','paper-center-intro','What are you adding? Choose below, then select your child.'));
  const workflows=make('div','paper-workflow-grid');paperCenter.append(workflows);main.append(paperCenter);
  let paperContext=false;
  const goPaper=async(id,scan=false)=>{paperContext=true;navigate(id);if(scan)await openSpelling();};
  for(const [id,label,caption,glyph,cls] of [
    ['grades','Grading','Photograph work, review it and record a grade','camera','grading'],
    ['spelling','Spelling','Scan a word list across several pages','spell-check','spelling'],
    ['vocabulary','Vocabulary','Build a word and definition list','book-open','vocabulary'],
    ['poems','Poems','Add exact lines to memorize','quote','poem']]){
    const card=button('',()=>void goPaper(id,id==='spelling'),'paper-workflow-card '+cls);
    const mark=make('span',''),copy=make('div','paper-workflow-copy');mark.append(icon(glyph));copy.append(make('strong','',label),make('small','',caption));
    card.append(mark,copy,icon('chevron-right'));workflows.append(card);
  }
  const saved=button('',()=>{void goPaper('grades');byId('cloud-files-list').scrollIntoView({block:'start'});},'paper-workflow-card saved-papers');
  const savedIcon=make('span','');savedIcon.append(icon('files'));const savedCopy=make('div','paper-workflow-copy');savedCopy.append(make('strong','','Saved papers & answer keys'),make('small','','Open your uploaded reference pages'));
  saved.append(savedIcon,savedCopy,icon('chevron-right'));paperCenter.append(saved);
  for(const id of ['grades','spelling','vocabulary','poems']){
    const back=button('',()=>navigate('mobile-papers'),'text-button cloud-mobile-only mobile-paper-back');back.append(icon('arrow-left'),document.createTextNode('Paper center'));byId('tab-'+id).prepend(back);
  }
  const addTabs = ['learning-videos', 'spelling', 'vocabulary', 'poems', 'worksheets'];
  for (const nav of root.querySelectorAll('.sidebar .nav-item[data-tab]')) {
    const id = nav.dataset.tab;
    if (nav.hidden || nav.style.display === 'none' || id.startsWith('mobile-')) continue;
    const label = nav.textContent.trim();
    const menuButton = () => button(label + '  ›', () => navigate(id));
    menus['mobile-more'].append(menuButton());
    if (addTabs.includes(id)) menus['mobile-add'].append(menuButton());
  }
  const install = button('Add to Home Screen', () => window.parent.postMessage({ type: 'bodeeguard-install' }, window.location.origin));
  menus['mobile-more'].prepend(install);
  const bottom = make('nav', 'bottom-nav cloud-mobile-only'); bottom.setAttribute('aria-label', 'BodeeGuard navigation');
  const tabs = [['overview', 'house', 'Controls'], ['mobile-papers', 'camera', 'Papers'], ['messages', 'mail', 'Messages'], ['mobile-add', 'plus', 'Add media'], ['mobile-more', 'ellipsis', 'More']];
  for (const [id, glyph, label] of tabs) {
    const nav = button('', () => {paperContext=false;navigate(id);}, 'nav-button'); nav.dataset.mobileTab = id;
    nav.append(icon(glyph), make('small', '', label)); bottom.append(nav);
  }
  root.append(bottom);
  const shortcut = button('', () => navigate('mobile-papers'), 'mobile-paper-shortcut cloud-mobile-only');
  const shortcutIcon=make('span','mobile-paper-shortcut-icon');shortcutIcon.append(icon('camera'));
  const shortcutCopy=make('span','');shortcutCopy.append(make('strong','','Photograph school papers'),make('small','','Student work, word lists and answer keys'));
  shortcut.append(shortcutIcon,shortcutCopy,icon('chevron-right'));
  byId('tab-overview').querySelector('.tab-header').after(shortcut);
  const overviewStatus=make('p','inline-status cloud-mobile-only');shortcut.after(overviewStatus);
  const pauseAll=button('Pause school',async()=>{
    const devices=getSnapshot()?.devices||[];if(!devices.length)return;
    const locked=!devices.every(d=>d.locked);pauseAll.disabled=true;
    try{for(const device of devices)if(device.locked!==locked)await mutate('set-school-pause',{deviceId:device.id,locked});feedback(locked?'School paused for all computers.':'School resumed for all computers.');}
    catch(error){feedback(error.message,true);}finally{pauseAll.disabled=false;}
  },'danger-outline cloud-mobile-only mobile-pause-all');
  byId('tab-overview').querySelector('.tab-header').append(pauseAll);
  const pendingNotice=make('p','mobile-review-notice cloud-mobile-only');pendingNotice.hidden=true;overviewStatus.after(pendingNotice);
  document.addEventListener('cloud-papers-listed',event=>{
    const count=event.detail.pending;pendingNotice.hidden=!count;pendingNotice.textContent=count+' paper'+(count===1?'':'s')+' waiting for review in Papers.';
  });
  const papers=byId('cloud-paper-form').closest('.cloud-papers');
  papers.querySelector('h2').textContent='School papers';
  papers.querySelector('p').textContent='Choose a child and photograph their work. Open a saved paper to review it and record a grade.';
  // Camera input feeds the existing upload form and its normal validation.
  const file = byId('cloud-paper-file');
  if (file) {
    const camera = make('input', ''); camera.type = 'file'; camera.accept = 'image/*'; camera.setAttribute('capture', 'environment'); camera.hidden = true;
    const takePhoto = button('Take a photo', () => camera.click(), 'btn btn-primary cloud-mobile-only');
    const choose=button('Choose a file',()=>file.click(),'btn btn-secondary cloud-mobile-only');choose.prepend(icon('image-plus'));
    const selectedName=make('span','mobile-selected-file cloud-mobile-only','No photo selected');
    file.classList.add('mobile-native-file');
    file.addEventListener('invalid',event=>{if(media.matches){event.preventDefault();byId('cloud-files-status').textContent='Take a photo or choose a file first.';takePhoto.focus();}});
    file.before(takePhoto,choose,camera);file.after(selectedName);
    file.addEventListener('change',()=>{selectedName.textContent=file.files?.[0]?.name||'No photo selected';});
    takePhoto.prepend(icon('camera'));
    camera.addEventListener('change', async () => {
      if (!camera.files?.length || file.disabled) return;
      const photo = camera.files[0]; const submit = byId('cloud-paper-upload');
      takePhoto.disabled = true; const wasDisabled = submit.disabled; submit.disabled = true;
      const status = byId('cloud-files-status'); status.textContent = 'Preparing photo…';
      try {
        if (photo.size > 20 * 1024 * 1024) throw new Error('Choose a photo smaller than 20 MB.');
        let prepared = await preparePhotoForUpload(photo);
        if (prepared.byteSize > 2 * 1024 * 1024) prepared = await preparePhotoForUpload(photo, { maxEdge: 1400, quality: 0.7 });
        if (prepared.byteSize > 2 * 1024 * 1024) throw new Error('This photo is too large. Try a smaller photo.');
        const bytes = Uint8Array.from(atob(prepared.dataUrl.split(',')[1]), char => char.charCodeAt(0));
        const transfer = new DataTransfer(); transfer.items.add(new File([bytes], 'School-paper.jpg', { type: 'image/jpeg' }));
        if (!file.disabled) { file.files = transfer.files; file.dispatchEvent(new Event('change', { bubbles: true })); status.textContent = 'Photo ready. Choose a child and tap Upload paper.'; }
      } catch (error) { status.textContent = error.message; }
      finally { camera.value = ''; takePhoto.disabled = false; submit.disabled = wasDisabled; }
    });
  }
  const heading = byId('tab-overview').querySelector('h1'); const desktopHeading = heading?.textContent;
  function resize() {
    document.body.classList.toggle('cloud-mobile', media.matches);
    if (heading) heading.textContent = media.matches ? 'Quick controls' : desktopHeading;
    if (!media.matches && document.querySelector('.cloud-mobile-menu.active')) navigate('overview');
  }
  media.addEventListener('change', resize); resize();
  return {
    setActive(id) {
      if(id==='mobile-papers')paperContext=true;
      const selected = paperContext&&['grades','spelling','vocabulary','poems'].includes(id)?'mobile-papers':tabs.some(([tab]) => tab === id) ? id : addTabs.includes(id) ? 'mobile-add' : 'mobile-more';
      for (const nav of bottom.children) {
        const active = nav.dataset.mobileTab === selected; nav.classList.toggle('active', active);
        if (active) nav.setAttribute('aria-current', 'page'); else nav.removeAttribute('aria-current');
      }
      if (media.matches) main.scrollTop = 0;
    },
    update(snapshot){
      overviewStatus.textContent='Updated '+new Date(snapshot.serverTime).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
      pauseAll.disabled=!snapshot.devices.length;pauseAll.textContent=snapshot.devices.length&&snapshot.devices.every(d=>d.locked)?'Resume school':'Pause school';
    },
    decorateCard(card, id, model) {
      card.classList.add('student-card');
      const top = card.querySelector('.monitor-card-top');
      const body = make('div', 'mobile-card-body'); body.id = `mobile-card-${id}`;
      for (const child of [...card.children]) if (child !== top) body.append(child);
      const shortcuts = make('div', 'cloud-actions cloud-mobile-only');
      shortcuts.append(button('Messages', () => navigate('messages'), 'btn btn-secondary'), button('Screenshots', () => navigate('screenshots'), 'btn btn-secondary'));
      body.append(shortcuts);
      const toggle = button('', () => {
        if (expanded.has(id)) expanded.delete(id); else expanded.add(id);
        card.classList.toggle('is-open', expanded.has(id)); toggle.setAttribute('aria-expanded', String(expanded.has(id)));
      }, 'student-card-summary cloud-mobile-only');
      toggle.setAttribute('aria-label', `Controls for ${card.querySelector('.monitor-name').textContent}`);
      toggle.setAttribute('aria-controls', body.id); toggle.setAttribute('aria-expanded', String(expanded.has(id)));
      const head=make('span','student-card-head'),avatar=card.querySelector('.monitor-avatar').cloneNode(true),copy=make('span','student-summary-copy');
      const total=Math.max(0,Number(model?.total)||0),time=total>=3600?Math.floor(total/3600)+'h '+Math.floor(total/60)%60+'m':Math.floor(total/60)+'m';
      const activity=model?.device?.locked?'School paused':model?.online?model.current?.title||'Dashboard':'Not currently active';
      copy.append(make('strong','student-name',card.querySelector('.monitor-name').textContent),make('span','student-meta',activity+' · '+time+' today'));
      const pill=make('span','online-pill '+(model?.online?'online':''),model?.online?'Online':'Offline'),chevron=icon('chevron-down');chevron.classList.add('expand-icon');
      head.append(avatar,copy,pill,chevron);toggle.append(head);
      card.prepend(toggle); card.append(body); card.classList.toggle('is-open', expanded.has(id));
    }
  };
}
