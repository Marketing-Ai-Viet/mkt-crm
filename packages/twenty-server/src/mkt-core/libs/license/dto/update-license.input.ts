import { Field, ID, InputType } from '@nestjs/graphql';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { LicenseStatus } from '../entities/license.entity';

@InputType()
export class UpdateLicenseInput {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  orderCode?: string;

  @Field({ nullable: true })
  @IsOptional()
  productName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @Field({ nullable: true })
  @IsOptional()
  customerName?: string;

  @Field({ nullable: true })
  @IsOptional()
  customerContact?: string;

  @Field(() => LicenseStatus, { nullable: true })
  @IsEnum(LicenseStatus)
  @IsOptional()
  status?: LicenseStatus;

  @Field({ nullable: true })
  @IsOptional()
  activatedAt?: Date;

  @Field({ nullable: true })
  @IsOptional()
  expiredAt?: Date;

  @Field({ nullable: true })
  @IsOptional()
  saleInCharge?: string;

  @Field({ nullable: true })
  @IsOptional()
  supportInCharge?: string;

  @Field({ nullable: true })
  @IsOptional()
  assignedAt?: Date;

  @Field({ nullable: true })
  @IsOptional()
  lastLoginAt?: Date;

  @Field({ nullable: true })
  @IsOptional()
  currentVersion?: string;

  @Field({ nullable: true })
  @IsOptional()
  deviceInfo?: string;

  @Field({ nullable: true })
  @IsOptional()
  internalNote?: string;
}