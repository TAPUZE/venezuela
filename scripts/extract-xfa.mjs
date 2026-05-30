// Extracts the embedded XFA (Adobe LiveCycle) XML from USCIS PDFs and lists field names.
// USCIS I-589 / I-821 / G-1450 etc. are XFA forms — pdf-lib's AcroForm API returns 0 fields.
// XFA forms are filled by writing to the <xfa:datasets> packet, addressed by SOM expressions
// like form1[0].#subform[0].Pt1Line1a_FamilyName[0].
//
// Usage: node scripts/extract-xfa.mjs
// Output per form in assets/field-maps/:
//   <form>.xfa.xml         full concatenated XFA packets (template + datasets + config)
//   <form>.xfa.fields.txt  flat list of field SOM-ish names parsed from the template

import { PDFDocument, PDFName, PDFArray, PDFRawStream, PDFStream, decodePDFRawStream } from 'pdf-lib';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

const FORMS_DIR = 'assets/uscis-forms';
const OUT_DIR = 'assets/field-maps';

function decodeStream(stream) {
  try {
    const bytes = decodePDFRawStream(stream).decode();
    return Buffer.from(bytes).toString('latin1');
  } catch {
    try {
      return Buffer.from(stream.getContents()).toString('latin1');
    } catch {
      return '';
    }
  }
}

function getXFA(doc) {
  const acroFormRef = doc.catalog.get(PDFName.of('AcroForm'));
  const acroForm = doc.context.lookup(acroFormRef);
  if (!acroForm) return null;
  const xfaRef = acroForm.get(PDFName.of('XFA'));
  const xfa = doc.context.lookup(xfaRef);
  if (!xfa) return null;

  let xml = '';
  if (xfa instanceof PDFArray) {
    for (let i = 0; i < xfa.size(); i++) {
      const el = doc.context.lookup(xfa.get(i));
      if (el instanceof PDFStream || el instanceof PDFRawStream) {
        xml += decodeStream(el);
      }
    }
  } else if (xfa instanceof PDFStream || xfa instanceof PDFRawStream) {
    xml += decodeStream(xfa);
  }
  return xml || null;
}

// Parse the XFA <template> packet for nested subform/field names to build SOM-ish paths.
function parseFieldPaths(xml) {
  const paths = [];
  const stack = [];
  // Tokenize opening/closing subform & field tags with their name attribute.
  const tagRe = /<(\/?)(subform|field|exclGroup)\b([^>]*?)(\/?)>/gi;
  let m;
  while ((m = tagRe.exec(xml)) !== null) {
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    const attrs = m[3];
    const selfClose = m[4] === '/';
    const nameMatch = /\bname\s*=\s*"([^"]*)"/i.exec(attrs);
    const name = nameMatch ? nameMatch[1] : '';

    if (closing) {
      if (stack.length) stack.pop();
      continue;
    }
    if (tag === 'field') {
      const path = [...stack.map((s) => s.name), name].filter(Boolean).join('.');
      if (name) paths.push(path);
      // fields don't push onto subform stack
    } else {
      // subform / exclGroup
      if (!selfClose) stack.push({ tag, name });
    }
  }
  return paths;
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const pdfs = readdirSync(FORMS_DIR).filter((f) => extname(f).toLowerCase() === '.pdf');

  for (const pdf of pdfs) {
    const name = basename(pdf, '.pdf');
    try {
      const doc = await PDFDocument.load(readFileSync(join(FORMS_DIR, pdf)), { ignoreEncryption: true });
      const xml = getXFA(doc);
      if (!xml) {
        console.log(`${pdf.padEnd(16)} -> no XFA packet`);
        continue;
      }
      writeFileSync(join(OUT_DIR, `${name}.xfa.xml`), xml);
      const paths = parseFieldPaths(xml);
      writeFileSync(join(OUT_DIR, `${name}.xfa.fields.txt`), paths.join('\n'));
      console.log(`${pdf.padEnd(16)} -> XFA found, ${paths.length} field paths`);
    } catch (err) {
      console.log(`${pdf.padEnd(16)} -> ERROR: ${err.message}`);
    }
  }
}

main();
