import './cloud-media-response-cache.js';
const cache=globalThis.CloudMediaResponseCache.createMediaResponseCache();
let retryAt=0;
export async function mediaFetch(raw,options={}){
  const url=new URL(raw,location.href);
  if(!url.pathname.startsWith('/api/'))return window.fetch(raw,options);
  if(Date.now()<retryAt)return new Response(JSON.stringify({error:'BodeeGuard is reconnecting. Please try again shortly.'}),{status:503,headers:{'Content-Type':'application/json'}});
  const method=options.method||'GET';
  // This module lives only in the authenticated dashboard document. Every
  // validation still reaches the authenticated bridge; no offline auth cache.
  const value=await cache.request('dashboard-document',{path:url.pathname+url.search,method,body:typeof options.body==='string'?JSON.parse(options.body):options.body,requestId:method==='GET'?undefined:crypto.randomUUID()},async change=>{
    const response=await window.fetch('/guard/dashboard/bridge/',{method:'POST',credentials:'same-origin',cache:'no-store',signal:options.signal||AbortSignal.timeout(180000),headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'media',...change})});
    if(response.status===503)retryAt=Date.now()+30000;
    if(response.status===401){cache.clear();window.parent.postMessage({type:'bodeeguard-renew-session'},location.origin);}
    const result=await response.json();return response.ok?result:{status:response.status,body:result};
  });
  return new Response(JSON.stringify(value.body),{status:value.status,headers:{'Content-Type':'application/json'}});
}
