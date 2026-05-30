import { notFound } from "next/navigation";
import { getCase, listEvidenceForCase } from "@/lib/data";
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

  return (
    <CaseDetailClient
      caseId={caseFile.id}
      formType={caseFile.form_type}
      narrative={caseFile.narrative_summary ?? ""}
      structuredData={caseFile.structured_data}
      flags={flags}
    />
  );
}

function severityRank(s: string): number {
  return s === "HIGH" ? 3 : s === "MEDIUM" ? 2 : 1;
}
