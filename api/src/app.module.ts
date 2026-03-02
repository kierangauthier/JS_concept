import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { QuotesModule } from './quotes/quotes.module';
import { JobsModule } from './jobs/jobs.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchasesModule } from './purchases/purchases.module';
import { InvoicesModule } from './invoices/invoices.module';
import { TimeEntriesModule } from './time-entries/time-entries.module';
import { WorkshopModule } from './workshop/workshop.module';
import { PlanningModule } from './planning/planning.module';
import { TeamsModule } from './teams/teams.module';
import { TeamPlanningModule } from './team-planning/team-planning.module';
import { MailModule } from './mail/mail.module';
import { HrModule } from './hr/hr.module';
import { SearchModule } from './search/search.module';
import { CatalogModule } from './catalog/catalog.module';
import { EmailModule } from './email/email.module';
import { AmendmentsModule } from './amendments/amendments.module';
import { SignaturesModule } from './signatures/signatures.module';
import { AbsencesModule } from './absences/absences.module';
import { RemindersModule } from './reminders/reminders.module';
import { QuoteTemplatesModule } from './quote-templates/quote-templates.module';
import { ReportsModule } from './reports/reports.module';
import { ImportModule } from './import/import.module';
import { ExportModule } from './export/export.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthController } from './health.controller';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { CompanyGuard } from './common/guards/company.guard';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuditModule,
    AuthModule,
    ClientsModule,
    QuotesModule,
    JobsModule,
    SuppliersModule,
    PurchasesModule,
    InvoicesModule,
    TimeEntriesModule,
    WorkshopModule,
    PlanningModule,
    TeamsModule,
    TeamPlanningModule,
    MailModule,
    HrModule,
    SearchModule,
    CatalogModule,
    EmailModule,
    AmendmentsModule,
    SignaturesModule,
    AbsencesModule,
    RemindersModule,
    QuoteTemplatesModule,
    ReportsModule,
    ImportModule,
    ExportModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global guards (order matters: throttle → auth → roles → company)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CompanyGuard },
    // Global audit interceptor
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
