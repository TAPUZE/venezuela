import { listCases, listClients, listEvidenceForCase, isLiveData } from "@/lib/data";
import DashboardClient, { type QueueRow } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

function threatFor(status: string): QueueRow["threat"] {
  if (status === "flagged_for_review") return "HIGH";
  if (status === "evidence_review" || status === "intake") return "MEDIUM";
  return "LOW";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

export default async function DashboardPage() {
  const [cases, clients] = await Promise.all([listCases(), listClients()]);
  const clientById = new Map(clients.map((c) => [c.id, c]));

  const rows: QueueRow[] = await Promise.all(
    cases.map(async (cf) => {
      const client = clientById.get(cf.client_id);
      const evidence = await listEvidenceForCase(cf.id);
      const flagged = evidence.some((e) => e.anomaly_flags?.status === "flagged");
      const first = cf.structured_data?.first_name as string | undefined;
      const last = cf.structured_data?.last_name as string | undefined;
      const name = first && last ? `${first[0]}. ${last}` : (client?.phone_number ?? "Unknown");
      return {
        caseId: cf.id,
        name,
        form: cf.form_type,
        status: cf.status,
        threat: flagged ? ("HIGH" as const) : threatFor(cf.status),
        lastContact: relativeTime(cf.updated_at),
      };
    }),
  );

  return <DashboardClient rows={rows} mockMode={!isLiveData} />;
}
