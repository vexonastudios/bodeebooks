import {auth} from '@clerk/nextjs/server';
const headers={'Cache-Control':'private, no-store'};
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')return new Response(null,{status:403,headers});
 if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return new Response(null,{status:415,headers});
 if(!(await auth()).isAuthenticated)return new Response(null,{status:401,headers});
 try{
  const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400,headers});let body='';const decoder=new TextDecoder();let bytes=0;
  try{for(;;){const item=await reader.read();if(item.done)break;bytes+=item.value.byteLength;if(bytes>2048){await reader.cancel();return new Response(null,{status:400,headers});}body+=decoder.decode(item.value,{stream:true});}body+=decoder.decode();}finally{reader.releaseLock();}
  const report=JSON.parse(body);
  if(!report||Object.keys(report).sort().join(',')!=='code,component,errorType,id,location,osVersion,schemaVersion,stage,version,windowsError'||report.component!=='parent'||report.code!=='runtime_failed'||report.stage!=='parent-ui'||report.schemaVersion!==1||report.osVersion!=='unknown'||report.windowsError!==0||!/^[a-f0-9-]{36}$/.test(report.id)||!/^(unknown|[a-f0-9]{7,40})$/.test(report.version)||!['Error','TypeError','RangeError','ReferenceError','SyntaxError','AbortError','TimeoutError'].includes(report.errorType)||!/^(unknown|renderer\/[A-Za-z0-9_.-]{1,100}\.js(?::\d{1,7}:\d{1,5})?)$/.test(report.location))return new Response(null,{status:400,headers});
  const base=process.env.BODEEGUARD_COMMERCIAL_API_URL?.replace(/\/$/,'');if(!base)return new Response(null,{status:503,headers});
  const response=await fetch(base+'/v1/diagnostics',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(report),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000)});
  await response.body?.cancel();return new Response(null,{status:[202,400,429].includes(response.status)?response.status:503,headers});
 }catch{return new Response(null,{status:503,headers});}
}
