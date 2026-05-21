import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PublishingController } from './publishing.controller';
import { PublishingService } from './publishing.service';
import { PublishingProcessor } from './publishing.processor';
import { InstagramClient } from './adapters/instagram-client';
import { LinkedInClient } from './adapters/linkedin-client';
import { PublishAdapterRegistry } from './adapters/adapter-registry';

@Module({
  imports: [BullModule.registerQueue({ name: 'publish' })],
  controllers: [PublishingController],
  providers: [
    InstagramClient,
    LinkedInClient,
    PublishAdapterRegistry,
    PublishingService,
    PublishingProcessor,
  ],
  exports: [PublishingService],
})
export class PublishingModule {}
