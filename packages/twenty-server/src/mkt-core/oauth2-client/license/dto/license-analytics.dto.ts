import { IsOptional, IsUUID, IsISO8601, IsEnum } from 'class-validator';

import {
  ANALYTICS_GROUP_BY,
  AnalyticsGroupByType,
} from 'src/mkt-core/oauth2-client/license/types';

/**
 * License Analytics Query DTO
 * Query parameters cho license analytics endpoint
 * GET /api/oauth/licenses/analytics
 */
export class LicenseAnalyticsQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsOptional()
  @IsEnum(ANALYTICS_GROUP_BY, {
    message: 'Invalid groupBy value. Must be: day, week, or month',
  })
  groupBy?: AnalyticsGroupByType;
}

// Type for API query params
export type LicenseAnalyticsQueryParams = {
  productId?: string;
  startDate?: string;
  endDate?: string;
  groupBy?: AnalyticsGroupByType;
};
