/**
 * V6 — Factur-X XML generator — multi-profile.
 *
 * Factur-X is a hybrid format: a PDF/A-3 with an embedded CII XML. This
 * module produces the XML part; the hybrid assembly lives in
 * facturx-pdf.service.ts.
 *
 * Three profiles are supported:
 *   - MINIMUM     — totals only; accepted by Chorus Pro and most PDP.
 *   - BASIC       — MINIMUM + line items.
 *   - EN 16931    — BASIC + buyer tax registration + richer payment terms
 *                   (recommended by Sage and most French accounting tools).
 *
 * References:
 *   - FNFE-MPE Factur-X 1.0.07
 *   - EN 16931-1:2017 + CII syntax binding 16931-3-3
 */

export type FacturXProfile = 'MINIMUM' | 'BASIC' | 'EN16931';

export const PROFILE_URN: Record<FacturXProfile, string> = {
  MINIMUM: 'urn:factur-x.eu:1p0:minimum',
  BASIC: 'urn:factur-x.eu:1p0:basic',
  EN16931: 'urn:cen.eu:en16931:2017',
};

export interface FacturXLine {
  designation: string;
  quantity: number;
  unit: string;        // UNECE Rec. 20 unit code (e.g. C62 for piece, HUR for hour)
  unitPrice: number;   // HT
  vatRate: number;     // %
  totalHT: number;
}

export interface FacturXInvoice {
  reference: string;
  issuedAt: Date;
  dueDate: Date;
  vatMode: 'normal' | 'autoliquidation' | 'exempt';

  seller: {
    name: string;
    address?: string;
    postalCode?: string;
    city?: string;
    countryCode?: string;
    vatNumber?: string;
    siret?: string;
    legalForm?: string;
  };
  buyer: {
    name: string;
    address?: string;
    postalCode?: string;
    city?: string;
    countryCode?: string;
    vatNumber?: string;
  };

  totalHT: number;
  totalTVA: number;
  totalTTC: number;

  lines?: FacturXLine[];

  /** Free-text payment terms (e.g. "Paiement à 30 jours fin de mois"). */
  paymentTerms?: string;
  /** Seller IBAN — printed on BASIC / EN16931. */
  iban?: string;
  /** Seller BIC — printed on BASIC / EN16931. */
  bic?: string;
}

/**
 * Chooses the richest profile the invoice payload can produce.
 * If no lines are provided we fall back to MINIMUM. Otherwise EN16931 is
 * preferred (Sage's default) unless the caller opts back to BASIC.
 */
export function pickBestProfile(
  inv: FacturXInvoice,
  preferred: FacturXProfile = 'EN16931',
): FacturXProfile {
  const hasLines = Array.isArray(inv.lines) && inv.lines.length > 0;
  if (!hasLines) return 'MINIMUM';
  return preferred;
}

// ─── XML helpers ──────────────────────────────────────────────────────────

const xmlEscape = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fmt = (n: number) => n.toFixed(2);
const fmtDate = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');

// ─── Fragment builders ────────────────────────────────────────────────────

function buildLines(lines: FacturXLine[], vatMode: FacturXInvoice['vatMode']): string {
  const taxCategoryCode =
    vatMode === 'autoliquidation' ? 'AE' : vatMode === 'exempt' ? 'E' : 'S';

  return lines
    .map(
      (l, i) => `
      <ram:IncludedSupplyChainTradeLineItem>
        <ram:AssociatedDocumentLineDocument>
          <ram:LineID>${i + 1}</ram:LineID>
        </ram:AssociatedDocumentLineDocument>
        <ram:SpecifiedTradeProduct>
          <ram:Name>${xmlEscape(l.designation)}</ram:Name>
        </ram:SpecifiedTradeProduct>
        <ram:SpecifiedLineTradeAgreement>
          <ram:NetPriceProductTradePrice>
            <ram:ChargeAmount>${fmt(l.unitPrice)}</ram:ChargeAmount>
          </ram:NetPriceProductTradePrice>
        </ram:SpecifiedLineTradeAgreement>
        <ram:SpecifiedLineTradeDelivery>
          <ram:BilledQuantity unitCode="${xmlEscape(l.unit)}">${fmt(l.quantity)}</ram:BilledQuantity>
        </ram:SpecifiedLineTradeDelivery>
        <ram:SpecifiedLineTradeSettlement>
          <ram:ApplicableTradeTax>
            <ram:TypeCode>VAT</ram:TypeCode>
            <ram:CategoryCode>${taxCategoryCode}</ram:CategoryCode>
            <ram:RateApplicablePercent>${vatMode === 'normal' ? fmt(l.vatRate) : '0'}</ram:RateApplicablePercent>
          </ram:ApplicableTradeTax>
          <ram:SpecifiedTradeSettlementLineMonetarySummation>
            <ram:LineTotalAmount>${fmt(l.totalHT)}</ram:LineTotalAmount>
          </ram:SpecifiedTradeSettlementLineMonetarySummation>
        </ram:SpecifiedLineTradeSettlement>
      </ram:IncludedSupplyChainTradeLineItem>`,
    )
    .join('');
}

