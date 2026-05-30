import { createServiceClient } from "@/lib/supabase/service";
import { runIntakeTurn } from "@/lib/agents/intake";
import { DISCLAIMER } from "@/lib/constants";
import type { Client } from "@/lib/types";

// Orchestrates an in-app intake message: consent gate -> intake turn -> persist -> reply.
// Transport-agnostic: the caller (the /api/intake route) supplies a per-browser sessionId and
// receives the assistant reply to render in the chat UI. Works in mock mode (no Supabase/LLM)
// using in-memory state so the flow is testable.

const memorySessions = new Map<string, { client: Partial<Client>; collected: Record<string, unknown> }>();

async function loadSession(sessionId: string) {
  const db = createServiceClient();
  if (!db) {
    const existing = memorySessions.get(sessionId);
    if (existing) return existing;
    const fresh: { client: Partial<Client>; collected: Record<string, unknown> } = {
      client: { phone_number: sessionId, language: "es", status: "intake" },
      collected: {},
    };
    memorySessions.set(sessionId, fresh);
    return fresh;
  }

  // The phone_number column is reused as a unique session identifier for in-app intake.
  const { data: client } = await db.from("clients").select("*").eq("phone_number", sessionId).maybeSingle();
  if (!client) {
    const { data: created } = await db
      .from("clients")
      .insert({ phone_number: sessionId, language: "es", status: "intake" })
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

async function persist(sessionId: string, state: { client: Partial<Client>; collected: Record<string, unknown> }, consented: boolean) {
  const db = createServiceClient();
  if (!db) {
    memorySessions.set(sessionId, state);
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
  sessionId: string;
  body: string;
  mediaUrls: string[];
}

export interface IntakeReply {
  reply: string;
  complete: boolean;
}

export async function handleInbound(msg: InboundMessage): Promise<IntakeReply> {
  const sessionId = msg.sessionId;
  const state = await loadSession(sessionId);
  const language = state.client.language ?? "es";

  // Consent gate: must accept the UPL disclaimer before any intake happens.
  if (!state.client.consented_at && !memorySessions.get(sessionId)?.client.consented_at) {
    const text = msg.body.trim().toLowerCase();
    if (text === "si" || text === "sí" || text === "yes" || text === "acepto") {
      state.client.consented_at = new Date().toISOString();
      await persist(sessionId, state, true);
      const reply = "Gracias. Comencemos. " + (await firstQuestion(state, language));
      return { reply, complete: false };
    }
    const reply = `${DISCLAIMER.es}\n\nResponda SÍ para aceptar y continuar.`;
    return { reply, complete: false };
  }

  // Intake turn.
  const result = await runIntakeTurn({ language, collected: state.collected, userMessage: msg.body });
  state.collected = result.collected;
  await persist(sessionId, state, false);
  return { reply: result.reply, complete: result.complete };
}

async function firstQuestion(state: { collected: Record<string, unknown> }, language: string): Promise<string> {
  const result = await runIntakeTurn({ language, collected: state.collected, userMessage: "" });
  return result.reply;
}
