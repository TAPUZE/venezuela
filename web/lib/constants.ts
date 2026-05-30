// Centralized compliance constants. Keep these under review (see docs/00-BUILD-CHECKLIST.md §4).

/** Required USCIS form editions. Reject anything older. */
export const FORM_EDITIONS = {
  I_589: "01/20/25",
  I_821: "02/27/26",
} as const;

/**
 * Verbatim UPL disclaimer mandated by Florida HB 915 (safest national baseline).
 * Must be shown, non-bypassable, in EN + ES before any intake. No attorney-client
 * relationship forms until a licensed attorney signs a formal agreement.
 */
export const DISCLAIMER = {
  en: "I AM NOT AN ATTORNEY LICENSED TO PRACTICE LAW AND MAY NOT GIVE LEGAL ADVICE OR ACCEPT FEES FOR LEGAL ADVICE. I AM NOT ACCREDITED TO REPRESENT YOU IN IMMIGRATION MATTERS.",
  es: "NO SOY UN ABOGADO CON LICENCIA PARA EJERCER LA ABOGACÍA Y NO PUEDO DAR ASESORAMIENTO LEGAL NI ACEPTAR HONORARIOS POR ASESORAMIENTO LEGAL. NO ESTOY ACREDITADO PARA REPRESENTARLO EN ASUNTOS DE INMIGRACIÓN.",
} as const;

export const DISCLAIMER_CLARIFICATION = {
  en: "This automated tool only translates and maps the information you provide onto blank USCIS forms. No attorney-client relationship is formed until a licensed attorney officially agrees to represent you in writing.",
  es: "Esta herramienta automatizada solo traduce y coloca la información que usted proporciona en formularios de USCIS en blanco. No se forma ninguna relación abogado-cliente hasta que un abogado con licencia acuerde oficialmente representarlo por escrito.",
} as const;

/** Critical deadline rules driving WhatsApp reminders. */
export const DEADLINE_RULES = {
  ONE_YEAR_ASYLUM_DAYS: 365,
  ANNUAL_ASYLUM_FEE_USD: 100,
  AAF_GRACE_DAYS: 30, // non-payment within 30 days silently kills I-589 + EAD (H.R. 1)
} as const;

export type CaseStatus =
  | "intake"
  | "evidence_review"
  | "flagged_for_review"
  | "ready_to_file"
  | "completed";
