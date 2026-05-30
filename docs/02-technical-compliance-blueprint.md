**Executive Summary**

The deployment of an automated intake and PDF-generation pipeline for Venezuelan asylum and TPS seekers involves navigating strict data formatting protocols, complex state privacy frameworks, and stringent communication API rules. As of May 29, 2026, the technical architecture must be specifically calibrated to handle shifting Meta/WhatsApp pricing rules, the deprecation of Supabase's UI for column-level encryption, and strict USCIS optical character recognition (OCR) form standards.

**Top 5 Implementation Risks:**

1. **Supabase `pgsodium` TCE Deprecation:** Supabase has deprecated its dashboard UI for Transparent Column Encryption (TCE) due to unrecoverable errors involving Row Level Security (RLS) views and trigger execution orders. Relying on TCE requires advanced SQL-only implementation, making application-layer encryption or standard at-rest encryption safer for rapid deployment.
2. **Twilio Webhook Signature Failures via SSL Termination:** Twilio validates inbound WhatsApp messages using an HMAC-SHA1 signature. If the application's proxy or load balancer terminates SSL or alters URL encoding (e.g., decoding `%20` spaces), the signature validation will fail, blocking inbound intake.
3. **PCI-DSS Scope of Form G-1450:** USCIS now mandates electronic payments for paper filings via Form G-1450. Programmatically capturing raw credit card numbers and CVVs to map onto the G-1450 PDF pulls the entire application into full PCI-DSS compliance scope, and USCIS requires a wet (non-digital) signature on the form.
4. **"Sensitive Data" Classifications (TDPSA & CCPA):** The Texas Data Privacy and Security Act (TDPSA) and California laws explicitly classify "citizenship or immigration status" and "precise geolocation" as Sensitive Data, requiring explicit, affirmative opt-in consent before processing.
5. **AcroForm Extraction Complexity:** USCIS PDFs often use Adobe LiveCycle Designer, resulting in heavily nested AcroForm field names (e.g., `form1.#subform...`). Checkbox states require exact literal export values (e.g., "Yes", "On", "1") which `pdf-lib` cannot easily guess without initial programmatic extraction.

---

### SECTION A — Complete USCIS AcroForm Field Enumeration (for `pdf-lib`)

**A.1. Programmatic Extraction of AcroForm Field Names**
Because USCIS form field identifiers frequently change across editions and are often generated via Adobe Experience Manager / LiveCycle Designer, the internal AcroForm names feature complex, nested hierarchies (e.g., `form1.#subform.#area.Line1_AlienNumber`).

To reliably extract the literal identifiers for the current I-589 (01/20/25) and I-821 (02/27/26) editions, you must run an extraction script using `pdf-lib` in a Node.js environment.

**Step-by-Step Extraction Script (`pdf-lib`):**

```javascript
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function extractFormFields(pdfPath) {
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  fields.forEach(field => {
    const type = field.constructor.name;
    const name = field.getName();
    console.log(`${type} | ${name}`);
  });
}
extractFormFields('./I-589-01-20-25.pdf');

```

*Alternative method:* You can use the `pdftk` command-line tool via `pdftk form.pdf dump_data_fields`, which dumps the exact field names, types, and expected checkbox/radio export values.

**A.2. Section-by-Section Field Table**

*Note: The database field mapping below outlines the expected USCIS form structure. Internal AcroForm names must be mapped using the extraction script above.*

Form I-589 (Edition 01/20/25) 

| Form Part / Page | Question / Purpose | Field Type | Expected Format / Rule |
| --- | --- | --- | --- |
| **Page 1 / Header** | Withholding of removal (CAT) | Checkbox | Checked explicitly if pursuing CAT.

 |
| **Part A.I** | Q1. A-Number | Text | 8-9 digits prefixed with 'A', or 'N/A'.

 |
| **Part A.I** | Q3. USCIS Online Account | Text | 12 digits or 'N/A'.

 |
| **Part A.I** | Q4-7. Complete Name | Text | Must not use 'N/A' for first name to avoid 'FNU' identity.

 |
| **Part A.I** | Q14-17. Entry Data | Text / Date | Last entry place, date (`mm/dd/yyyy`), I-94 status.

 |
| **Part A.II** | Spouse & Children | Mixed | Iterative subforms. Checkboxes for "included in application".

 |
