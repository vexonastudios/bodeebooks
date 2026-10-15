// Suggestions only. The parent must click; the message body never selects a child or API path.
const MEDIA = Object.freeze([
  { kind: 'audiobook', label: 'Audiobooks', route: 'audiobooks', icon: 'headphones', words: /\b(?:audio[ -]?books?|audible)\b/ },
  { kind: 'video', label: 'Videos', route: 'video', icon: 'video', words: /\b(?:videos?|youtube|movies?)\b/ },
  { kind: 'music', label: 'Music', route: 'music', icon: 'music', words: /\b(?:music|songs?)\b/ }
]);

const normalize = value => String(value || '').toLowerCase().replace(/[’‘']/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const ALIASES = {
  'app://coloring':['art','art studio','drawing','coloring','colouring','coloring studio'],
  'app://coloring-studio':['art','art studio','drawing','coloring','colouring','coloring studio'],
  'app://games':['games','family games','game hub','family game room'],
  'app://drivers-education':['drivers ed','drivers education','driver ed','driving','texas road school'],
  'app://math-coach':['math coach','math tutor'], 'app://words':['confused words'],
  'app://typing':['typing school','typing'], 'app://poems':['poems','poetry'],
  'app://quizzes':['quiz','quizzes'], 'app://worksheets':['worksheet','worksheets'],
  'app://learning-videos':['learning videos','learning video','educational videos'],
  'app://writing':['writing','notebook','word processor'], 'app://piano':['piano','piano practice']
};
const HOSTED_GAMES = ['bodeebooks games','bodee books games','bodde books games','bodie books games','booty book games','booty books games'];
function choices(snapshot, studentId, includeUnavailable = false) {
  const items=MEDIA.map(item=>({...item,key:item.kind,aliases:({audiobook:['audiobooks','audiobook','audio books','audio book','audible'],video:['videos','video','youtube','movies','movie'],music:['music','songs','song']})[item.kind]}));
  const studio=[];
  for(const subject of snapshot?.rules?.subjects || []) {
    const assignment=Array.isArray(subject.assignments)?subject.assignments.find(a=>a.studentId===studentId):{};
    if(!subject.id||!subject.title)continue;
    if(!includeUnavailable&&(subject.active===false||!assignment||assignment.active===false||(assignment.dailyPlan||subject.dailyPlan)?.enabled===false))continue;
    if(['app://audiobooks','app://videos','app://music'].includes(subject.url))continue;
    const aliases=[subject.title,...(ALIASES[subject.url] || []),...(subject.url?.startsWith('app://')?[subject.url.slice(6).replaceAll('-',' ')]:[])];
    try{if(new URL(subject.url).origin==='https://games.bodeebooks.com')aliases.push(...HOSTED_GAMES);}catch{/* An activity is not an HTTPS URL. */}
    const item={key:'subject:'+subject.id,kind:'subject',subjectId:subject.id,subjectIds:[subject.id],label:subject.title,icon:subject.icon||'book-open',aliases};
    if(['app://coloring','app://coloring-studio'].includes(subject.url)){studio.push(item);continue;}
    items.push(item);
  }
  if(studio.length)items.push({...studio[0],label:'Art Studio',subjectIds:studio.map(s=>s.subjectId),aliases:studio.flatMap(s=>s.aliases)});
  return items;
}
export function requestedMessageActions(body,snapshot,studentId) {
  if(typeof body!=='string')return [];
  const clauses=body.toLowerCase().replace(/[’‘]/g,"'").split(/[.!?;\n]+/).filter(clause=>{
    if(/\b(?:don't|dont|do not|didn't|didnt|did not|never|stop|no need|not to|already unlocked)\b/.test(clause))return false;
    return /\b(?:unlock|unblock|enable)\b/.test(clause)||/\bturn\b.{0,35}\bon\b/.test(clause);
  }).map(clause=>' '+normalize(clause)+' ');
  const items=choices(snapshot,studentId),found=new Set();
  // Longer names consume their words first: Learning Videos must not also
  // suggest recreational Videos, nor BodeeBooks Games also Family Games.
  const names=items.flatMap(item=>[...new Set(item.aliases.map(normalize))].filter(Boolean).map(name=>({name,item})));
  // Reserve specific names even when unassigned. "Learning Videos" must never
  // fall back to recreational Videos after the learning activity is removed.
  const reserved=[...Object.values(ALIASES).flat(),...HOSTED_GAMES,...choices(snapshot,studentId,true).flatMap(item=>item.aliases)];
  names.push(...reserved.map(normalize).filter(Boolean).map(name=>({name,item:null})));
  names.sort((a,b)=>b.name.length-a.name.length);
  for(let clause of clauses)for(const {name,item}of names){const phrase=' '+name+' ';if(clause.includes(phrase)){if(item)found.add(item.key);clause=clause.replaceAll(phrase,' ');}}
  return items.filter(item=>found.has(item.key));
}
export function requestedMessageMedia(body) {return requestedMessageActions(body,null,null).map(item=>item.kind);}


export function createMessageMediaActions({ request, getStudents, getSnapshot = () => null }) {
  // Keep a lost-response retry tied to the same write, even after switching chats.
  const receipts = new Map();
  const findStudent = id => getStudents().find(student => student.id === id && !student.archived_at);
  function attach({ message, studentId, canAct }) {
    const student = findStudent(studentId);
    const kinds = message.sender === 'child' && message.id && student ? requestedMessageActions(message.body,getSnapshot(),studentId) : [];
    if (!kinds.length) return null;
    const node = document.createElement('div'); node.className = 'cloud-message-media-actions';
    const context = document.createElement('span'); context.className = 'cloud-message-media-context';
    context.textContent = `For ${student.name} · Today`;
    node.append(context);
    const listeners = [];
    for (const media of kinds) {
      const kind = media.key;
      const key = JSON.stringify([new Date().toDateString(), studentId, message.id, kind]);
      if (!receipts.has(key)) receipts.set(key, { phase: 'ready', requestId: null, error: '', listeners: new Set() });
      const state = receipts.get(key);
      const row = document.createElement('div'); row.className = 'cloud-message-media-action'; row.dataset.media = media.kind === 'subject' ? media.subjectId : kind;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'cloud-message-media-unlock';
      const icon = document.createElement('i'); icon.dataset.lucide = media.icon; icon.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span'); button.append(icon, label);
      button.title = 'Bypass school and schedule requirements for today. Daily time limits still apply.';
      const status = document.createElement('span'); status.className = 'cloud-message-media-status';
      status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
      const draw = () => {
        const busy = state.phase === 'saving', saved = state.phase === 'saved';
        button.disabled = busy || saved || !findStudent(studentId);
        button.setAttribute('aria-busy', String(busy)); row.dataset.state = state.phase;
        label.textContent = busy ? 'Unlocking…' : saved ? `${media.label} unlock saved` : `${state.phase === 'error' ? 'Retry unlock: ' : 'Unlock '}${media.label}`;
        button.setAttribute('aria-label', `${label.textContent} for ${student.name} today`);
        status.textContent = saved ? 'Saved for today. Applies on their next sync.' : state.error;
      };
      button.addEventListener('click', async () => {
        if (state.phase === 'saving' || state.phase === 'saved' || !findStudent(studentId) || !canAct()) return;
        if (!choices(getSnapshot(),studentId).some(item=>item.key===media.key)) { state.phase='error';state.error='This activity is no longer assigned. Check Daily plan.';draw();return; }
        state.phase = 'saving'; state.error = '';
        const update = () => state.listeners.forEach(listener => listener());
        update();
        try {
          state.requestId ||= crypto.randomUUID();
          const result = media.kind === 'subject'
            ? await request('computer-command',{kind:'quick-unlock',studentId,subjectId:media.subjectId,unlocked:true,requestId:state.requestId})
            : await request('media', { path: `/api/${media.route}/quick-control`, method: 'POST', requestId: state.requestId,body: { student_id: studentId, operation: 'override', unlocked: true } });
          const confirmed = media.kind === 'subject' ? media.subjectIds.every(id=>result?.quickUnlock?.subjectIds?.includes(id))
            : result?.status === 200 && result.body?.success === true && result.body?.unlocked === true;
          if (!confirmed) throw new Error('The unlock could not be confirmed.');
          state.phase = 'saved';
        } catch (error) {
          state.phase = 'error'; state.error = `${error.message || 'The unlock could not be confirmed.'} Tap to retry.`;
        }
        update();
      });
      state.listeners.add(draw); listeners.push(() => state.listeners.delete(draw)); draw();
      row.append(button, status); node.append(row);
    }
    const hint = document.createElement('span'); hint.className = 'cloud-message-media-hint';
    hint.textContent = 'Daily time limits still apply.'; node.append(hint);
    return { node, dispose: () => listeners.forEach(remove => remove()) };
  }
  return { attach, fingerprint: studentId => JSON.stringify(choices(getSnapshot(),studentId)) };
}
