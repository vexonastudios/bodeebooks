import { installerApi, installerLink, privateHeaders, sameOrigin, unavailable } from "../server";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({error:"Enter your code on the BodeeGuard install page."},{status:403,headers:privateHeaders});
  try {
    const reader = request.body?.getReader();
    let text = "", size = 0;
    if (reader) {
      const decoder = new TextDecoder();
      while (true) {
        const {value,done} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 1024) { await reader.cancel(); return Response.json({error:"Enter the short download code shown on the parent’s phone."},{status:400,headers:privateHeaders}); }
        text += decoder.decode(value,{stream:true});
      }
      text += decoder.decode();
    }
    let body;
    try { body = JSON.parse(text); } catch { return Response.json({error:"Enter your download code."},{status:400,headers:privateHeaders}); }
    // The service validates the code and rate-limits guesses before lookup.
    // Parent cookies/tokens are never forwarded by this public endpoint.
    const {result,error} = await installerApi("/v1/install/redeem",{code:body?.code});
    if (error) return error;
    return Response.json(installerLink(result.descriptor),{headers:privateHeaders});
  } catch { return unavailable(); }
}
