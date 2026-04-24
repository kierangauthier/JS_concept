import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoiceIntegrityService } from './invoice-integrity.service';
import { FacturXPdfService } from './facturx-pdf.service';

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoiceIntegrityService, FacturXPdfService],
  exports: [InvoicesService, InvoiceIntegrityService, FacturXPdfService],
})
export class InvoicesModule {}
