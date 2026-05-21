import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { QueryDashboardDto } from './dto/query-dashboard.dto';
import { QueryRankingDto } from './dto/query-ranking.dto';
import { QueryComparisonDto } from './dto/query-comparison.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  async dashboard(
    @CurrentUser() user: { userId: string; tenantId: string },
    @Query() dto: QueryDashboardDto,
  ) {
    return this.analyticsService.dashboard(user.tenantId, dto);
  }

  @Get('ranking')
  async ranking(
    @CurrentUser() user: { userId: string; tenantId: string },
    @Query() dto: QueryRankingDto,
  ) {
    return this.analyticsService.ranking(user.tenantId, dto);
  }

  @Get('comparison')
  async comparison(
    @CurrentUser() user: { userId: string; tenantId: string },
    @Query() dto: QueryComparisonDto,
  ) {
    return this.analyticsService.comparison(user.tenantId, dto);
  }
}
