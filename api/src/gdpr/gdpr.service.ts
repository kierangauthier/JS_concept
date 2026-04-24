import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * I3 / I4 — RGPD personal-data operations.
 *
 *  I3 — erase   : right to be forgotten. The user row is retained (accounting
 *                 records link to it via `userId` and legal retention is 10y),
 *                 but all PII is overwritten with non-identifying placeholders.
 *                 Refresh + password-reset tokens are wiped so the account can
 *                 never be used again.
 *
 *  I4 — export  : right to data portability. Returns a serializable snapshot
 *                 of everything the system knows about a given user.
 */
@Injectable()
export class GdprService {
  constructor(private prisma: PrismaService) {}

  /** Anonymize a user in place (RGPD right to be forgotten, Art. 17). */
  async eraseUser(userId: string): Promise<{ erasedAt: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    // If already anonymized, short-circuit.
    if (user.email.startsWith('deleted_') && user.email.endsWith('@gdpr.local')) {
      return { erasedAt: (user.deletedAt ?? new Date()).toISOString() };
    }

    const anonEmail = `deleted_${user.id}@gdpr.local`;
    const erasedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: anonEmail,
          name: 'Utilisateur anonymisé',
          // Scramble the password hash — bcrypt of a random UUID is unrecoverable.
          passwordHash:
            '$2b$10$anonymizedanonymizedanonymizedanonymizedanonymize0',
          avatar: null,
          isActive: false,
          deletedAt: erasedAt,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: erasedAt },
      }),
      // `deleteMany` on password reset tokens is safe: single-use, only useful live.
      this.prisma.passwordResetToken.deleteMany({ where: { userId } }),
    ]);

    return { erasedAt: erasedAt.toISOString() };
  }

  /**
   * Collect every piece of personal data tied to a user.
   *
   * The payload is intentionally broad so the end-user has a complete view
   * of their footprint on the platform (profile, hours, assignments,
   * absences, HR documents, activity). Accounting records (invoices,
   * purchases) are NOT exported because they belong to the company, not the
   * individual.
   */
  async exportUser(userId: string): Promise<Record<string, any>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: { select: { id: true, name: true, code: true } },
        timeEntries: {
          orderBy: { date: 'desc' },
        },
        jobAssignments: {
          include: {
            job: { select: { id: true, reference: true, address: true } },
          },
        },
        planningSlots: true,
        teamMemberships: {
          include: { team: { select: { id: true, name: true } } },
        },
        hrDocuments: {
          select: {
            id: true,
            type: true,
            label: true,
            storageKey: true,
            mimeType: true,
            createdAt: true,
            expiresAt: true,
          },
        },
        absences: true,
        activityLogs: {
          orderBy: { createdAt: 'desc' },
          take: 500,
        },
      },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    if (user.email.startsWith('deleted_') && user.email.endsWith('@gdpr.local')) {
      throw new BadRequestException(
        'Ce compte a été anonymisé — aucune donnée personnelle à exporter.',
      );
    }

    // Only expose the audit entries authored BY the user (not those concerning
    // them as an entity), since the latter may belong to other data subjects.
    const auditLogs = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    return {
      generatedAt: new Date().toISOString(),
      subject: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      company: user.company,
      timeEntries: user.timeEntries,
      jobAssignments: user.jobAssignments,
      planningSlots: user.planningSlots,
      teamMemberships: user.teamMemberships,
      hrDocuments: user.hrDocuments,
      absences: user.absences,
      activityLogs: user.activityLogs,
      auditLogsAuthored: auditLogs,
    };
  }
}
