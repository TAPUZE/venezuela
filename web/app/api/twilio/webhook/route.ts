import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "twilio";
import { hasTwilio } from "@/lib/env";
import { handleInbound } from "@/lib/intake/orchestrator";

/**
 * Twilio WhatsApp inbound webhook.
 *
 * SECURITY: Twilio signs requests with HMAC-SHA1 over the EXACT original URL + sorted params.
 * If a proxy/load balancer terminates SSL or rewrites the URL, validation fails (403).
 * Set TWILIO_WEBHOOK_URL to the exact public https URL Twilio is configured to call.
 *
 * In mock mode (no Twilio creds) signature validation is skipped so the flow can be tested
 * with a plain POST.
 */
export async function POST(req: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const webhookUrl = process.env.TWILIO_WEBHOOK_URL;

  // Twilio sends application/x-www-form-urlencoded.
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    params[k] = typeof v === "string" ? v : "";
  }

  if (hasTwilio && authToken && webhookUrl) {
    const signature = req.headers.get("x-twilio-signature") ?? "";
    const isValid = validateRequest(authToken, signature, webhookUrl, params);
    if (!isValid) {
      return new NextResponse("Invalid signature", { status: 403 });
    }
  }

  const from = params["From"]; // e.g. "whatsapp:+1..."
  const body = params["Body"] ?? "";
  const numMedia = Number(params["NumMedia"] ?? "0");

  const mediaUrls: string[] = [];
  for (let i = 0; i < numMedia; i++) {
    const url = params[`MediaUrl${i}`];
    if (url) mediaUrls.push(url);
  }

  try {
    await handleInbound({ from, body, mediaUrls });
  } catch (err) {
    console.error("[webhook] handleInbound failed", err);
  }

  // Empty TwiML 200 acknowledges receipt; the orchestrator sends replies via the REST API.
  return new NextResponse("<Response></Response>", {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
