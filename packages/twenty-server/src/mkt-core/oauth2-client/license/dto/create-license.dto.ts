import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';

import { LICENSE_MAX_DEVICES_LIMITS } from 'src/mkt-core/oauth2-client/constants';

export class CreateLicenseDto {
  @IsNotEmpty()
  @IsUUID()
  productPackageId: string;

  @IsNotEmpty()
  @IsUUID()
  productId: string;

  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsInt()
  @Min(LICENSE_MAX_DEVICES_LIMITS.MIN)
  @Max(LICENSE_MAX_DEVICES_LIMITS.MAX)
  maxDevices?: number = LICENSE_MAX_DEVICES_LIMITS.DEFAULT;
}

// Type for API request body
export type CreateLicensePayload = {
  productPackageId: string;
  productId: string;
  userId: string;
  maxDevices?: number;
};
