import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { QuotesModule } from '../quotes/quotes.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [QuotesModule, InvoicesModule],
  controllers: [EmailController],
  providers: [EmailService],
})
export class EmailModule {}
