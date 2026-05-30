# Amparo — Venezuelan Asylum / TPS Intake Platform

Automated, attorney-supervised intake and USCIS form-preparation platform for the
Venezuelan immigrant community (Forms I-589 asylum, I-821 TPS).

> Compliance-first. This tool prepares forms and organizes evidence. It does NOT give legal
> advice and forms no attorney-client relationship until a licensed attorney signs on.

## Repository layout
```
docs/                         Research + design (read these first)
  00-BUILD-CHECKLIST.md         Gap tracker + hard compliance constraints + build sequence
  01-legal-regulatory-blueprint.md   Research report #1 (legal/policy/UPL/forms)
  02-technical-compliance-blueprint.md Research report #2 (AcroForm/security/templates)
  03-source-documents.md        Real USCIS forms, sample filings, court dockets, statutes
  04-field-maps.md              Real extracted AcroForm field names (auto-generated)
  05-pdf-fill-strategy.md       VERIFIED hybrid-XFA fill recipe (pypdf)

assets/
  uscis-forms/                  Downloaded live USCIS PDFs (I-589, I-821, G-1450, ...)
  field-maps/                   Extracted field names (.acro.txt / .xfa.txt / .clean.txt)
  output/                       Filled sample PDFs (proof i-589.FILLED-SAMPLE.pdf)

scripts/
  extract_fields.py             pypdf AcroForm + XFA extractor (USE THIS)
  build_clean_map.py            Builds filtered field maps + docs/04-field-maps.md
  fill_poc.py                   VERIFIED end-to-end I-589 fill proof
  extract-form-fields.mjs       pdf-lib attempt (FAILS on these PDFs — kept for reference)
  extract-xfa.mjs               pdf-lib XFA attempt (FAILS — kept for reference)

web/                          Next.js (App Router) + Mantine + Framer Motion + Supabase
  app/page.tsx                  Disclaimer-gated landing (EN/ES, FL HB 915 verbatim)
  app/login/page.tsx            Attorney login (Supabase Auth; mock-mode bypass)
  app/dashboard/page.tsx        Attorney case queue (data-driven, magnetic hover)
  app/dashboard/cases/[id]/     Case detail split-screen (narrative + Mistake Vault | data)
  app/dashboard/deadlines/      Computed deadline board
  app/api/twilio/webhook/       WhatsApp inbound webhook -> intake orchestrator
  app/api/cases/[id]/generate-pdf/  Calls Python pypdf service to fill the form
  app/api/cron/reminders/       Deadline reminder cron (Bearer CRON_SECRET)
  middleware.ts                 Supabase session refresh + /dashboard guard
  lib/env.ts                    Central env + MOCK_MODE detection
  lib/data.ts                   Read layer (Supabase or canned mock data)
  lib/llm.ts                    Anthropic/OpenAI/mock chat abstraction
  lib/agents/                   Intake Director, Vision Extractor, Mistake Vault, checklist
  lib/intake/orchestrator.ts    Consent gate -> intake turn -> persist -> reply
  lib/twilio/                   WhatsApp send + 6 Utility templates (EN/ES)
  lib/deadlines.ts              One-year filing + $100 Annual Asylum Fee engine
  lib/pdf.ts                    Client for the pypdf fill microservice
  lib/constants.ts              Form editions, disclaimer text, deadline rules
  lib/supabase/                 Browser + server + service-role + middleware clients
  supabase/schema.sql           Tables + RLS (attorney-scoped) + audit log
  .env.example                  Required secrets

pdf_service/                   FastAPI + pypdf fill microservice (THE production filler)
  app.py                        POST /fill {form_type, data} -> filled PDF
```

## Key verified facts
- USCIS I-589 / I-821 are **hybrid XFA** PDFs with compressed object streams.
  **`pdf-lib` cannot read them; `pypdf` can.** Fill recipe verified — see `docs/05`.
- Real field names extracted: I-589 = 489, I-821 = 511.
- Filled-and-verified sample at `assets/output/i-589.FILLED-SAMPLE.pdf`.

## Run the whole platform
The platform runs fully in **MOCK MODE with no API keys** (canned data, mock LLM, logged
WhatsApp sends). Add keys to `web/.env.local` to go live — that is the only thing required.

1. Start the PDF fill microservice (needed for the "Generate PDF" button):
```powershell
cd pdf_service
python -m pip install -r requirements.txt
$env:PYTHONPATH=".."; python -m uvicorn app:app --host 127.0.0.1 --port 8000
```
2. Start the web app (new terminal):
```powershell
cd web
copy .env.example .env.local   # optional: fill in Supabase + Twilio + LLM keys to go live
npm run dev                     # http://localhost:3000
```
3. Try it: open `/login` -> Sign In (mock) -> `/dashboard` -> open a case -> Generate PDF.

### Going live (just add keys)
- `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — run `web/supabase/schema.sql` first.
- `ANTHROPIC_API_KEY` **or** `OPENAI_API_KEY` — enables the real agents.
- `TWILIO_ACCOUNT_SID` / `_AUTH_TOKEN` / `_WHATSAPP_FROM` / `_WEBHOOK_URL` — enables real WhatsApp.
- `CRON_SECRET` — protects the reminders route.
With none set, everything still runs in mock mode for testing.

## Re-extract / fill forms
```powershell
python scripts/extract_fields.py
python scripts/build_clean_map.py
python scripts/fill_poc.py
```

## Status
Built and verified (typecheck + production build pass; mock-mode smoke test passes):
- [x] pypdf fill microservice (FastAPI) — produces valid filled I-589 PDFs.
- [x] Intake / Vision / Mistake-Vault agents + LLM abstraction (mock fallback).
- [x] WhatsApp webhook -> consent gate -> intake orchestrator -> reply.
- [x] 6 Meta Utility templates (EN/ES) wired into the reminder cron.
- [x] Attorney login + middleware + data-driven dashboard + case split-screen.
- [x] Deadline engine (365-day filing + $100 AAF 30-day grace).

Still requires real-world action before production:
- [ ] Register the 6 Meta Utility templates in the WhatsApp Business account.
- [ ] Confirm remaining I-589 field names (DOB, last-entry, Part B/C checkboxes) in `assets/field-maps/i-589.mapping.json` (`unmapped_todo`).
- [ ] Media handling: download Twilio media -> private Supabase bucket -> purge Twilio URL.
- [ ] Monitor: 365-day EAD rule, H.R. 1 fee injunctions, J.G.G. v. Trump appeal.
