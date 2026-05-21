import { Module } from '@nestjs/common';
import { FactCheckService } from './fact-check.service';

@Module({
  providers: [FactCheckService],
  exports: [FactCheckService],
})
export class FactCheckModule {}
