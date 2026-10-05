// Public signed release metadata only; no account read or upstream dependency.
// Signature authority remains the pinned key in the child and native Guardian.
export function familyBetaRecoveryManifest(encoded: string | undefined, version: string | undefined) {
  if (!encoded || encoded.length > 45000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return null;
  try {
    const bytes = Buffer.from(encoded, "base64");
    if (bytes.length > 32768 || bytes.toString("base64") !== encoded) return null;
    const envelope = JSON.parse(bytes.toString("utf8"));
    if (envelope.schemaVersion !== 3 || Object.keys(envelope).sort().join(",") !== "payload,schemaVersion,signature" ||
        typeof envelope.payload !== "string" || typeof envelope.signature !== "string") return null;
    const body = JSON.parse(Buffer.from(envelope.payload, "base64").toString("utf8"));
    if (body.purpose !== "bodeeguard-cloud-child-test-update" || body.channel !== "beta" || body.version !== version ||
        body.product !== "com.vexonastudios.bodeeguard.cloudchild" || body.platform !== "win32" || body.arch !== "x64" ||
        !/^\d{1,5}\.\d{1,5}\.\d{1,5}$/.test(version || "")) return null;
    return bytes;
  } catch { return null; }
}
