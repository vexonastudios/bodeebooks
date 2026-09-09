let retryAt=0;
export async function mediaFetch(raw,options={}){
  const url=new URL(raw,location.href);
  if(!url.pathname.startsWith('/api/'))return window.fetch(raw,options);
  if(Date.now()<retryAt)return new Response(JSON.stringify({error:'BodeeGuard is reconnecting. Please try again shortly.'}),{status:503,headers:{'Content-Type':'application/json'}});
  const method=options.method||'GET',response=await window.fetch('/guard/dashboard/bridge/',{method:'POST',credentials:'same-origin',cache:'no-store',signal:options.signal||AbortSignal.timeout(180000),headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'media',path:url.pathname+url.search,method,body:typeof options.body==='string'?JSON.parse(options.body):options.body,requestId:method==='GET'?undefined:crypto.randomUUID()})});
  if(response.status===503)retryAt=Date.now()+30000;
  if(response.status===401)window.parent.postMessage({type:'bodeeguard-renew-session'},location.origin);
  const value=await response.json();return new Response(JSON.stringify(response.ok?value.body:value),{status:response.ok?value.status:response.status,headers:{'Content-Type':'application/json'}});
}
