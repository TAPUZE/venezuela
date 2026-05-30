import { hasSupabaseService } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { MOCK_CASES, MOCK_CLIENTS, MOCK_EVIDENCE } from "@/lib/mock-data";
import type { CaseFile, Client, Evidence } from "@/lib/types";

// Read-side data access. Falls back to canned data when Supabase is not configured.

export async function listClients(): Promise<Client[]> {
  const db = createServiceClient();
  if (!db) return MOCK_CLIENTS;
  const { data, error } = await db.from("clients").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Client[];
}

export async function getCase(caseId: string): Promise<CaseFile | null> {
  const db = createServiceClient();
  if (!db) return MOCK_CASES.find((c) => c.id === caseId) ?? MOCK_CASES[0] ?? null;
  const { data, error } = await db.from("case_files").select("*").eq("id", caseId).maybeSingle();
  if (error) throw error;
  return (data as CaseFile) ?? null;
}

export async function listCases(): Promise<CaseFile[]> {
  const db = createServiceClient();
  if (!db) return MOCK_CASES;
  const { data, error } = await db.from("case_files").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return data as CaseFile[];
}

export async function listEvidenceForCase(caseId: string): Promise<Evidence[]> {
  const db = createServiceClient();
  if (!db) return MOCK_EVIDENCE.filter((e) => e.case_id === caseId);
  const { data, error } = await db.from("evidence").select("*").eq("case_id", caseId);
  if (error) throw error;
  return data as Evidence[];
}

export const isLiveData = hasSupabaseService;
