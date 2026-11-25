import { approveComputer } from "../../actions";
import { privateHeaders, sameOrigin } from "../../install/server";

function failure(message: string, status: number) {
  return Response.json({ status: "error", message }, { status, headers: privateHeaders });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return failure("Open your parent dashboard to approve a computer.", 403);
  if (request.headers.get("content-type")?.split(";")[0] !== "text/plain") return failure("Enter the pairing code from the child app.", 415);
  const reader = request.body?.getReader();
  if (!reader) return failure("Enter the pairing code from the child app.", 400);
  try {
    const bytes: number[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (bytes.length + value.length > 80) {
        await reader.cancel();
        return failure("Enter the short pairing code shown in the child app.", 400);
      }
      bytes.push(...value);
    }
    const form = new FormData();
    form.set("userCode", new TextDecoder().decode(Uint8Array.from(bytes)));
    const result = await approveComputer({ status: "idle", message: "" }, form);
    return Response.json(result, { status: result.status === "success" ? 200 : 400, headers: privateHeaders });
  } catch {
    return failure("Could not confirm approval. Check the child app and try again.", 503);
  }
}
