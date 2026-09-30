// Fixed choices keep the reaction picker small and consistent for parents and kids.
export const MESSAGE_REACTIONS = Object.freeze([
  { emoji: '👍', label: 'Thumbs up' }, { emoji: '😂', label: 'Laughing' },
  { emoji: '❤️', label: 'Love' }, { emoji: '🎉', label: 'Celebrate' },
  { emoji: '😮', label: 'Surprised' }, { emoji: '😢', label: 'Sad' }
]);
let openReactionPicker = null;
export function createMessageReactions({ onReact, messageElement, otherParent = 'Parent', otherChild = 'Child' }) {
  const node = document.createElement('div'); node.className = 'message-reactions';
  const badges = document.createElement('div'); badges.className = 'message-reaction-badges';
  const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'message-reaction-trigger';
  const smile = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  smile.setAttribute('viewBox', '0 0 24 24'); smile.setAttribute('fill', 'none'); smile.setAttribute('stroke', 'currentColor'); smile.setAttribute('stroke-width', '1.8'); smile.setAttribute('stroke-linecap', 'round'); smile.setAttribute('aria-hidden', 'true');
  for (const d of ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', 'M8 14s1.5 2 4 2 4-2 4-2', 'M9 9h.01', 'M15 9h.01']) {
    const path=document.createElementNS(smile.namespaceURI,'path');path.setAttribute('d',d);smile.append(path);
  }
  trigger.append(smile); trigger.title='React to this message';trigger.setAttribute('aria-label','React to this message');trigger.setAttribute('aria-expanded','false');
  const picker=document.createElement('div');picker.className='message-reaction-picker';picker.hidden=true;
  picker.setAttribute('role','toolbar');picker.setAttribute('aria-label','Choose a message reaction');
  picker.id='reaction-picker-'+crypto.randomUUID();trigger.setAttribute('aria-controls',picker.id);
  const feedback=document.createElement('span');feedback.className='message-reaction-feedback';feedback.setAttribute('role','status');feedback.hidden=true;
  node.append(badges,trigger,feedback);
  let reactions=[],busy=false,disposed=false,key='',holdTimer=null,press=null,suppressClickUntil=0;
  const buttons=new Map(),listeners=new AbortController();
  const owns=target=>target instanceof Node&&(node.contains(target)||picker.contains(target));
  const interactive=target=>target instanceof Element&&target.closest('button,a,input,textarea,select,audio,video,[contenteditable=true]');
  function cancelHold(){clearTimeout(holdTimer);holdTimer=null;press=null;}
  function close(restoreFocus=false){
    cancelHold();picker.hidden=true;trigger.setAttribute('aria-expanded','false');messageElement?.classList.remove('message-reaction-open');
    if(openReactionPicker===close)openReactionPicker=null;
    document.removeEventListener('pointerdown',outside,true);document.removeEventListener('scroll',dismiss,true);window.removeEventListener('resize',dismiss);
    if(restoreFocus&&!disposed&&trigger.isConnected)trigger.focus({preventScroll:true});
  }
  function dismiss(){close();}
  function outside(event){if(!owns(event.target))close();}
  function open(keyboard=false){
    if(busy||disposed||!node.isConnected)return;
    if(openReactionPicker&&openReactionPicker!==close)openReactionPicker();
    openReactionPicker=close;
    if(!picker.isConnected)document.body.append(picker);
    picker.hidden=false;trigger.setAttribute('aria-expanded','true');messageElement?.classList.add('message-reaction-open');
    const box=(messageElement||node).getBoundingClientRect(),size=picker.getBoundingClientRect(),viewport=window.visualViewport;
    const left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0,width=viewport?.width||innerWidth,height=viewport?.height||innerHeight;
    picker.style.left=Math.max(left+8,Math.min(box.left,left+width-size.width-8))+'px';
    picker.style.top=Math.max(top+8,Math.min(box.top-size.height-8>=top+8?box.top-size.height-8:box.bottom+8,top+height-size.height-8))+'px';
    document.addEventListener('pointerdown',outside,true);document.addEventListener('scroll',dismiss,true);window.addEventListener('resize',dismiss);
    if(keyboard)picker.querySelector('button').focus({preventScroll:true});
  }
  function controls(){
    node.setAttribute('aria-busy',String(busy));
    for(const button of [...node.querySelectorAll('button'),...picker.querySelectorAll('button')])button.disabled=busy;
  }
  function update(value=[]){
    reactions=Array.isArray(value)?value.filter(item=>MESSAGE_REACTIONS.some(choice=>choice.emoji===item.emoji)&&Number.isInteger(item.count)&&item.count>0):[];
    const next=JSON.stringify(reactions);
    if(next!==key){
      key=next;badges.replaceChildren();
      for(const reaction of reactions){
        const choice=MESSAGE_REACTIONS.find(choice=>choice.emoji===reaction.emoji);
        const button=document.createElement('button');button.type='button';button.className='message-reaction-badge';button.dataset.emoji=reaction.emoji;
        const badge=document.createElement('span');badge.textContent=reaction.emoji+' '+reaction.count;button.append(badge);
        const people=reaction.mine&&reaction.count===1?['You']:[...(reaction.from||[]).map(role=>role==='parent'?otherParent:otherChild),reaction.mine?'including you':''].filter(Boolean);
        button.title=choice.label+' · '+[...new Set(people)].join(', ');
        button.setAttribute('aria-label',choice.label+', '+reaction.count+(reaction.mine?', your reaction. Remove reaction':'. Add your reaction'));
        button.setAttribute('aria-pressed',String(Boolean(reaction.mine)));
        button.addEventListener('click',()=>void react(reaction.emoji));badges.append(button);
      }
      for(const [emoji,button] of buttons)button.setAttribute('aria-pressed',String(reactions.some(item=>item.emoji===emoji&&item.mine)));
    }
    messageElement?.classList.toggle('message-has-reaction-badges',reactions.length>0);
    controls();
  }
  async function react(emoji){
    if(busy||disposed)return;
    const remove=reactions.some(item=>item.emoji===emoji&&item.mine);
    const restoreFocus=picker.contains(document.activeElement);
    busy=true;feedback.hidden=true;close();controls();
    try{
      const value=await onReact(remove?null:emoji);
      if(disposed)return;
      update(value);feedback.textContent=remove?'Reaction removed':'Reaction saved';
    }catch(error){
      if(disposed)return;
      feedback.textContent=error.message||'Reaction could not send. Reconnect and try again.';feedback.hidden=false;
    }finally{busy=false;if(!disposed){controls();if(restoreFocus&&trigger.isConnected)trigger.focus({preventScroll:true});}}
  }
  for(const choice of MESSAGE_REACTIONS){
    const button=document.createElement('button');button.type='button';button.textContent=choice.emoji;button.dataset.emoji=choice.emoji;
    button.setAttribute('aria-label',choice.label);button.setAttribute('aria-pressed','false');
    button.addEventListener('click',()=>void react(choice.emoji));buttons.set(choice.emoji,button);picker.append(button);
  }
  trigger.addEventListener('click',event=>{if(picker.hidden)open(event.detail===0);else close();});
  function keydown(event){
    if(event.key==='Escape'){event.preventDefault();close(true);}
    if(picker.hidden||!picker.contains(event.target))return;
    const all=[...buttons.values()],index=all.indexOf(document.activeElement);
    const next=event.key==='Home'?0:event.key==='End'?all.length-1:event.key==='ArrowRight'?(index+1)%all.length:event.key==='ArrowLeft'?(index+all.length-1)%all.length:null;
    if(next!==null){event.preventDefault();all[next].focus();}
  }
  for(const el of [node,picker]){
    el.addEventListener('keydown',keydown);
    el.addEventListener('focusout',event=>{if(!owns(event.relatedTarget))close();});
  }
  if(messageElement){
    messageElement.classList.add('message-can-react');
    messageElement.addEventListener('pointerdown',event=>{
      cancelHold();
      if(busy||event.isPrimary===false||!['touch','pen'].includes(event.pointerType)||interactive(event.target))return;
      press={id:event.pointerId,x:event.clientX,y:event.clientY};
      holdTimer=setTimeout(()=>{holdTimer=null;suppressClickUntil=Date.now()+1000;open();},500);
    },{passive:true,signal:listeners.signal});
    messageElement.addEventListener('pointermove',event=>{if(press&&(event.pointerId!==press.id||Math.hypot(event.clientX-press.x,event.clientY-press.y)>10))cancelHold();},{passive:true,signal:listeners.signal});
    for(const type of ['pointerup','pointercancel','pointerleave'])messageElement.addEventListener(type,cancelHold,{passive:true,signal:listeners.signal});
    messageElement.addEventListener('click',event=>{if(Date.now()<suppressClickUntil&&!interactive(event.target)){event.preventDefault();event.stopPropagation();}},{capture:true,signal:listeners.signal});
    messageElement.addEventListener('contextmenu',event=>{if(!interactive(event.target)){event.preventDefault();cancelHold();open();}},{signal:listeners.signal});
  }
  update();
  return {node,update,dispose(){disposed=true;close();listeners.abort();picker.remove();messageElement?.classList.remove('message-can-react','message-has-reaction-badges');}};
}
