import { createServiceClient } from "@/lib/supabase/service";
import { complete } from "@/lib/llm";
import { runMistakeVault } from "@/lib/agents/mistakeVault";
import { I589_CHECKLIST } from "@/lib/agents/checklist";
import { upsertDraftCase, upsertDraftClient, setDraftEvidence } from "@/lib/store/draftStore";
import type { CaseFile, Client, Evidence, AnomalyFlag, CaseStatus } from "@/lib/types";

// Auto-draft pipeline.
// Once intake collects every required field, this assembles a COMPLETE draft case so the
// attorney never touches data entry — they only edit, approve, and send. It:
//   1. Synthesizes a polished narrative summary from the applicant's own words.
//   2. Runs the Mistake Vault against any documentary evidence to surface contradictions.
//   3. Computes which form fields are mapped and which still need attorney attention.
//   4. Persists a ready_for_attorney (or flagged_for_review) CaseFile + Evidence.

export interface AutoDraftInput {
  clientId: string;
  phone: string;
  language: string;
  collected: Record<string, unknown>;
  documents?: { type: string; text: string }[];
}

export interface AutoDraftResult {
  caseId: string;
  status: CaseStatus;
  narrativeSummary: string;
  flags: AnomalyFlag[];
  missingFields: string[];
}

function missingRequiredFields(collected: Record<string, unknown>): string[] {
  return I589_CHECKLIST.filter((item) => {
    if (!item.required) return false;
    const v = collected[item.key];
    return v === undefined || v === null || v === "";
  }).map((item) => item.key);
}

async function synthesizeNarrative(collected: Record<string, unknown>, language: string): Promise<string> {
  const raw = String(collected.narrative ?? "").trim();
  const basis = String(collected.persecution_basis ?? "").trim();
  if (!raw && !basis) return "";

  const en = language.startsWith("en");
  const system = en
    ? `You are a paralegal drafting a neutral, factual narrative summary for an asylum case (Form I-589). Summarize the applicant's account in clear English, third person, chronological where possible. Do NOT add facts, do NOT give legal opinions, do NOT assess credibility. 4-8 sentences.`
    : `Eres un asistente legal que redacta un resumen narrativo neutral y factual para un caso de asilo (Formulario I-589). Resume el relato del solicitante en español claro, en tercera persona, en orden cronológico cuando sea posible. NO agregues hechos, NO des opiniones legales, NO evalúes credibilidad. 4-8 oraciones.`;

  return complete({
    system,
    messages: [
      {
        role: "user",
        content: `Persecution basis: ${basis || "(not specified)"}\n\nApplicant's account:\n${raw || "(none provided)"}`,
      },
    ],
    maxTokens: 500,
  });
}

async function persistLive(
  db: NonNullable<ReturnType<typeof createServiceClient>>,
  input: AutoDraftInput,
  narrative: string,
  status: CaseStatus,
  flags: AnomalyFlag[],
): Promise<string> {
  await db.from("clients").update({ status }).eq("id", input.clientId);
  const { data: caseRow } = await db
    .from("case_files")
    .upsert(
      {
        client_id: input.clientId,
        form_type: "I-589",
        structured_data: input.collected,
        narrative_summary: narrative,
        last_entry_date: (input.collected.last_entry_date as string) ?? null,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id" },
    )
    .select("id")
    .single();
  const caseId = (caseRow?.id as string) ?? input.clientId;

  if (flags.length > 0) {
    await db.from("evidence").insert({
      case_id: caseId,
      document_type: "other",
      storage_path: "intake/auto-draft",
      raw_text: "Auto-draft contradiction scan.",
      anomaly_flags: { status: "flagged", confidence_score: 0.8, contradictions: flags },
    });
  }
  return caseId;
}

function persistMock(
  input: AutoDraftInput,
  narrative: string,
  status: CaseStatus,
  flags: AnomalyFlag[],
): string {
  const now = new Date().toISOString();
  const caseId = `draft-${input.clientId}`;

  const client: Client = {
    id: input.clientId,
    phone_number: input.phone,
    language: input.language,
    consented_at: now,
    assigned_attorney: null,
    status,
    created_at: now,
  };
  upsertDraftClient(client);

  const caseFile: CaseFile = {
    id: caseId,
    client_id: input.clientId,
    form_type: "I-589",
    structured_data: input.collected,
    narrative_summary: narrative,
    last_entry_date: (input.collected.last_entry_date as string) ?? null,
    status,
    generated_pdf_path: null,
    created_at: now,
    updated_at: now,
  };
  upsertDraftCase(caseFile);

  if (flags.length > 0) {
    const evidence: Evidence[] = [
      {
        id: `ev-${caseId}`,
        case_id: caseId,
        document_type: "other",
        storage_path: "intake/auto-draft",
        raw_text: "Auto-draft contradiction scan.",
        anomaly_flags: { status: "flagged", confidence_score: 0.8, contradictions: flags },
        created_at: now,
      },
    ];
    setDraftEvidence(caseId, evidence);
  } else {
    setDraftEvidence(caseId, []);
  }
  return caseId;
}

export async function runAutoDraft(input: AutoDraftInput): Promise<AutoDraftResult> {
  const missingFields = missingRequiredFields(input.collected);
  const narrative = await synthesizeNarrative(input.collected, input.language);

  // Contradiction scan against any documents the applicant supplied during intake.
  let flags: AnomalyFlag[] = [];
  const docs = input.documents ?? [];
  if (narrative && docs.length > 0) {
    try {
      const vault = await runMistakeVault({ narrative, documents: docs });
      flags = vault.contradictions ?? [];
    } catch {
      flags = [];
    }
  }

  const hasHigh = flags.some((f) => f.severity === "HIGH");
  const status: CaseStatus = hasHigh ? "flagged_for_review" : "ready_for_attorney";

  const db = createServiceClient();
  const caseId = db
    ? await persistLive(db, input, narrative, status, flags)
    : persistMock(input, narrative, status, flags);

  return { caseId, status, narrativeSummary: narrative, flags, missingFields };
}
