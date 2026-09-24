import { setupTabletop } from './cloud-tabletop-ui.js';
export function setupOnlineTabletop({root,request,parent}) {
 let active=false,role=null,timer=null,busy=false,generation=0,state={supported:true,rooms:[],busy:true};
 const make=(tag,text='')=>{const el=document.createElement(tag);el.textContent=text;return el;};
 const button=(text,click)=>{const el=make('button',text);el.type='button';el.className='btn btn-secondary';el.onclick=click;return el;};
 const section=make('section');section.className='tabletop-room';
 section.append(make('h3',parent?'Join your children':'Play with family online'),make('p',parent?'Choose your player name. Chess, Connect Four, Checkers and Fleet Battle play here in the parent app; no game download is needed.':'Play with Mom, Dad or a sibling. Internet is required. Your Family Games hours and time limits still apply.'));
 const actions=make('div');actions.className='cloud-game-actions';
 const dialog=make('dialog');dialog.className='cloud-game-dialog cloud-online-tabletop';dialog.setAttribute('aria-label','Family board games');
 const heading=make('h2'),close=button('Close game window',()=>dialog.close()),body=make('div');dialog.append(heading,close,body);root.append(section,dialog);
 const ui=setupTabletop({root:body,parent,online:true,request:async(kind,input={})=>{
  const operation=kind==='reconnect'?'status':kind;
  return refresh({operation,id:crypto.randomUUID(),...(kind==='move'?{move:input,roomId:state.roomId}:input)});
 }});
 async function refresh(input={operation:'status'}){
  if(busy||!active||document.hidden||!dialog.open)return state;
  clearTimeout(timer);busy=true;const turn=generation;
  try{
   const result=await request('tabletop',{...input,...(parent?{role}:{})});
   if(turn!==generation)return state;
   state=result;ui.setState(state);return state;
  }catch(error){
   if(turn===generation){state={...state,busy:true,connected:false,message:`${error.message} Checking the saved board before another move…`};ui.setState(state);}
   throw error;
  }finally{
   busy=false;if(active&&dialog.open&&!document.hidden)timer=setTimeout(()=>refresh().catch(()=>{}),turn===generation?5000:0);
  }
 }
 function open(value){role=value;heading.textContent=parent?`Playing as ${role==='mom'?'Mom':'Dad'}`:'Play with your family';dialog.showModal();state={supported:true,rooms:[],busy:true};ui.setState(state);void refresh().catch(()=>{});}
 if(parent){actions.append(button('Play as Mom',()=>open('mom')),button('Play as Dad',()=>open('dad')));}
 else actions.append(button('Play with Mom, Dad or siblings',()=>open(null)));
 section.append(actions);
 const suspend=()=>{generation++;clearTimeout(timer);state={...state,connected:false,busy:true};ui.setState(state);};
 dialog.addEventListener('close',suspend);
 document.addEventListener('visibilitychange',()=>{suspend();if(!document.hidden&&active&&dialog.open)void refresh().catch(()=>{});});
 return {setActive(value){active=value;if(!active){suspend();if(dialog.open)dialog.close();}},clear(){suspend();if(dialog.open)dialog.close();role=null;state={supported:true,rooms:[],busy:true};}};
}
