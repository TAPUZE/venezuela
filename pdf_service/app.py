"""Amparo PDF fill microservice (FastAPI + pypdf).

Fills hybrid-XFA USCIS forms (I-589, I-821, G-1450). The Next.js backend calls this.
Verified approach (see docs/05-pdf-fill-strategy.md):
  1. pypdf reads forms pdf-lib cannot.
  2. Drop /XFA so AcroForm values are honored.
  3. Set NeedAppearances.
  4. Fill by fully-qualified field name from the mapping JSON.

Run: uvicorn app:app --host 0.0.0.0 --port 8000
"""
import io
import json
import os
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from pypdf import PdfReader, PdfWriter
from pypdf.generic import BooleanObject, NameObject

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FORMS_DIR = os.path.join(ROOT, "assets", "uscis-forms")
MAPS_DIR = os.path.join(ROOT, "assets", "field-maps")

app = FastAPI(title="Amparo PDF Service")

FORM_FILES = {
    "I-589": "i-589.pdf",
    "I-821": "i-821.pdf",
    "G-1450": "g-1450.pdf",
}


def load_mapping(form_type: str) -> dict[str, Any]:
    key = form_type.lower().replace("-", "-")
    path = os.path.join(MAPS_DIR, f"{key}.mapping.json")
    if not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


class FillRequest(BaseModel):
    form_type: str                 # "I-589" | "I-821" | "G-1450"
    data: dict[str, Any]           # internal structured_data keyed by mapping keys


def build_field_values(mapping: dict[str, Any], data: dict[str, Any]) -> dict[str, str]:
    values: dict[str, str] = {}
    for key, field in mapping.get("text_fields", {}).items():
        if data.get(key) not in (None, ""):
            values[field] = str(data[key])
    for key, field in mapping.get("date_fields", {}).items():
        if data.get(key) not in (None, ""):
            values[field] = str(data[key])  # expect MM/DD/YYYY
    for key, spec in mapping.get("checkbox_fields", {}).items():
        if data.get(key):
            values[spec["field"]] = spec["on_value"]
    return values


@app.get("/health")
def health() -> dict[str, Any]:
    forms = {k: os.path.exists(os.path.join(FORMS_DIR, v)) for k, v in FORM_FILES.items()}
    return {"ok": True, "forms_present": forms}


@app.post("/fill")
def fill(req: FillRequest) -> StreamingResponse:
    if req.form_type not in FORM_FILES:
        raise HTTPException(400, f"Unknown form_type {req.form_type}")
    src = os.path.join(FORMS_DIR, FORM_FILES[req.form_type])
    if not os.path.exists(src):
        raise HTTPException(500, f"Form PDF not found: {src}")

    mapping = load_mapping(req.form_type)
    values = build_field_values(mapping, req.data)

    reader = PdfReader(src)
    writer = PdfWriter()
    writer.append(reader)

    # NeedAppearances so viewers render typed values
    try:
        writer.set_need_appearances_writer(True)
    except Exception:
        root = writer._root_object
        if "/AcroForm" in root:
            root["/AcroForm"][NameObject("/NeedAppearances")] = BooleanObject(True)

    # Drop XFA (hybrid forms ignore AcroForm otherwise)
    try:
        acro = writer._root_object["/AcroForm"]
        if "/XFA" in acro:
            del acro[NameObject("/XFA")]
    except Exception:
        pass

    # Resolve values by exact name or trailing-leaf fallback
    present = set((reader.get_fields() or {}).keys())
    resolved: dict[str, str] = {}
    for name, val in values.items():
        if name in present:
            resolved[name] = val
        else:
            leaf = name.split(".")[-1]
            for p in present:
                if p.endswith(leaf):
                    resolved[p] = val
                    break

    for page in writer.pages:
        try:
            writer.update_page_form_field_values(page, resolved)
        except Exception:
            pass

    buf = io.BytesIO()
    writer.write(buf)
    buf.seek(0)
    filename = f"{req.form_type}.filled.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
