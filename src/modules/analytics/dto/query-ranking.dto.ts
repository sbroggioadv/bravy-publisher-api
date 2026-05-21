import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dtos/pagination.dto';

export class QueryRankingDto extends PaginationDto {
  @IsOptional()
  @IsString()
  sortBy?: string = 'engagementRate';

  @IsOptional()
  @IsString()
  persona?: string;

  @IsOptional()
  @IsString()
  pattern?: string;
}
