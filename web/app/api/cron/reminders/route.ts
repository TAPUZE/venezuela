import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { listCases, listClients } from "@/lib/data";
import { computeDeadlines, dueSoon } from "@/lib/deadlines";

// Reminder cron: scans cases, computes due-soon deadlines, and returns in-app reminder records.
// Protect with CRON_SECRET (Authorization: Bearer <CRON_SECRET>). In mock mode it still runs.
export async function GET(req: NextRequest) {
  if (env.cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${env.cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const [cases, clients] = await Promise.all([listCases(), listClients()]);
  const clientById = new Map(clients.map((c) => [c.id, c]));

  let sent = 0;
  const actions: { caseId: string; clientId: string; kind: string; due: string }[] = [];

  for (const cf of cases) {
    const deadlines = computeDeadlines({ lastEntryDate: cf.last_entry_date });
    const soon = dueSoon(deadlines, 30);
    const client = clientById.get(cf.client_id);
    if (!client) continue;

    for (const d of soon) {
      sent++;
      actions.push({ caseId: cf.id, clientId: client.id, kind: d.kind, due: d.due_date });
    }
  }

  return NextResponse.json({ ok: true, sent, actions });
}
