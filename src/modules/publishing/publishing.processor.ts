import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { PublishingService } from './publishing.service';

@Processor('publish', { concurrency: 1 })
export class PublishingProcessor extends WorkerHost {
  private readonly logger = new Logger(PublishingProcessor.name);

  constructor(
    private readonly publishingService: PublishingService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<{ publishTargetId: string }>) {
    const { publishTargetId } = job.data;
    this.logger.log(`Processing publish job for target ${publishTargetId}`);

    try {
      await this.prisma.publishTarget.update({
        where: { id: publishTargetId },
        data: { status: 'PROCESSING', attempts: { increment: 1 } },
      });

      const result = await this.publishingService.publish(publishTargetId);
      this.logger.log(`Published successfully: ${result.externalMediaId}`);
      return result;
    } catch (error) {
      this.logger.error(`Publish failed: ${error.message}`);

      await this.prisma.publishTarget.update({
        where: { id: publishTargetId },
        data: {
          status: 'FAILED',
          lastError: error.message,
        },
      });

      throw error;
    }
  }
}
