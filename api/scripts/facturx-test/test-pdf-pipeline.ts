/**
 * Full Factur-X PDF/A-3 pipeline test — standalone.
 *
 * Runs the same 3-stage pipeline as the production service:
 *   1. Generate a regular PDF with pdfmake.
 *   2. Convert to PDF/A-3 via Ghostscript.
 *   3. Attach the XML + write Factur-X XMP with pdf-lib.
 *
 * Run with:
 *   GHOSTSCRIPT_BIN="/c/Program Files/gs/gs10.07.0/bin/gswin64c.exe" npx tsx scripts/facturx-test/test-pdf-pipeline.ts
 *
 * (or set GHOSTSCRIPT_BIN in your shell first)
 */

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = SELF_DIR;
const require = createRequire(import.meta.url);

async function main() {
  console.log("\n🧪 Factur-X full pipeline test — pdfmake → Ghostscript → pdf-lib\n");

  // ─── 1. Check Ghostscript ────────────────────────────────────────────
  const gsBin = process.env.GHOSTSCRIPT_BIN ?? "gs";
  console.log(`📌 Using Ghostscript binary: ${gsBin}`);

  // ─── 2. Generate a basic PDF with pdf-lib directly ────────────────────
  // Note: the production service uses pdfmake. Here we build a minimal PDF
  // with pdf-lib just to test the Ghostscript + attachment stages — this is
  // the "risky" part we need to validate with real Ghostscript.
  console.log("\n── Stage 1/3: generating base PDF with pdf-lib (minimal test PDF) ──");

  const pdfLibForBase = await import("pdf-lib");
  const baseDoc = await pdfLibForBase.PDFDocument.create();
  const page = baseDoc.addPage([595, 842]); // A4
  const font = await baseDoc.embedFont(pdfLibForBase.StandardFonts.Helvetica);
  const fontBold = await baseDoc.embedFont(pdfLibForBase.StandardFonts.HelveticaBold);

  let y = 800;
  const line = (text: string, opts: { bold?: boolean; size?: number; color?: [number, number, number] } = {}) => {
    page.drawText(text, {
      x: 50,
      y,
      size: opts.size ?? 10,
      font: opts.bold ? fontBold : font,
      color: opts.color ? pdfLibForBase.rgb(...opts.color) : pdfLibForBase.rgb(0, 0, 0),
    });
    y -= (opts.size ?? 10) + 4;
  };

  line("ASP Signalisation SAS", { bold: true, size: 16 });
  line("12 rue de la Signalisation, 75010 Paris", { size: 9, color: [0.4, 0.4, 0.4] });
  y -= 20;
  line("FACTURE", { bold: true, size: 20 });
  line("Reference : FAC-ASP-2026-001", { size: 11 });
  line("Date : 22/04/2026");
  line("Echeance : 22/05/2026");
  y -= 20;
  line("Client : Mairie de Saint-Denis", { bold: true });
  line("2 place Victor Hugo, 93200 Saint-Denis");
  y -= 20;
  line("Pose panneau B14 70 km/h  -  4 x 1200.00 = 4800.00 EUR");
  line("Marquage peinture 150m  -  150 x 28.00 = 4200.00 EUR");
  line("Signalisation temporaire  -  Forfait 3450.00 EUR");
  y -= 15;
  line("Total HT : 12 450.00 EUR", { bold: true });
  line("TVA 20% : 2 490.00 EUR");
  line("Total TTC : 14 940.00 EUR", { bold: true, size: 12 });
  y -= 30;
  line("Paiement a 30 jours fin de mois", { size: 9 });
  line("IBAN : FR7630006000011234567890189  -  BIC : BNPAFRPP", { size: 9 });
  y -= 20;
  line("ASP Signalisation SAS  -  SIRET 12345678900012  -  TVA FR12345678901", { size: 7, color: [0.5, 0.5, 0.5] });

  const basePdfBytes = Buffer.from(await baseDoc.save());
  const basePdfPath = join(OUT_DIR, "stage1-base.pdf");
  writeFileSync(basePdfPath, basePdfBytes);
  console.log(`   ✅ ${basePdfPath} — ${basePdfBytes.length} bytes`);

  // ─── 3. Convert to PDF/A-3 via Ghostscript ───────────────────────────
  console.log("\n── Stage 2/3: Ghostscript converting to PDF/A-3 ──");

  const pdfA3Path = join(OUT_DIR, "stage2-pdfa3.pdf");
  const defPath = join(OUT_DIR, "pdfa-def.ps");

  // Write the PDF/A definition file used by Ghostscript.
  // Simpler PDF/A-3 def: declare the OutputIntent with Ghostscript's bundled
  // sRGB ICC profile. No manual ICC stream to feed, no ASCII85 filter to wrap.
  const pdfaDef = `%!
[ /Title (Factur-X Test)
  /Author (Acreed)
  /Creator (ConceptManager)
  /DOCINFO pdfmark

[/_objdef {OutputIntent_PDFA} /type /dict /OBJ pdfmark
[{OutputIntent_PDFA} <<
  /Type /OutputIntent
  /S /GTS_PDFA1
  /OutputConditionIdentifier (sRGB)
  /Info (sRGB IEC61966-2.1)
>> /PUT pdfmark
[{Catalog} <</OutputIntents [{OutputIntent_PDFA}]>> /PUT pdfmark
`;
  writeFileSync(defPath, pdfaDef);

  const { spawnSync } = await import("node:child_process");
  const gsResult = spawnSync(
    gsBin,
    [
      "-dPDFA=3",
      "-dBATCH",
      "-dNOPAUSE",
      "-dNOOUTERSAVE",
      "-dPDFACompatibilityPolicy=1",
      // Convert to sRGB device space — required by PDF/A-3 and avoids the
      // "device-independent colour" error from Ghostscript 10.07+.
      "-sColorConversionStrategy=sRGB",
      "-sDEVICE=pdfwrite",
      `-sOutputFile=${pdfA3Path}`,
      defPath,
      basePdfPath,
    ],
    { encoding: "utf8" },
  );

  if (gsResult.status !== 0) {
    console.error(`   ❌ Ghostscript exited with code ${gsResult.status}`);
    console.error(`stdout:\n${gsResult.stdout}`);
    console.error(`stderr:\n${gsResult.stderr}`);
    process.exit(1);
  }
  if (!existsSync(pdfA3Path)) {
    console.error(`   ❌ Ghostscript did not produce ${pdfA3Path}`);
    process.exit(1);
  }
  const pdfA3Bytes = readFileSync(pdfA3Path);
  console.log(`   ✅ ${pdfA3Path} — ${pdfA3Bytes.length} bytes`);

  // Quick sanity check on the output file: look for the PDF/A marker.
  const head = pdfA3Bytes.subarray(0, 512).toString("latin1");
  if (!head.startsWith("%PDF-")) {
    console.error("   ❌ Output doesn't start with %PDF- header");
    process.exit(1);
  }
  console.log(`   ✅ PDF header OK (${head.slice(0, 8)})`);

  // ─── 4. Attach XML + write XMP via pdf-lib ───────────────────────────
  console.log("\n── Stage 3/3: attaching XML + Factur-X XMP via pdf-lib ──");

  const pdfLib = await import("pdf-lib");
  const { PDFDocument, PDFName, AFRelationship } = pdfLib;

  // Reuse the XML we generated in test-xml-only
  const { generateFacturXXml } = await import("../../src/invoices/facturx.generator");
  const xml = generateFacturXXml({
    reference: "FAC-ASP-2026-001",
    issuedAt: new Date("2026-04-22T10:00:00Z"),
    dueDate: new Date("2026-05-22T23:59:59Z"),
    vatMode: "normal",
    seller: {
      name: "ASP Signalisation SAS",
      address: "12 rue de la Signalisation",
      postalCode: "75010",
      city: "Paris",
      countryCode: "FR",
      vatNumber: "FR12345678901",
      siret: "12345678900012",
    },
    buyer: {
      name: "Mairie de Saint-Denis",
      address: "2 place Victor Hugo",
      postalCode: "93200",
      city: "Saint-Denis",
      countryCode: "FR",
    },
    totalHT: 12_450,
    totalTVA: 2_490,
    totalTTC: 14_940,
    lines: [
      { designation: "Pose panneau B14", quantity: 4, unit: "C62", unitPrice: 1_200, vatRate: 20, totalHT: 4_800 },
      { designation: "Marquage peinture", quantity: 150, unit: "MTR", unitPrice: 28, vatRate: 20, totalHT: 4_200 },
      { designation: "Signalisation temporaire", quantity: 1, unit: "LS", unitPrice: 3_450, vatRate: 20, totalHT: 3_450 },
    ],
    iban: "FR7630006000011234567890189",
    bic: "BNPAFRPP",
    paymentTerms: "Paiement à 30 jours fin de mois",
  });

  const doc = await PDFDocument.load(pdfA3Bytes, { updateMetadata: false });
  await doc.attach(new TextEncoder().encode(xml), "factur-x.xml", {
    mimeType: "application/xml",
    description: "Factur-X invoice FAC-ASP-2026-001",
    creationDate: new Date(),
    modificationDate: new Date(),
    afRelationship: AFRelationship.Alternative,
  });

  // Write Factur-X XMP metadata
  const xmp = `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:pdf="http://ns.adobe.com/pdf/1.3/"
        xmlns:xmp="http://ns.adobe.com/xap/1.0/"
        xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
        xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">
      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">Facture FAC-ASP-2026-001</rdf:li></rdf:Alt></dc:title>
      <dc:creator><rdf:Seq><rdf:li>ConceptManager</rdf:li></rdf:Seq></dc:creator>
      <pdf:Producer>ConceptManager</pdf:Producer>
      <xmp:CreatorTool>ConceptManager</xmp:CreatorTool>
      <pdfaid:part>3</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
      <fx:DocumentType>INVOICE</fx:DocumentType>
      <fx:DocumentFileName>factur-x.xml</fx:DocumentFileName>
      <fx:Version>1.0</fx:Version>
      <fx:ConformanceLevel>EN 16931</fx:ConformanceLevel>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  const xmpBytes = new TextEncoder().encode(xmp);
  const metadataStream = doc.context.stream(xmpBytes, {
    Type: PDFName.of("Metadata"),
    Subtype: PDFName.of("XML"),
  });
  const metadataRef = doc.context.register(metadataStream);
  doc.catalog.set(PDFName.of("Metadata"), metadataRef);

  doc.setTitle("Facture FAC-ASP-2026-001");
  doc.setSubject("Factur-X EN 16931");
  doc.setProducer("ConceptManager");

  const finalBytes = await doc.save({ useObjectStreams: false });
  const finalPath = join(OUT_DIR, "stage3-factur-x.pdf");
  writeFileSync(finalPath, Buffer.from(finalBytes));
  console.log(`   ✅ ${finalPath} — ${finalBytes.length} bytes`);

  // ─── 5. Sanity checks on the final file ──────────────────────────────
  console.log("\n── Final checks ──");

  const finalContent = readFileSync(finalPath).toString("latin1");
  const checks: Array<[string, boolean]> = [
    ["Starts with %PDF-", finalContent.startsWith("%PDF-")],
    ["Contains 'factur-x.xml'", finalContent.includes("factur-x.xml")],
    ["Contains '/AFRelationship'", finalContent.includes("/AFRelationship")],
    ["Contains 'Alternative'", finalContent.includes("Alternative")],
    ["Contains pdfaid:part 3", finalContent.includes("<pdfaid:part>3</pdfaid:part>")],
    ["Contains pdfaid:conformance B", finalContent.includes("<pdfaid:conformance>B</pdfaid:conformance>")],
    ["Contains fx:ConformanceLevel EN 16931", finalContent.includes("EN 16931")],
    ["Contains embedded invoice reference", finalContent.includes("FAC-ASP-2026-001")],
  ];

  let allOk = true;
  for (const [label, ok] of checks) {
    console.log(`   ${ok ? "✅" : "❌"} ${label}`);
    if (!ok) allOk = false;
  }

  console.log("\n" + "=".repeat(60));
  if (allOk) {
    console.log("✅ PIPELINE SUCCESS");
    console.log(`\nFichier final à ouvrir : ${finalPath}`);
    console.log("\nProchaine étape : valider avec mustangproject (Java CLI)");
    console.log("   java -jar Mustang-CLI-*.jar --action validate --source " + finalPath);
  } else {
    console.log("❌ Some sanity checks failed — inspect the output");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n❌ Fatal:", err);
  process.exit(1);
});
