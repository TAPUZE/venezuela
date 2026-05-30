"""Proof-of-concept: fill real fields on the live I-589 and save a filled PDF.

Demonstrates the chosen fill strategy for hybrid XFA USCIS forms:
  1. Read with pypdf (handles compressed object streams pdf-lib chokes on).
  2. Set NeedAppearances so viewers render the values.
  3. Drop the XFA packet so Acrobat falls back to the AcroForm layer we filled
     (otherwise a dynamic-XFA viewer may ignore AcroForm values).
  4. Write field values by fully-qualified name.

Usage: python scripts/fill_poc.py
Output: assets/output/i-589.FILLED-SAMPLE.pdf
"""
import os
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, BooleanObject

SRC = "assets/uscis-forms/i-589.pdf"
OUT_DIR = "assets/output"
OUT = os.path.join(OUT_DIR, "i-589.FILLED-SAMPLE.pdf")

# Fully-qualified field names taken from assets/field-maps/i-589.clean.txt
SAMPLE_VALUES = {
    "form1[0].#subform[0].PtAILine1_ANumber[0]": "A123456789",
    "form1[0].#subform[0].PtAILine4_LastName[0]": "GARCIA",
    "form1[0].#subform[0].PtAILine5_FirstName[0]": "MARIA",
    "form1[0].#subform[0].PtAILine6_MiddleName[0]": "ISABEL",
}


def find_matching(reader, wanted):
    """Map requested short keys to the actual qualified names present in the PDF."""
    fields = reader.get_fields() or {}
    present = set(fields.keys())
    resolved = {}
    for k, v in wanted.items():
        if k in present:
            resolved[k] = v
        else:
            # fall back: match by trailing leaf segment
            leaf = k.split(".")[-1]
            for name in present:
                if name.endswith(leaf):
                    resolved[name] = v
                    break
    return resolved


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    reader = PdfReader(SRC)
    writer = PdfWriter()
    writer.append(reader)

    # 1. NeedAppearances
    try:
        writer.set_need_appearances_writer(True)
    except Exception:
        root = writer._root_object
        if "/AcroForm" in root:
            root["/AcroForm"][NameObject("/NeedAppearances")] = BooleanObject(True)

    # 2. Drop XFA so AcroForm values are honored
    try:
        acro = writer._root_object["/AcroForm"]
        if "/XFA" in acro:
            del acro[NameObject("/XFA")]
            print("Dropped XFA packet.")
    except Exception as e:
        print(f"XFA drop skipped: {e}")

    # 3. Resolve + fill
    values = find_matching(reader, SAMPLE_VALUES)
    print(f"Filling {len(values)} fields:")
    for k in values:
        print("  -", k)
    for page in writer.pages:
        try:
            writer.update_page_form_field_values(page, values)
        except Exception:
            pass

    with open(OUT, "wb") as fh:
        writer.write(fh)
    print(f"\nWrote {OUT} ({os.path.getsize(OUT)} bytes)")


if __name__ == "__main__":
    main()
