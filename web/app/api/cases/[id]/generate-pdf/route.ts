import { NextRequest, NextResponse } from "next/server";
import { getCase } from "@/lib/data";
import { fillPdf, pdfServiceHealthy } from "@/lib/pdf";

// Generates a filled USCIS PDF for a case by delegating to the Python pypdf microservice.
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const caseFile = await getCase(id);
  if (!caseFile) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  if (!(await pdfServiceHealthy())) {
    return NextResponse.json(
      { error: "PDF service unavailable. Start pdf_service (uvicorn app:app) and set PDF_SERVICE_URL." },
      { status: 503 },
    );
  }

  try {
    const buffer = await fillPdf(caseFile.form_type, caseFile.structured_data);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${caseFile.form_type}-${id.slice(0, 8)}.pdf"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "PDF generation failed" },
      { status: 500 },
    );
  }
}
