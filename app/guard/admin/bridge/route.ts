import {operatorApi,OperatorError} from "../operator-api";
const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
export async function POST(request:Request){
  if(request.headers.get("origin")!==new URL(request.url).origin||request.headers.get("sec-fetch-site")==="cross-site")return Response.json({error:"Open the staff panel to make changes."},{status:403,headers});
  if(request.headers.get("content-type")?.split(";")[0]!=="application/json")return Response.json({error:"Use a JSON request."},{status:415,headers});
  try{
    const reader=request.body?.getReader();if(!reader)throw new OperatorError("Invalid request.",400);
    const chunks:Uint8Array[]=[];let size=0;
    try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>3*1024*1024){await reader.cancel();throw new OperatorError("Image or collection is too large.",413);}chunks.push(part.value);}}finally{reader.releaseLock();}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    const input=JSON.parse(new TextDecoder().decode(bytes));if(!input||typeof input!=="object"||Array.isArray(input))throw new OperatorError("Invalid request.",400);
    let result;
    if(input.action==="overview")result=await operatorApi();
    else if(input.action==="usage")result=await operatorApi(`/usage?days=${encodeURIComponent(String(input.days||7))}&family=${encodeURIComponent(String(input.family||"").slice(0,40))}`);
    else if(input.action==="reports")result=await operatorApi(`/diagnostics?reference=${encodeURIComponent(String(input.reference||"").slice(0,40))}`);
    else if(["catalog","save","publish","upload","preview"].includes(input.action))result=await operatorApi("/control",input);
    else throw new OperatorError("Choose a staff action.",400);
    return Response.json(result,{headers});
  }catch(error){return Response.json({error:error instanceof OperatorError?error.message:"The request could not be completed."},{status:error instanceof OperatorError?error.status:503,headers});}
}
