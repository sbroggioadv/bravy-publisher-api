import { IsString, IsOptional } from 'class-validator';

export class QueryComparisonDto {
  @IsString()
  contentIds: string;

  @IsOptional()
  @IsString()
  metric?: string = 'engagementRate';
}
