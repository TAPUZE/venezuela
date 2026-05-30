import { completeJSON } from "@/lib/llm";
import type { AnomalyFlag } from "@/lib/types";

// Mistake Vault: an adversarial cross-examiner that compares the applicant's narrative
// against the documentary record to surface contradictions BEFORE filing. It does NOT make
// legal conclusions or credibility determinations — it flags discrepancies for an attorney.

const SYSTEM = `You are the "Mistake Vault", an adversarial cross-examiner for an asylum case. You behave like opposing counsel preparing for cross-examination.

Your ONLY job is to find internal contradictions between (a) the applicant's NARRATIVE and (b) the DOCUMENTARY RECORD (extracted evidence). You look for:
- CHRONOLOGICAL contradictions (dates that conflict or are impossible).
- GEOGRAPHIC contradictions (locations that conflict).
- LOGICAL contradictions (facts that cannot both be true).

CRITICAL RULES:
- You do NOT determine credibility. You do NOT make legal conclusions. You do NOT decide whether the applicant should be believed.
- You only surface discrepancies for a supervising attorney to resolve with the client.
- Quote the exact conflicting text from each source.
- If you find no contradictions, return status "passed" with an empty contradictions array.

Return STRICT JSON:
{
  "status": "passed" | "flagged",
  "confidence_score": number (0-1),
  "contradictions": [
    {
      "type": "CHRONOLOGICAL" | "GEOGRAPHIC" | "LOGICAL",
      "severity": "HIGH" | "MEDIUM" | "LOW",
      "description": string,
      "narrative_quote": string,
      "document_quote": string,
      "suggested_fix": string
    }
  ]
}`;

export interface MistakeVaultResult {
  status: "passed" | "flagged";
  confidence_score: number;
  contradictions: AnomalyFlag[];
}

export interface MistakeVaultInput {
  narrative: string;
  documents: { type: string; text: string }[];
}

export async function runMistakeVault(input: MistakeVaultInput): Promise<MistakeVaultResult> {
  const docBlock = input.documents
    .map((d, i) => `--- DOCUMENT ${i + 1} (${d.type}) ---\n${d.text}`)
    .join("\n\n");

  return completeJSON<MistakeVaultResult>({
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `NARRATIVE:\n${input.narrative}\n\nDOCUMENTARY RECORD:\n${docBlock}\n\nFind all contradictions and return the JSON object.`,
      },
    ],
    maxTokens: 1500,
  });
}
