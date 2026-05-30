import { notFound } from "next/navigation";
import { getCase, listEvidenceForCase } from "@/lib/data";
import { computeDeadlines } from "@/lib/deadlines";
import CaseDetailClient from "@/components/CaseDetailClient";

export const dynamic = "force-dynamic";

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caseFile = await getCase(id);
  if (!caseFile) notFound();
  const evidence = await listEvidenceForCase(caseFile.id);

  const flags = evidence
    .flatMap((e) => e.anomaly_flags?.contradictions ?? [])
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  const deadlines = computeDeadlines({
    lastEntryDate: caseFile.last_entry_date,
    filedDate: caseFile.status === "sent" ? caseFile.updated_at : null,
  });

  return (
    <CaseDetailClient
      caseId={caseFile.id}
      formType={caseFile.form_type}
      status={caseFile.status}
      narrative={caseFile.narrative_summary ?? ""}
      structuredData={caseFile.structured_data}
      flags={flags}
      deadlines={deadlines}
    />
  );
}

function severityRank(s: string): number {
  return s === "HIGH" ? 3 : s === "MEDIUM" ? 2 : 1;
}
