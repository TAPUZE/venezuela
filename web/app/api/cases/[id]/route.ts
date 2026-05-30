import { NextRequest, NextResponse } from "next/server";
import { getCase } from "@/lib/data";
import { updateCase } from "@/lib/cases/mutate";

// Attorney edits the drafted case (structured form data and/or narrative summary).
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const existing = await getCase(id);
  if (!existing) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  let body: { structured_data?: Record<string, unknown>; narrative_summary?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.structured_data && typeof body.structured_data === "object") {
    patch.structured_data = body.structured_data;
  }
  if (typeof body.narrative_summary === "string") {
    patch.narrative_summary = body.narrative_summary;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await updateCase(id, patch);
  return NextResponse.json({ ok: true, case: updated });
}
