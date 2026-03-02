import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Res,
  ForbiddenException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { ImportService } from './import.service';

@Controller('api/import')
@Roles('admin')
export class ImportController {
  constructor(private importService: ImportService) {}

  // ─── Download CSV template ─────────────────────────

  @Get('templates/:type')
  getTemplate(
    @Param('type') type: 'clients' | 'suppliers' | 'jobs' | 'invoices',
    @Res() res: Response,
  ) {
    const validTypes = ['clients', 'suppliers', 'jobs', 'invoices'];
    if (!validTypes.includes(type)) {
      throw new BadRequestException(`Type invalide: ${type}`);
    }

    const csv = this.importService.getTemplate(type);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="template-${type}.csv"`,
    );
    // Add UTF-8 BOM for Excel compatibility
    res.send('\uFEFF' + csv);
  }

  // ─── Preview (dry run) ─────────────────────────────

  @Post('preview')
  @UseInterceptors(FileInterceptor('file'))
  async preview(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: 'clients' | 'suppliers' | 'jobs' | 'invoices',
    @Req() req: any,
  ) {
    if (!req.companyId) {
      throw new ForbiddenException('Import impossible en vue GROUPE');
    }
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }
    const validTypes = ['clients', 'suppliers', 'jobs', 'invoices'];
    if (!validTypes.includes(type)) {
      throw new BadRequestException(`Type invalide: ${type}`);
    }

    return this.importService.preview(file.buffer, type, req.companyId);
  }

  // ─── Execute (real import) ─────────────────────────

  @Post('execute')
  async execute(
    @Body()
    body: {
      type: 'clients' | 'suppliers' | 'jobs' | 'invoices';
      fileKey: string;
      checksum: string;
      duplicateActions?: {
        line: number;
        action: 'merge' | 'skip' | 'create';
        mergePolicy?: 'safe' | 'overwrite';
      }[];
    },
    @Req() req: any,
  ) {
    if (!req.companyId) {
      throw new ForbiddenException('Import impossible en vue GROUPE');
    }
    if (!body.fileKey || !body.checksum) {
      throw new BadRequestException('fileKey et checksum requis');
    }

    return this.importService.execute(
      body.type,
      body.fileKey,
      body.checksum,
      req.companyId,
      body.duplicateActions || [],
    );
  }
}
