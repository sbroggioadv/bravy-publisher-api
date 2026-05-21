import { IsOptional, IsDateString } from 'class-validator';

export class UpdateScheduleDto {
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
