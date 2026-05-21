import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PublishCronService {
  private readonly logger = new Logger(PublishCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('* * * * *')
  async handlePendingPublishes() {
    const now = new Date();

    const targets = await this.prisma.publishTarget.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: now },
      },
    });

    if (targets.length === 0) return;

    this.logger.log(`Found ${targets.length} target(s) ready to publish`);

    const ids = targets.map((t) => t.id);

    await this.prisma.publishTarget.updateMany({
      where: { id: { in: ids } },
      data: { status: 'PROCESSING' },
    });

    this.logger.log(`Moved ${ids.length} target(s) to PROCESSING`);
  }
}
