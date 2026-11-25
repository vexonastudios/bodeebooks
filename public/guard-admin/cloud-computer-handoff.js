import { requestInstallerCode } from './cloud-installer-code.js?v=20261125-computer-handoff';

// The download code belongs to the open parent guide. Renders can reuse it,
// but closing the guide or reaching its expiry removes it from the screen.
export function computerHandoff({node, button}) {
  let grant=null, pending=null, timer=null, message='', update=null;
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
    const phone=step('Get the download code on your phone');
    phone.append(node('p','Create the code here. Type it into the install page on the child’s computer.'));
    const create=button('Create download code',createCode,true),createLabel=create.firstChild;
    const output=node('div','','setup-code-result');output.setAttribute('role','status');
    const install=node('p','On the child’s computer, select Get download, then Download BodeeGuard. Run the installer and open BodeeGuard.');
    phone.append(create,output,install);
    const approve=step('Back on your phone');
    approve.append(node('p','When the child app shows a pairing code, leave it open. Enter that code here to approve the computer, then choose the child who uses it.'));
    const pairing=node('a','Enter pairing code','btn btn-secondary');
    pairing.href='/guard/activate/?setup=1';pairing.target='_top';
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
