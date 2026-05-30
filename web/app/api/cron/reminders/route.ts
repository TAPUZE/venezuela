import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { listCases, listClients } from "@/lib/data";
import { computeDeadlines, dueSoon } from "@/lib/deadlines";
import { sendWhatsApp } from "@/lib/twilio/send";
import { renderTemplate } from "@/lib/twilio/templates";

// Reminder cron: scans cases, computes due-soon deadlines, sends WhatsApp template reminders.
// Protect with CRON_SECRET (Authorization: Bearer <CRON_SECRET>). In mock mode it still runs
// and logs the messages it would send.
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
  const actions: { caseId: string; kind: string; due: string }[] = [];

  for (const cf of cases) {
    const deadlines = computeDeadlines({ lastEntryDate: cf.last_entry_date });
    const soon = dueSoon(deadlines, 30);
    const client = clientById.get(cf.client_id);
    if (!client) continue;

    for (const d of soon) {
      const key = d.kind === "one_year_filing" ? "one_year_filing_anniversary" : "annual_asylum_fee_deadline";
      const body = renderTemplate(key, client.language, [d.due_date]);
      await sendWhatsApp(client.phone_number, body);
      sent++;
      actions.push({ caseId: cf.id, kind: d.kind, due: d.due_date });
    }
  }

  return NextResponse.json({ ok: true, sent, actions });
}
