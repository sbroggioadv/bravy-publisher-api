import { Controller, Post, Param, Body } from '@nestjs/common';
import { GenerationService } from './generation.service';
import { GenerateDto } from './dto/generate.dto';

@Controller('generation')
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  @Post('generate')
  async generate(@Body() dto: GenerateDto) {
    // TODO: extract tenantId and authorId from JWT when auth is wired up
    const tenantId = 'default-tenant';
    return this.generationService.generate(dto, tenantId);
  }

  @Post('regenerate/:id')
  async regenerate(@Param('id') id: string) {
    return this.generationService.regenerate(id);
  }
}
