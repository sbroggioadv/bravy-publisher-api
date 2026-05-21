import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TemplateFamily } from '@prisma/client';
import { PaginationDto } from '../../../common/dtos/pagination.dto';

export class QueryTemplateDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TemplateFamily })
  @IsOptional()
  @IsEnum(TemplateFamily)
  family?: TemplateFamily;

  @ApiPropertyOptional({ example: 'contador' })
  @IsOptional()
  @IsString()
  persona?: string;

  @ApiPropertyOptional({ example: 'dark' })
  @IsOptional()
  @IsString()
  search?: string;
}
