import { createServiceClient } from "@/lib/supabase/service";
import { runIntakeTurn } from "@/lib/agents/intake";
import { sendWhatsApp } from "@/lib/twilio/send";
import { DISCLAIMER } from "@/lib/constants";
import type { Client } from "@/lib/types";

// Orchestrates an inbound WhatsApp message: consent gate -> intake turn -> persist -> reply.
// Works in mock mode (no Supabase/Twilio/LLM) using in-memory state so the flow is testable.

const memoryClients = new Map<string, { client: Partial<Client>; collected: Record<string, unknown> }>();

function detectLanguage(_phone: string): string {
  return "es"; // Venezuelan applicants default to Spanish.
}

async function loadClient(phone: string) {
  const db = createServiceClient();
  if (!db) {
    const existing = memoryClients.get(phone);
    if (existing) return existing;
    const fresh: { client: Partial<Client>; collected: Record<string, unknown> } = {
      client: { phone_number: phone, language: "es", status: "intake" },
      collected: {},
    };
    memoryClients.set(phone, fresh);
    return fresh;
  }

  const { data: client } = await db.from("clients").select("*").eq("phone_number", phone).maybeSingle();
  if (!client) {
    const { data: created } = await db
      .from("clients")
      .insert({ phone_number: phone, language: detectLanguage(phone), status: "intake" })
      .select("*")
      .single();
    return { client: created as Client, collected: {} as Record<string, unknown> };
  }
  const { data: caseFile } = await db
    .from("case_files")
    .select("structured_data")
    .eq("client_id", (client as Client).id)
    .maybeSingle();
  return { client: client as Client, collected: (caseFile?.structured_data ?? {}) as Record<string, unknown> };
}

async function persist(phone: string, state: { client: Partial<Client>; collected: Record<string, unknown> }, consented: boolean) {
  const db = createServiceClient();
  if (!db) {
    memoryClients.set(phone, state);
    return;
  }
  if (consented && state.client.id) {
    await db.from("clients").update({ consented_at: new Date().toISOString(), status: "intake" }).eq("id", state.client.id);
  }
  if (state.client.id) {
    await db
      .from("case_files")
      .upsert(
        { client_id: state.client.id, form_type: "I-589", structured_data: state.collected, updated_at: new Date().toISOString() },
        { onConflict: "client_id" },
      );
  }
}

export interface InboundMessage {
  from: string; // "whatsapp:+1..."
  body: string;
  mediaUrls: string[];
}

export async function handleInbound(msg: InboundMessage): Promise<string> {
  const phone = msg.from.replace("whatsapp:", "");
  const state = await loadClient(phone);
  const language = state.client.language ?? "es";

  // Consent gate: must accept the UPL disclaimer before any intake happens.
  if (!state.client.consented_at && !memoryClients.get(phone)?.client.consented_at) {
    const text = msg.body.trim().toLowerCase();
    if (text === "si" || text === "sí" || text === "yes" || text === "acepto") {
      state.client.consented_at = new Date().toISOString();
      await persist(phone, state, true);
      const reply = "Gracias. Comencemos. " + (await firstQuestion(state, language));
      await sendWhatsApp(msg.from, reply);
      return reply;
    }
    const reply = `${DISCLAIMER.es}\n\nResponda SÍ para aceptar y continuar.`;
    await sendWhatsApp(msg.from, reply);
    return reply;
  }

  // Intake turn.
  const result = await runIntakeTurn({ language, collected: state.collected, userMessage: msg.body });
  state.collected = result.collected;
  await persist(phone, state, false);
  await sendWhatsApp(msg.from, result.reply);
  return result.reply;
}

async function firstQuestion(state: { collected: Record<string, unknown> }, language: string): Promise<string> {
  const result = await runIntakeTurn({ language, collected: state.collected, userMessage: "" });
  return result.reply;
}
