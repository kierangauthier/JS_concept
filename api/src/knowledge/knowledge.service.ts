import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { PrismaService } from '../prisma/prisma.service';

export interface KnowledgeSearchResult {
  id: string;
  content: string;
  source: string;
  page?: number | null;
  tags: string[];
  score?: number;
}

@Injectable()
export class KnowledgeService {
  constructor(private prisma: PrismaService) {}

  // ─── Recherche full-text PostgreSQL (mode RAG) ──────────────────────────

  async search(query: string, companyId: string, limit = 6): Promise<KnowledgeSearchResult[]> {
    // Sanitize the query and build search terms.
    // NOTE: `terms` are never spliced as raw SQL below — they are bound via Prisma.sql
    // parameters, so a value like `' OR 1=1 --` is treated as literal text.
    const terms = query
      .toLowerCase()
      .replace(/[^\w\sàâäéèêëîïôùûüç-]/gi, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2)
      .slice(0, 10);

    if (terms.length === 0) return [];

    // Hard-cap the limit (never trust callers even though it's typed).
    const safeLimit = Math.min(Math.max(1, Math.floor(Number(limit) || 6)), 50);

    // Build the ILIKE clauses safely, one bound parameter per term.
    // Prisma.sql with ${x} uses real parameter binding — no interpolation.
    const ilikeClauses: Prisma.Sql[] = terms
      .slice(0, 3)
      .map((t) => Prisma.sql`content ILIKE ${`%${t}%`}`);

    const ilikeOr =
      ilikeClauses.length > 0
        ? Prisma.sql` OR ${Prisma.join(ilikeClauses, ' OR ')}`
        : Prisma.empty;

    const results = await this.prisma.$queryRaw<Array<{
      id: string;
      content: string;
      source: string;
      page: number | null;
      tags: string[];
      rank: number;
    }>>(Prisma.sql`
      SELECT
        id,
        content,
        source,
        page,
        tags,
        ts_rank(
          to_tsvector('french', content),
          plainto_tsquery('french', ${query})
        ) AS rank
      FROM knowledge_chunks
      WHERE
        "companyId" = ${companyId}
        AND (
          to_tsvector('french', content) @@ plainto_tsquery('french', ${query})
          ${ilikeOr}
        )
      ORDER BY rank DESC, "chunkIndex" ASC
      LIMIT ${safeLimit}
    `);

    return results.map(r => ({
      id: r.id,
      content: r.content,
      source: r.source,
      page: r.page,
      tags: r.tags,
      score: Number(r.rank),
    }));
  }

  // ─── Recherche simplifiée par ILIKE (fallback si FTS ne retourne rien) ──

  async searchFallback(query: string, companyId: string, limit = 4): Promise<KnowledgeSearchResult[]> {
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length > 2)
      .slice(0, 5);

    if (terms.length === 0) return [];

    const conditions = terms.map(t => ({ content: { contains: t, mode: 'insensitive' as const } }));

    const chunks = await this.prisma.knowledgeChunk.findMany({
      where: {
        companyId,
        OR: conditions,
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return chunks.map(c => ({
      id: c.id,
      content: c.content,
      source: c.source,
      page: c.page,
      tags: c.tags,
    }));
  }

  // ─── Ingest : ajouter des chunks manuellement ───────────────────────────

  async ingestChunks(
    chunks: Array<{
      content: string;
      source: string;
      sourceType?: string;
      page?: number;
      chunkIndex: number;
      tags: string[];
    }>,
    companyId: string,
  ): Promise<number> {
    const data = chunks.map(c => ({
      // `KnowledgeChunk.id` is a mandatory TEXT in the schema (no default),
      // callers don't supply it, so we mint one here.
      id: createId(),
      content: c.content,
      source: c.source,
      sourceType: c.sourceType ?? 'pdf',
      page: c.page ?? null,
      chunkIndex: c.chunkIndex,
      tags: c.tags,
      companyId,
    }));

    const result = await this.prisma.knowledgeChunk.createMany({ data, skipDuplicates: true });
    return result.count;
  }

  // ─── Suppression d'une source ────────────────────────────────────────────

  async deleteSource(source: string, companyId: string): Promise<number> {
    const result = await this.prisma.knowledgeChunk.deleteMany({ where: { source, companyId } });
    return result.count;
  }

  // ─── Listing des sources indexées ────────────────────────────────────────

  async listSources(companyId: string) {
    const result = await this.prisma.$queryRaw<Array<{ source: string; count: bigint }>>`
      SELECT source, COUNT(*) as count
      FROM knowledge_chunks
      WHERE "companyId" = ${companyId}
      GROUP BY source
      ORDER BY source ASC
    `;
    return result.map(r => ({ source: r.source, chunks: Number(r.count) }));
  }
}
