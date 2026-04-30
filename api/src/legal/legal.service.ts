import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateLegalDto } from './dto/update-legal.dto';

const LEGAL_FIELDS = [
  'legalName', 'tagline', 'legalForm', 'shareCapital', 'legalRepresentative',
  'siren', 'siret', 'apeCode', 'vatNumber', 'rcsCity',
  'addressLine1', 'addressLine2', 'postalCode', 'city', 'countryCode',
  'phone', 'email', 'website',
  'iban', 'bic', 'bankName',
  'paymentTerms', 'latePaymentRate', 'lateFeeFlat', 'discountRate',
  'facturxProfile',
] as const;

@Injectable()
export class LegalService {
  constructor(private prisma: PrismaService) {}

  private mapLegal(c: any) {
    return {
      companyId: c.id,
      code: c.code,
      name: c.name,
      legalName: c.legalName,
      tagline: c.tagline,
      legalForm: c.legalForm,
      shareCapital: c.shareCapital != null ? Number(c.shareCapital) : null,
      legalRepresentative: c.legalRepresentative,
      siren: c.siren,
      siret: c.siret,
      apeCode: c.apeCode,
      vatNumber: c.vatNumber,
      rcsCity: c.rcsCity,
      addressLine1: c.addressLine1,
      addressLine2: c.addressLine2,
      postalCode: c.postalCode,
      city: c.city,
      countryCode: c.countryCode,
      phone: c.phone,
      email: c.email,
      website: c.website,
      iban: c.iban,
      bic: c.bic,
      bankName: c.bankName,
      paymentTerms: c.paymentTerms,
      latePaymentRate: c.latePaymentRate,
      lateFeeFlat: c.lateFeeFlat != null ? Number(c.lateFeeFlat) : null,
      discountRate: c.discountRate != null ? Number(c.discountRate) : null,
      facturxProfile: c.facturxProfile,
    };
  }

  async getForCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');
    return this.mapLegal(company);
  }

  async update(companyId: string, dto: UpdateLegalDto) {
    // Build a strict whitelist patch — class-validator already pruned junk via
    // ValidationPipe, but be defensive at the persistence layer too.
    const data: Record<string, any> = {};
    for (const key of LEGAL_FIELDS) {
      if ((dto as any)[key] !== undefined) data[key] = (dto as any)[key];
    }
    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data,
    });
    return this.mapLegal(updated);
  }
}
