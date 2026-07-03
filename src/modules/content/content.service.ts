import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { QueryContentDto } from './dto/query-content.dto';
import { CreateSlideDto } from './dto/create-slide.dto';
import { UpdateSlideDto } from './dto/update-slide.dto';
import { ContentStatus } from '@prisma/client';
import { canTransition } from './content-status.machine';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: QueryContentDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { status, contentType, persona, pattern, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (status) where.status = status;
    if (contentType) where.contentType = contentType;
    if (persona) where.persona = persona;
    if (pattern) where.pattern = pattern;
    if (search) {
      where.OR = [
        { slug: { contains: search, mode: 'insensitive' } },
        { hookCapa: { contains: search, mode: 'insensitive' } },
        { caption: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          tenantId: true,
          slug: true,
          contentType: true,
          status: true,
          persona: true,
          pattern: true,
          template: true,
          hookCapa: true,
          caption: true,
          authorId: true,
          templateId: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
        },
      }),
      this.prisma.content.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, tenantId: string) {
    const content = await this.prisma.content.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        slides: { orderBy: { position: 'asc' } },
        publishTargets: true,
        generations: true,
        templateRef: true,
      },
    });

    if (!content) {
      throw new NotFoundException(`Content ${id} not found`);
    }

    return content;
  }

  async create(dto: CreateContentDto, tenantId: string, authorId: string) {
    return this.prisma.content.create({
      data: {
        ...dto,
        tenantId,
        authorId,
      },
    });
  }

  async update(id: string, tenantId: string, dto: UpdateContentDto) {
    const content = await this.ensureExists(id, tenantId);

    // merge server-side: o studio manda slidesData inteiro (patch de texto);
    // preserva `image` gravada pelo pipeline de geração quando o payload não a traz.
    const data: Record<string, any> = { ...dto };
    if (dto.slidesData !== undefined) {
      data.slidesData = this.mergeSlidesDataImages(
        content.slidesData,
        dto.slidesData,
      );
    }

    return this.prisma.content.update({
      where: { id },
      data,
    });
  }

  async transitionStatus(
    id: string,
    tenantId: string,
    targetStatus: ContentStatus,
  ) {
    const content = await this.ensureExists(id, tenantId);

    if (!canTransition(content.status, targetStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${content.status} to ${targetStatus}`,
      );
    }

    return this.prisma.content.update({
      where: { id },
      data: { status: targetStatus },
    });
  }

  async duplicate(id: string, tenantId: string, authorId: string) {
    const content = await this.prisma.content.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { slides: { orderBy: { position: 'asc' } } },
    });

    if (!content) {
      throw new NotFoundException(`Content ${id} not found`);
    }

    return this.prisma.content.create({
      data: {
        tenantId,
        slug: `${content.slug}-copy`,
        contentType: content.contentType,
        status: 'DRAFT',
        persona: content.persona,
        pattern: content.pattern,
        template: content.template,
        hookCapa: content.hookCapa,
        caption: content.caption,
        slidesData: content.slidesData ?? undefined,
        authorId,
        templateId: content.templateId,
        slides: {
          create: content.slides.map((slide) => ({
            position: slide.position,
            slideType: slide.slideType,
            bodyData: slide.bodyData as any,
          })),
        },
      },
      include: { slides: { orderBy: { position: 'asc' } } },
    });
  }

  async softDelete(id: string, tenantId: string) {
    await this.ensureExists(id, tenantId);

    return this.prisma.content.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async bulkSoftDelete(ids: string[], tenantId: string) {
    const result = await this.prisma.content.updateMany({
      where: { id: { in: ids }, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    return { deleted: result.count };
  }

  async bulkUpdateStatus(
    ids: string[],
    tenantId: string,
    status: ContentStatus,
  ) {
    const result = await this.prisma.content.updateMany({
      where: { id: { in: ids }, tenantId, deletedAt: null },
      data: { status },
    });

    return { updated: result.count };
  }

  async findSlides(contentId: string, tenantId: string) {
    await this.ensureExists(contentId, tenantId);

    return this.prisma.slide.findMany({
      where: { contentId },
      orderBy: { position: 'asc' },
    });
  }

  async createSlide(contentId: string, tenantId: string, dto: CreateSlideDto) {
    await this.ensureExists(contentId, tenantId);

    return this.prisma.slide.create({
      data: {
        contentId,
        position: dto.position,
        slideType: dto.slideType,
        bodyData: dto.bodyData,
      },
    });
  }

  async updateSlide(
    contentId: string,
    slideId: string,
    tenantId: string,
    dto: UpdateSlideDto,
  ) {
    await this.ensureExists(contentId, tenantId);

    const slide = await this.prisma.slide.findFirst({
      where: { id: slideId, contentId },
    });

    if (!slide) {
      throw new NotFoundException(`Slide ${slideId} not found`);
    }

    // merge server-side: bodyData é JSON substituído por inteiro pelo Prisma;
    // preserva `image` do registro atual quando o patch não a traz explicitamente.
    const data: Record<string, any> = { ...dto };
    if (dto.bodyData !== undefined) {
      data.bodyData = this.preserveImage(slide.bodyData, dto.bodyData);
    }

    return this.prisma.slide.update({
      where: { id: slideId },
      data,
    });
  }

  async deleteSlide(contentId: string, slideId: string, tenantId: string) {
    await this.ensureExists(contentId, tenantId);

    const slide = await this.prisma.slide.findFirst({
      where: { id: slideId, contentId },
    });

    if (!slide) {
      throw new NotFoundException(`Slide ${slideId} not found`);
    }

    return this.prisma.slide.delete({
      where: { id: slideId },
    });
  }

  /**
   * Mantém `image` do objeto atual quando o payload não a traz explicitamente.
   * Payload com `image` (mesmo null) prevalece — permite limpar/substituir de propósito.
   */
  private preserveImage(current: unknown, incoming: any): any {
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      return incoming;
    }
    if ('image' in incoming) return incoming;
    const image =
      current && typeof current === 'object' && !Array.isArray(current)
        ? (current as Record<string, unknown>).image
        : undefined;
    return image !== undefined ? { ...incoming, image } : incoming;
  }

  /** Idem para content.slidesData: preserva `image` por índice em slides[]. */
  private mergeSlidesDataImages(current: unknown, incoming: any): any {
    if (
      !incoming ||
      typeof incoming !== 'object' ||
      !Array.isArray(incoming.slides)
    ) {
      return incoming;
    }
    const currentSlides =
      current && typeof current === 'object' && Array.isArray((current as any).slides)
        ? ((current as any).slides as unknown[])
        : [];
    return {
      ...incoming,
      slides: incoming.slides.map((slide: any, idx: number) =>
        this.preserveImage(currentSlides[idx], slide),
      ),
    };
  }

  private async ensureExists(id: string, tenantId: string) {
    const content = await this.prisma.content.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!content) {
      throw new NotFoundException(`Content ${id} not found`);
    }

    return content;
  }
}
