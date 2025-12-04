import { Type } from 'class-transformer';
import {
  ValidateNested,
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';

import { LICENSE_BULK_LIMITS } from 'src/mkt-core/oauth2-client/constants';

import { CreateLicenseDto, CreateLicensePayload } from './create-license.dto';
import { UpdateLicenseDto, UpdateLicensePayload } from './update-license.dto';

// Bulk Create DTO
export class BulkCreateLicenseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(LICENSE_BULK_LIMITS.MIN_ITEMS)
  @ArrayMaxSize(LICENSE_BULK_LIMITS.MAX_ITEMS)
  @Type(() => CreateLicenseDto)
  items: CreateLicenseDto[];
}

// Bulk Update Item DTO
export class BulkUpdateItemDto {
  @IsNotEmpty()
  @IsUUID()
  id: string;

  @ValidateNested()
  @Type(() => UpdateLicenseDto)
  updates: UpdateLicenseDto;
}

// Bulk Update DTO
export class BulkUpdateLicenseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(LICENSE_BULK_LIMITS.MIN_ITEMS)
  @ArrayMaxSize(LICENSE_BULK_LIMITS.MAX_ITEMS)
  @Type(() => BulkUpdateItemDto)
  items: BulkUpdateItemDto[];
}

// Bulk Delete DTO
export class BulkDeleteLicenseDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  @ArrayMinSize(LICENSE_BULK_LIMITS.MIN_ITEMS)
  @ArrayMaxSize(LICENSE_BULK_LIMITS.MAX_ITEMS)
  ids: string[];
}

// Types for API request body
export type BulkCreateLicensePayload = {
  items: CreateLicensePayload[];
};

export type BulkUpdateItemPayload = {
  id: string;
  updates: UpdateLicensePayload;
};

export type BulkUpdateLicensePayload = {
  items: BulkUpdateItemPayload[];
};

export type BulkDeleteLicensePayload = {
  ids: string[];
};
