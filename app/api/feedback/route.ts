import { put, list, copy, del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://bodeebooks.com",
  "https://www.bodeebooks.com",
  "https://fit.bodeebooks.com",
  "https://games.bodeebooks.com",
];

function corsHeaders(origin: string | null) {
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// ── OPTIONS (CORS preflight) ──────────────────────────────────────────────
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

// ── POST — Receive & store a new feedback submission ─────────────────────
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  try {
    const body = await req.json();
    const { source, type, name, email, message, submittedAt, appVersion, userAgent } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400, headers }
      );
    }

    const submission = {
      source: source || "Unknown",
      type: type || "General",
      name: name || "Anonymous",
      email: email || "",
      message: message.trim(),
      submittedAt: submittedAt || new Date().toISOString(),
      appVersion: appVersion || "unknown",
      userAgent: userAgent || "",
      receivedAt: new Date().toISOString(),
    };

    // Store as a uniquely-named blob
    const timestamp = Date.now();
    const blobName = `feedback/${timestamp}-${Math.random().toString(36).slice(2, 8)}.json`;

    await put(blobName, JSON.stringify(submission, null, 2), {
      access: "public",
      contentType: "application/json",
    });

    return NextResponse.json({ ok: true }, { status: 200, headers });
  } catch (err) {
    console.error("[feedback POST]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500, headers }
    );
  }
}

// ── GET — List all feedback (admin only) ─────────────────────────────────
export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  // Check admin token
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  const adminPassword = process.env.ADMIN_PASSWORD || "";

  if (!adminPassword || token !== adminPassword) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401, headers }
    );
  }

  try {
    const { blobs } = await list({ prefix: "feedback/" });

    // Fetch each blob's content
    const feedbackItems = await Promise.all(
      blobs
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
        .map(async (blob) => {
          try {
            const res = await fetch(blob.url);
            const data = await res.json();
            return { ...data, _blobUrl: blob.url, _blobName: blob.pathname };
          } catch {
            return null;
          }
        })
    );

    const items = feedbackItems.filter(Boolean);
    return NextResponse.json({ items, total: items.length }, { status: 200, headers });
  } catch (err) {
    console.error("[feedback GET]", err);
    return NextResponse.json(
      { error: "Failed to load feedback." },
      { status: 500, headers }
    );
  }
}

// ── PATCH — Archive feedback ─────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  // Check admin token
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  const adminPassword = process.env.ADMIN_PASSWORD || "";

  if (!adminPassword || token !== adminPassword) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401, headers }
    );
  }

  try {
    const body = await req.json();
    const { blobUrl, blobName, action } = body;

    if (!blobUrl || !blobName || action !== "archive") {
      return NextResponse.json(
        { error: "Invalid request. Missing blobUrl, blobName, or action." },
        { status: 400, headers }
      );
    }

    // Example blobName: "feedback/172348123-abcde.json"
    // Move to: "archived-feedback/172348123-abcde.json"
    const newPath = blobName.replace("feedback/", "archived-feedback/");

    // 1. Copy to new path
    await copy(blobUrl, newPath, { access: "public" });

    // 2. Delete original
    await del(blobUrl);

    return NextResponse.json({ ok: true }, { status: 200, headers });
  } catch (err) {
    console.error("[feedback PATCH]", err);
    return NextResponse.json(
      { error: "Internal server error during archive." },
      { status: 500, headers }
    );
  }
}
