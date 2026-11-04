const node=(tag,text='',className='')=>{const el=document.createElement(tag);el.textContent=text;el.className=className;return el;};

// Reuse the authenticated family-password endpoint. Never save the plaintext in
// setup drafts, browser storage, URLs or the per-child setup record.
export function setupPassword({host,getSnapshot,mutate,refresh,onBusy,onSaved}) {
  const panel=node('section','','setup-parent-password');panel.setAttribute('aria-label','Family parent password');host.append(panel);
  let busy=false,saveConfirmed=false,password,confirmation;
  const configured=()=>getSnapshot()?.parentPassword?.configured===true;
  const clear=()=>{if(password)password.value='';if(confirmation)confirmation.value='';};
  function render(){
    clear();panel.replaceChildren();
    panel.append(node('h3',configured()?'Parent password is ready':'First, set your parent password'),node('p','Use it for parent controls and exiting BodeeGuard on every child’s computer, even offline. Keep it private.','setup-copy'));
    if(configured()){panel.dataset.ready='true';panel.append(node('p','Saved for your family. Connected computers receive it automatically.','setup-password-success'));return;}
    panel.dataset.ready='false';panel.append(node('p','Separate from your website sign-in. Save it before connecting a computer.','setup-copy'));
    const fields=node('div','','setup-password-fields');
    function field(labelText,name){const label=node('label','','setup-field'),input=node('input');input.type='password';input.name=name;input.autoComplete='new-password';input.minLength=6;input.maxLength=64;input.required=true;label.append(node('span',labelText),input);fields.append(label);return input;}
    password=field('Parent password (6–64 characters)','setupParentPassword');confirmation=field('Confirm parent password','setupParentPasswordConfirm');
    const status=node('p','','setup-password-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const save=node('button','Save parent password','btn btn-primary');save.type='button';
    save.onclick=async()=>{
      if(busy)return;
      if(!saveConfirmed){
        confirmation.setCustomValidity(password.value===confirmation.value?'':'Enter the same password in both fields.');
        if(!password.reportValidity()||!confirmation.reportValidity())return;
      }
      busy=true;save.disabled=password.disabled=confirmation.disabled=true;onBusy(true);status.textContent='Saving parent password…';status.dataset.error='false';
      try {
        if(!saveConfirmed){const result=await mutate('set-parent-password',{password:password.value});if(result?.saved!==true)throw Error('The password was not confirmed. Check the connection and try again.');saveConfirmed=true;clear();}
        await refresh();
        if(!configured())throw Error('The password was saved. Check again to confirm it before connecting a computer.');
        render();onSaved();
      } catch(error){status.textContent=error.message;status.dataset.error='true';save.textContent=saveConfirmed?'Check saved password':'Save parent password';}
      finally{busy=false;save.disabled=password.disabled=confirmation.disabled=false;onBusy(false);}
    };
    confirmation.addEventListener('input',()=>confirmation.setCustomValidity(''));
    panel.append(fields,save,status);
  }
  render();
  return {clear,validate(){if(!configured()&&(password?.value||confirmation?.value))throw Error('Choose Save parent password first, or clear the password fields to finish later.');}};
}
