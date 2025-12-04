import {
  Field,
  Int,
  ObjectType,
  registerEnumType,
  InputType,
} from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

// Enums
export enum LicenseStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

export enum LicenseType {
  PERPETUAL = 'perpetual',
  SUBSCRIPTION = 'subscription',
  TRIAL = 'trial',
}

export enum AnalyticsGroupBy {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

registerEnumType(LicenseStatus, {
  name: 'LicenseStatus',
  description: 'License status values',
});

registerEnumType(LicenseType, {
  name: 'LicenseType',
  description: 'License type values',
});

registerEnumType(AnalyticsGroupBy, {
  name: 'AnalyticsGroupBy',
  description: 'Analytics grouping options',
});

// GraphQL Descriptions
export const LICENSE_GRAPHQL_DESCRIPTIONS = {
  // Queries
  LICENSES_QUERY: 'Get paginated list of licenses',
  LICENSE_BY_ID_QUERY: 'Get license by ID',
  LICENSE_BY_KEY_QUERY: 'Get license by license key',
  VALIDATE_LICENSE_QUERY: 'Validate a license key',
  LICENSE_ANALYTICS_QUERY: 'Get license analytics',

  // Mutations
  CREATE_LICENSE_MUTATION: 'Create a new license',
  UPDATE_LICENSE_MUTATION: 'Update an existing license',
  DELETE_LICENSE_MUTATION: 'Delete a license',
  ACTIVATE_LICENSE_MUTATION: 'Activate a license',
  REVOKE_LICENSE_MUTATION: 'Revoke a license',
  BULK_CREATE_LICENSE_MUTATION: 'Bulk create licenses',
  BULK_UPDATE_LICENSE_MUTATION: 'Bulk update licenses',
  BULK_DELETE_LICENSE_MUTATION: 'Bulk delete licenses',
} as const;

// Actor Output Types
@ObjectType()
export class ActorContextOutput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  source?: string;

  @Field({ nullable: true })
  timestamp?: string;
}

@ObjectType()
export class CreatedByActorOutput {
  @Field()
  type: string;

  @Field({ nullable: true })
  userId?: string;

  @Field()
  actorId: string;

  @Field(() => ActorContextOutput, { nullable: true })
  context?: ActorContextOutput;
}

@ObjectType()
export class UpdatedByActorOutput {
  @Field()
  type: string;

  @Field()
  actorId: string;

  @Field(() => ActorContextOutput, { nullable: true })
  context?: ActorContextOutput;
}

// Localized Text Output Type
@ObjectType()
export class LocalizedTextOutput {
  @Field({ nullable: true })
  en?: string;

  @Field({ nullable: true })
  ko?: string;

  @Field({ nullable: true })
  vi?: string;
}

// Product Output Type
@ObjectType()
export class ProductOutput {
  @Field()
  id: string;

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;

  @Field({ nullable: true })
  deletedAt?: string;

  @Field(() => CreatedByActorOutput, { nullable: true })
  createdBy?: CreatedByActorOutput;

  @Field(() => UpdatedByActorOutput, { nullable: true })
  updatedBy?: UpdatedByActorOutput;

  @Field(() => LocalizedTextOutput)
  productName: LocalizedTextOutput;

  @Field(() => LocalizedTextOutput)
  productDescription: LocalizedTextOutput;

  @Field(() => LocalizedTextOutput)
  productOverview: LocalizedTextOutput;

  @Field()
  code: string;

  @Field()
  status: string;

  @Field()
  version: string;

  @Field(() => Int)
  entityVersion: number;

  @Field()
  basePrice: number;

  @Field({ nullable: true })
  iconUrl?: string;

  @Field({ nullable: true })
  bannerUrl?: string;

  @Field(() => [String])
  gallery: string[];

  @Field(() => Int)
  sortOrder: number;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown>;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  description?: string;
}

// Output Types
@ObjectType()
export class LicenseOutput {
  @Field()
  id: string;

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;

