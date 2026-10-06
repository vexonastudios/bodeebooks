import {auth} from '@clerk/nextjs/server';
import {cloudApi,CloudApiError} from '../../dashboard/cloud-api';
export const maxDuration=60;
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers});
export async function POST(request:Request){
  if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')return reply({error:'Open Report a bug from your parent dashboard.'},403);
  if(!(await auth()).isAuthenticated)return reply({error:'Sign in again, then retry your report.'},401);
  if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return reply({error:'Send a JSON request.'},415);
  const reader=request.body?.getReader();if(!reader)return reply({error:'The request is empty.'},400);
  let input:Record<string,unknown>;
  try{
    const chunks:Uint8Array[]=[];let size=0;
    for(;;){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>3*1024*1024){await reader.cancel();return reply({error:'The upload is too large. Use a shorter recording or fewer photos.'},413);}chunks.push(chunk.value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    input=JSON.parse(new TextDecoder().decode(bytes));if(!input||Array.isArray(input)||typeof input!=='object')throw Error();
  }catch{return reply({error:'The request could not be read.'},400);}finally{reader.releaseLock();}
  try{
    const base='/bug-reports';let path=base,body:unknown=undefined;
    if(input.action==='context')path+='/context';
    else if(input.action==='list')path+='?offset='+encodeURIComponent(String(input.offset||0));
    else if(input.action==='photo'){
      if(typeof input.id!=='string'||!/^[a-f0-9-]{36}$/i.test(input.id))return reply({error:'Choose a photo.'},400);
      path+='/photos/'+input.id;
    }else if(input.action==='detail'||input.action==='reply'){
      if(typeof input.id!=='string'||!/^[a-f0-9-]{36}$/i.test(input.id))return reply({error:'Choose a report.'},400);
      path+='/'+input.id;
      if(input.action==='reply')body={eventId:input.eventId,revision:input.revision,note:input.note,photos:input.photos};
    }else if(input.action==='submit'){
      body={id:input.id,description:input.description,area:input.area,studentIds:input.studentIds,occurredAt:input.occurredAt,includeSetup:input.includeSetup,inputKind:input.inputKind,browser:input.browser,photos:input.photos};
    }else if(input.action==='voice'){path+='/voice';body={consent:input.consent,data:input.data,mime:input.mime};}
    else return reply({error:'Choose a report action.'},400);
    return reply(await cloudApi(path,body===undefined?{}:{method:'POST',body:JSON.stringify(body)}));
  }catch(error){return reply({error:error instanceof CloudApiError?error.message:'The connection was interrupted. Your text is still here; retry when you are online.'},error instanceof CloudApiError?error.status:503);}
}
