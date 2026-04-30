import { http } from './http';

export type FacturxProfile = 'MINIMUM' | 'BASIC' | 'EN16931' | 'EXTENDED';

export interface CompanyLegal {
  companyId: string;
  code: string;
  name: string;

  legalName: string | null;
  tagline: string | null;
  legalForm: string | null;
  shareCapital: number | null;
  legalRepresentative: string | null;

  siren: string | null;
  siret: string | null;
  apeCode: string | null;
  vatNumber: string | null;
  rcsCity: string | null;

  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  countryCode: string | null;

  phone: string | null;
  email: string | null;
  website: string | null;

  iban: string | null;
  bic: string | null;
  bankName: string | null;

  paymentTerms: string | null;
  latePaymentRate: string | null;
  lateFeeFlat: number | null;
  discountRate: number | null;

  facturxProfile: FacturxProfile | null;
}

export type UpdateLegalPayload = Partial<Omit<CompanyLegal, 'companyId' | 'code' | 'name'>>;

export const legalApi = {
  get: (): Promise<CompanyLegal> => http.get<CompanyLegal>('/admin/legal'),
  update: (data: UpdateLegalPayload): Promise<CompanyLegal> =>
    http.patch<CompanyLegal>('/admin/legal', data),
};
