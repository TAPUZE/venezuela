// I-589 intake checklist — the minimum structured fields the intake bot must collect
// before a case can move from "intake" to "evidence_review". Drives the next question.

export interface ChecklistItem {
  key: string;
  /** Bilingual prompt the bot asks to obtain this field. */
  question_es: string;
  question_en: string;
  required: boolean;
}

export const I589_CHECKLIST: ChecklistItem[] = [
  { key: "last_name", question_es: "¿Cuál es su apellido legal completo?", question_en: "What is your full legal last name?", required: true },
  { key: "first_name", question_es: "¿Cuál es su primer nombre?", question_en: "What is your first name?", required: true },
  { key: "date_of_birth", question_es: "¿Cuál es su fecha de nacimiento? (DD/MM/AAAA)", question_en: "What is your date of birth? (DD/MM/YYYY)", required: true },
  { key: "nationality", question_es: "¿Cuál es su país de nacionalidad?", question_en: "What is your country of nationality?", required: true },
  { key: "residence_city", question_es: "¿En qué ciudad de EE. UU. vive actualmente?", question_en: "What U.S. city do you currently live in?", required: true },
  { key: "residence_state", question_es: "¿En qué estado vive?", question_en: "What state do you live in?", required: true },
  { key: "last_entry_date", question_es: "¿En qué fecha entró a los Estados Unidos por última vez? (DD/MM/AAAA)", question_en: "When did you last enter the United States? (DD/MM/YYYY)", required: true },
  { key: "persecution_basis", question_es: "¿Por qué teme regresar a su país? (raza, religión, nacionalidad, opinión política o grupo social)", question_en: "Why do you fear returning to your country?", required: true },
  { key: "narrative", question_es: "Cuénteme con sus propias palabras qué le sucedió.", question_en: "Tell me in your own words what happened to you.", required: true },
];

/** Returns the next required field not yet present in collected data. */
export function nextQuestion(
  collected: Record<string, unknown>,
  language: string,
): ChecklistItem | null {
  for (const item of I589_CHECKLIST) {
    const v = collected[item.key];
    if (item.required && (v === undefined || v === null || v === "")) {
      return item;
    }
  }
  return null;
}

export function localizedQuestion(item: ChecklistItem, language: string): string {
  return language.startsWith("en") ? item.question_en : item.question_es;
}