| **Part B** | Application Basis | Checkboxes | Multi-select for Race, Religion, Nationality, Political Opinion, etc..

 |
| **Part C** | Exceptions / 1-Year Rule | Checkboxes/Text | Yes/No. If Yes, requires overflow routing to Supplement B.

 |
| **Supplement A** | Additional Children | Text | Continuation of Part A.II. |
| **Supplement B** | Narrative Addendum | Text | General overflow sheet.

 |

Form I-821 (Edition 02/27/26) 

| Form Part / Page | Question / Purpose | Field Type | Expected Format / Rule |
| --- | --- | --- | --- |
| **Part 1** | Type of Application | Radio | Initial vs. Re-registration. |
| **Part 2** | Q15. Country of Nationality | Text | e.g., Venezuela. |
| **Part 2** | Q19-24. U.S. Entry Info | Text / Date | Date (`mm/dd/yyyy`), I-94, Port of Entry.

 |
| **Part 2** | Q32-33. Immigration Proceedings | Checkbox | Yes/No; if Yes, indicate EOIR/BIA status.

 |
| **Part 3** | Biographic / Marital | Text | Spouse details, dates of marriage. |

**A.3. Checkbox/Radio Export Values**
To programmatically check a box using `pdf-lib` (`form.getCheckBox('name').check()`), the library relies on the underlying PDF export values. Checkboxes and radio buttons in USCIS forms commonly use `Yes`, `No`, `1`, `2`, or `Off` as export values. You must run `pdftk dump_data_fields` to find the exact literal string expected for each specific widget.

**A.4. Form G-1450 (Credit Card Authorization) Structure**
USCIS requires electronic payments for paper forms. Form G-1450 captures: `Given Name`, `Family Name`, `Billing Address`, `Credit Card Type` (Visa, MasterCard, American Express, Discover), `Credit Card Number`, `Expiration Date (mm/yyyy)`, and `Authorized Payment Amount`.

* **Filing Rule:** The G-1450 must be printed and placed **ON TOP** of the application packet.
* **Signature Constraint:** USCIS explicitly states they cannot process the payment without an authorized wet signature. A digital scan of a wet signature may be permitted, but typed signatures are rejected.

**A.5. Continuation/Addendum and Formatting Conventions**

* **Supplement B Headers:** Every supplemental sheet (Form I-589 Supplement B) *must* include the applicant's A-Number, full name (exactly as it appears in Part A.I), date, and signature.
* **Formatting:** Typed responses must utilize Courier New font, size 10, bold, in black ink.
* **Overflow Logic:** If a narrative exceeds the primary field box, the system must append `See Supplement B` (or asterisk it) and route the text to the supplement. Do not leave priority fields completely blank; if inapplicable, use `N/A` (unless it is a name field).



---

### SECTION B — Data Privacy & Security Architecture

**B.1. Legal and Regulatory Frameworks**

* **Texas (TDPSA):** Classifies "citizenship or immigration status" and "precise geolocation" explicitly as "Sensitive Data," mandating affirmative opt-in consent before processing.
* **California (CCPA/CPRA):** Protects the personal information of California residents and similarly categorizes "citizenship or immigration status" as sensitive personal information.
* **New York (SHIELD Act):** Mandates strict data security safeguards and imposes a 30-day clock to notify authorities and users in the event of a data breach.
* **Florida (FDBR):** While relevant, the FDBR primarily targets entities with over $1 billion in global gross revenue. However, the state-level "notario" UPL laws (FL HB 915) require strict front-facing compliance and disclosures.

**B.2. Data-Minimization and Retention Policy**

* **Necessary Data:** Retain only the biographic data, timelines, and narratives explicitly mapped to Forms I-589 and I-821.
* **Data to Discard/Avoid:** Do not store IP addresses, precise geolocation metadata, or unnecessary device metadata. Do not log conversational tangents outside the scope of the forms.
* **Retention Timeline:** Once an attorney reviews the packet, prints it, and secures a wet signature, the raw PII stored in the database should be scrubbed or aggressively anonymized within a predefined window (e.g., 30–60 days post-filing), retaining only the case status and Twilio communication thread identifiers.

**B.3. Supabase/PostgreSQL Security Blueprint**

