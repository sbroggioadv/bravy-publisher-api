import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DatasetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPatterns() {
    return this.prisma.datasetEntry.findMany({
      where: { entryType: 'pattern' },
    });
  }

  async findVocabByPersona(persona: string) {
    return this.prisma.datasetEntry.findFirst({
      where: { entryType: 'vocab', persona },
    });
  }

  async findTopPosts(limit: number) {
    return this.prisma.datasetEntry.findMany({
      where: { entryType: 'top_carousel' },
      orderBy: { score: 'desc' },
      take: limit,
    });
  }
}
