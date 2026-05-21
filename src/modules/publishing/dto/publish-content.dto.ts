import { IsUUID, IsOptional, IsDateString } from 'class-validator';

export class PublishContentDto {
  @IsUUID()
  socialAccountId: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
