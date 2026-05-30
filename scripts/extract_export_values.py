"""Dump checkbox/radio export ('on') values for the priority forms.

pdf-lib/pypdf need the exact literal state (e.g. '/1', '/Yes', '/On') to check a box.
This reads each widget's /AP /N appearance dictionary to recover the real export states.

Usage: python scripts/extract_export_values.py
Output: assets/field-maps/<form>.states.txt   (field | states)
"""
import os
import glob
from pypdf import PdfReader

FORMS_DIR = "assets/uscis-forms"
OUT_DIR = "assets/field-maps"
TARGETS = {"i-589", "i-821", "g-1450"}


def widget_states(annot):
    states = set()
    ap = annot.get("/AP")
    if not ap:
        return states
    ap = ap.get_object()
    n = ap.get("/N")
    if n is None:
        return states
    try:
        n = n.get_object()
        for k in n.keys():
            states.add(str(k))
    except Exception:
        pass
    return states


def main():
    for pdf in sorted(glob.glob(os.path.join(FORMS_DIR, "*.pdf"))):
        base = os.path.splitext(os.path.basename(pdf))[0]
        if base not in TARGETS:
            continue
        reader = PdfReader(pdf)
        rows = {}
        for page in reader.pages:
            annots = page.get("/Annots")
            if not annots:
                continue
            for ref in annots:
                a = ref.get_object()
                if a.get("/Subtype") != "/Widget":
                    continue
                ft = a.get("/FT")
                # walk up to parent for field type / name on kids
                name = a.get("/T")
                parent = a.get("/Parent")
                if parent is not None:
                    p = parent.get_object()
                    if ft is None:
                        ft = p.get("/FT")
                    if name is None:
                        name = p.get("/T")
                if str(ft) not in ("/Btn",):
                    continue
                st = widget_states(a) - {"/Off"}
                if not st:
                    continue
                key = str(name) if name else "(kid)"
                rows.setdefault(key, set()).update(st)
        out = os.path.join(OUT_DIR, f"{base}.states.txt")
        with open(out, "w", encoding="utf-8") as fh:
            for k in sorted(rows):
                fh.write(f"{k} | {','.join(sorted(rows[k]))}\n")
        print(f"{base:8} -> {len(rows)} button fields with states -> {out}")


if __name__ == "__main__":
    main()
