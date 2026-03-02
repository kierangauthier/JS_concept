import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobPhotosService } from './job-photos.service';
import { HrModule } from '../hr/hr.module';

@Module({
  imports: [HrModule],
  controllers: [JobsController],
  providers: [JobsService, JobPhotosService],
  exports: [JobsService],
})
export class JobsModule {}
