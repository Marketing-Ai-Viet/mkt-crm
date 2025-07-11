import { Field, ID, ObjectType } from '@nestjs/graphql';
import { LicenseStatus } from '../entities/license.entity';

@ObjectType()
export class LicenseOutput {
  @Field(() => ID)
  id: string;

  @Field()
  licenseCode: string;

  @Field()
  orderCode: string;

  @Field()
  productName: string;

  @Field()
  customerEmail: string;

  @Field()
  customerName: string;

  @Field({ nullable: true })
  customerContact?: string;

  @Field(() => LicenseStatus)
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