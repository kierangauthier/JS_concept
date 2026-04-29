import {
  Controller, Post, Get, Body, Req,
  HttpCode, HttpStatus, ServiceUnavailableException,
  BadRequestException, UseGuards,
} from '@nestjs/common';
import { AiService } from './ai.service';
import {
  ExtractQuoteLinesDto, DraftReminderDto, ChatDto,
  SizingDto, VoiceReportDto,
} from './dto/ai.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AiConsentGuard } from './ai-consent.guard';

@Controller('api/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // TODO: handle GROUP scope properly (cross-company aggregation).
  // For now, AI endpoints fall back to the user's own companyId so admins
  // browsing in GROUP mode still get a valid scope instead of crashing
  // Prisma with a null id/companyId.
  private resolveCompanyId(req: any): string {
    const companyId = req.companyId ?? req.user?.companyId;
    if (!companyId) {
      throw new BadRequestException('No company scope available for AI endpoint');
    }
    return companyId;
  }

  @Get('status')
  @Public()
  getStatus() {
    return {
      configured: this.aiService.isConfigured,
      message: this.aiService.isConfigured ? 'Service IA opérationnel' : 'ANTHROPIC_API_KEY non configurée',
    };
  }

  @Post('extract-quote-lines')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'conducteur', 'collaborateur')
  @UseGuards(AiConsentGuard)
  async extractQuoteLines(@Body() dto: ExtractQuoteLinesDto, @Req() req: any) {
    if (!this.aiService.isConfigured) throw new ServiceUnavailableException('Service IA non configuré');
    return this.aiService.extractQuoteLines(dto, this.resolveCompanyId(req));
  }

  @Post('draft-reminder')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'conducteur', 'comptable', 'collaborateur')
  @UseGuards(AiConsentGuard)
  async draftReminder(@Body() dto: DraftReminderDto, @Req() req: any) {
    if (!this.aiService.isConfigured) throw new ServiceUnavailableException('Service IA non configuré');
    return this.aiService.draftReminder(dto, this.resolveCompanyId(req));
  }

  @Get('daily-briefing')
  @Roles('admin', 'conducteur', 'comptable')
  @UseGuards(AiConsentGuard)
  async getDailyBriefing(@Req() req: any) {
    if (!this.aiService.isConfigured) throw new ServiceUnavailableException('Service IA non configuré');
    return this.aiService.getDailyBriefing(this.resolveCompanyId(req));
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'conducteur', 'comptable', 'collaborateur', 'technicien')
  @UseGuards(AiConsentGuard)
  async chat(@Body() dto: ChatDto, @Req() req: any) {
    if (!this.aiService.isConfigured) throw new ServiceUnavailableException('Service IA non configuré');
    return this.aiService.chat(dto, this.resolveCompanyId(req), req.user?.name ?? 'utilisateur');
  }

  // ── WOW 1 : Dimensionnement auto → devis ──────────────────────────────────

  @Post('size-and-quote')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'conducteur', 'collaborateur')
  @UseGuards(AiConsentGuard)
  async sizeAndQuote(@Body() dto: SizingDto, @Req() req: any) {
    if (!this.aiService.isConfigured) throw new ServiceUnavailableException('Service IA non configuré');
    return this.aiService.autoSizeAndQuote(dto, this.resolveCompanyId(req));
  }

  // ── WOW 2 : Rapport vocal terrain ─────────────────────────────────────────

  @Post('voice-report')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'conducteur', 'technicien')
  @UseGuards(AiConsentGuard)
  async voiceReport(@Body() dto: VoiceReportDto, @Req() req: any) {
    if (!this.aiService.isConfigured) throw new ServiceUnavailableException('Service IA non configuré');
    return this.aiService.parseVoiceReport(dto, this.resolveCompanyId(req));
  }

  // ── WOW 3 : Alertes proactives ────────────────────────────────────────────

  @Get('proactive-alerts')
  @Roles('admin', 'conducteur', 'comptable')
  @UseGuards(AiConsentGuard)
  async getProactiveAlerts(@Req() req: any) {
    if (!this.aiService.isConfigured) throw new ServiceUnavailableException('Service IA non configuré');
    return this.aiService.getProactiveAlerts(this.resolveCompanyId(req));
  }
}
