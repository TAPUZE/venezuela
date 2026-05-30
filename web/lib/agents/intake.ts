import { complete, completeJSON } from "@/lib/llm";
import { I589_CHECKLIST, localizedQuestion, nextQuestion } from "@/lib/agents/checklist";

// Intake Director: a Spanish-first WhatsApp conversational agent that walks a Venezuelan
// applicant through the I-589 intake checklist. It NEVER gives legal advice (UPL guardrail);
// it only gathers facts and hands off to an attorney for review.

const SYSTEM = `Eres "Amparo", un asistente de admisión que ayuda a recopilar información para una solicitud de asilo (Formulario I-589) en los Estados Unidos.

REGLAS CRÍTICAS:
- NO eres abogado y NO das asesoría legal. No interpretas la ley, no predices resultados, no recomiendas estrategias.
- Si te piden consejo legal, responde: "No puedo darle asesoría legal, pero un abogado supervisado revisará su caso."
- Habla en español claro y empático, en segunda persona ("usted").
- Haz UNA pregunta a la vez. No abrumes a la persona.
- No inventes datos. Si la persona no entiende, reformula con sencillez.
- Nunca solicites números de tarjeta de crédito ni datos de pago.`;

export interface IntakeTurnInput {
  language: string;
  collected: Record<string, unknown>;
  userMessage: string;
}

export interface IntakeTurnResult {
  reply: string;
  collected: Record<string, unknown>;
  complete: boolean;
}

/**
 * Processes one inbound message: extracts any answer for the field currently being asked,
 * updates the collected record, then asks the next required question (or signals completion).
 */
export async function runIntakeTurn(input: IntakeTurnInput): Promise<IntakeTurnResult> {
  const pending = nextQuestion(input.collected, input.language);

  // Extract a value for the pending field from the user's message.
  const collected = { ...input.collected };
  if (pending && input.userMessage.trim()) {
    const extracted = await completeJSON<{ value: string | null }>({
      system:
        "Extrae el valor solicitado del mensaje del usuario. Devuelve JSON {\"value\": string|null}. Si el mensaje no contiene una respuesta clara, value es null.",
      messages: [
        { role: "user", content: `Campo solicitado: ${pending.key}\nPregunta: ${localizedQuestion(pending, input.language)}\nMensaje del usuario: ${input.userMessage}` },
      ],
      maxTokens: 200,
    });
    if (extracted.value) collected[pending.key] = extracted.value;
  }

  const next = nextQuestion(collected, input.language);
  if (!next) {
    const en = input.language.startsWith("en");
    const closing = await complete({
      system: SYSTEM,
      messages: en
        ? [
            { role: "user", content: "I have finished answering all the questions." },
            { role: "assistant", content: "Write a brief message, in English, thanking the person and explaining that a supervised attorney will review the case." },
          ]
        : [
            { role: "user", content: "He terminado de responder todas las preguntas." },
            { role: "assistant", content: "Genera un mensaje breve agradeciendo y explicando que un abogado revisará el caso." },
          ],
      maxTokens: 200,
    });
    return { reply: closing, collected, complete: true };
  }

  return { reply: localizedQuestion(next, input.language), collected, complete: false };
}

export const I589_FIELDS = I589_CHECKLIST.map((c) => c.key);
