import { env, hasTwilio } from "@/lib/env";

// Twilio WhatsApp send helper. In mock mode (no Twilio creds) it logs and returns a fake SID
// so the rest of the pipeline runs without sending real messages.

export interface SendResult {
  sid: string;
  mock: boolean;
}

export async function sendWhatsApp(to: string, body: string): Promise<SendResult> {
  const toAddr = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  if (!hasTwilio || !env.twilioFrom) {
    console.log(`[twilio mock] -> ${toAddr}: ${body}`);
    return { sid: `MOCK${Date.now()}`, mock: true };
  }

  const auth = Buffer.from(`${env.twilioSid}:${env.twilioToken}`).toString("base64");
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.twilioSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        authorization: `Basic ${auth}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: toAddr, From: env.twilioFrom, Body: body }),
    },
  );
  if (!res.ok) throw new Error(`Twilio send error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { sid: data.sid, mock: false };
}
