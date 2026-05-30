// Extracts AcroForm field names, types, and checkbox/radio export values from USCIS PDFs.
// Usage: node scripts/extract-form-fields.mjs
// Output: assets/field-maps/<form>.fields.json  and  assets/field-maps/<form>.fields.txt
//
// NOTE: USCIS forms are sometimes XFA (Adobe LiveCycle). If getFields() returns 0 fields
// but the PDF is clearly fillable, the form is XFA and needs an XFA-aware parser.

import { PDFDocument, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList, PDFTextField } from 'pdf-lib';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

const FORMS_DIR = 'assets/uscis-forms';
const OUT_DIR = 'assets/field-maps';

function typeOf(field) {
  if (field instanceof PDFTextField) return 'text';
  if (field instanceof PDFCheckBox) return 'checkbox';
  if (field instanceof PDFRadioGroup) return 'radio';
  if (field instanceof PDFDropdown) return 'dropdown';
  if (field instanceof PDFOptionList) return 'optionlist';
  return field.constructor.name;
}

async function extract(pdfPath) {
  const bytes = readFileSync(pdfPath);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  // Detect XFA (dynamic forms) which pdf-lib cannot fully read.
  let isXFA = false;
  try {
    const acroForm = doc.catalog.lookup(doc.catalog.context.obj({}).constructor); // noop guard
  } catch { /* ignore */ }

  const form = doc.getForm();
  const fields = form.getFields();

  const records = fields.map((f) => {
    const rec = { name: f.getName(), type: typeOf(f) };
    if (f instanceof PDFCheckBox || f instanceof PDFRadioGroup) {
      try { rec.options = f.acroField.getExportValues?.() ?? null; } catch { rec.options = null; }
    }
    if (f instanceof PDFRadioGroup || f instanceof PDFDropdown || f instanceof PDFOptionList) {
      try { rec.choices = f.getOptions?.() ?? null; } catch { /* ignore */ }
    }
    return rec;
  });

  if (records.length === 0) {
    isXFA = true; // strong signal: fillable form but no AcroForm fields
  }

  return { isXFA, count: records.length, records };
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const pdfs = readdirSync(FORMS_DIR).filter((f) => extname(f).toLowerCase() === '.pdf');

  for (const pdf of pdfs) {
    const name = basename(pdf, '.pdf');
    try {
      const { isXFA, count, records } = await extract(join(FORMS_DIR, pdf));
      writeFileSync(join(OUT_DIR, `${name}.fields.json`), JSON.stringify({ form: name, isXFA, count, records }, null, 2));
      const txt = records.map((r) => {
        const opts = r.options ? `  options=[${r.options.join(', ')}]` : '';
        const ch = r.choices ? `  choices=[${r.choices.join(', ')}]` : '';
        return `${r.type.padEnd(10)} | ${r.name}${opts}${ch}`;
      }).join('\n');
      writeFileSync(join(OUT_DIR, `${name}.fields.txt`), txt);
      console.log(`${pdf.padEnd(18)} -> ${count} fields${isXFA ? '  [XFA? 0 AcroForm fields]' : ''}`);
    } catch (err) {
      console.log(`${pdf.padEnd(18)} -> ERROR: ${err.message}`);
    }
  }
}

main();
