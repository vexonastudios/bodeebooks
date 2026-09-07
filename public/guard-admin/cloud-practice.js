export function setupCloudPractice({endpoint,getSnapshot}){
  const root=document.getElementById('cloud-practice-reports'),node=(tag,text='')=>{const element=document.createElement(tag);element.textContent=text;return element;};
  const selector=node('select'),module=node('select'),refresh=node('button','Refresh practice results'),status=node('p'),history=node('div');
  selector.className=module.className='admin-select';selector.setAttribute('aria-label','Practice student');module.setAttribute('aria-label','Practice module');refresh.className='btn btn-secondary';status.setAttribute('role','status');
  for(const[value,label]of [['','Both modules'],['logic','Logic Lab'],['words','Confused Words']]){const option=node('option',label);option.value=value;module.append(option);}
  root.append(node('h2','Logic Lab & Confused Words'),selector,module,refresh,status,history);
  let active=false,busy=false,generation=0,offset=0;
  async function load(){
    if(!active||busy)return;busy=true;refresh.disabled=true;const epoch=generation;
    try{
      const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'list-practice',studentId:selector.value||null,module:module.value||null,offset})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'Practice results could not connect.');if(!active||epoch!==generation)return;
      history.replaceChildren();
      for(const answer of data.answers.slice(0,50)){
        const detail=node('details'),question=answer.question;
        if(answer.origin==='legacy'){
          detail.append(node('summary',`${answer.name} · ${answer.practice_date} · ${answer.kind==='logic'?'Logic Lab':'Confused Words'} · Original Admin · ${answer.correct?'Correct':'Practice'} · ${answer.coins} coins recorded`),node('p','The original question and selected answer were not saved. No coins were added by this transfer.'),node('p',`Original question reference: ${answer.question_key}`),node('p',`Originally saved ${new Date(answer.created_at).toLocaleString()}`));
          history.append(detail);continue;
        }
        const selection=answer.kind==='words'?answer.selection:Array.isArray(answer.selection)?answer.selection.map(id=>question.parts.find(part=>String(part.id)===id)?.text||id).join(' → '):question.options[answer.selection]?.text;
        detail.append(node('summary',`${answer.name} · ${answer.practice_date} · ${answer.kind==='logic'?'Logic Lab':'Confused Words'} · ${answer.correct?'Correct':'Practice'} · ${answer.coins} coins`),node('p',question.scenario||question.sentence),node('p',question.question||question.prompt||''),node('p',`Selected: ${selection}`),node('p',`Saved ${new Date(answer.created_at).toLocaleString()}`));
        if(answer.kind==='words')detail.append(node('p',`Correct word: ${question.answer}`),node('p',question.tip?.rule||''));
        else if(question.type==='build-chain')detail.append(node('p',`Correct order: ${question.correctOrder.map(id=>question.parts.find(part=>String(part.id)===String(id))?.text||id).join(' → ')}`));
        else for(const option of question.options.filter(option=>option.isCorrect))detail.append(node('p',`Correct answer: ${option.text}`),node('p',option.feedback||''));
        history.append(detail);
      }
      for(const[label,page]of [['Newer practice results',offset-50],['Older practice results',offset+50]]){if(page<0||page>offset&&data.answers.length<=50)continue;const button=node('button',label);button.className='btn btn-secondary';button.onclick=()=>{offset=page;generation++;void load();};history.append(button);}
      status.textContent=`${data.answers.length?'Practice results are connected.':'No practice results recorded.'} ${data.includesLanHistory?'Original Admin history is connected for imported children. Recorded historical coins were not awarded again.':'Earlier practice history still awaits transfer.'}`;
    }catch(error){if(active&&epoch===generation){history.replaceChildren();status.textContent=error.message;}}
    finally{busy=false;refresh.disabled=false;if(active&&epoch!==generation)void load();}
  }
  function update(){if(document.activeElement===selector)return;const selected=selector.value;selector.replaceChildren(...[{id:'',name:'All students'},...(getSnapshot()?.students||[])].map(child=>{const option=node('option',child.name);option.value=child.id;return option;}));if([...selector.options].some(option=>option.value===selected))selector.value=selected;}
  for(const control of [selector,module])control.onchange=()=>{offset=0;generation++;void load();};refresh.onclick=load;
  return{update,setActive(value){active=value;generation++;if(value){update();void load();}}};
}
