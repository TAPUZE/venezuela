import { NextRequest, NextResponse } from "next/server";
import { getCase } from "@/lib/data";
import { updateCase } from "@/lib/cases/mutate";

// Attorney files/sends the approved case: marks it sent.
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const existing = await getCase(id);
  if (!existing) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }
  if (existing.status !== "ready_to_file" && existing.status !== "approved") {
    return NextResponse.json(
      { error: "Case must be approved before it can be sent." },
      { status: 409 },
    );
  }
  const updated = await updateCase(id, { status: "sent" });
  return NextResponse.json({ ok: true, case: updated });
}
