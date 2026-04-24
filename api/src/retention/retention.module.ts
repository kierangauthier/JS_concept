import { Module } from '@nestjs/common';
import { InvoiceRetentionService } from './invoice-retention.service';

@Module({
  providers: [InvoiceRetentionService],
  exports: [InvoiceRetentionService],
})
export class RetentionModule {}
