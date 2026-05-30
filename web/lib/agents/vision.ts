import { completeJSON } from "@/lib/llm";
import type { DocumentType } from "@/lib/types";

// Vision Extractor: OCRs/structures an uploaded evidence document (passport, police report,
// medical record, etc.) into text + key fields. In mock mode (no LLM key) it returns the
// supplied placeholder text so the pipeline still flows.

export interface VisionResult {
  document_type: DocumentType;
  raw_text: string;
  key_fields: Record<string, string>;
}

const SYSTEM = `Eres un extractor de documentos. Recibes el texto OCR de un documento de evidencia para un caso de asilo.
Devuelve JSON con: { "document_type": uno de [passport, police_report, medical, ticket, political_membership, other], "raw_text": string, "key_fields": objeto con fechas, nombres, lugares y números relevantes }.
No interpretes legalmente. Solo extrae hechos.`;

export async function extractDocument(ocrText: string): Promise<VisionResult> {
  return completeJSON<VisionResult>({
    system: SYSTEM,
    messages: [{ role: "user", content: ocrText }],
    maxTokens: 1200,
  });
}
