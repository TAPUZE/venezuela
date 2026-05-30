import { DEADLINE_RULES } from "@/lib/constants";

// Deadline engine. Computes the two hard immigration deadlines from a case's facts.
// - One-year asylum filing deadline: 365 days from last U.S. entry (8 U.S.C. 1158(a)(2)(B)).
// - Annual Asylum Fee ($100): due each year on the filing anniversary; 30-day grace.
//   Non-payment within grace silently terminates the I-589 + EAD (H.R. 1).

export interface ComputedDeadline {
  kind: "one_year_filing" | "annual_asylum_fee";
  due_date: string; // ISO date
  grace_until?: string;
  description: string;
}

function addDays(iso: string, days: number): Date {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function computeDeadlines(opts: {
  lastEntryDate?: string | null;
  filedDate?: string | null;
}): ComputedDeadline[] {
  const out: ComputedDeadline[] = [];

  if (opts.lastEntryDate) {
    const due = addDays(opts.lastEntryDate, DEADLINE_RULES.ONE_YEAR_ASYLUM_DAYS);
    out.push({
      kind: "one_year_filing",
      due_date: toISODate(due),
      description: "One-year deadline to file Form I-589 from last U.S. entry.",
    });
  }

  if (opts.filedDate) {
    const due = addDays(opts.filedDate, DEADLINE_RULES.ONE_YEAR_ASYLUM_DAYS);
    const grace = addDays(toISODate(due), DEADLINE_RULES.AAF_GRACE_DAYS);
    out.push({
      kind: "annual_asylum_fee",
      due_date: toISODate(due),
      grace_until: toISODate(grace),
      description: `Annual Asylum Fee of $${DEADLINE_RULES.ANNUAL_ASYLUM_FEE_USD} due. ${DEADLINE_RULES.AAF_GRACE_DAYS}-day grace; non-payment terminates the application.`,
    });
  }

  return out;
}

/** Returns deadlines due within `windowDays` and not yet notified. */
export function dueSoon(deadlines: ComputedDeadline[], windowDays = 30): ComputedDeadline[] {
  const now = Date.now();
  const horizon = now + windowDays * 86_400_000;
  return deadlines.filter((d) => {
    const t = new Date(d.due_date).getTime();
    return t >= now && t <= horizon;
  });
}
