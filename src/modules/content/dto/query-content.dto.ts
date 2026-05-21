import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ContentStatus, ContentType } from '@prisma/client';
import { PaginationDto } from '../../../common/dtos/pagination.dto';

export class QueryContentDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @IsOptional()
  @IsString()
  persona?: string;

  @IsOptional()
  @IsString()
  pattern?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
