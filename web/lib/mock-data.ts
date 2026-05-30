import type { CaseFile, Client, Evidence, AnomalyFlag } from "@/lib/types";

// Canned data so the dashboard and case-detail views render with no Supabase configured.

export const MOCK_CLIENTS: Client[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    phone_number: "+584120000001",
    language: "es",
    consented_at: "2025-01-15T14:02:00Z",
    assigned_attorney: "att-1",
    status: "flagged_for_review",
    created_at: "2025-01-15T14:00:00Z",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    phone_number: "+584140000002",
    language: "es",
    consented_at: "2025-02-01T10:30:00Z",
    assigned_attorney: "att-1",
    status: "evidence_review",
    created_at: "2025-02-01T10:25:00Z",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    phone_number: "+584160000003",
    language: "es",
    consented_at: "2025-02-10T09:00:00Z",
    assigned_attorney: "att-1",
    status: "ready_to_file",
    created_at: "2025-02-10T08:55:00Z",
  },
];

export const MOCK_CASES: CaseFile[] = [
  {
    id: "aaaa1111-0000-0000-0000-000000000001",
    client_id: "11111111-1111-1111-1111-111111111111",
    form_type: "I-589",
    structured_data: {
      first_name: "María",
      last_name: "González",
      residence_city: "Miami",
      residence_state: "FL",
    },
    narrative_summary:
      "Applicant fled Caracas after detention by SEBIN in March 2023 for participation in protests. Reports threats to family and inability to obtain police protection.",
    last_entry_date: "2024-08-20",
    status: "flagged_for_review",
    generated_pdf_path: null,
    created_at: "2025-01-15T14:00:00Z",
    updated_at: "2025-01-16T09:00:00Z",
  },
];

const FLAGS: AnomalyFlag[] = [
  {
    type: "CHRONOLOGICAL",
    severity: "HIGH",
    description:
      "Narrative states detention in March 2023, but the police report is dated January 2023 — the report predates the event it allegedly documents.",
    narrative_quote: "I was detained by SEBIN in March 2023.",
    document_quote: "Fecha del informe: 12 de enero de 2023",
    suggested_fix:
      "Confirm with the client which date is correct and reconcile the narrative with the documentary record before filing.",
  },
];

export const MOCK_EVIDENCE: Evidence[] = [
  {
    id: "eeee1111-0000-0000-0000-000000000001",
    case_id: "aaaa1111-0000-0000-0000-000000000001",
    document_type: "police_report",
    storage_path: "mock/police_report.jpg",
    raw_text: "Informe policial — Fecha del informe: 12 de enero de 2023 ...",
    anomaly_flags: { status: "flagged", confidence_score: 0.88, contradictions: FLAGS },
    created_at: "2025-01-16T08:30:00Z",
  },
];
