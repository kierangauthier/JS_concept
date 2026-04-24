import { describe, it, expect } from "vitest";
import {
  generateFacturXXml,
  pickBestProfile,
  PROFILE_URN,
  FacturXInvoice,
} from "../../../api/src/invoices/facturx.generator";

const baseInvoice: FacturXInvoice = {
  reference: "FAC-ASP-2026-001",
  issuedAt: new Date("2026-04-22T00:00:00Z"),
  dueDate: new Date("2026-05-22T00:00:00Z"),
  vatMode: "normal",
  seller: {
    name: "ASP Signalisation",
    address: "12 rue du Test",
    postalCode: "75001",
    city: "Paris",
    countryCode: "FR",
    vatNumber: "FR12345678901",
    siret: "12345678900012",
  },
  buyer: {
    name: "Client SARL",
    address: "30 avenue du Client",
    postalCode: "69002",
    city: "Lyon",
    countryCode: "FR",
  },
  totalHT: 1000,
  totalTVA: 200,
  totalTTC: 1200,
};

describe("pickBestProfile (V6)", () => {
  it("falls back to MINIMUM when no lines are provided", () => {
    expect(pickBestProfile({ ...baseInvoice, lines: undefined })).toBe("MINIMUM");
    expect(pickBestProfile({ ...baseInvoice, lines: [] })).toBe("MINIMUM");
  });

  it("returns EN16931 by default when lines are present", () => {
    const inv: FacturXInvoice = {
      ...baseInvoice,
      lines: [{ designation: "X", quantity: 1, unit: "C62", unitPrice: 1000, vatRate: 20, totalHT: 1000 }],
    };
    expect(pickBestProfile(inv)).toBe("EN16931");
  });

  it("respects the caller's preferred profile when lines are present", () => {
    const inv: FacturXInvoice = {
      ...baseInvoice,
      lines: [{ designation: "X", quantity: 1, unit: "C62", unitPrice: 1000, vatRate: 20, totalHT: 1000 }],
    };
    expect(pickBestProfile(inv, "BASIC")).toBe("BASIC");
  });
});

describe("generateFacturXXml — MINIMUM", () => {
  const xml = generateFacturXXml(baseInvoice, "MINIMUM");

  it("emits the MINIMUM guideline URN", () => {
    expect(xml).toContain(PROFILE_URN.MINIMUM);
  });

  it("contains the invoice reference and date in CII format (YYYYMMDD)", () => {
    expect(xml).toContain("<ram:ID>FAC-ASP-2026-001</ram:ID>");
    expect(xml).toContain('format="102">20260422</udt:DateTimeString>');
  });

  it("omits line items", () => {
    expect(xml).not.toContain("IncludedSupplyChainTradeLineItem");
  });

  it("omits IBAN even when provided (not part of MINIMUM)", () => {
    const withIban = generateFacturXXml({ ...baseInvoice, iban: "FR76..." }, "MINIMUM");
    expect(withIban).not.toContain("IBANID");
  });

  it("escapes XML special characters in party names", () => {
    const inv: FacturXInvoice = {
      ...baseInvoice,
      seller: { ...baseInvoice.seller, name: "A & B <Ltd>" },
    };
    const out = generateFacturXXml(inv, "MINIMUM");
    expect(out).toContain("A &amp; B &lt;Ltd&gt;");
    expect(out).not.toContain("<Ltd>");
  });

  it("emits grand total and due payable", () => {
    expect(xml).toContain("<ram:GrandTotalAmount>1200.00</ram:GrandTotalAmount>");
    expect(xml).toContain("<ram:DuePayableAmount>1200.00</ram:DuePayableAmount>");
  });
});

describe("generateFacturXXml — EN16931", () => {
  const inv: FacturXInvoice = {
    ...baseInvoice,
    lines: [
      { designation: "Pose panneau B14", quantity: 2, unit: "C62", unitPrice: 300, vatRate: 20, totalHT: 600 },
      { designation: "Peinture", quantity: 20, unit: "MTR", unitPrice: 20, vatRate: 20, totalHT: 400 },
    ],
    iban: "FR7630006000011234567890189",
    bic: "BNPAFRPP",
    paymentTerms: "30 jours fin de mois",
  };
  const xml = generateFacturXXml(inv);

  it("emits the EN 16931 guideline URN by default", () => {
    expect(xml).toContain(PROFILE_URN.EN16931);
  });

  it("includes every line item with escaped designation", () => {
    expect(xml).toContain("Pose panneau B14");
    expect(xml).toContain("Peinture");
    // Only the opening tag (`<ram:Included...>` without `/`).
    expect(xml.match(/<ram:IncludedSupplyChainTradeLineItem>/g)?.length).toBe(2);
  });

  it("prints IBAN and BIC when the profile is richer than MINIMUM", () => {
    expect(xml).toContain("FR7630006000011234567890189");
    expect(xml).toContain("BNPAFRPP");
  });

  it("uses UNECE unit codes as attributes on billed quantities", () => {
    expect(xml).toContain('unitCode="C62">2.00');
    expect(xml).toContain('unitCode="MTR">20.00');
  });

  it("prints the payment terms free text", () => {
    expect(xml).toContain("30 jours fin de mois");
  });
});

describe("generateFacturXXml — VAT modes", () => {
  it("adds the autoliquidation exemption reason with category AE", () => {
    const xml = generateFacturXXml(
      { ...baseInvoice, vatMode: "autoliquidation", totalTVA: 0 },
      "MINIMUM",
    );
    expect(xml).toContain("Autoliquidation");
    expect(xml).toContain("<ram:CategoryCode>AE</ram:CategoryCode>");
    expect(xml).toContain("<ram:RateApplicablePercent>0</ram:RateApplicablePercent>");
  });

  it("adds the CGI 261 exemption with category E", () => {
    const xml = generateFacturXXml(
      { ...baseInvoice, vatMode: "exempt", totalTVA: 0 },
      "MINIMUM",
    );
    expect(xml).toContain("Exonération Art. 261 CGI");
    expect(xml).toContain("<ram:CategoryCode>E</ram:CategoryCode>");
  });
});
