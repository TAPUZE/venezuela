import { NextRequest, NextResponse } from "next/server";
import { handleInbound } from "@/lib/intake/orchestrator";

// In-app intake endpoint. The browser sends { sessionId, message } and receives the
// assistant reply. This replaces the former WhatsApp/Twilio webhook — intake now happens
// entirely inside the app.
export async function POST(req: NextRequest) {
  let payload: { sessionId?: string; message?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sessionId = (payload.sessionId ?? "").trim();
  const message = payload.message ?? "";
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const result = await handleInbound({ sessionId, body: message, mediaUrls: [] });
  return NextResponse.json(result);
}
