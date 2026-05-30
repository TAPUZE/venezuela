import type { CaseFile, Client, Evidence } from "@/lib/types";

// In-memory drafted-case store. Bridges completed in-app intakes to the attorney
// dashboard when Supabase is NOT configured (mock mode). When Supabase IS configured,
// the auto-draft pipeline persists to the database instead and this store is unused.
//
// NOTE: This is per-server-process state (fine for a single Railway container / demo).
// Live deployments rely on Supabase for durable storage.

declare global {
  // eslint-disable-next-line no-var
  var __amparoDraftStore:
    | {
        clients: Map<string, Client>;
        cases: Map<string, CaseFile>;
        evidence: Map<string, Evidence[]>;
      }
    | undefined;
}

const store =
  globalThis.__amparoDraftStore ??
  (globalThis.__amparoDraftStore = {
    clients: new Map<string, Client>(),
    cases: new Map<string, CaseFile>(),
    evidence: new Map<string, Evidence[]>(),
  });

export function upsertDraftClient(client: Client): void {
  store.clients.set(client.id, client);
}

export function upsertDraftCase(caseFile: CaseFile): void {
  store.cases.set(caseFile.id, caseFile);
}

export function setDraftEvidence(caseId: string, evidence: Evidence[]): void {
  store.evidence.set(caseId, evidence);
}

export function listDraftClients(): Client[] {
  return [...store.clients.values()];
}

export function listDraftCases(): CaseFile[] {
  return [...store.cases.values()];
}

export function getDraftCase(caseId: string): CaseFile | null {
  return store.cases.get(caseId) ?? null;
}

export function listDraftEvidence(caseId: string): Evidence[] {
  return store.evidence.get(caseId) ?? [];
}

/** Patch a drafted case in place (attorney edits, approve, send). Returns the updated case. */
export function patchDraftCase(caseId: string, patch: Partial<CaseFile>): CaseFile | null {
  const existing = store.cases.get(caseId);
  if (!existing) return null;
  const updated: CaseFile = { ...existing, ...patch, updated_at: new Date().toISOString() };
  store.cases.set(caseId, updated);
  // Keep the client status in sync with the case status.
  const client = store.clients.get(existing.client_id);
  if (client && patch.status) {
    store.clients.set(client.id, { ...client, status: patch.status });
  }
  return updated;
}