function buildSellerParty(seller: FacturXInvoice['seller']): string {
  const country = seller.countryCode ?? 'FR';
  return `
      <ram:SellerTradeParty>
        <ram:Name>${xmlEscape(seller.name)}</ram:Name>
        ${seller.siret ? `<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${xmlEscape(seller.siret)}</ram:ID></ram:SpecifiedLegalOrganization>` : ''}
        <ram:PostalTradeAddress>
          ${seller.postalCode ? `<ram:PostcodeCode>${xmlEscape(seller.postalCode)}</ram:PostcodeCode>` : ''}
          ${seller.address ? `<ram:LineOne>${xmlEscape(seller.address)}</ram:LineOne>` : ''}
          ${seller.city ? `<ram:CityName>${xmlEscape(seller.city)}</ram:CityName>` : ''}
          <ram:CountryID>${country}</ram:CountryID>
        </ram:PostalTradeAddress>
        ${seller.vatNumber ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${xmlEscape(seller.vatNumber)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
      </ram:SellerTradeParty>`;
}

function buildBuyerParty(buyer: FacturXInvoice['buyer']): string {
  const country = buyer.countryCode ?? 'FR';
  return `
      <ram:BuyerTradeParty>
        <ram:Name>${xmlEscape(buyer.name)}</ram:Name>
        <ram:PostalTradeAddress>
          ${buyer.postalCode ? `<ram:PostcodeCode>${xmlEscape(buyer.postalCode)}</ram:PostcodeCode>` : ''}
          ${buyer.address ? `<ram:LineOne>${xmlEscape(buyer.address)}</ram:LineOne>` : ''}
          ${buyer.city ? `<ram:CityName>${xmlEscape(buyer.city)}</ram:CityName>` : ''}
          <ram:CountryID>${country}</ram:CountryID>
        </ram:PostalTradeAddress>
        ${buyer.vatNumber ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${xmlEscape(buyer.vatNumber)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
      </ram:BuyerTradeParty>`;
}

function buildPaymentMeans(inv: FacturXInvoice): string {
  if (!inv.iban) return '';
  return `
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>30</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${xmlEscape(inv.iban)}</ram:IBANID>
        </ram:PayeePartyCreditorFinancialAccount>
        ${inv.bic ? `<ram:PayeeSpecifiedCreditorFinancialInstitution><ram:BICID>${xmlEscape(inv.bic)}</ram:BICID></ram:PayeeSpecifiedCreditorFinancialInstitution>` : ''}
      </ram:SpecifiedTradeSettlementPaymentMeans>`;
}

// ─── Main generator ───────────────────────────────────────────────────────

export function generateFacturXXml(
  inv: FacturXInvoice,
  profile: FacturXProfile = pickBestProfile(inv),
): string {
  const taxCategoryCode =
    inv.vatMode === 'autoliquidation' ? 'AE' : inv.vatMode === 'exempt' ? 'E' : 'S';

  const exemptionReason =
    inv.vatMode === 'autoliquidation'
      ? '<ram:TaxExemptionReason>Autoliquidation Art. 283-2 CGI</ram:TaxExemptionReason>'
      : inv.vatMode === 'exempt'
        ? '<ram:TaxExemptionReason>Exonération Art. 261 CGI</ram:TaxExemptionReason>'
        : '';

  // MINIMUM profile skips line items, payment means and verbose payment terms.
  const includeLines = profile !== 'MINIMUM';
  const includePaymentMeans = profile !== 'MINIMUM';
  const includePaymentTermsText = profile !== 'MINIMUM' && !!inv.paymentTerms;

  const linesXml = includeLines && inv.lines?.length
    ? buildLines(inv.lines, inv.vatMode)
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">

  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>${PROFILE_URN[profile]}</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>

  <rsm:ExchangedDocument>
    <ram:ID>${xmlEscape(inv.reference)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${fmtDate(inv.issuedAt)}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>

  <rsm:SupplyChainTradeTransaction>
${linesXml}
    <ram:ApplicableHeaderTradeAgreement>
${buildSellerParty(inv.seller)}
${buildBuyerParty(inv.buyer)}
    </ram:ApplicableHeaderTradeAgreement>

    <ram:ApplicableHeaderTradeDelivery />

    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
${includePaymentMeans ? buildPaymentMeans(inv) : ''}
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${fmt(inv.totalTVA)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        ${exemptionReason}
        <ram:BasisAmount>${fmt(inv.totalHT)}</ram:BasisAmount>
        <ram:CategoryCode>${taxCategoryCode}</ram:CategoryCode>
        <ram:RateApplicablePercent>${inv.vatMode === 'normal' && inv.totalHT > 0 ? fmt((inv.totalTVA / inv.totalHT) * 100) : '0'}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>

      <ram:SpecifiedTradePaymentTerms>
        ${includePaymentTermsText ? `<ram:Description>${xmlEscape(inv.paymentTerms!)}</ram:Description>` : ''}
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${fmtDate(inv.dueDate)}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>

      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${fmt(inv.totalHT)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${fmt(inv.totalHT)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${fmt(inv.totalTVA)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${fmt(inv.totalTTC)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${fmt(inv.totalTTC)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>

    </ram:ApplicableHeaderTradeSettlement>

  </rsm:SupplyChainTradeTransaction>

</rsm:CrossIndustryInvoice>`;
}
