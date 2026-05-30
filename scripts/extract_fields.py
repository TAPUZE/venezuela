"""Extract fillable-field info from USCIS PDFs (AcroForm + XFA).

USCIS forms (I-589, I-821, etc.) frequently use XFA (Adobe LiveCycle) and compressed
object streams that pdf-lib fails to parse. pypdf handles both.

Usage: python scripts/extract_fields.py
Outputs into assets/field-maps/:
  <form>.acro.txt   AcroForm fields: name | type | states(for checkboxes)
  <form>.xfa.xml    raw XFA template/datasets XML (if present)
  <form>.xfa.txt    field names parsed from the XFA template (SOM-ish paths)
"""
import os
import glob
import re

try:
    from pypdf import PdfReader
except ImportError:
    raise SystemExit("pypdf not installed. Run: python -m pip install pypdf")

FORMS_DIR = "assets/uscis-forms"
OUT_DIR = "assets/field-maps"
os.makedirs(OUT_DIR, exist_ok=True)


def dump_acroform(reader, base):
    fields = reader.get_fields()
    lines = []
    if fields:
        for name, f in fields.items():
            ftype = f.get("/FT", "")
            states = ""
            try:
                st = f.get("_States_")
                if st:
                    states = "  states=" + ",".join(str(s) for s in st)
            except Exception:
                pass
            lines.append(f"{str(ftype):8} | {name}{states}")
    with open(os.path.join(OUT_DIR, f"{base}.acro.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))
    return len(lines)


def get_xfa_xml(reader):
    try:
        xfa = reader.xfa
    except Exception:
        xfa = None
    if not xfa:
        # fall back to raw catalog lookup
        try:
            root = reader.trailer["/Root"]
            acro = root.get("/AcroForm")
            if acro is not None:
                acro = acro.get_object()
                raw = acro.get("/XFA")
                if raw is not None:
                    raw = raw.get_object()
                    parts = []
                    if isinstance(raw, list):
                        for el in raw:
                            obj = el.get_object()
                            data = getattr(obj, "get_data", lambda: b"")()
                            if data:
                                parts.append(data.decode("latin1", "ignore"))
                    else:
                        data = getattr(raw, "get_data", lambda: b"")()
                        if data:
                            parts.append(data.decode("latin1", "ignore"))
                    return "".join(parts) if parts else None
        except Exception:
            return None
        return None
    # pypdf returns a dict of packet-name -> bytes
    if isinstance(xfa, dict):
        return "".join(
            (v.decode("latin1", "ignore") if isinstance(v, (bytes, bytearray)) else str(v))
            for v in xfa.values()
        )
    return str(xfa)


def parse_xfa_field_paths(xml):
    paths, stack = [], []
    tag_re = re.compile(r"<(/?)(subform|field|exclGroup)\b([^>]*?)(/?)>", re.IGNORECASE)
    name_re = re.compile(r'\bname\s*=\s*"([^"]*)"', re.IGNORECASE)
    for m in tag_re.finditer(xml):
        closing, tag, attrs, selfclose = m.group(1), m.group(2).lower(), m.group(3), m.group(4)
        nm = name_re.search(attrs)
        name = nm.group(1) if nm else ""
        if closing:
            if stack:
                stack.pop()
            continue
        if tag == "field":
            path = ".".join([s for s in [*[p for p in stack], name] if s])
            if name:
                paths.append(path)
        else:
            if selfclose != "/":
                stack.append(name)
    return paths


def main():
    for pdf in sorted(glob.glob(os.path.join(FORMS_DIR, "*.pdf"))):
        base = os.path.splitext(os.path.basename(pdf))[0]
        try:
            reader = PdfReader(pdf)
            n_acro = dump_acroform(reader, base)
            xml = get_xfa_xml(reader)
            n_xfa = 0
            if xml:
                with open(os.path.join(OUT_DIR, f"{base}.xfa.xml"), "w", encoding="utf-8") as fh:
                    fh.write(xml)
                paths = parse_xfa_field_paths(xml)
                n_xfa = len(paths)
                with open(os.path.join(OUT_DIR, f"{base}.xfa.txt"), "w", encoding="utf-8") as fh:
                    fh.write("\n".join(paths))
            print(f"{base:16} acroform={n_acro:4}  xfa_fields={n_xfa}")
        except Exception as e:
            print(f"{base:16} ERROR: {e}")


if __name__ == "__main__":
    main()
