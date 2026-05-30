// Meta/WhatsApp Utility message templates (EN/ES). Outside the 24-hour customer-care window,
// only pre-approved templates may be sent. These mirror the six approved templates in
// docs/02-technical-compliance-blueprint.md. {{1}} placeholders are filled at send time.

export type TemplateKey =
  | "consent_reopen"
  | "attorney_evidence_inquiry"
  | "missing_document_reminder"
  | "annual_asylum_fee_deadline"
  | "one_year_filing_anniversary"
  | "status_update";

interface Template {
  es: string;
  en: string;
}

export const TEMPLATES: Record<TemplateKey, Template> = {
  consent_reopen: {
    es: "Hola, soy Amparo. Necesitamos continuar con su solicitud. ¿Desea seguir? Responda SÍ para continuar o STOP para no recibir más mensajes.",
    en: "Hello, this is Amparo. We need to continue with your application. Reply YES to continue or STOP to opt out.",
  },
  attorney_evidence_inquiry: {
    es: "Su abogado tiene una pregunta sobre su caso: {{1}}. Por favor responda cuando pueda.",
    en: "Your attorney has a question about your case: {{1}}. Please reply when you can.",
  },
  missing_document_reminder: {
    es: "Falta un documento en su solicitud: {{1}}. Puede enviarlo como foto por este chat.",
    en: "A document is still missing from your application: {{1}}. You can send it as a photo in this chat.",
  },
  annual_asylum_fee_deadline: {
    es: "Recordatorio: su Cuota Anual de Asilo de $100 vence el {{1}}. Hay 30 días de gracia. Consulte con su abogado.",
    en: "Reminder: your $100 Annual Asylum Fee is due on {{1}}. There is a 30-day grace period. Please consult your attorney.",
  },
  one_year_filing_anniversary: {
    es: "Importante: la fecha límite de un año para presentar su solicitud de asilo se acerca ({{1}}). Hable con su abogado pronto.",
    en: "Important: the one-year deadline to file your asylum application is approaching ({{1}}). Please speak with your attorney soon.",
  },
  status_update: {
    es: "Actualización de su caso: {{1}}.",
    en: "Case update: {{1}}.",
  },
};

export function renderTemplate(key: TemplateKey, language: string, args: string[] = []): string {
  const t = TEMPLATES[key];
  let body = language.startsWith("en") ? t.en : t.es;
  args.forEach((arg, i) => {
    body = body.replace(`{{${i + 1}}}`, arg);
  });
  return body;
}