* **Row Level Security (RLS) for Attorney Dashboard:** Enable RLS on the `profiles` and `cases` tables. Create a Postgres function (e.g., `requesting_user_id()`) that parses the Supabase JWT claims to ensure an attorney can only query rows explicitly assigned to their `user_id`.
* **Encryption at Rest vs. Column Encryption:** Supabase projects are encrypted at rest by default, which satisfies SOC2 and basic compliance. Supabase has removed the dashboard UI for `pgsodium` Transparent Column Encryption (TCE) due to a high misconfiguration risk (e.g., conflicts with trigger execution orders and RLS views). If column-level encryption is strictly required, it must be implemented purely via SQL or handled at the application layer before reaching the database.
* **Storage Access:** Uploaded evidence (passports, I-94s) must be kept in private Supabase Storage buckets, accessed exclusively via short-lived Signed URLs generated by the authenticated attorney's session.

**B.4. Subpoena Exposure and Risk Reduction**
Government agencies (like ICE) utilize administrative subpoenas to compel data production. The most lawful and effective architectural defense is strict data minimization and short retention policies. The platform cannot produce data it no longer holds. Application-layer encryption (where the platform does not hold the decryption keys, only the attorney/client does) further shields the underlying data from compulsory disclosure.

**B.5. Payment Stack (PCI-DSS and Advance-Fee Compliance)**

* **CA AB 1159 Firewall:** Under California law, attorneys/consultants cannot accept advance fees for un-enacted immigration reform, and standard fees must often be placed in Client Trust Accounts. Stripe integrations must route funds appropriately to comply.
* **G-1450 PCI Scope:** Generating the Form G-1450 dynamically requires the platform to collect and map raw Credit Card Numbers and CVVs. This pulls the application heavily into PCI-DSS compliance scope. It is safer to prompt the user to hand-write their payment details on a printed G-1450 rather than passing raw CC data through the app's Supabase backend.

**B.6. Incident Response Checklist (NY SHIELD Aligned)**

1. **Contain & Isolate:** Immediately revoke compromised JWTs, rotate Supabase database passwords, and refresh Twilio API keys.
2. **Assess Scope:** Audit Supabase logs to determine if tables containing "Sensitive Data" (immigration status) were accessed.
3. **Notify (30-Day Clock):** Under NY SHIELD, notify the state Attorney General and affected users within 30 days of discovery.
4. **Remediate & Patch:** Close the exploited vulnerability and implement secondary safeguards.

---

### SECTION C — WhatsApp / Twilio Messaging-Template Catalog

**C.1. WhatsApp Business Platform Rules (Meta/Twilio)**
Meta strictly governs outbound communications through a 24-hour customer service window, which opens whenever a user sends a message.

* **Inside the 24-Hour Window:** The bot can send free-form messages. As of July 1, 2025, sending Meta-approved **Utility** templates during this open window incurs no Meta fees.
* **Outside the 24-Hour Window:** The business can *only* initiate contact using pre-approved templates.


* **Template Categories:** **Utility** (updates regarding an ongoing transaction/case), **Authentication** (OTPs), and **Marketing** (promotions). Mixing any marketing language into a utility template automatically reclassifies it (and prices it) as Marketing.
* **Opt-in:** Explicit opt-in is legally required before initiating template messaging.

**C.2. Pre-Approved Utility Template Catalog (EN/ES)**

**1. Consent/Disclaimer Re-open (Category: Utility)**

* *Why Utility:* Confirms the continuation of the agreed-upon legal intake process.
* *EN:* "Hello {{1}}. We are ready to continue your intake. Please reply 'YES' to acknowledge you understand we are not acting as your attorney until a formal agreement is signed."
* *ES:* "Hola {{1}}. Estamos listos para continuar con su solicitud. Por favor, responda 'SÍ' para confirmar que entiende que no actuamos como su abogado hasta que se firme un acuerdo formal."

**2. Attorney Evidence Inquiry (Category: Utility)**

* *Why Utility:* Pertains directly to an ongoing case review.
* *EN:* "Your legal representative, {{1}}, has a question regarding the document you uploaded on {{2}}. Please reply to this message to securely connect with them."
* *ES:* "Su representante legal, {{1}}, tiene una pregunta sobre el documento que subió el {{2}}. Responda a este mensaje para conectarse de forma segura."

**3. Missing Document Reminder (Category: Utility)**

