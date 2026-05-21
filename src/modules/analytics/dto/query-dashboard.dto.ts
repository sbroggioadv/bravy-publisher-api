import { IsOptional, IsIn, IsUUID } from 'class-validator';

export class QueryDashboardDto {
  @IsOptional()
  @IsIn(['7d', '30d', '60d', '90d'])
  period?: string = '30d';

  @IsOptional()
  @IsUUID()
  socialAccountId?: string;
}
