/**
 * Standalone Factur-X XML test — zero dependencies on DB or Ghostscript.
 *
 * Run with (from repo root):
 *   npx tsx scripts/facturx-test/test-xml-only.ts
 *
 * Produces five XML files next to this script and prints a console report.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Resolve __dirname in both CJS and ESM modes.
const SELF_DIR = (() => {
  try {
    // ESM branch
    return dirname(fileURLToPath(import.meta.url));
  } catch {
    // CJS fallback
    // eslint-disable-next-line no-undef
    return typeof __dirname !== "undefined" ? __dirname : process.cwd();
  }
})();

async function main() {
  // Dynamic import so tsx doesn't choke on the static resolution.
  const {
    generateFacturXXml,
    pickBestProfile,
  } = await import("../../api/src/invoices/facturx.generator");

  type FacturXInvoice = Parameters<typeof generateFacturXXml>[0];
  type FacturXProfile = Parameters<typeof generateFacturXXml>[1] extends infer P
    ? P extends undefined ? "MINIMUM" | "BASIC" | "EN16931" : NonNullable<P>
    : "MINIMUM" | "BASIC" | "EN16931";

  const SAMPLE: FacturXInvoice = {
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
      legalForm: "SAS",
    },
    buyer: {
      name: "Mairie de Saint-Denis",
      address: "2 place Victor Hugo",
      postalCode: "93200",
      city: "Saint-Denis",
      countryCode: "FR",
      vatNumber: "FR98765432109",
    },
    totalHT: 12_450.0,
    totalTVA: 2_490.0,
    totalTTC: 14_940.0,
    lines: [
      { designation: "Pose panneau B14 limitation 70 km/h", quantity: 4, unit: "C62", unitPrice: 1_200, vatRate: 20, totalHT: 4_800 },
      { designation: "Marquage peinture résine blanc — 150 m", quantity: 150, unit: "MTR", unitPrice: 28, vatRate: 20, totalHT: 4_200 },
      { designation: "Signalisation temporaire chantier — forfait", quantity: 1, unit: "LS", unitPrice: 3_450, vatRate: 20, totalHT: 3_450 },
    ],
    paymentTerms: "Paiement à 30 jours fin de mois",
    iban: "FR7630006000011234567890189",
    bic: "BNPAFRPP",
  };

  function checkXml(profile: FacturXProfile, xml: string): string[] {
    const issues: string[] = [];
    const check = (label: string, predicate: boolean) => {
      if (!predicate) issues.push(`❌ ${label}`);
    };

    check("XML starts with declaration", xml.startsWith('<?xml version="1.0"'));
    check("Contains CrossIndustryInvoice root", xml.includes("CrossIndustryInvoice"));
    check("Declares the three namespaces", xml.includes("xmlns:rsm=") && xml.includes("xmlns:ram=") && xml.includes("xmlns:udt="));

    const expectedUrn = {
      MINIMUM: "urn:factur-x.eu:1p0:minimum",
      BASIC: "urn:factur-x.eu:1p0:basic",
      EN16931: "urn:cen.eu:en16931:2017",
    }[profile];
    check(`Profile URN = ${expectedUrn}`, xml.includes(expectedUrn));

    check("Invoice reference present", xml.includes(SAMPLE.reference));
    check("Seller name present", xml.includes(SAMPLE.seller.name));
    check("Buyer name present", xml.includes(SAMPLE.buyer.name));
    check("Seller SIRET present", xml.includes(SAMPLE.seller.siret!));
    check("Seller VAT number present", xml.includes(SAMPLE.seller.vatNumber!));

    check("Issued date in format 102", /format="102">20260422</.test(xml));
    check("Due date in format 102", /format="102">20260522</.test(xml));

    check("Total HT 12450.00", xml.includes("12450.00"));
    check("Total TVA 2490.00", xml.includes("2490.00"));
    check("Grand total 14940.00", xml.includes("14940.00"));

    if (profile === "MINIMUM") {
      check("MINIMUM has NO line items", !xml.includes("<ram:IncludedSupplyChainTradeLineItem>"));
      check("MINIMUM has NO IBAN", !xml.includes("IBANID"));
    } else {
      check("Line items present", xml.includes("<ram:IncludedSupplyChainTradeLineItem>"));
      check("Line 1 designation present", xml.includes("Pose panneau B14"));
      check("Line 2 designation present", xml.includes("Marquage peinture"));
      check("Line 3 designation present", xml.includes("Signalisation temporaire"));
      check("IBAN present", xml.includes("FR7630006000011234567890189"));
      check("BIC present", xml.includes("BNPAFRPP"));
      check("UNECE unit C62 used", xml.includes('unitCode="C62"'));
      check("UNECE unit MTR used", xml.includes('unitCode="MTR"'));
      check("UNECE unit LS used", xml.includes('unitCode="LS"'));
    }

    return issues;
  }

  console.log("\n🧪 Factur-X XML generation test — standalone\n");

  const autoProfile = pickBestProfile(SAMPLE);
  console.log(`✅ Auto-picked profile: ${autoProfile} (expected EN16931 since lines are present)`);
  if (autoProfile !== "EN16931") {
    console.log("❌ UNEXPECTED auto-picked profile — investigate");
    process.exit(1);
  }

  const profiles: FacturXProfile[] = ["MINIMUM", "BASIC", "EN16931"];
  let totalIssues = 0;

  for (const profile of profiles) {
    console.log(`\n── Profile: ${profile} ──`);
    const xml = generateFacturXXml(SAMPLE, profile);

    const out = join(SELF_DIR, `sample-${profile.toLowerCase()}.xml`);
    writeFileSync(out, xml, "utf-8");
    console.log(`   → Written: ${out}`);
    console.log(`   → Size: ${xml.length} bytes, ${xml.split("\n").length} lines`);

    const issues = checkXml(profile, xml);
    if (issues.length === 0) {
      console.log(`   ✅ All assertions passed`);
    } else {
      totalIssues += issues.length;
      console.log(`   ⚠️  ${issues.length} issue(s):`);
      for (const i of issues) console.log(`      ${i}`);
    }
  }

  console.log("\n── VAT modes ──");
  for (const mode of ["autoliquidation", "exempt"] as const) {
    const xml = generateFacturXXml({ ...SAMPLE, vatMode: mode, totalTVA: 0 }, "EN16931");
    const out = join(SELF_DIR, `sample-vat-${mode}.xml`);
    writeFileSync(out, xml, "utf-8");
    console.log(`   → ${mode}: ${out}`);
    if (mode === "autoliquidation" && !xml.includes("Autoliquidation")) {
      console.log("      ❌ autoliquidation reason missing");
      totalIssues++;
    }
    if (mode === "exempt" && !xml.includes("Art. 261 CGI")) {
      console.log("      ❌ CGI 261 exemption reason missing");
      totalIssues++;
    }
  }

  console.log("\n" + "=".repeat(60));
  if (totalIssues === 0) {
    console.log("✅ ALL CHECKS PASSED — XML generation is healthy");
    console.log("\nNext step: install Ghostscript + run full PDF/A-3 pipeline.");
    process.exit(0);
  } else {
    console.log(`❌ ${totalIssues} issue(s) detected — check the output above`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
