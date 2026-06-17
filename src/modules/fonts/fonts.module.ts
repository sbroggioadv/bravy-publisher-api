import { Module } from '@nestjs/common';
import { FontsController } from './fonts.controller';
import { FontCatalogService } from './font-catalog.service';

@Module({
  controllers: [FontsController],
  providers: [FontCatalogService],
  exports: [FontCatalogService],
})
export class FontsModule {}
