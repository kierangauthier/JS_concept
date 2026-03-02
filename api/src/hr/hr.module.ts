import { Module } from '@nestjs/common';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';
import { MinioService } from './minio.service';

@Module({
  controllers: [HrController],
  providers: [HrService, MinioService],
  exports: [MinioService],
})
export class HrModule {}
