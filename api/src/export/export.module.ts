import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { DataDumpController } from './data-dump.controller';

@Module({
  controllers: [ExportController, DataDumpController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
