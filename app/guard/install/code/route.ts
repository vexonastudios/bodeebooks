import { auth } from "@clerk/nextjs/server";
import { installerApi, installerLink, privateHeaders, sameOrigin, unavailable } from "../server";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({error:"Create a download code from your parent account."},{status:403,headers:privateHeaders});
  try {
    const session = await auth();
    const token = session.isAuthenticated && await session.getToken();
    if (!token) return Response.json({error:"Sign in to your parent account to create a download code."},{status:401,headers:privateHeaders});
    // No browser-supplied release, URL, student or account identifier is accepted.
    const {result,error} = await installerApi("/v1/account/installer-codes",{},token);
    if (error) return error;
    const link = installerLink(result.descriptor);
    if (!/^[2-9A-HJ-NP-Z]{5}-[2-9A-HJ-NP-Z]{5}$/.test(result.code) || !Number.isFinite(Date.parse(result.expiresAt))) return unavailable();
    return Response.json({code:result.code,expiresAt:result.expiresAt,version:link.version},{headers:privateHeaders});
  } catch { return unavailable(); }
}
