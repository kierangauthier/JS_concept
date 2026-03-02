import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(query: string, companyId: string | null) {
    const q = query.trim();
    if (q.length < 2) {
      return { clients: [], quotes: [], jobs: [], invoices: [] };
    }

    const companyFilter = companyId ? { companyId } : {};

    const [clients, quotes, jobs, invoices] = await Promise.all([
      this.prisma.client.findMany({
        where: {
          deletedAt: null,
          ...companyFilter,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, email: true, city: true },
        take: 5,
      }),

      this.prisma.quote.findMany({
        where: {
          deletedAt: null,
          ...companyFilter,
          OR: [
            { reference: { contains: q, mode: 'insensitive' } },
            { subject: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, reference: true, subject: true, status: true },
        take: 5,
      }),

      this.prisma.job.findMany({
        where: {
          deletedAt: null,
          ...companyFilter,
          OR: [
            { reference: { contains: q, mode: 'insensitive' } },
            { title: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, reference: true, title: true, status: true },
        take: 5,
      }),

      this.prisma.invoice.findMany({
        where: {
          deletedAt: null,
          ...companyFilter,
          OR: [
            { reference: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, reference: true, status: true, amount: true },
        take: 5,
      }),
    ]);

    return {
      clients: clients.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        city: c.city,
      })),
      quotes: quotes.map((q) => ({
        id: q.id,
        reference: q.reference,
        subject: q.subject,
        status: q.status,
      })),
      jobs: jobs.map((j) => ({
        id: j.id,
        reference: j.reference,
        title: j.title,
        status: j.status,
      })),
      invoices: invoices.map((i) => ({
        id: i.id,
        reference: i.reference,
        status: i.status,
        amount: Number(i.amount),
      })),
    };
  }
}
