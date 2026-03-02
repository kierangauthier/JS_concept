import { Module } from '@nestjs/common';
import { AmendmentsController } from './amendments.controller';
import { AmendmentsService } from './amendments.service';

@Module({
  controllers: [AmendmentsController],
  providers: [AmendmentsService],
  exports: [AmendmentsService],
})
export class AmendmentsModule {}
