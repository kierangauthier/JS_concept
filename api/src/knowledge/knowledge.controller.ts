import { Controller, Get, Post, Delete, Body, Query, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { KnowledgeService } from './knowledge.service';

@Controller('knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  // GET /knowledge/search?q=code+erreur+E7
  @Get('search')
  search(@Query('q') q: string, @Req() req: any) {
    return this.knowledge.search(q ?? '', req.user.companyId);
  }

  // GET /knowledge/sources — liste les docs indexés
  @Get('sources')
  sources(@Req() req: any) {
    return this.knowledge.listSources(req.user.companyId);
  }

  // DELETE /knowledge/sources/:source — supprime une source
  @Delete('sources/:source')
  deleteSource(@Param('source') source: string, @Req() req: any) {
    return this.knowledge.deleteSource(
      decodeURIComponent(source),
      req.user.companyId,
    );
  }

  // POST /knowledge/ingest — ingère des chunks manuellement (admin)
  @Post('ingest')
  ingest(
    @Body() body: { chunks: any[]; source: string },
    @Req() req: any,
  ) {
    return this.knowledge.ingestChunks(body.chunks, req.user.companyId);
  }
}
