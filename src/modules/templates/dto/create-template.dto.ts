import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TemplateFamily } from '@prisma/client';

export class CreateTemplateDto {
  @ApiProperty({ example: 'step-dark-v1' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ enum: TemplateFamily, example: 'STEP' })
  @IsEnum(TemplateFamily)
  family: TemplateFamily;

  @ApiPropertyOptional({ example: 'contador' })
  @IsOptional()
  @IsString()
  persona?: string;

  @ApiProperty({ example: '<div class="slide">{{content}}</div>' })
  @IsString()
  @IsNotEmpty()
  htmlContent: string;

  @ApiPropertyOptional({ example: { '--accent': '#00FF88', '--bg': '#111' } })
  @IsOptional()
  @IsObject()
  cssVariables?: Record<string, string>;
}
