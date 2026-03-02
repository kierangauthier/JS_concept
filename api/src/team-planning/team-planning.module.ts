import { Module } from '@nestjs/common';
import { TeamPlanningController } from './team-planning.controller';
import { TeamPlanningService } from './team-planning.service';

@Module({
  controllers: [TeamPlanningController],
  providers: [TeamPlanningService],
})
export class TeamPlanningModule {}
