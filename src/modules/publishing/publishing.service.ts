import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { PublishAdapterRegistry } from './adapters/adapter-registry';

@Injectable()
export class PublishingService {
  private readonly logger = new Logger(PublishingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterRegistry: PublishAdapterRegistry,
    @InjectQueue('publish') private readonly publishQueue: Queue,
  ) {}

  async enqueuePublish(contentId: string, socialAccountId: string, scheduledAt?: Date) {
    const publishTarget = await this.prisma.publishTarget.create({
      data: {
        contentId,
        socialAccountId,
        status: 'PENDING',
        scheduledAt,
      },
    });

    if (!scheduledAt) {
      await this.publishQueue.add('publish-content', {
        publishTargetId: publishTarget.id,
      });
    }

    return publishTarget;
  }

  async publish(publishTargetId: string) {
    const target = await this.prisma.publishTarget.findUniqueOrThrow({
      where: { id: publishTargetId },
      include: {
        content: { include: { slides: { orderBy: { position: 'asc' } } } },
        socialAccount: true,
      },
    });

    const imageUrls = target.content.slides
      .filter(s => s.imageUrl)
      .map(s => s.imageUrl!);

    if (imageUrls.length < 2) {
      throw new Error(`Content ${target.contentId} has fewer than 2 rendered slides`);
    }

    const adapter = this.adapterRegistry.get(target.socialAccount.platform);

    const result = await adapter.publishCarousel({
      imageUrls,
      caption: target.content.caption || '',
      accountId: target.socialAccount.accountId,
      accessToken: target.socialAccount.accessToken,
    });

    await this.prisma.publishTarget.update({
      where: { id: publishTargetId },
      data: {
        status: 'COMPLETED',
        externalMediaId: result.externalMediaId,
        publishedAt: result.publishedAt,
      },
    });

    await this.prisma.content.update({
      where: { id: target.contentId },
      data: { status: 'PUBLISHED' },
    });

    return result;
  }
}
