export function setupCloudGeography({endpoint,getSnapshot}){
  const root=document.getElementById('cloud-geography-reports'),node=(tag,text='')=>{const element=document.createElement(tag);element.textContent=text;return element;};
  const selector=node('select'),refresh=node('button','Refresh Geography progress'),status=node('p'),progress=node('div'),history=node('div');
  selector.className='admin-select';selector.setAttribute('aria-label','Geography student');refresh.className='btn btn-secondary';status.setAttribute('role','status');root.append(node('h2','Geography Mastery'),selector,refresh,status,progress,history);
  let active=false,busy=false,generation=0,offset=0;
  async function load(){
    if(!active||busy)return;busy=true;refresh.disabled=true;const epoch=generation;
    try{
      const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'list-geography',studentId:selector.value||null,offset})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'Geography could not connect.');if(!active||epoch!==generation)return;
      progress.replaceChildren();history.replaceChildren();
      for(const child of data.progress){const card=node('details');card.append(node('summary',`${child.name} · ${child.summary.strong}/50 pairs strong · ${child.summary.introduced} introduced`));for(const set of child.songSets)card.append(node('p',`${set.label}: ${set.strong}/${set.total} strong · ${set.status==='complete'?'Complete':set.status==='current'?'Current set':'Locked'} · ${set.due} due for review`));progress.append(card);}
      for(const answer of data.answers.slice(0,50)){
        if(answer.origin==='legacy'){
          const detail=node('details');detail.append(node('summary',`${answer.name} · ${answer.practice_date} · Original Admin · ${answer.correct?'Correct':'Practice'} · ${answer.coins} coins recorded`),node('p','The original question and selected answer were not saved. No coins were added by this transfer.'),node('p',`Original question reference: ${answer.question_key}`),node('p',`Originally saved ${new Date(answer.created_at).toLocaleString()}`));history.append(detail);continue;
        }
        const detail=node('details');detail.append(node('summary',`${answer.name} · ${answer.practice_date} · ${answer.mode==='memory'?'Capital Memory':'Daily Challenge'} · ${answer.correct?'Correct':'Practice'} · ${answer.coins} coins`),node('p',answer.question.question),node('p',`Selected: ${answer.selection}`),node('p',`Correct answer: ${answer.question.answer}`),node('p',`Saved ${new Date(answer.created_at).toLocaleString()}`));history.append(detail);
      }
      for(const[label,page]of [['Newer Geography results',offset-50],['Older Geography results',offset+50]]){if(page<0||page>offset&&data.answers.length<=50)continue;const button=node('button',label);button.className='btn btn-secondary';button.onclick=()=>{offset=page;generation++;void load();};history.append(button);}
      status.textContent='The daily challenge and capital-memory course are connected. Memory practice awards no coins. '+(data.includesLanHistory?'Original Admin rewards and mastery are connected for imported children; historical coins were not awarded again.':'Earlier Geography history still awaits transfer.');
    }catch(error){if(active&&epoch===generation){history.replaceChildren();progress.replaceChildren();status.textContent=error.message;}}
    finally{busy=false;refresh.disabled=false;if(active&&epoch!==generation)void load();}
  }
  function update(){if(document.activeElement===selector)return;const selected=selector.value;selector.replaceChildren(...[{id:'',name:'All students'},...(getSnapshot()?.students||[])].map(child=>{const option=node('option',child.name);option.value=child.id;return option;}));if([...selector.options].some(option=>option.value===selected))selector.value=selected;}
  selector.onchange=()=>{offset=0;generation++;void load();};refresh.onclick=load;
  return{update,setActive(value){active=value;generation++;if(value){update();void load();}}};
}
