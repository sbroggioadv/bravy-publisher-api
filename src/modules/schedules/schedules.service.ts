import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.publishTarget.findMany({
      where: {
        status: 'PENDING',
        content: { tenantId },
      },
      include: {
        content: true,
        socialAccount: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async create(tenantId: string, dto: CreateScheduleDto) {
    const content = await this.prisma.content.findFirst({
      where: { id: dto.contentId, tenantId },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    return this.prisma.publishTarget.create({
      data: {
        contentId: dto.contentId,
        socialAccountId: dto.socialAccountId,
        scheduledAt: new Date(dto.scheduledAt),
        status: 'PENDING',
      },
      include: {
        content: true,
        socialAccount: true,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateScheduleDto) {
    const target = await this.prisma.publishTarget.findFirst({
      where: {
        id,
        content: { tenantId },
      },
    });

    if (!target) {
      throw new NotFoundException('Schedule not found');
    }

    if (target.status !== 'PENDING') {
      throw new BadRequestException(
        'Only PENDING schedules can be updated',
      );
    }

    return this.prisma.publishTarget.update({
      where: { id },
      data: {
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
      include: {
        content: true,
        socialAccount: true,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const target = await this.prisma.publishTarget.findFirst({
      where: {
        id,
        content: { tenantId },
      },
    });

    if (!target) {
      throw new NotFoundException('Schedule not found');
    }

    if (target.status !== 'PENDING') {
      throw new BadRequestException(
        'Only PENDING schedules can be deleted',
      );
    }

    return this.prisma.publishTarget.delete({
      where: { id },
    });
  }
}
