import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiConsentGuard } from './ai-consent.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [PrismaModule, KnowledgeModule],
  controllers: [AiController],
  providers: [AiService, AiConsentGuard],
  exports: [AiService],
})
export class AiModule {}
