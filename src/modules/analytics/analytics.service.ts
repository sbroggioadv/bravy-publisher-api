import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QueryDashboardDto } from './dto/query-dashboard.dto';
import { QueryRankingDto } from './dto/query-ranking.dto';
import { QueryComparisonDto } from './dto/query-comparison.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(tenantId: string, dto: QueryDashboardDto) {
    const period = dto.period ?? '30d';
    const days = parseInt(period.replace('d', ''), 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: any = {
      status: 'COMPLETED',
      publishedAt: { gte: since },
      content: { tenantId },
    };

    if (dto.socialAccountId) {
      where.socialAccountId = dto.socialAccountId;
    }

    const targets = await this.prisma.publishTarget.findMany({
      where,
      include: {
        analytics: {
          orderBy: { fetchedAt: 'desc' },
          take: 1,
        },
        content: true,
      },
      orderBy: { publishedAt: 'asc' },
    });

    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalSaves = 0;
    let totalReach = 0;
    let totalImpressions = 0;
    let engagementSum = 0;
    let engagementCount = 0;

    const timeSeriesMap = new Map<
      string,
      { date: string; likes: number; comments: number; shares: number; saves: number; reach: number; impressions: number }
    >();

    for (const target of targets) {
      const latest = target.analytics[0];
      if (!latest) continue;

      totalLikes += latest.likes;
      totalComments += latest.comments;
      totalShares += latest.shares;
      totalSaves += latest.saves;
      totalReach += latest.reach;
      totalImpressions += latest.impressions;

      if (latest.engagementRate !== null) {
        engagementSum += latest.engagementRate;
        engagementCount++;
      }

      const dateKey = target.publishedAt
        ? target.publishedAt.toISOString().slice(0, 10)
        : 'unknown';

      const existing = timeSeriesMap.get(dateKey) || {
        date: dateKey,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        reach: 0,
        impressions: 0,
      };

      existing.likes += latest.likes;
      existing.comments += latest.comments;
      existing.shares += latest.shares;
      existing.saves += latest.saves;
      existing.reach += latest.reach;
      existing.impressions += latest.impressions;

      timeSeriesMap.set(dateKey, existing);
    }

    return {
      cards: {
        totalPosts: targets.length,
        totalLikes,
        totalComments,
        totalShares,
        totalSaves,
        totalReach,
        totalImpressions,
        avgEngagementRate:
          engagementCount > 0 ? engagementSum / engagementCount : 0,
      },
      timeSeries: Array.from(timeSeriesMap.values()),
    };
  }

  async ranking(tenantId: string, dto: QueryRankingDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const contentWhere: any = { tenantId };
    if (dto.persona) contentWhere.persona = dto.persona;
    if (dto.pattern) contentWhere.pattern = dto.pattern;

    const sortField = dto.sortBy || 'engagementRate';

    const targets = await this.prisma.publishTarget.findMany({
      where: {
        status: 'COMPLETED',
        content: contentWhere,
      },
      include: {
        analytics: {
          orderBy: { fetchedAt: 'desc' },
          take: 1,
        },
        content: true,
        socialAccount: true,
      },
    });

    const ranked = targets
      .filter((t) => t.analytics.length > 0)
      .map((t) => ({
        publishTargetId: t.id,
        content: t.content,
        socialAccount: t.socialAccount,
        analytics: t.analytics[0],
      }))
      .sort((a, b) => {
        const aVal = (a.analytics as any)[sortField] ?? 0;
        const bVal = (b.analytics as any)[sortField] ?? 0;
        return bVal - aVal;
      });

    const total = ranked.length;
    const data = ranked.slice(skip, skip + limit);

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

  async comparison(tenantId: string, dto: QueryComparisonDto) {
    const ids = dto.contentIds.split(',').map((id) => id.trim());
    const metric = dto.metric || 'engagementRate';

    const targets = await this.prisma.publishTarget.findMany({
      where: {
        content: {
          id: { in: ids },
          tenantId,
        },
        status: 'COMPLETED',
      },
      include: {
        analytics: {
          orderBy: { fetchedAt: 'desc' },
          take: 1,
        },
        content: true,
      },
    });

    return targets.map((t) => ({
      contentId: t.contentId,
      contentSlug: t.content.slug,
      publishTargetId: t.id,
      metric,
      value: t.analytics[0] ? (t.analytics[0] as any)[metric] ?? 0 : 0,
      analytics: t.analytics[0] || null,
    }));
  }
}
