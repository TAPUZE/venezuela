# Source Documents — Real Forms, Samples & Court Filings

> Authoritative, publicly available sources to ground the build in real artifacts.
> Verify edition dates on download — USCIS rejects outdated editions.
> Last updated: 2026-05-29

---

## 1. Official USCIS forms (download the live PDFs)
These are the canonical stable download paths. Always cross-check the edition date printed
at the bottom of page 1 against the required edition before using.

| Form | Purpose | Required edition | Landing page | Direct PDF |
|---|---|---|---|---|
| **I-589** | Application for Asylum & Withholding of Removal (also CAT) | 01/20/25 | https://www.uscis.gov/i-589 | https://www.uscis.gov/sites/default/files/document/forms/i-589.pdf |
| **I-589 instructions** | Line-by-line filing instructions | — | https://www.uscis.gov/i-589 | https://www.uscis.gov/sites/default/files/document/forms/i-589instr.pdf |
| **I-821** | Application for Temporary Protected Status | 02/27/26 | https://www.uscis.gov/i-821 | https://www.uscis.gov/sites/default/files/document/forms/i-821.pdf |
| **I-821 instructions** | TPS filing instructions | — | https://www.uscis.gov/i-821 | https://www.uscis.gov/sites/default/files/document/forms/i-821instr.pdf |
| **I-765** | Application for Employment Authorization (EAD, c)(8) | — | https://www.uscis.gov/i-765 | https://www.uscis.gov/sites/default/files/document/forms/i-765.pdf |
| **G-1450** | Authorization for Credit Card Transactions | — | https://www.uscis.gov/g-1450 | https://www.uscis.gov/sites/default/files/document/forms/g-1450.pdf |
| **G-1650** | Authorization for ACH Transactions | — | https://www.uscis.gov/g-1650 | https://www.uscis.gov/sites/default/files/document/forms/g-1650.pdf |
| **G-28** | Notice of Entry of Appearance as Attorney/Accredited Rep | — | https://www.uscis.gov/g-28 | https://www.uscis.gov/sites/default/files/document/forms/g-28.pdf |

> NOTE: USCIS may serve these behind bot-protection that redirects automated fetches.
> Download manually in a browser, place the raw PDFs in `assets/uscis-forms/`, then run the
> field-extraction script against them.

---

## 2. Sample / completed forms & pro se guides (legal-aid sources)
Reputable nonprofits publish redacted sample filings, checklists, and practice advisories.
Use these for realistic field values, narrative structure, and packet assembly — NOT as legal advice.

- **ILRC** (Immigrant Legal Resource Center) — asylum & TPS practice manuals, sample forms: https://www.ilrc.org/
- **CLINIC** (Catholic Legal Immigration Network) — TPS & asylum toolkits: https://www.cliniclegal.org/
- **NIJC** (National Immigrant Justice Center) — pro se asylum guides (EN/ES): https://immigrantjustice.org/
- **ASAP** (Asylum Seeker Advocacy Project) — step-by-step I-589 help: https://www.asylumadvocacy.org/
- **AILA** (American Immigration Lawyers Association) — practice advisories, sample G-28/packets: https://www.aila.org/
- **Florence Project** — pro se asylum & detention materials (EN/ES): https://firrp.org/
- **CLINIC TPS Venezuela page** — designation dates, registration windows, sample I-821.
- **USCIS Policy Manual** — Vol. 12 (Asylum), TPS chapters: https://www.uscis.gov/policy-manual

---

## 3. Real court filings (for emergency-response templates & legal grounding)
Public dockets — use for understanding actual motion structure (stays of removal, habeas, AEA challenges).

- **CourtListener / RECAP** (free PACER mirror): https://www.courtlistener.com/ — search case names below.
- **PACER** (official federal dockets): https://pacer.uscourts.gov/
- **ACLU "Know Your Rights" + active case pages**: https://www.aclu.org/

Key cases referenced in the research (search by name to pull dockets/filings):
- **J.G.G. v. Trump** — Alien Enemies Act / CECOT removals; D.C. District + Supreme Court orders.
- **Litigation over Venezuela TPS termination (2025–2026)** — National TPS Alliance v. Noem line of cases.
- **Trump v. J.G.G.** — Supreme Court order requiring hearings before AEA removals.

> Pull the actual PDFs of: (a) Emergency Motion for Temporary Restraining Order / Stay of Removal,
> (b) Petition for Writ of Habeas Corpus, (c) Motion to Reopen. These become the structural
> templates for the platform's "one-button escalation" generator.

---

## 4. Statutory / regulatory primary sources
- **8 CFR 208** (asylum & withholding): https://www.ecfr.gov/current/title-8/chapter-I/subchapter-B/part-208
- **8 CFR 244 / 8 CFR 1244** (TPS): https://www.ecfr.gov/current/title-8
- **Federal Register** (TPS notices, fee rules, EAD rule): https://www.federalregister.gov/
- **EOIR (immigration court) practice manual**: https://www.justice.gov/eoir
- **DOJ Recognition & Accreditation program**: https://www.justice.gov/eoir/recognition-and-accreditation-program

---

## 5. State UPL / immigration-consultant statutes
- **Florida HB 915 / FL Stat. notario provisions** (eff. 2025-07-01).
- **California AB 1159 / Bus. & Prof. Code §22440 et seq.** ($100k bond, advance-fee ban).
- **Texas TDPSA** (sensitive data = immigration status, geolocation).
- **NY SHIELD Act** (30-day breach notification).

---

## How to use this file
1. Manually download the PDFs in §1 into `assets/uscis-forms/`.
2. Run `scripts/extract-form-fields.mjs` to dump real AcroForm field names → `assets/field-maps/`.
3. Pull 2–3 real filings from §3 to template the emergency-motion generator.
4. Keep edition dates and case statuses under review (see `00-BUILD-CHECKLIST.md` §4).
