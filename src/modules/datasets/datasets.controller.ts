import { Controller, Get, Param, Query } from '@nestjs/common';
import { DatasetsService } from './datasets.service';
import { QueryDatasetDto } from './dto/query-dataset.dto';

@Controller('datasets')
export class DatasetsController {
  constructor(private readonly datasetsService: DatasetsService) {}

  @Get('patterns')
  async findPatterns() {
    return this.datasetsService.findPatterns();
  }

  @Get('vocab/:persona')
  async findVocab(@Param('persona') persona: string) {
    return this.datasetsService.findVocabByPersona(persona);
  }

  @Get('top-posts')
  async findTopPosts(@Query() query: QueryDatasetDto) {
    return this.datasetsService.findTopPosts(query.limit || 50);
  }
}
