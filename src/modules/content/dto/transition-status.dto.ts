import { IsEnum } from 'class-validator';
import { ContentStatus } from '@prisma/client';

export class TransitionStatusDto {
  @IsEnum(ContentStatus)
  targetStatus: ContentStatus;
}
