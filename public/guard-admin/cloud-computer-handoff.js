import { requestInstallerCode } from './cloud-installer-code.js?v=20261125-computer-handoff';

import { openPairingDialog } from './cloud-pairing-dialog.js?v=20261125-pairing-dialog';

// The download code belongs to the open parent guide. Renders can reuse it,
// but closing the guide or reaching its expiry removes it from the screen.
export function computerHandoff({node, button, onApproved}) {
  let grant=null, pending=null, timer=null, message='', update=null;
  let pairingDialog=null;
  async function createCode() {
    if(pending || grant)return;
    const request=requestInstallerCode();
    pending=request;message='';update?.();
    try {
      const result=await request;
      if(pending!==request)return;
      grant=result;
      timer=setTimeout(()=>{
        grant=null;message='Download code expired. Create another if you still need to install.';update?.();
      },Math.max(0,Date.parse(result.expiresAt)-Date.now()));
    } catch(failure) {
      if(pending===request)message=failure instanceof TypeError || failure.name==='TimeoutError'
        ? 'Could not reach BodeeGuard. Check your connection and try again.' : failure.message;
    } finally {
      if(pending===request){pending=null;update?.();}
    }
  }
  function clear() {
    pairingDialog?.close();
    clearTimeout(timer);grant=pending=timer=null;message='';update?.();update=null;
  }
  function render(hasComputer) {
    const guide=node(hasComputer?'details':'section','','setup-connection-guide parent-start-more');
    if(hasComputer)guide.append(node('summary','Connect another Windows computer'));
    const list=node('ol','','setup-device-steps');
    function step(title) {
      const item=node('li');item.append(node('strong',title));list.append(item);return item;
    }
    const pc=step('Start on the child’s Windows computer');
    pc.append(node('p','In its browser, open'),node('strong','guard.bodeebooks.com/install','setup-install-address'),node('p','Already installed? Open BodeeGuard to see its pairing code.'));
    const parent=step('Get a download code in your parent dashboard');
    parent.append(node('p','On your phone or computer, create a download code here. Enter it on the install page on the child’s computer.'));
    const create=button('Create download code',createCode,true),createLabel=create.firstChild;
    const output=node('div','','setup-code-result');output.setAttribute('role','status');
    const install=node('p','On the child’s computer, select Get download, then Download BodeeGuard. Run the installer and open BodeeGuard.');
    parent.append(create,output,install);
    const approve=step('Approve the computer in your parent dashboard');
    approve.append(node('p','Leave the pairing code on the child’s screen. On your phone or computer, enter that code below, then choose who uses the child’s computer.'));
    const pairing=button('Enter pairing code',()=>{
      if(pairingDialog?.open)return;
      pairingDialog=openPairingDialog({node,button,opener:pairing,onApproved});
    });
    pairing.setAttribute('aria-haspopup','dialog');
    approve.append(pairing);guide.append(list);
    update=()=>{
      const focusCode=!!grant && document.activeElement===create;
      create.disabled=!!pending;create.hidden=!!grant;install.hidden=!grant;
      createLabel.textContent=pending?'Creating download code…':'Create download code';
      output.replaceChildren();
      if(grant){
        const code=node('strong',grant.code,'setup-download-code');code.tabIndex=-1;
        output.append(node('span','Download code'),code,node('small','Valid until '+new Date(grant.expiresAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})));
        if(focusCode)code.focus({preventScroll:true});
      }else if(message)output.textContent=message;
      pairing.classList.toggle('btn-primary',!!grant);pairing.classList.toggle('btn-secondary',!grant);
    };
    update();
    return guide;
  }
  return {render,clear};
}
