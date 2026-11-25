const node=(tag,text='',className='')=>{const el=document.createElement(tag);el.textContent=text;el.className=className;return el;};

function passwordField(fields, labelText, name, hint, toggleTarget) {
  const field = node('div', '', 'setup-field');
  const label = node('label', labelText);
  const control = node('div', '', 'setup-password-control');
  const input = node('input');
  input.id = input.name = name;
  label.htmlFor = name;
  input.autocomplete = 'new-password';
  input.autocapitalize = 'none';
  input.spellcheck = false;
  input.minLength = 6;
  input.maxLength = 64;
  input.required = true;
  input.setAttribute('aria-describedby', hint.id);

  const toggle = node('button', '', 'setup-password-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', name);
  for (const iconName of ['eye', 'eye-off']) {
    const icon = node('i', '', 'setup-password-' + iconName);
    icon.dataset.lucide = iconName;
    icon.setAttribute('aria-hidden', 'true');
    toggle.append(icon);
  }
  const action = node('span');
  toggle.append(action);
  function setVisible(visible) {
    input.type = visible ? 'text' : 'password';
    action.textContent = visible ? 'Hide' : 'Show';
    toggle.setAttribute('aria-label', action.textContent + ' ' + toggleTarget);
    toggle.dataset.visible = String(visible);
  }
  setVisible(false);
  toggle.onclick = () => setVisible(input.type === 'password');
  control.append(input, toggle);
  field.append(label, control, hint);
  fields.append(field);
  return { input, clear() { input.value = ''; setVisible(false); } };
}

// Reuse the authenticated family-password endpoint. Never save the plaintext in
// setup drafts, browser storage, URLs or the per-child setup record.
export function setupPassword({host,getSnapshot,mutate,refresh,onBusy,onSaved}) {
  const panel=node('section','','setup-parent-password');panel.setAttribute('aria-label','Family parent password');host.append(panel);
  let busy=false,saveConfirmed=false,password,confirmation,matchHint;
  const configured=()=>getSnapshot()?.parentPassword?.configured===true;
  const clear=()=>{
    password?.clear();
    if (!confirmation) return;
    confirmation.clear();
    confirmation.input.setCustomValidity('');
    confirmation.input.removeAttribute('aria-invalid');
    matchHint.textContent='';
  };
  function render(){
    clear();panel.replaceChildren();
    panel.append(node('h3',configured()?'Parent password is ready':'First, set your parent password'),node('p','Use it for parent controls and exiting BodeeGuard on every child’s computer, even offline. Keep it private.','setup-copy'));
    if(configured()){panel.dataset.ready='true';panel.append(node('p','Saved for your family. Connected computers receive it automatically.','setup-password-success'));return;}
    panel.dataset.ready='false';panel.append(node('p','This password is separate from your website sign-in.','setup-copy'));
    const form=node('form');form.noValidate=true;form.method='post';
    const fields=node('fieldset','','setup-password-fields');
    const lengthHint=node('small','Use 6–64 characters.','setup-password-hint');lengthHint.id='setup-password-length';
    matchHint=node('small','','setup-password-hint');matchHint.id='setup-password-match';matchHint.setAttribute('role','status');
    password=passwordField(fields,'Parent password','setupParentPassword',lengthHint,'parent password');
    confirmation=passwordField(fields,'Confirm parent password','setupParentPasswordConfirm',matchHint,'password confirmation');
    function checkMatch(showMismatch) {
      const repeated = confirmation.input;
      const mismatch = repeated.value !== '' && repeated.value !== password.input.value;
      const showError = showMismatch && mismatch;
      repeated.setCustomValidity(mismatch ? 'Enter the same password in both fields.' : '');
      if (showError) repeated.setAttribute('aria-invalid','true');
      else repeated.removeAttribute('aria-invalid');
      matchHint.dataset.error = String(showError);
      let message = '';
      if (showError) message = 'Passwords don’t match.';
      else if (repeated.value && !mismatch) message = 'Passwords match.';
      if (matchHint.textContent !== message) matchHint.textContent = message;
    }
    form.addEventListener('input',()=>checkMatch(false));
    confirmation.input.addEventListener('blur',()=>checkMatch(true));
    const status=node('p','','setup-password-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const save=node('button','Save parent password','btn btn-primary');save.type='submit';
    form.onsubmit=async event=>{
      event.preventDefault();
      if(busy)return;
      if(!saveConfirmed){
        checkMatch(true);
        if(!password.input.reportValidity()||!confirmation.input.reportValidity())return;
      }
      busy=true;save.disabled=fields.disabled=true;onBusy(true);status.textContent='Saving parent password…';status.dataset.error='false';
      try {
        if(!saveConfirmed){const result=await mutate('set-parent-password',{password:password.input.value});if(result?.saved!==true)throw Error('The password was not confirmed. Check the connection and try again.');saveConfirmed=true;clear();}
        await refresh();
        if(!configured())throw Error('The password was saved. Check again to confirm it before connecting a computer.');
        render();onSaved();
      } catch(error){status.textContent=error.message;status.dataset.error='true';save.textContent=saveConfirmed?'Check saved password':'Save parent password';}
      finally{busy=false;save.disabled=false;fields.disabled=saveConfirmed;onBusy(false);}
    };
    form.append(fields,save,status);panel.append(form);
  }
  render();
  return {clear,validate(){if(!configured()&&(password?.input.value||confirmation?.input.value))throw Error('Choose Save parent password first, or clear the password fields to finish later.');}};
}
