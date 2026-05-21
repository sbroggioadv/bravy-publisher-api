import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { PublishCronService } from './publish-cron.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [SchedulesController],
  providers: [SchedulesService, PublishCronService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
