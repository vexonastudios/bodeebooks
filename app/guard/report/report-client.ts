export class RequestError extends Error{constructor(message:string,public status=0){super(message);}}
export async function request<T>(body:Record<string,unknown>):Promise<T>{
  let response:Response;
  try{response=await fetch('/guard/report/api/',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});}
  catch{throw new RequestError('Connection interrupted. Your report has not been cleared. Please retry.');}
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new RequestError(result.error||'Unable to complete this request.',response.status);
  return result as T;
}
