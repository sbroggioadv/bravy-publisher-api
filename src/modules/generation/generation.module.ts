import { Module } from '@nestjs/common';
import { FactCheckModule } from '../fact-check/fact-check.module';
import { GenerationController } from './generation.controller';
import { GenerationService } from './generation.service';

@Module({
  imports: [FactCheckModule],
  controllers: [GenerationController],
  providers: [GenerationService],
  exports: [GenerationService],
})
export class GenerationModule {}
