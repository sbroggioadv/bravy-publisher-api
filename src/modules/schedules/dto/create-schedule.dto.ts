import { IsUUID, IsDateString } from 'class-validator';

export class CreateScheduleDto {
  @IsUUID()
  contentId: string;

  @IsUUID()
  socialAccountId: string;

  @IsDateString()
  scheduledAt: string;
}
