import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Platform } from '@prisma/client';

export class CreateSocialAccountDto {
  @ApiProperty({ enum: Platform, example: 'INSTAGRAM' })
  @IsEnum(Platform)
  platform: Platform;

  @ApiProperty({ example: '@minha_conta' })
  @IsString()
  @IsNotEmpty()
  accountName: string;

  @ApiProperty({ example: '17841400123456789' })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({ example: 'EAAGm...' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  tokenExpiresAt?: string;
}