* *Why Utility:* Reminds the user to complete a necessary step in the transaction.
* *EN:* "Important: We are still missing your {{1}} to complete your Form {{2}}. Please upload a clear photo of this document."
* *ES:* "Importante: Aún nos falta su {{1}} para completar su Formulario {{2}}. Por favor, envíe una foto clara de este documento."

**4. Annual Asylum Fee Deadline (Category: Utility - *Critical*)**

* *Why Utility:* Essential billing/administrative alert to prevent catastrophic EAD termination under the new H.R. 1 rules.
* *EN:* "URGENT: Your $100 Annual Asylum Fee to USCIS is due by {{1}}. Failure to pay within 30 days of notice will result in the immediate rejection of your application and termination of your work permit."
* *ES:* "URGENTE: Su Cuota Anual de Asilo de $100 a USCIS vence el {{1}}. Si no paga dentro de los 30 días posteriores al aviso, su solicitud será rechazada y su permiso de trabajo será cancelado de inmediato."

**5. One-Year Asylum Filing Anniversary (Category: Utility)**

* *Why Utility:* Case-specific compliance deadline reminder.
* *EN:* "Alert: You entered the U.S. on {{1}}. Your one-year deadline to file Form I-589 is approaching on {{2}}. Please complete your intake to avoid losing asylum eligibility."
* *ES:* "Alerta: Usted ingresó a EE. UU. el {{1}}. Su fecha límite de un año para presentar el Formulario I-589 se acerca el {{2}}. Complete su cuestionario para evitar perder su elegibilidad para asilo."

**6. Status Update (Category: Utility)**

* *Why Utility:* Updates the user on their application status.
* *EN:* "Your Form {{1}} has been successfully reviewed by {{2}} and is ready for your signature."
* *ES:* "Su Formulario {{1}} ha sido revisado con éxito por {{2}} y está listo para su firma."

**C.3. Template Approval Pitfalls**
Legal services face high rejection rates if templates resemble cold outreach or guarantee outcomes. To pass Meta's review, templates must strictly avoid promotional language (e.g., "Let us help you win your case!"), must include clear placeholders (`{{1}}`), and must explicitly align with an ongoing transaction/case.

**C.4. Media-Handling Rules**
The WhatsApp Business API supports inbound media (PDFs, JPEGs, PNGs) generally capped at 16MB for documents and images. Media is temporarily cached on Meta's servers and accessed via secure URLs. The platform must immediately download the media using the Twilio media URL, upload it to the secure Supabase bucket, and purge the Twilio link reference to maintain data privacy. Because biometric and identity documents (passports) are being transferred, the initial consent template must explicitly state that identity documents will be securely processed and retained solely for form generation.

**C.5. Twilio-Specific Requirements**

* **Webhook Signature Validation:** To prevent malicious actors from sending fake WhatsApp payloads to your server, Twilio signs its webhook requests using an HMAC-SHA1 algorithm against your Twilio Auth Token.
* **Validation Pitfalls:** If your Express.js/Node.js application sits behind a load balancer that terminates SSL or modifies the request URL (e.g., changing `https` to `http` or decoding URL parameters), Twilio's `validateRequest` middleware will fail and return a `403 Unauthorized` error. You must ensure the validation function receives the *exact, perfectly url-encoded* URL that Twilio originally targeted.

---

### Appendix: Currency & Uncertainty

* **Literal Checkbox Export Values:** The exact string values required to toggle checkboxes or radio buttons via `pdf-lib` (e.g., `/Yes`, `/Off`, `/1`) cannot be authoritatively established without running `pdftk dump_data_fields` directly on the physical I-589 (01/20/25) and I-821 (02/27/26) PDF files.
* **AcroForm vs. XFA:** While research indicates I-589 is a standard AcroForm , USCIS occasionally updates files using Adobe LiveCycle, which may introduce dynamic XML elements (XFA). `pdf-lib` has limited support for XFA manipulation.


* **Proposed 365-Day Asylum Clock:** The DHS proposed rule extending the work authorization waiting period to 365 days was scheduled for comment closure on April 24, 2026. As of May 29, 2026, it is unclear if this rule has been officially codified as a Final Rule or halted by injunctions.


* **FDBR Thresholds:** The Florida Digital Bill of Rights (FDBR) primarily applies to mega-corporations exceeding $1 billion in revenue. However, local Florida notario UPL laws remain strictly applicable to any size entity.