# PDF Fill Strategy (VERIFIED)

> Validated end-to-end on 2026-05-29 against the live USCIS I-589 (edition 01/20/25).
> Proof: `scripts/fill_poc.py` → `assets/output/i-589.FILLED-SAMPLE.pdf` (values confirmed).

## Key finding
USCIS I-589 / I-821 / G-1450 are **hybrid XFA (Adobe LiveCycle)** PDFs that also use
**compressed object streams**.

- ❌ `pdf-lib` (`getForm().getFields()`) returns **0 fields** and throws "invalid object ref" —
  it cannot parse these PDFs. Do NOT build the fill service on pdf-lib.
- ✅ `pypdf` (Python) reads them correctly: **489 fields (I-589), 511 (I-821)**, and fills them.

## The working recipe (pypdf)
1. `PdfReader(src)` → `PdfWriter()` → `writer.append(reader)`.
2. Set **NeedAppearances = true** so viewers render the typed values.
3. **Delete the `/XFA` packet** from `/AcroForm`. These are hybrid forms; if the dynamic XFA
   layer stays, Acrobat ignores the AcroForm values we wrote. Dropping XFA makes every viewer
   fall back to the AcroForm layer we control.
4. `writer.update_page_form_field_values(page, values)` using **fully-qualified field names**
   e.g. `form1[0].#subform[0].PtAILine4_LastName[0]`.
5. Write out.

## Field names
- Real names live in `assets/field-maps/<form>.clean.txt` (filtered) and `<form>.acro.txt` (raw).
- Human reference: `docs/04-field-maps.md`.
- Naming pattern is meaningful: `PtAILine1_ANumber`, `PtAILine4_LastName`, etc. — maps cleanly
  to Part/Line of the paper form.
- Ignore `PDF417BarCode*`, `#pageSet`, `CurrentPage`, `PageCount` (dynamic/structural).

## Checkbox / radio values
- Get literal export states per widget from `f.get('/_States_')` via pypdf, or
  `pdftk dump_data_fields` if installed. Do not guess `/Yes` vs `/1` vs `/On`.

## Overflow → Supplement B
- Monitor character counts vs. field capacity. On overflow: write `See Supplement B` in the
  primary field and route the full text to a generated Supplement B page with a header
  containing A-Number, full name, date, and signature block (Courier New, size 10, bold, black).

## Service implementation note
The production PDF-fill microservice should be **Python (pypdf)**, not Node/pdf-lib.
Options to integrate with the Next.js app:
- a small FastAPI/Flask service the Next.js API route calls, or
- a serverless Python function, or
- run pypdf as a child process from the Node backend.

## G-1450 (payment) — compliance reminder
Do NOT capture raw card numbers in the backend (full PCI-DSS scope). Have the user hand-write
the printed G-1450; it requires a wet signature and is placed ON TOP of the mailed packet.
