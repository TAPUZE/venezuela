# Build Checklist & Gap Tracker

> Automated intake / legal-defense platform for Venezuelan asylum (I-589) & TPS (I-821) applicants.
> Last updated: 2026-05-29

## Status legend
- ✅ specified / done
- ⚠️ partially specified — runtime verification needed
- ❌ not started

---

## 1. Knowledge / research gaps
| Item | Status | Notes |
|---|---|---|
| 2026 legal & policy facts (TPS, asylum, AEA) | ✅ | `docs/01-legal-regulatory-blueprint.md` |
| UPL / state compliance (FL HB 915, CA AB 1159) | ✅ | Verbatim disclaimer captured |
| Privacy / security architecture | ✅ | `docs/02-technical-compliance-blueprint.md` |
| WhatsApp/Twilio template catalog | ✅ | 6 EN/ES Utility templates ready |
| I-589 priority field map | ✅ | |
| **Full I-589 / I-821 AcroForm field names** | ⚠️ | Must run extraction script on real PDFs (Section A). May be XFA. |
| Real USCIS source PDFs | ⏳ | See `docs/03-source-documents.md` |
| Sample filled forms + real court filings | ⏳ | See `docs/03-source-documents.md` |

---

## 2. Hard compliance constraints (must be baked into the build)
- [ ] **Non-bypassable disclaimer gate** (EN/ES) before any intake — verbatim FL HB 915 text.
- [ ] **No attorney-client relationship** until licensed attorney signs formal agreement.
- [ ] **Do NOT pass raw credit-card data through backend** — user hand-writes G-1450 (avoids full PCI-DSS scope). Wet signature required; G-1450 goes ON TOP of packet.
- [ ] **Sensitive-data opt-in** (immigration status, geolocation) required under TX TDPSA / CA CCPA.
- [ ] **Data minimization**: store only fields mapped to I-589/I-821. No IP, no precise geolocation, no conversational tangents.
- [ ] **Retention**: scrub raw PII 30–60 days post-filing; keep case status + thread IDs only.
- [ ] **CA AB 1159**: no advance fees for un-enacted reform; route fees to client trust account. Firewall Stripe.
- [ ] **Form edition auto-check**: I-589 = 01/20/25, I-821 = 02/27/26 (old rejected since 2026-04-01).
- [ ] **Annual Asylum Fee tracker**: $100/yr; 30-day silent termination of I-589 + EAD on non-payment.
- [ ] **One-year asylum deadline** calculator from last_entry_date.

---

## 3. Technical build sequence
- [ ] Scaffold Next.js (App Router) + Mantine + Framer Motion.
- [ ] Supabase: schema (clients, case_files, evidence), RLS, private Storage buckets, signed URLs.
- [ ] App-layer encryption (pgsodium TCE deprecated in Supabase UI).
- [ ] Field-extraction script (`pdf-lib` getFields / `pdftk dump_data_fields`) → real AcroForm names.
- [ ] Twilio WhatsApp webhook + HMAC-SHA1 signature validation (exact original URL).
- [ ] Register 6 Meta Utility templates (EN/ES).
- [ ] Intake Director agent, Vision Extractor agent, Mistake Vault agent.
- [ ] PDF mapping service (JSON → AcroForm), overflow → Supplement B, addendum headers.
- [ ] Attorney dashboard (Mantine AppShell, split-screen case view).

---

## 4. Open runtime unknowns (monitor)
- [ ] Literal checkbox/radio export values (`/Yes` `/Off` `/1`) — get via `pdftk dump_data_fields`.
- [ ] Whether I-589/I-821 PDFs are AcroForm vs XFA (pdf-lib XFA support limited).
- [ ] Whether 365-day EAD proposed rule was finalized (comment closed 2026-04-24).
- [ ] H.R. 1 Annual Asylum Fee — watch for injunction; build fee logic to be pausable.
- [ ] J.G.G. v. Trump (AEA) appeal status.
