import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserLicenseDto {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  licenseKey?: string;

  @Field({ nullable: true })
  status?: string;

  @Field({ nullable: true })
  activatedAt?: Date;

  @Field({ nullable: true })
  expiresAt?: Date;

  @Field({ nullable: true })
  lastLoginAt?: Date;

  @Field({ nullable: true })
  trialLicense?: boolean;

  @Field({ nullable: true })
  deviceInfo?: string;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field({ nullable: true })
  customerId?: string;

  @Field({ nullable: true })
  customerName?: string;
}

@ObjectType()
export class UserLicensesResponseDto {
  @Field(() => [UserLicenseDto])
  licenses: UserLicenseDto[];

  @Field()
  total: number;

  @Field({ nullable: true })
  customerId?: string;

  @Field({ nullable: true })
  customerName?: string;
}
