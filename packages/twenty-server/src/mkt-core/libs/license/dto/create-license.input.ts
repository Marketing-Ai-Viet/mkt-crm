import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { LicenseStatus } from '../entities/license.entity';

@InputType()
export class CreateLicenseInput {
  @Field()
  licenseCode: string;

  @Field()
  orderCode: string;

  @Field()
  productName: string;

  @Field()
  @IsEmail()
  customerEmail: string;

  @Field()
  customerName: string;

  @Field({ nullable: true })
  @IsOptional()
  customerContact?: string;

  @Field(() => LicenseStatus)
  @IsEnum(LicenseStatus)
  status: LicenseStatus;

  @Field()
  activatedAt: Date;

  @Field()
  expiredAt: Date;

  @Field()
  saleInCharge: string;

  @Field()
  supportInCharge: string;

  @Field()
  assignedAt: Date;

  @Field({ nullable: true })
  lastLoginAt?: Date;

  @Field({ nullable: true })
  currentVersion?: string;

  @Field({ nullable: true })
  deviceInfo?: string;

  @Field({ nullable: true })
  internalNote?: string;
}