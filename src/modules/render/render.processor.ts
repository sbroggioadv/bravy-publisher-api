import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { RenderService } from './render.service';

@Processor('render', { concurrency: 2 })
export class RenderProcessor extends WorkerHost {
  private readonly logger = new Logger(RenderProcessor.name);

  constructor(
    private readonly renderService: RenderService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<{ contentId: string; renderJobId: string }>) {
    const { contentId, renderJobId } = job.data;
    this.logger.log(
      `Processing render job ${renderJobId} for content ${contentId}`,
    );

    try {
      await this.prisma.renderJob.update({
        where: { id: renderJobId },
        data: { status: 'PROCESSING', attempts: { increment: 1 } },
      });

      await this.prisma.content.update({
        where: { id: contentId },
        data: { status: 'GENERATING' },
      });

      const result = await this.renderService.renderToImages(contentId);

      await this.prisma.renderJob.update({
        where: { id: renderJobId },
        data: { status: 'COMPLETED' },
      });

      await this.prisma.content.update({
        where: { id: contentId },
        data: { status: 'READY' },
      });

      this.logger.log(`Render completed: ${result.slides.length} slides`);
      return result;
    } catch (error) {
      this.logger.error(`Render failed: ${error.message}`);

      await this.prisma.renderJob.update({
        where: { id: renderJobId },
        data: {
          status: 'FAILED',
          error: error.message,
        },
      });

      await this.prisma.content.update({
        where: { id: contentId },
        data: { status: 'FAILED' },
      });

      throw error;
    }
  }
}
