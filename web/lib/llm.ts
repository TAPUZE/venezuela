import { env, hasLLM } from "@/lib/env";

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  system: string;
  messages: LLMMessage[];
  /** When true, the caller expects a JSON object and we request/parse accordingly. */
  json?: boolean;
  maxTokens?: number;
}

/**
 * Provider-agnostic chat completion.
 * Uses Anthropic if ANTHROPIC_API_KEY is set, else OpenAI, else a deterministic mock.
 * The mock returns a benign, schema-shaped response so the whole pipeline is testable
 * without any keys.
 */
export async function complete(opts: LLMOptions): Promise<string> {
  if (!hasLLM) return mockResponse(opts);

  if (env.anthropicKey) return callAnthropic(opts);
  return callOpenAI(opts);
}

async function callAnthropic(opts: LLMOptions): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.anthropicKey!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-latest",
      max_tokens: opts.maxTokens ?? 1024,
      system: opts.system,
      messages: opts.messages,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

async function callOpenAI(opts: LLMOptions): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.openaiKey!}`,
    },
    body: JSON.stringify({
      model: env.openaiModel,
      max_completion_tokens: opts.maxTokens ?? 1024,
      response_format: opts.json ? { type: "json_object" } : undefined,
      messages: [{ role: "system", content: opts.system }, ...opts.messages],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function mockResponse(opts: LLMOptions): string {
  if (opts.json) {
    // Mistake Vault / structured agents expect JSON.
    if (opts.system.includes("cross-examiner") || opts.system.includes("contradiction")) {
      return JSON.stringify({
        status: "passed",
        confidence_score: 0.95,
        contradictions: [],
      });
    }
    return JSON.stringify({ mock: true, note: "LLM not configured — returning empty structured result." });
  }
  const last = opts.messages[opts.messages.length - 1]?.content ?? "";
  return `[MOCK ASISTENTE] Recibí: "${last.slice(0, 80)}". Configure ANTHROPIC_API_KEY u OPENAI_API_KEY para respuestas reales.`;
}

export async function completeJSON<T>(opts: Omit<LLMOptions, "json">): Promise<T> {
  const raw = await complete({ ...opts, json: true });
  try {
    return JSON.parse(raw) as T;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error(`LLM did not return valid JSON: ${raw.slice(0, 200)}`);
  }
}
