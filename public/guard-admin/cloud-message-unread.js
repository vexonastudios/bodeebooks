// The authenticated outer parent page owns unread state; no polling is added.
export function setupMessageUnread(messaging) {
  window.addEventListener('message', event => {
    if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='bodeeguard-unread')return;
    if(!Array.isArray(event.data.items))return;
    const items=event.data.items.filter(item=>item&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(item.studentId)&&Number.isSafeInteger(item.count)&&item.count>=0);
    messaging.setUnread(items);
    const total=items.reduce((sum,item)=>sum+item.count,0);
    for(const nav of document.querySelectorAll('[data-tab="messages"],[data-mobile-tab="messages"]')){
      let badge=nav.querySelector('.cloud-unread-badge');
      if(!badge){badge=document.createElement('span');badge.className='cloud-unread-badge';nav.append(badge);}
      badge.hidden=!total;badge.textContent=String(Math.min(999,total));nav.setAttribute('aria-label',total?'Messages, '+total+' unread':'Messages');
    }
  });
}
