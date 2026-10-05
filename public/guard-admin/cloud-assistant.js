// Presentation only: all provider text becomes text nodes, never HTML or links.
const ASSISTANT_AREAS = {
  chores: ['Chores & routines', 'list-checks', 'chores'],
  spelling: ['Spelling', 'spell-check', 'spelling'],
  vocabulary: ['Vocabulary', 'book-a', 'learning'],
  poems: ['Poems', 'quote', 'learning'],
  typing: ['Typing', 'keyboard', 'learning'],
  'math-coach': ['Math Coach', 'calculator', 'learning'],
  'family-games': ['Games', 'gamepad-2', 'games'],
  videos: ['Videos', 'video', 'videos'],
  music: ['Music', 'music', 'music'],
  audiobooks: ['Audiobooks', 'headphones', 'audiobooks'],
  'learning-videos': ['Learning videos', 'graduation-cap', 'learning'],
  messages: ['Messages', 'messages-square', 'messages'],
  economy: ['Coins & rewards', 'coins', 'rewards'],
  account: ['Account & billing', 'credit-card', 'account'],
  students: ['Children', 'users', 'general'],
  grades: ['Grades', 'notebook-tabs', 'learning'],
  'daily-plan': ['Daily plan', 'calendar-check', 'school'],
  calendar: ['Schedule', 'calendar-days', 'school'],
  overview: ['Family controls', 'sliders-horizontal', 'general'],
};
const ASSISTANT_TOPIC_AREAS = { 'workflow-media-lock': ['Entertainment rules', 'lock-keyhole', 'videos'] };
const ASSISTANT_CONTROLS = /\*\*[^*\n]+\*\*|\x60[^\x60\n]+\x60|\b(?:Quick Unlock|Add chore|Mark complete|Mark as done|Daily Plan|Daily plan|Family setup|Game Hub|Music Library|Math Coach|Your day|Open Store|Earn coins|Needs approval|Save settings|Start trial|Spelling|Vocabulary|Audiobooks|Videos|Chores|Save)\b/g;
function assistantInlineRuns(text) {
  text=String(text ?? '');
  const runs = []; let offset = 0;
  for (const match of String(text).matchAll(ASSISTANT_CONTROLS)) {
    if (match.index > offset) runs.push({kind:'text', text:text.slice(offset,match.index)});
    const value=match[0], kind=value.startsWith('**')?'strong':value.startsWith('\x60')?'code':'control';
    runs.push({kind, text:kind==='strong'?value.slice(2,-2):kind==='code'?value.slice(1,-1):value});
    offset=match.index+value.length;
  }
  if (offset < text.length) runs.push({kind:'text',text:text.slice(offset)});
  return runs;
}
function assistantReplyModel(text, {sources=[],mode=''} = {}) {
  const entries=Array.isArray(sources)?sources.filter(entry=>entry && typeof entry==='object'):[], first=entries.find(entry=>Object.hasOwn(ASSISTANT_TOPIC_AREAS,entry.id) || Object.hasOwn(ASSISTANT_AREAS,entry.tab));
  const area=first?(Object.hasOwn(ASSISTANT_TOPIC_AREAS,first.id)?ASSISTANT_TOPIC_AREAS[first.id]:ASSISTANT_AREAS[first.tab]):null;
  const titles=new Set(entries.map(entry=>entry.title));
  const blocks=[]; let current=null, afterSteps=false;
  const guideFooter='I can guide you to these controls; I have not changed anything.';
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line=raw.trim();
    if (!line) {current=null;continue;}
    if (mode==='guide' && line===guideFooter) {current=null;continue;}
    const heading=line.match(/^#{1,3}\s+(.+)/);
    if (heading || titles.has(line)) {blocks.push({kind:'heading',text:heading?heading[1]:line});current=null;afterSteps=false;continue;}
    const ordered=line.match(/^(\d{1,3})[.)]\s+(.+)/), bullet=line.match(/^[-*•]\s+(.+)/);
    if (ordered || bullet) {
      const kind=ordered?'ordered':'bullets';
      if (current?.kind!==kind) {current={kind,items:[]};blocks.push(current);}
      current.items.push({text:ordered?ordered[2]:bullet[1],...(ordered?{number:Number(ordered[1])}:{})});afterSteps=true;continue;
    }
    const explicitNote=line.match(/^(Note|Important|Remember|Keep in mind):\s*/i);
    const kind=explicitNote || mode==='guide' && afterSteps?'note':'paragraph';
    const value=explicitNote?line.slice(explicitNote[0].length):line, label=kind==='note'?(explicitNote?explicitNote[1]:'Keep in mind'):null;
    if (current?.kind===kind && current.label===label) current.text+=' '+value;
    else {current={kind,text:value,label};blocks.push(current);}
  }
  const state=mode==='guide'?['Guide only · Nothing changed','guide']:mode==='ai'?['AI guidance · Nothing changed','guide']:['settings-review','game-time-review','music-review'].includes(mode)?['Review before saving','review']:mode==='action'?['Request saved','saved']:mode==='status'?['Latest reported check-ins','status']:null;
  return {area,blocks,state};
}

