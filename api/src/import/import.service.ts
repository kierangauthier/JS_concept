import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createId } from '@paralleldrive/cuid2';
import { decodeCSV } from './encoding';
import * as Minio from 'minio';
import { createHash } from 'crypto';

// ─── Types ──────────────────────────────────────────

type ImportType = 'clients' | 'suppliers' | 'jobs' | 'invoices';

interface ImportError {
  line: number;
  message: string;
}

interface SoftMatch {
  line: number;
  csvRow: Record<string, string>;
  matchedEntity: { id: string; name: string; city?: string; email?: string };
  score: number;
  suggestedAction: 'merge' | 'skip';
}

interface PreviewResult {
  fileKey: string;
  checksum: string;
  valid: Record<string, string>[];
  errors: ImportError[];
  duplicates: SoftMatch[];
  total: number;
}

interface DuplicateAction {
  line: number;
  action: 'merge' | 'skip' | 'create';
  mergePolicy?: 'safe' | 'overwrite';
}

interface ExecuteResult {
  imported: number;
  merged: number;
  skipped: number;
  errors: string[];
}

// ─── Service ────────────────────────────────────────

@Injectable()
export class ImportService {
  private minio!: Minio.Client;
  private bucket = 'concept-imports';

  constructor(private prisma: PrismaService) {
    this.minio = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      useSSL: false,
    });
  }

  async onModuleInit() {
    try {
      const exists = await this.minio.bucketExists(this.bucket);
      if (!exists) await this.minio.makeBucket(this.bucket);
    } catch (err: any) {
      console.error(`[Import] MinIO bucket init failed: ${err.message}`);
    }
  }

  // ─── Templates ──────────────────────────────────────

  getTemplate(type: ImportType): string {
    const templates: Record<ImportType, string> = {
      clients:
        'externalRef;nom;contact;email;telephone;adresse;ville;code_postal;type\n' +
        'CLI-001;Mairie de Lyon;Jean Dupont;jean@lyon.fr;0472000000;1 Place Bellecour;Lyon;69002;public\n',
      suppliers:
        'externalRef;nom;contact;email;telephone;categorie\n' +
        'FRN-001;Signaux Girod;Service commercial;contact@girod.fr;0474000000;Panneaux\n',
      jobs:
        'externalRef;reference;titre;client_ref;adresse;statut;date_debut;date_fin;taux_horaire;heures_estimees;montant_devis\n' +
        'CHT-001;CHT-2024-001;Signalisation RD45;CLI-001;RD45 km12;in_progress;2024-06-01;2024-09-30;45,00;200;15000,00\n',
      invoices:
        'externalRef;reference;client_ref;montant_ht;taux_tva;date_emission;date_echeance;date_paiement;chantier_ref\n' +
        'FAC-LEG-001;FAC-2024-001;CLI-001;5000,00;20;2024-03-15;2024-04-15;2024-04-20;CHT-001\n',
    };
    return templates[type];
  }

  // ─── Preview ────────────────────────────────────────

  async preview(
    fileBuffer: Buffer,
    type: ImportType,
    companyId: string,
  ): Promise<PreviewResult> {
    const content = decodeCSV(fileBuffer);
    const checksum = createHash('sha256').update(content).digest('hex');
    const fileKey = `imports/${companyId}/${checksum}.csv`;

    // Store in MinIO for later execute
    await this.minio.putObject(
      this.bucket,
      fileKey,
      Buffer.from(content, 'utf-8'),
      undefined,
      { 'Content-Type': 'text/csv; charset=utf-8' },
    );

    const lines = content.split('\n').filter((l) => l.trim());
    if (lines.length < 2) {
      throw new BadRequestException('Le fichier CSV est vide');
    }

    const dataLines = lines.slice(1); // skip header
    const valid: Record<string, string>[] = [];
    const errors: ImportError[] = [];
    const duplicates: SoftMatch[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const lineNum = i + 2; // 1-indexed, header = line 1
      const cols = dataLines[i].split(';').map((c) => c.trim());

      try {
        const row = this.parseRow(type, cols, lineNum);

        // Validate references (FK)
        if (type === 'jobs' && row.client_ref) {
          const client = await this.findByExternalRef('client', row.client_ref, companyId);
          if (!client) {
            errors.push({ line: lineNum, message: `Client "${row.client_ref}" introuvable` });
            continue;
          }
        }
        if (type === 'invoices' && row.client_ref) {
          const client = await this.findByExternalRef('client', row.client_ref, companyId);
          if (!client) {
            errors.push({ line: lineNum, message: `Client "${row.client_ref}" introuvable` });
            continue;
          }
        }
        if (type === 'invoices' && row.chantier_ref) {
          const job = await this.findByExternalRef('job', row.chantier_ref, companyId);
          if (!job) {
            errors.push({ line: lineNum, message: `Chantier "${row.chantier_ref}" introuvable` });
            continue;
          }
        }

        // Check deduplication
        if (row.externalRef) {
          // Deterministic — will upsert, no user action needed
          valid.push(row);
        } else {
          // Soft matching required
          const match = await this.softMatch(type, row, companyId);
          if (match) {
            duplicates.push({
              line: lineNum,
              csvRow: row,
              matchedEntity: match.entity,
              score: match.score,
              suggestedAction: match.score >= 75 ? 'merge' : 'skip',
            });
          } else {
            valid.push(row);
          }
        }
      } catch (err: any) {
        errors.push({ line: lineNum, message: err.message });
      }
    }

    return { fileKey, checksum, valid, errors, duplicates, total: dataLines.length };
  }

  // ─── Execute ────────────────────────────────────────

  async execute(
    type: ImportType,
    fileKey: string,
    checksum: string,
    companyId: string,
    duplicateActions: DuplicateAction[],
  ): Promise<ExecuteResult> {
    // Retrieve file from MinIO
    const stream = await this.minio.getObject(this.bucket, fileKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const content = Buffer.concat(chunks).toString('utf-8');

    // Verify checksum
    const actualChecksum = createHash('sha256').update(content).digest('hex');
    if (actualChecksum !== checksum) {
      throw new ConflictException(
        'Checksum mismatch — le fichier a été modifié entre le preview et l\'exécution',
      );
    }

    const lines = content.split('\n').filter((l) => l.trim());
    const dataLines = lines.slice(1);

    const actionMap = new Map(duplicateActions.map((a) => [a.line, a]));
    let imported = 0;
    let merged = 0;
    let skipped = 0;
    const errorMessages: string[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const lineNum = i + 2;
      const cols = dataLines[i].split(';').map((c) => c.trim());

      try {
        const row = this.parseRow(type, cols, lineNum);

        if (row.externalRef) {
          // Deterministic upsert
          await this.upsertByExternalRef(type, row, companyId);
          imported++;
        } else {
          // Check if this line was a duplicate
          const action = actionMap.get(lineNum);
          if (!action) {
            // Check if it needs an action (was it a duplicate?)
            const match = await this.softMatch(type, row, companyId);
            if (match) {
              // No action provided for a duplicate — skip
              errorMessages.push(
                `Ligne ${lineNum}: doublon potentiel sans décision — ignoré`,
              );
              skipped++;
              continue;
            }
            // No match, no externalRef → create new
            await this.createNew(type, row, companyId);
            imported++;
          } else if (action.action === 'skip') {
            skipped++;
          } else if (action.action === 'create') {
            await this.createNew(type, row, companyId);
            imported++;
          } else if (action.action === 'merge') {
            const match = await this.softMatch(type, row, companyId);
            if (match) {
              const policy = action.mergePolicy || 'safe';
              await this.mergeInto(type, match.entity.id, row, companyId, policy);
              merged++;
            } else {
              await this.createNew(type, row, companyId);
              imported++;
            }
          }
        }
      } catch (err: any) {
        errorMessages.push(`Ligne ${lineNum}: ${err.message}`);
        skipped++;
      }
    }

    // Cleanup file from MinIO
    try {
      await this.minio.removeObject(this.bucket, fileKey);
    } catch {}

    return { imported, merged, skipped, errors: errorMessages };
  }

  // ─── Row parsing ────────────────────────────────────

  private parseRow(
    type: ImportType,
    cols: string[],
    lineNum: number,
  ): Record<string, string> {
    switch (type) {
      case 'clients':
        return this.parseClientRow(cols, lineNum);
      case 'suppliers':
        return this.parseSupplierRow(cols, lineNum);
      case 'jobs':
        return this.parseJobRow(cols, lineNum);
      case 'invoices':
        return this.parseInvoiceRow(cols, lineNum);
      default:
        throw new BadRequestException(`Type "${type}" non supporté`);
    }
  }

  private parseClientRow(cols: string[], line: number): Record<string, string> {
    if (cols.length < 8) throw new Error('Nombre de colonnes insuffisant (min 8)');
    const [externalRef, nom, contact, email, telephone, adresse, ville, code_postal, type] = cols;
    if (!nom) throw new Error('Le champ "nom" est requis');
    if (email && !this.isValidEmail(email)) throw new Error(`Email invalide "${email}"`);
    const clientType = (type || 'private').toLowerCase();
    if (!['public', 'private'].includes(clientType)) {
      throw new Error(`Type invalide "${type}" (public ou private)`);
    }
    return { externalRef, nom, contact, email, telephone, adresse, ville, code_postal, type: clientType };
  }

  private parseSupplierRow(cols: string[], line: number): Record<string, string> {
    if (cols.length < 5) throw new Error('Nombre de colonnes insuffisant (min 5)');
    const [externalRef, nom, contact, email, telephone, categorie] = cols;
    if (!nom) throw new Error('Le champ "nom" est requis');
    if (email && !this.isValidEmail(email)) throw new Error(`Email invalide "${email}"`);
    return { externalRef, nom, contact: contact || '', email: email || '', telephone: telephone || '', categorie: categorie || '' };
  }

  private parseJobRow(cols: string[], line: number): Record<string, string> {
    if (cols.length < 6) throw new Error('Nombre de colonnes insuffisant (min 6)');
    const [externalRef, reference, titre, client_ref, adresse, statut, date_debut, date_fin, taux_horaire, heures_estimees, montant_devis] = cols;
    if (!titre) throw new Error('Le champ "titre" est requis');
    if (!reference) throw new Error('Le champ "reference" est requis');
    const status = (statut || 'planned').toLowerCase();
    if (!['planned', 'in_progress', 'completed', 'paused'].includes(status)) {
      throw new Error(`Statut invalide "${statut}"`);
    }
    if (date_debut && isNaN(Date.parse(date_debut))) throw new Error(`Date début invalide "${date_debut}"`);
    return {
      externalRef, reference, titre, client_ref: client_ref || '', adresse: adresse || '',
      statut: status, date_debut: date_debut || '', date_fin: date_fin || '',
      taux_horaire: taux_horaire || '', heures_estimees: heures_estimees || '',
      montant_devis: montant_devis || '',
    };
  }

  private parseInvoiceRow(cols: string[], line: number): Record<string, string> {
    if (cols.length < 7) throw new Error('Nombre de colonnes insuffisant (min 7)');
    const [externalRef, reference, client_ref, montant_ht, taux_tva, date_emission, date_echeance, date_paiement, chantier_ref] = cols;
    if (!reference) throw new Error('Le champ "reference" est requis');
    if (!montant_ht) throw new Error('Le champ "montant_ht" est requis');
    const amount = this.parseDecimal(montant_ht);
    if (isNaN(amount)) throw new Error(`Montant invalide "${montant_ht}"`);
    if (date_emission && isNaN(Date.parse(date_emission))) throw new Error(`Date émission invalide "${date_emission}"`);
    return {
      externalRef, reference, client_ref: client_ref || '', montant_ht,
      taux_tva: taux_tva || '20', date_emission: date_emission || '',
      date_echeance: date_echeance || '', date_paiement: date_paiement || '',
      chantier_ref: chantier_ref || '',
    };
  }

  // ─── Soft matching ──────────────────────────────────

  private async softMatch(
    type: ImportType,
    row: Record<string, string>,
    companyId: string,
  ): Promise<{ entity: { id: string; name: string; city?: string; email?: string }; score: number } | null> {
    if (type === 'clients') {
      return this.softMatchClient(row, companyId);
    }
    if (type === 'suppliers') {
      return this.softMatchSupplier(row, companyId);
    }
    // Jobs and invoices use reference as natural key — no soft matching
    return null;
  }

  private async softMatchClient(
    row: Record<string, string>,
    companyId: string,
  ) {
    const clients = await this.prisma.client.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true, name: true, city: true, email: true },
    });

    for (const entity of clients) {
      let score = 0;
      if (this.normalize(row.nom) === this.normalize(entity.name)) score += 50;
      if (row.ville && this.normalize(row.ville) === this.normalize(entity.city)) score += 25;
      if (row.email && this.normalize(row.email) === this.normalize(entity.email)) score += 25;
      if (score >= 50) {
        return { entity, score };
      }
    }
    return null;
  }

  private async softMatchSupplier(
    row: Record<string, string>,
    companyId: string,
  ) {
    const suppliers = await this.prisma.supplier.findMany({
      where: { companyId },
      select: { id: true, name: true, email: true },
    });

    for (const entity of suppliers) {
      let score = 0;
      if (this.normalize(row.nom) === this.normalize(entity.name)) score += 50;
      if (row.email && this.normalize(row.email) === this.normalize(entity.email)) score += 25;
      if (score >= 50) {
        return { entity: { ...entity, city: undefined }, score };
      }
    }
    return null;
  }

  // ─── Upsert by externalRef ──────────────────────────

  private async upsertByExternalRef(
    type: ImportType,
    row: Record<string, string>,
    companyId: string,
  ) {
    switch (type) {
      case 'clients':
        return this.upsertClient(row, companyId);
      case 'suppliers':
        return this.upsertSupplier(row, companyId);
      case 'jobs':
        return this.upsertJob(row, companyId);
      case 'invoices':
        return this.upsertInvoice(row, companyId);
    }
  }

  private async upsertClient(row: Record<string, string>, companyId: string) {
    const data = {
      name: row.nom,
      contact: row.contact || '',
      email: row.email || '',
      phone: row.telephone || '',
      address: row.adresse || '',
      city: row.ville || '',
      type: row.type as any,
      externalRef: row.externalRef,
    };

    const existing = await this.prisma.client.findUnique({
      where: { companyId_externalRef: { companyId, externalRef: row.externalRef } },
    });

    if (existing) {
      await this.prisma.client.update({
        where: { id: existing.id },
        data: { ...data, deletedAt: null },
      });
    } else {
      await this.prisma.client.create({
        data: { id: createId(), ...data, companyId },
      });
    }
  }

  private async upsertSupplier(row: Record<string, string>, companyId: string) {
    const data = {
      name: row.nom,
      contact: row.contact || '',
      email: row.email || '',
      phone: row.telephone || '',
      category: row.categorie || '',
      externalRef: row.externalRef,
    };

    const existing = await this.prisma.supplier.findUnique({
      where: { companyId_externalRef: { companyId, externalRef: row.externalRef } },
    });

    if (existing) {
      await this.prisma.supplier.update({ where: { id: existing.id }, data });
    } else {
      await this.prisma.supplier.create({
        data: { id: createId(), ...data, companyId },
      });
    }
  }

  private async upsertJob(row: Record<string, string>, companyId: string) {
    // Resolve client FK
    let clientId: string | undefined;
    if (row.client_ref) {
      const client = await this.findByExternalRef('client', row.client_ref, companyId);
      if (client) clientId = client.id;
    }

    const data: any = {
      reference: row.reference,
      title: row.titre,
      address: row.adresse || '',
      status: row.statut as any,
      startDate: row.date_debut ? new Date(row.date_debut) : new Date(),
      externalRef: row.externalRef,
    };
    if (row.date_fin) data.endDate = new Date(row.date_fin);
    if (row.taux_horaire) data.hourlyRate = this.parseDecimal(row.taux_horaire);
    if (row.heures_estimees) data.estimatedHours = this.parseDecimal(row.heures_estimees);
    if (clientId) data.clientId = clientId;

    const existing = row.externalRef
      ? await this.prisma.job.findUnique({
          where: { companyId_externalRef: { companyId, externalRef: row.externalRef } },
        })
      : await this.prisma.job.findUnique({ where: { reference: row.reference } });

    if (existing) {
      await this.prisma.job.update({
        where: { id: existing.id },
        data: { ...data, deletedAt: null },
      });
    } else {
      await this.prisma.job.create({
        data: { id: createId(), ...data, companyId },
      });
    }
  }

  private async upsertInvoice(row: Record<string, string>, companyId: string) {
    // Resolve client FK
    let clientId: string | undefined;
    if (row.client_ref) {
      const client = await this.findByExternalRef('client', row.client_ref, companyId);
      if (client) clientId = client.id;
    }

    // Resolve job FK
    let jobId: string | undefined;
    if (row.chantier_ref) {
      const job = await this.prisma.job.findUnique({
        where: { companyId_externalRef: { companyId, externalRef: row.chantier_ref } },
      });
      if (job) jobId = job.id;
    }

    const amount = this.parseDecimal(row.montant_ht);
    const issuedAt = row.date_emission ? new Date(row.date_emission) : new Date();
    const dueDate = row.date_echeance ? new Date(row.date_echeance) : new Date();
    const paidAt = row.date_paiement ? new Date(row.date_paiement) : null;

    // Calculate status from dates (never trust imported status)
    let status: 'paid' | 'sent' | 'overdue';
    if (paidAt) {
      status = 'paid';
    } else if (dueDate < new Date()) {
      status = 'overdue';
    } else {
      status = 'sent';
    }

    const data: any = {
      reference: row.reference,
      amount,
      status,
      issuedAt,
      dueDate,
      paidAt,
      isImported: true,
      source: 'legacy',
      externalRef: row.externalRef,
      vatRate: this.parseDecimal(row.taux_tva || '20'),
    };
    if (clientId) data.clientId = clientId;
    if (jobId) data.jobId = jobId;

    const existing = row.externalRef
      ? await this.prisma.invoice.findUnique({
          where: { companyId_externalRef: { companyId, externalRef: row.externalRef } },
        })
      : await this.prisma.invoice.findFirst({
          where: { reference: row.reference, companyId },
        });

    if (existing) {
      await this.prisma.invoice.update({
        where: { id: existing.id },
        data: { ...data, deletedAt: null },
      });
    } else {
      await this.prisma.invoice.create({
        data: { id: createId(), ...data, companyId },
      });
    }
  }

  // ─── Create new (no externalRef) ────────────────────

  private async createNew(
    type: ImportType,
    row: Record<string, string>,
    companyId: string,
  ) {
    // Same as upsert but always creates
    switch (type) {
      case 'clients':
        await this.prisma.client.create({
          data: {
            id: createId(),
            name: row.nom,
            contact: row.contact || '',
            email: row.email || '',
            phone: row.telephone || '',
            address: row.adresse || '',
            city: row.ville || '',
            type: (row.type || 'private') as any,
            companyId,
          },
        });
        break;
      case 'suppliers':
        await this.prisma.supplier.create({
          data: {
            id: createId(),
            name: row.nom,
            contact: row.contact || '',
            email: row.email || '',
            phone: row.telephone || '',
            category: row.categorie || '',
            companyId,
          },
        });
        break;
      case 'jobs':
        return this.upsertJob(row, companyId);
      case 'invoices':
        return this.upsertInvoice(row, companyId);
    }
  }

  // ─── Merge ──────────────────────────────────────────

  private async mergeInto(
    type: ImportType,
    entityId: string,
    row: Record<string, string>,
    companyId: string,
    policy: 'safe' | 'overwrite',
  ) {
    if (type === 'clients') {
      const existing = await this.prisma.client.findUnique({ where: { id: entityId } });
      if (!existing) return;

      const csvData: Record<string, string> = {
        name: row.nom,
        contact: row.contact || '',
        email: row.email || '',
        phone: row.telephone || '',
        address: row.adresse || '',
        city: row.ville || '',
      };

      const updates = policy === 'safe'
        ? this.safeMerge(existing, csvData)
        : this.overwriteMerge(csvData);

      if (Object.keys(updates).length > 0) {
        await this.prisma.client.update({ where: { id: entityId }, data: updates });
      }
    } else if (type === 'suppliers') {
      const existing = await this.prisma.supplier.findUnique({ where: { id: entityId } });
      if (!existing) return;

      const csvData: Record<string, string> = {
        name: row.nom,
        contact: row.contact || '',
        email: row.email || '',
        phone: row.telephone || '',
        category: row.categorie || '',
      };

      const updates = policy === 'safe'
        ? this.safeMerge(existing, csvData)
        : this.overwriteMerge(csvData);

      if (Object.keys(updates).length > 0) {
        await this.prisma.supplier.update({ where: { id: entityId }, data: updates });
      }
    }
  }

  private safeMerge(existing: any, csvData: Record<string, string>): Record<string, string> {
    const updates: Record<string, string> = {};
    for (const [key, value] of Object.entries(csvData)) {
      if (!value) continue;
      const existingValue = existing[key];
      if (existingValue == null || existingValue === '') {
        updates[key] = value;
      }
    }
    return updates;
  }

  private overwriteMerge(csvData: Record<string, string>): Record<string, string> {
    const updates: Record<string, string> = {};
    for (const [key, value] of Object.entries(csvData)) {
      if (!value) continue;
      updates[key] = value;
    }
    return updates;
  }

  // ─── Helpers ────────────────────────────────────────

  private async findByExternalRef(
    entity: 'client' | 'supplier' | 'job',
    externalRef: string,
    companyId: string,
  ): Promise<{ id: string } | null> {
    switch (entity) {
      case 'client':
        return this.prisma.client.findUnique({
          where: { companyId_externalRef: { companyId, externalRef } },
          select: { id: true },
        });
      case 'supplier':
        return this.prisma.supplier.findUnique({
          where: { companyId_externalRef: { companyId, externalRef } },
          select: { id: true },
        });
      case 'job':
        return this.prisma.job.findUnique({
          where: { companyId_externalRef: { companyId, externalRef } },
          select: { id: true },
        });
      default:
        return null;
    }
  }

  private normalize(s: string | null | undefined): string {
    return (s ?? '')
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  private parseDecimal(s: string): number {
    return parseFloat(s.replace(/\s/g, '').replace(',', '.'));
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
