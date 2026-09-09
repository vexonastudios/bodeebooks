import "server-only";
import { auth } from "@clerk/nextjs/server";

export class OperatorError extends Error { constructor(message:string,public status:number){super(message);} }
export async function operatorApi<T>(path="/control",body?:unknown):Promise<T>{
  const session=await auth();if(!session.isAuthenticated)throw new OperatorError("Sign in to continue.",401);
  const token=await session.getToken(),base=process.env.BODEEGUARD_COMMERCIAL_API_URL?.replace(/\/$/,"");
  if(!token||!base)throw new OperatorError("Staff services are unavailable.",503);
  const response=await fetch(`${base}/v1/operator${path}`,{method:body===undefined?"GET":"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(60000)});
  const data=await response.json();if(!response.ok)throw new OperatorError(response.status<500?data.error||"Staff access is required.":"Staff services could not be reached.",response.status);return data as T;
}
