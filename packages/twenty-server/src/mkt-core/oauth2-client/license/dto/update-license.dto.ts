import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsEnum,
  IsObject,
  IsString,
  MinLength,
  MaxLength,
  IsUUID,
  ValidateIf,
} from 'class-validator';

import { LICENSE_MAX_DEVICES_LIMITS } from 'src/mkt-core/oauth2-client/constants';
import {
  LICENSE_STATUS,
  LicenseStatusType,
} from 'src/mkt-core/oauth2-client/license/types';

export class UpdateLicenseDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  type?: string;

  @IsOptional()
  @IsEnum(LICENSE_STATUS)
  status?: LicenseStatusType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @ValidateIf((obj) => obj.startDate && obj.endDate)
  endDate?: string | null;

  @IsOptional()
  @IsInt()
  @Min(LICENSE_MAX_DEVICES_LIMITS.MIN)
  @Max(LICENSE_MAX_DEVICES_LIMITS.MAX)
  maxDevices?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsUUID()
  updatedBy?: string;
}

// Type for API request body
export type UpdateLicensePayload = {
  type?: string;
  status?: LicenseStatusType;
  startDate?: string;
  endDate?: string | null;
  maxDevices?: number;
  metadata?: Record<string, unknown>;
  updatedBy?: string;
};