  @Field({ nullable: true })
  deletedAt?: string;

  @Field(() => CreatedByActorOutput, { nullable: true })
  createdBy?: CreatedByActorOutput;

  @Field(() => UpdatedByActorOutput, { nullable: true })
  updatedBy?: UpdatedByActorOutput;

  @Field(() => Int)
  version: number;

  @Field()
  licenseKey: string;

  @Field(() => LicenseType)
  type: LicenseType;

  @Field(() => LicenseType)
  originalType: LicenseType;

  @Field(() => LicenseStatus)
  status: LicenseStatus;

  @Field({ nullable: true })
  startDate?: string;

  @Field({ nullable: true })
  endDate?: string;

  @Field(() => Int)
  maxDevices: number;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown>;

  @Field()
  userId: string;

  @Field()
  productId: string;

  @Field(() => ProductOutput, { nullable: true })
  product?: ProductOutput;
}

@ObjectType()
export class PaginatedLicenseOutput {
  @Field(() => [LicenseOutput])
  data: LicenseOutput[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;
}

@ObjectType()
export class LicenseValidationOutput {
  @Field()
  isValid: boolean;

  @Field({ nullable: true })
  reason?: string;

  @Field(() => LicenseOutput, { nullable: true })
  license?: LicenseOutput;
}

@ObjectType()
export class LicenseAnalyticsOutput {
  @Field(() => Int)
  total: number;

  @Field(() => GraphQLJSON)
  byStatus: Record<string, number>;

  @Field(() => GraphQLJSON, { nullable: true })
  queryPeriod?: {
    startDate: string;
    endDate: string;
  };
}

@ObjectType()
export class LicenseActionOutput {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => LicenseOutput, { nullable: true })
  license?: LicenseOutput;
}

@ObjectType()
export class BulkLicenseActionOutput {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => [LicenseOutput], { nullable: true })
  licenses?: LicenseOutput[];

  @Field(() => Int)
  count: number;
}

// Input Types
@InputType()
export class QueryLicensesInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  limit?: number;

  @Field({ nullable: true })
  userId?: string;

  @Field({ nullable: true })
  productId?: string;

  @Field(() => LicenseStatus, { nullable: true })
  status?: LicenseStatus;
}

@InputType()
export class CreateLicenseInput {
  @Field()
  productPackageId: string;

  @Field()
  productId: string;

  @Field()
  userId: string;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  maxDevices?: number;
}

@InputType()
export class UpdateLicenseInput {
  @Field({ nullable: true })
  type?: string;

  @Field(() => LicenseStatus, { nullable: true })
  status?: LicenseStatus;

  @Field({ nullable: true })
  startDate?: string;

  @Field({ nullable: true })
  endDate?: string;

  @Field(() => Int, { nullable: true })
  maxDevices?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown>;

  @Field({ nullable: true })
  updatedBy?: string;
}

@InputType()
export class ValidateLicenseInput {
  @Field()
  licenseKey: string;

  @Field({ nullable: true })
  productId?: string;
}

@InputType()
export class LicenseAnalyticsInput {
  @Field({ nullable: true })
  productId?: string;

  @Field({ nullable: true })
  startDate?: string;

  @Field({ nullable: true })
  endDate?: string;

  @Field(() => AnalyticsGroupBy, { nullable: true })
  groupBy?: AnalyticsGroupBy;
}

@InputType()
export class BulkUpdateLicenseItemInput {
  @Field()
  id: string;

  @Field(() => UpdateLicenseInput)
  updates: UpdateLicenseInput;
}

@InputType()
export class BulkCreateLicenseInput {
  @Field(() => [CreateLicenseInput])
  items: CreateLicenseInput[];
}

@InputType()
export class BulkUpdateLicenseInput {
  @Field(() => [BulkUpdateLicenseItemInput])
  items: BulkUpdateLicenseItemInput[];
}

@InputType()
export class BulkDeleteLicenseInput {
  @Field(() => [String])
  ids: string[];
}
