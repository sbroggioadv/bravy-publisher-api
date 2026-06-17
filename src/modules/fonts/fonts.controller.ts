import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { FontCatalogService } from './font-catalog.service';

export class EnsureFontDto {
  @IsString()
  @MinLength(1)
  family: string;
}

@Controller('fonts')
export class FontsController {
  constructor(private readonly catalog: FontCatalogService) {}

  /** shortlist curada + busca no catálogo completo do Google Fonts. */
  @Get('catalog')
  async search(@Query('q') q?: string) {
    return this.catalog.search(q);
  }

  /** baixa/cacheia a família no MinIO e devolve o manifest de variantes. */
  @Post('ensure')
  async ensure(@Body() dto: EnsureFontDto) {
    return this.catalog.ensureFamily(dto.family);
  }
}
