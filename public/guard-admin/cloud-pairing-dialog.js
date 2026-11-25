export function openPairingDialog({node,button,opener,onApproved}) {
  const dialog=node('dialog','','setup-pairing-dialog');
  const form=node('form'), title=node('h2','Approve the child’s computer');
  title.id='setup-pairing-title';dialog.setAttribute('aria-labelledby',title.id);
  const label=node('label','Pairing code from the child’s computer'),input=node('input');
  input.id='setup-pairing-code';label.htmlFor=input.id;
  input.placeholder='e.g. ABCD-EFGH';input.maxLength=20;input.required=true;
  input.autocapitalize='characters';input.autocomplete='off';input.spellcheck=false;
  const feedback=node('p','','setup-pairing-feedback');feedback.id='setup-pairing-feedback';
  feedback.setAttribute('role','status');input.setAttribute('aria-describedby',feedback.id);
  const actions=node('div','','setup-pairing-actions'),cancel=button('Cancel',()=>dialog.close());
  const submit=node('button','Approve computer','btn btn-primary');submit.type='submit';
  actions.append(cancel,submit);form.append(title,label,input,feedback,actions);
  dialog.append(form);document.body.append(dialog);
  let submitting=false;
  dialog.addEventListener('cancel',event=>{if(submitting)event.preventDefault();});
  dialog.addEventListener('close',()=>{
    dialog.remove();
    if(dialog.returnValue!=='approved'&&opener.isConnected)opener.focus();
  },{once:true});
  form.onsubmit=async event=>{
    event.preventDefault();
    if(submitting||!dialog.open)return;
    submitting=true;submit.disabled=cancel.disabled=true;input.readOnly=true;
    submit.textContent='Approving…';feedback.textContent='';
    let approved=false,computerName='';
    try {
      const response=await fetch('/guard/activate/approve/',{
        method:'POST',credentials:'same-origin',redirect:'error',cache:'no-store',
        headers:{'Content-Type':'text/plain;charset=UTF-8'},body:input.value.trim(),
        signal:AbortSignal.timeout(20000)
      });
      const result=await response.json();
      if(response.ok&&result.status==='success'){
        approved=true;computerName=result.computerName||'';
      }else{
        feedback.textContent=result.message||'Could not approve this computer. Check the pairing code and try again.';
      }
    }catch{
      feedback.textContent='Could not confirm approval. Check your connection and the child app, then try again if it still shows a code.';
    }finally{
      submitting=false;submit.disabled=cancel.disabled=false;input.readOnly=false;
      submit.textContent='Approve computer';
    }
    if(!dialog.open)return;
    if(approved){dialog.close('approved');await onApproved(computerName);}
    else{input.focus();input.select();}
  };
  dialog.showModal();input.focus();
  return dialog;
}
