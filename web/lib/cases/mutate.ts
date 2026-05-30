import { createServiceClient } from "@/lib/supabase/service";
import { patchDraftCase } from "@/lib/store/draftStore";
import type { CaseFile } from "@/lib/types";

// Write-side helper for attorney actions (edit / approve / send).
// Routes to Supabase when configured, otherwise the in-memory draft store.

export async function updateCase(caseId: string, patch: Partial<CaseFile>): Promise<CaseFile | null> {
  const db = createServiceClient();
  if (!db) return patchDraftCase(caseId, patch);

  const { data, error } = await db
    .from("case_files")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", caseId)
    .select("*")
    .maybeSingle();
  if (error) throw error;

  const updated = (data as CaseFile) ?? null;
  if (updated && patch.status) {
    await db.from("clients").update({ status: patch.status }).eq("id", updated.client_id);
  }
  return updated;
}
