import {
  IsOptional,
  Min,
  Max,
  IsUUID,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

import { LICENSE_QUERY_DEFAULTS } from 'src/mkt-core/oauth2-client/constants';
import {
  LICENSE_STATUS,
  LicenseStatusType,
} from 'src/mkt-core/oauth2-client/license/types';

/**
 * Get Licenses Query DTO
 * Query parameters cho OAuth endpoint GET /api/oauth/licenses
 * Hỗ trợ pagination, filtering by user, product, status
 */
export class QueryLicensesDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsEnum(LICENSE_STATUS, { message: 'Invalid license status' })
  status?: LicenseStatusType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = LICENSE_QUERY_DEFAULTS.PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(LICENSE_QUERY_DEFAULTS.MAX_LIMIT)
  limit?: number = LICENSE_QUERY_DEFAULTS.LIMIT;
}

// Query params type for HTTP request
export type QueryLicensesParams = {
  userId?: string;
  productId?: string;
  status?: LicenseStatusType;
  page?: number;
  limit?: number;
};
