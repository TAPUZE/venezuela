import { NextRequest, NextResponse } from "next/server";
import { getCase } from "@/lib/data";
import { updateCase } from "@/lib/cases/mutate";

// Attorney approves the drafted case: marks it ready_to_file.
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const existing = await getCase(id);
  if (!existing) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }
  const updated = await updateCase(id, { status: "ready_to_file" });
  return NextResponse.json({ ok: true, case: updated });
}
