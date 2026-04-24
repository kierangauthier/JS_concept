import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * V2.9 — Opt-in consent for AI features.
 *
 * Every AI endpoint sends user content to an external LLM (Anthropic US) —
 * a transfer of personal data outside the EU. GDPR requires the user's
 * informed consent before the first call.
 *
 * The guard looks up the current user's `aiProcessingConsent` flag and
 * throws 403 with a machine-readable marker when consent is missing, so the
 * frontend can surface the opt-in modal.
 */
@Injectable()
export class AiConsentGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    if (!userId) return false;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { aiProcessingConsent: true },
    });

    if (!user || !user.aiProcessingConsent) {
      throw new ForbiddenException({
        message:
          'Consentement au traitement IA requis. Les données envoyées à un fournisseur externe (Anthropic, États-Unis) nécessitent votre accord explicite.',
        code: 'AI_CONSENT_REQUIRED',
      });
    }

    return true;
  }
}
