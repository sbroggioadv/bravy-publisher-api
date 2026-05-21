import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { QueryTemplateDto } from './dto/query-template.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryTemplateDto) {
    const { family, persona, search } = query;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TemplateWhereInput = {};

    if (family) {
      where.family = family;
    }

    if (persona) {
      where.persona = persona;
    }

    if (search) {
      where.slug = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.template.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          slug: true,
          family: true,
          persona: true,
          cssVariables: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.template.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const template = await this.prisma.template.findUnique({ where: { id } });

    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    return template;
  }

  async preview(id: string): Promise<string> {
    const template = await this.prisma.template.findUnique({
      where: { id },
      select: { htmlContent: true },
    });

    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    return template.htmlContent;
  }

  async create(dto: CreateTemplateDto) {
    return this.prisma.template.create({ data: dto });
  }

  async update(id: string, dto: UpdateTemplateDto) {
    await this.findOne(id);

    return this.prisma.template.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.template.delete({ where: { id } });
  }
}