// The cloud adapter reuses the desktop presentation, not its LAN endpoints,
// settings, mutations or credentials. Conversation text lives only in this tab.
export function setupCloudAssistant({ endpoint, navigate, onChange }) {
  const byId = id => document.getElementById(id);
  const drawer = byId('parent-assistant-drawer');
  if (!drawer) return;
  const input = byId('parent-assistant-input');
  let pendingReview = null;
  const thread = byId('parent-assistant-thread');
  const ai = byId('parent-assistant-ai');
  const launcher = byId('parent-assistant-launcher');
  const background = byId('admin-dashboard');
  // One scrolling body keeps long replies and expanded help away from the composer.
  const content = document.createElement('div'); content.className = 'cloud-assistant-content';
  const help = document.createElement('details'); help.className = 'cloud-assistant-help';
  const summary = document.createElement('summary');
  summary.innerHTML = '<i data-lucide="shield-check" aria-hidden="true"></i>Options &amp; privacy<i data-lucide="chevron-down" aria-hidden="true"></i>';
  help.append(summary, drawer.querySelector('.parent-assistant-safety'));
  content.append(help, thread, byId('parent-assistant-suggestions'));
  const composer = document.createElement('div'); composer.className = 'cloud-assistant-composer';
  composer.append(byId('parent-assistant-form'), drawer.querySelector('.parent-assistant-footnote'));
  drawer.append(content, composer);
  input.placeholder = 'Ask BodeeGuard…';
  const closeButton = byId('parent-assistant-close');
  closeButton.innerHTML = '<i data-lucide="x" aria-hidden="true"></i>';
  closeButton.setAttribute('aria-label', 'Close Ask BodeeGuard');
  const phoneLayout = () => document.body.classList.contains('cloud-mobile') || window.matchMedia('(max-width: 600px)').matches;
  let welcome = null, busy = false, generation = 0, topicId = null, retry = null, controller = null;
  let history = [], returnFocus = null;
  function message(role, text, className = '', info = {}) {
    const item = document.createElement('article');
    item.className = `assistant-message ${role} ${className}`;
    if (role === 'assistant' && !className) {
      item.classList.add('assistant-rich');
      const model=assistantReplyModel(text,info);
      if (model.area) item.setAttribute('data-area',model.area[2]);
      const header=document.createElement('div');header.className='assistant-reply-meta';
      if (model.area) {
        const badge=document.createElement('span');badge.className='assistant-area-badge';
        const icon=document.createElement('i');icon.setAttribute('data-lucide',model.area[1]);icon.setAttribute('aria-hidden','true');
        const label=document.createElement('span');label.textContent=model.area[0];badge.append(icon,label);header.append(badge);
      }
      if (model.state) {const state=document.createElement('span');state.className='assistant-reply-state';state.setAttribute('data-state',model.state[1]);state.textContent=model.state[0];header.append(state);}
      if (header.children.length) item.append(header);
      const body=document.createElement('div');body.className='assistant-reply-body';
      const inline=(parent,value)=>{for(const run of assistantInlineRuns(value)){const node=document.createElement(run.kind==='text'?'span':run.kind==='code'?'code':'strong');node.textContent=run.text;if(run.kind==='control')node.className='assistant-control-name';parent.append(node);}};
      for (const block of model.blocks) {
        const node=document.createElement(block.kind==='heading'?'h3':block.kind==='ordered'?'ol':block.kind==='bullets'?'ul':block.kind==='note'?'aside':'p');
        if (block.kind==='ordered' || block.kind==='bullets') {
          node.className='assistant-reply-steps';
          for(const entry of block.items){const li=document.createElement('li');if(entry.number!==undefined)li.setAttribute('value',String(entry.number));inline(li,entry.text);node.append(li);}
        } else {
          if(block.kind==='note'){node.className='assistant-reply-note';const label=document.createElement('strong');label.className='assistant-note-label';label.textContent=block.label || 'Keep in mind';if(block.label?.toLowerCase()==='important')node.setAttribute('data-importance','important');node.append(label);}
          inline(node,block.text);
        }
        body.append(node);
      }
      item.append(body);
    } else item.textContent = text;
    thread.append(item);
    window.lucide?.createIcons?.();
    // Bound long sessions without retaining hidden conversation copies.
    while (thread.children.length > 40) thread.firstElementChild.remove();
    requestAnimationFrame(() => { content.scrollTop = content.scrollHeight; });
    return item;
  }
  async function request(action, data = {}) {
    const localController = new AbortController(); controller = localController;
    const timeout = setTimeout(() => localController.abort(), 26000);
    try {
      const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: localController.signal,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...data }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if ([401, 403].includes(response.status)) {
          history = []; retry = null; topicId = null; thread.replaceChildren();
        }
        throw new Error(response.status === 401 ? 'Your sign-in expired. Open Account and sign in again.' : result.error || 'Parent help could not connect. Please try again.');
      }
      return result;
    } catch (error) {
      throw new Error(error.name === 'AbortError' ? 'The answer took too long. Your question is still here; try again.' : error.message);
    } finally { clearTimeout(timeout); if (controller === localController) controller = null; }
  }
  function suggestions(items) {
    const root = byId('parent-assistant-suggestions'); root.replaceChildren();
    for (const text of (items || []).slice(0, 4)) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = text;
      button.addEventListener('click', () => { if (!busy) { input.value = text; submit(); } }); root.append(button);
    }
  }
  function close() {
    cancelReview();
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); drawer.inert = true;
    background.inert = false; launcher.setAttribute('aria-expanded', 'false'); byId('parent-assistant-backdrop').hidden = true;
    (returnFocus?.isConnected ? returnFocus : launcher).focus();
  }
  function sources(item, entries) {
    const actions = document.createElement('div'); actions.className = 'assistant-message-actions';
    const seen=new Set();
    for (const source of (entries || []).slice(0, 3)) {
      if(seen.has(source.tab))continue;
      if (!/^[a-z-]+$/.test(source.tab || '')) continue;
      const target = source.tab === 'account' ? null : byId(`tab-${source.tab}`);
      if (!target && source.tab !== 'account') continue;
      seen.add(source.tab);
      if (source.status === 'pending' || source.status === 'partial') {
        const details=document.createElement('span');details.className='cloud-assistant-source';details.textContent=source.status==='pending'?'Still being transferred':'Partly connected';actions.append(details);
      }
      if (source.tab === 'account') {
        const link = document.createElement('a'); link.href = '/guard/account/'; link.target = '_top'; link.textContent = 'Open Account & billing'; actions.append(link);
      } else {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = Object.hasOwn(ASSISTANT_AREAS,source.tab) ? 'Open '+ASSISTANT_AREAS[source.tab][0] : 'Open this page';
        button.addEventListener('click', () => { close(); navigate(source.tab); }); actions.append(button);
      }
    }
    item.append(actions);
  }
  function musicReview(item, review) {
    if (!review || !Array.isArray(review.candidates)) return;
    const choices = document.createElement('div'); choices.className = 'assistant-music-choices';
    const buttons = [];
    let selected = null, approvalId = null, saved = false;
    for (const candidate of review.candidates.slice(0, 3)) {
      if (!/^[A-Za-z0-9_-]{11}$/.test(candidate.youtubeId || '')) continue;
      const card = document.createElement('section'); card.className = 'assistant-music-card';
      const title = document.createElement('strong'); title.textContent = candidate.title;
      const channel = document.createElement('span'); channel.textContent = candidate.channel; channel.className = 'assistant-music-channel';
      const preview = document.createElement('iframe');
      preview.src = 'https://www.youtube-nocookie.com/embed/' + candidate.youtubeId;
      preview.title = 'Preview ' + candidate.title; preview.loading = 'lazy'; preview.allow = 'encrypted-media; fullscreen'; preview.referrerPolicy = 'strict-origin-when-cross-origin'; preview.allowFullscreen = true;
      const approve = document.createElement('button'); approve.type = 'button'; approve.className = 'assistant-music-approve'; approve.textContent = 'Approve & add for all children';
      const status = document.createElement('p'); status.className = 'assistant-music-status'; status.setAttribute('aria-live', 'polite');
      buttons.push(approve);
      approve.addEventListener('click', async () => {
        if (busy || saved) return;
        const current = generation;
        if (selected !== candidate.youtubeId) { selected = candidate.youtubeId; approvalId = crypto.randomUUID(); }
        busy = true; input.readOnly = true; byId('parent-assistant-send').disabled = true;
        for (const button of buttons) button.disabled = true;
        status.textContent = 'Adding this song for your children…';
        try {
          const response = await request('assistant-music-approve', {prompt:review.prompt, youtubeId:selected, approved:true, requestId:approvalId});
          if (current !== generation) return;
          saved = true; status.textContent = 'Approved';
          const reply = message('assistant', response.message, '', response); sources(reply, response.sources);
          if (response.change?.changedCount > 0) onChange?.(response.change.feature);
          // Stop previews once the choice is saved, including videos in other cards.
          for (const frame of choices.querySelectorAll('iframe')) frame.remove();
          for (const button of buttons) button.textContent = button === approve ? 'Added to Music Library' : 'Another match';
        } catch (error) {
          if (current === generation) { status.textContent = error.message; approve.textContent = 'Retry approval'; }
        } finally {
          if (current === generation) {
            busy = false; input.readOnly = false; byId('parent-assistant-send').disabled = false;
            for (const button of buttons) button.disabled = saved;
          }
        }
      });
      card.append(title, channel, preview, approve, status); choices.append(card);
    }
    item.append(choices);
    requestAnimationFrame(() => item.scrollIntoView({block:'start'}));
  }
  function cancelReview() {
    if(pendingReview){pendingReview.cancel();pendingReview=null;}
  }
  function actionReview(item,review,type) {
    if(!review || !Number.isInteger(review.studentCount) || review.studentCount<1 || review.studentCount>50)return;
    const game=type==='game-time';
    if(game && (!Number.isInteger(review.minutes)||review.minutes<1||review.minutes>240))return;
    if(!game && !['games-unlock','math-enable'].includes(review.kind))return;
    cancelReview();
    const approval={prompt:review.prompt,studentCount:review.studentCount,reviewFingerprint:review.reviewFingerprint,requestId:crypto.randomUUID(),
      ...(game?{minutes:review.minutes,studentId:review.studentId || 'all'}:{kind:review.kind})};
    const token={expires:Date.now()+10*60*1000};
    pendingReview=token;
    const approve=document.createElement('button');approve.type='button';approve.className='btn btn-primary';
    approve.textContent=game?'Yes, add '+review.minutes+' minutes for '+(review.targetLabel || 'all '+review.studentCount+' kids'):review.kind==='games-unlock'?'Yes, unlock games today':'Yes, enable Math Coach';
    const cancel=document.createElement('button');cancel.type='button';cancel.className='btn btn-secondary';cancel.textContent='Cancel';
    const status=document.createElement('p');status.setAttribute('role','status');
    const actions=document.createElement('div');actions.className='assistant-message-actions assistant-confirmation';
    token.cancel=()=>{approve.disabled=true;cancel.disabled=true;status.textContent='Review dismissed. Ask again to prepare a new change.';};
    cancel.addEventListener('click',()=>{if(pendingReview===token)cancelReview();});
    async function confirm() {
      if(busy || pendingReview!==token)return;
      if(Date.now()>token.expires){cancelReview();status.textContent='This review expired. Ask again to confirm current recipients and settings.';return;}
      const current=generation;
      busy=true;approve.disabled=true;cancel.disabled=true;input.readOnly=true;byId('parent-assistant-send').disabled=true;
      status.textContent='Saving your confirmed change…';
      try {
        const result=await request(game?'assistant-game-time-approve':'assistant-settings-approve',{...approval,approved:true});
        if(current!==generation)return;
        status.textContent=result.message;approve.textContent='Saved';
        if(pendingReview===token)pendingReview=null;
        if(result.change?.changedCount>0)onChange?.(result.change.feature);
      } catch(error){if(current===generation){status.textContent=error.message;approve.textContent='Retry confirmation';}}
      finally{if(current===generation){busy=false;input.readOnly=false;byId('parent-assistant-send').disabled=false;approve.disabled=pendingReview!==token;cancel.disabled=pendingReview!==token;}}
    }
    approve.addEventListener('click',confirm);token.confirm=confirm;
    actions.append(approve,cancel,status);item.append(actions);
  }
  function loadWelcome() {
    if (welcome) return welcome;
    const current = generation;
    welcome = request('assistant-welcome').then(data => {
      if (current !== generation) return;
      message('assistant', data.message);
      byId('parent-assistant-privacy').textContent = data.privacy;
      byId('parent-assistant-ai-label').textContent = 'Use OpenAI for conversational help';
      ai.disabled = !data.aiConfigured;
      byId('parent-assistant-configure-ai').hidden = Boolean(data.aiConfigured);
      suggestions(data.suggestions);
    }).catch(error => {
      if (current === generation) { welcome = null; message('assistant', error.message, 'error'); }
    });
    return welcome;
  }
  async function submit() {
    if (busy || !input.value.trim()) return;
    if (pendingReview && /^(?:yes|yes please|confirm|approve)[.!]?$/i.test(input.value.trim())) {
      input.value = '';
      await pendingReview.confirm();
      return;
    }
    cancelReview();
    busy = true; byId('parent-assistant-send').disabled = true;
    const current = generation;
    await loadWelcome();
    if (current !== generation) return;
    const prompt = input.value.trim().slice(0, 1500);
    const aiRequested = ai.checked && !ai.disabled;
    const body = retry?.prompt === prompt && retry.ai === aiRequested ? retry : {
      prompt, ai: aiRequested, requestId: crypto.randomUUID(), topicId,
      contextTab: document.querySelector('.nav-item.active')?.dataset.tab || 'overview', history: history.slice(-4)
    };
    retry = body;
    message('user', prompt);
    const pending = message('assistant', 'Working on your request…', 'loading');
    input.readOnly = true;
    try {
      const response = await request('assistant-ask', body);
      if (current !== generation) return;
      pending.remove();
      const reply = message('assistant', response.message, '', response);
      sources(reply, response.sources);
      if (response.mode === 'music-review') musicReview(reply, response.musicReview);
      if (response.mode === 'game-time-review') actionReview(reply, response.gameTimeReview, 'game-time');
      if (response.mode === 'settings-review') actionReview(reply, response.settingsReview, 'settings');
      if (response.mode === 'action' && response.change?.changedCount > 0) onChange?.(response.change.feature);
      if (response.notice) message('assistant', response.notice, 'cloud-assistant-notice');
      topicId = response.sources?.[0]?.id || topicId;
      history = [...history, { role: 'user', text: prompt }, { role: 'assistant', text: response.message.slice(0, 2400) }].slice(-4);
      suggestions(response.suggestions);
      if (!response.notice) { input.value = ''; retry = null; }
    } catch (error) { if (current === generation) { pending.remove(); message('assistant', error.message, 'error'); } }
    finally {
      if (current === generation) { busy = false; input.readOnly = false; byId('parent-assistant-send').disabled = false; if (drawer.classList.contains('open')) input.focus({ preventScroll: true }); }
    }
  }
  launcher.hidden = false; ai.disabled = true;
  launcher.addEventListener('click', () => {
    returnFocus = launcher;
    drawer.inert = false; drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false');
    background.inert = true; launcher.setAttribute('aria-expanded', 'true'); byId('parent-assistant-backdrop').hidden = false;
    loadWelcome(); (phoneLayout() ? closeButton : input).focus({ preventScroll: true });
  });
  byId('parent-assistant-close').addEventListener('click', close);
  byId('parent-assistant-backdrop').addEventListener('click', close);
  byId('parent-assistant-form').addEventListener('submit', event => { event.preventDefault(); submit(); });
  drawer.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    if (event.key === 'Tab') {
      const controls = [...drawer.querySelectorAll('button, textarea, input, a[href], iframe, summary')].filter(control => !control.disabled && !control.hidden && control.checkVisibility());
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    }
  });
  input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); submit(); } });
  const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'cloud-assistant-reset'; reset.textContent = 'Clear conversation';
  reset.addEventListener('click', () => {
    cancelReview(); generation++; controller?.abort(); welcome = null; history = []; retry = null; topicId = null; pendingReview = null; busy = false;
    input.value = ''; input.readOnly = false; byId('parent-assistant-send').disabled = false; thread.replaceChildren(); loadWelcome();
  });
  help.append(reset);
  window.lucide?.createIcons?.();
  window.addEventListener('pagehide', () => { cancelReview(); generation++; controller?.abort(); history = []; retry = null; thread.replaceChildren(); });
}
