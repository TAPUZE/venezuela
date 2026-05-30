import { env } from "@/lib/env";

// Calls the Python pypdf FastAPI microservice (pdf_service/app.py) to fill a USCIS form.
// The Node side never parses XFA PDFs — pypdf is the only reliable filler (see docs/05).

export async function fillPdf(
  formType: "I-589" | "I-821" | "G-1450",
  data: Record<string, unknown>,
): Promise<ArrayBuffer> {
  const res = await fetch(`${env.pdfServiceUrl}/fill`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ form_type: formType, data }),
  });
  if (!res.ok) {
    throw new Error(`PDF service error ${res.status}: ${await res.text()}`);
  }
  return res.arrayBuffer();
}

export async function pdfServiceHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${env.pdfServiceUrl}/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}
