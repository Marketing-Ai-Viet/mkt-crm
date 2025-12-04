import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';

export class ValidateLicenseDto {
  @IsNotEmpty()
  @IsString()
  licenseKey: string;

  @IsOptional()
  @IsUUID()
  productId?: string;
}

// Type for API request body
export type ValidateLicensePayload = {
  licenseKey: string;
  productId?: string;
};
