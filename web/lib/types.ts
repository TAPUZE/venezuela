// Shared domain types mirroring supabase/schema.sql.

export type CaseStatus =
  | "intake"
  | "drafting"
  | "ready_for_attorney"
  | "evidence_review"
  | "flagged_for_review"
  | "approved"
  | "ready_to_file"
  | "sent"
  | "completed";

export type DocumentType =
  | "passport"
  | "police_report"
  | "medical"
  | "ticket"
  | "political_membership"
  | "other";

export interface Client {
  id: string;
  phone_number: string;
  language: string;
  consented_at: string | null;
  assigned_attorney: string | null;
  status: CaseStatus;
  created_at: string;
}

export interface CaseFile {
  id: string;
  client_id: string;
  form_type: "I-589" | "I-821";
  structured_data: Record<string, unknown>;
  narrative_summary: string | null;
  last_entry_date: string | null;
  status: CaseStatus;
  generated_pdf_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnomalyFlag {
  type: "CHRONOLOGICAL" | "GEOGRAPHIC" | "LOGICAL" | "PARSER_ERROR";
  severity: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  narrative_quote: string;
  document_quote: string;
  suggested_fix: string;
}

export interface Evidence {
  id: string;
  case_id: string;
  document_type: DocumentType;
  storage_path: string;
  raw_text: string | null;
  anomaly_flags: { status: "passed" | "flagged"; confidence_score: number; contradictions: AnomalyFlag[] } | null;
  created_at: string;
}

export interface Deadline {
  id: string;
  case_id: string;
  kind: "annual_asylum_fee" | "one_year_filing";
  due_date: string;
  notified_at: string | null;
  created_at: string;
}
