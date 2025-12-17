import {
  Field,
  Int,
  ObjectType,
  registerEnumType,
  InputType,
} from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

// ============================================
// ENUMS
// ============================================

export enum MktLicenseStatusEnum {
  ACTIVE = 'active',
  PENDING = 'pending',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

export enum MktLicenseTypeEnum {
  PERPETUAL = 'perpetual',
  SUBSCRIPTION = 'subscription',
  TRIAL = 'trial',
}

export enum MktAnalyticsGroupByEnum {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

registerEnumType(MktLicenseStatusEnum, {
  name: 'MktLicenseStatus',
  description: 'License status values',
});

registerEnumType(MktLicenseTypeEnum, {
  name: 'MktLicenseType',
  description: 'License type values',
});

registerEnumType(MktAnalyticsGroupByEnum, {
  name: 'MktAnalyticsGroupBy',
  description: 'Analytics grouping options',
});

// ============================================
// GRAPHQL DESCRIPTIONS
// ============================================

export const MKT_LICENSE_GRAPHQL_DESCRIPTIONS = {
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

// ============================================
// ACTOR OUTPUT TYPES
// ============================================

@ObjectType()
export class MktActorContextOutput {
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
export class MktCreatedByActorOutput {
  @Field()
  type: string;

  @Field({ nullable: true })
  userId?: string;

  @Field()
  actorId: string;

  @Field(() => MktActorContextOutput, { nullable: true })
  context?: MktActorContextOutput;
}

@ObjectType()
export class MktUpdatedByActorOutput {
  @Field()
  type: string;

  @Field()
  actorId: string;

  @Field(() => MktActorContextOutput, { nullable: true })
  context?: MktActorContextOutput;
}

// ============================================
// LOCALIZED TEXT OUTPUT
// ============================================

@ObjectType()
export class MktLocalizedTextOutput {
  @Field({ nullable: true })
  en?: string;

  @Field({ nullable: true })
  ko?: string;

  @Field({ nullable: true })
  vi?: string;
}

// ============================================
// PRODUCT OUTPUT
// ============================================

@ObjectType()
export class MktLicenseProductOutput {
  @Field()
  id: string;

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;

  @Field({ nullable: true })
  deletedAt?: string;

  @Field(() => MktCreatedByActorOutput, { nullable: true })
  createdBy?: MktCreatedByActorOutput;

  @Field(() => MktUpdatedByActorOutput, { nullable: true })
  updatedBy?: MktUpdatedByActorOutput;

  @Field(() => MktLocalizedTextOutput)
  productName: MktLocalizedTextOutput;

  @Field(() => MktLocalizedTextOutput)
  productDescription: MktLocalizedTextOutput;

  @Field(() => MktLocalizedTextOutput)
  productOverview: MktLocalizedTextOutput;

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

// ============================================
// LICENSE OUTPUT
// ============================================

@ObjectType()
export class MktLicenseOutput {
  @Field()
  id: string;

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;

  @Field({ nullable: true })
  deletedAt?: string;

  @Field(() => MktCreatedByActorOutput, { nullable: true })
  createdBy?: MktCreatedByActorOutput;

  @Field(() => MktUpdatedByActorOutput, { nullable: true })
  updatedBy?: MktUpdatedByActorOutput;

  @Field(() => Int)
  version: number;

  @Field()
  licenseKey: string;

  @Field(() => MktLicenseTypeEnum)
  type: MktLicenseTypeEnum;

  @Field(() => MktLicenseTypeEnum)
  originalType: MktLicenseTypeEnum;

  @Field(() => MktLicenseStatusEnum)
  status: MktLicenseStatusEnum;

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

  @Field(() => MktLicenseProductOutput, { nullable: true })
  product?: MktLicenseProductOutput;
}

// ============================================
// PAGINATED OUTPUT
// ============================================

@ObjectType()
export class MktPaginatedLicenseOutput {
  @Field(() => [MktLicenseOutput])
  data: MktLicenseOutput[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;
}

// ============================================
// VALIDATION OUTPUT
// ============================================

@ObjectType()
export class MktLicenseValidationOutput {
  @Field()
  isValid: boolean;

  @Field({ nullable: true })
  reason?: string;

  @Field(() => MktLicenseOutput, { nullable: true })
  license?: MktLicenseOutput;
}

// ============================================
// ANALYTICS OUTPUT
// ============================================

@ObjectType()
export class MktLicenseAnalyticsOutput {
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

// ============================================
// ACTION OUTPUTS
// ============================================

@ObjectType()
export class MktLicenseActionOutput {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => MktLicenseOutput, { nullable: true })
  license?: MktLicenseOutput;
}

@ObjectType()
export class MktBulkLicenseActionOutput {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => [MktLicenseOutput], { nullable: true })
  licenses?: MktLicenseOutput[];

  @Field(() => Int)
  count: number;
}

// ============================================
// INPUT TYPES
// ============================================

@InputType()
export class MktQueryLicensesInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  limit?: number;

  @Field({ nullable: true })
  userId?: string;

  @Field({ nullable: true })
  productId?: string;

  @Field(() => MktLicenseStatusEnum, { nullable: true })
  status?: MktLicenseStatusEnum;
}

@InputType()
export class MktCreateLicenseInput {
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
export class MktUpdateLicenseInput {
  @Field({ nullable: true })
  type?: string;

  @Field(() => MktLicenseStatusEnum, { nullable: true })
  status?: MktLicenseStatusEnum;

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
export class MktValidateLicenseInput {
  @Field()
  licenseKey: string;

  @Field({ nullable: true })
  productId?: string;
}

@InputType()
export class MktLicenseAnalyticsInput {
  @Field({ nullable: true })
  productId?: string;

  @Field({ nullable: true })
  startDate?: string;

  @Field({ nullable: true })
  endDate?: string;

  @Field(() => MktAnalyticsGroupByEnum, { nullable: true })
  groupBy?: MktAnalyticsGroupByEnum;
}

@InputType()
export class MktBulkUpdateLicenseItemInput {
  @Field()
  id: string;

  @Field(() => MktUpdateLicenseInput)
  updates: MktUpdateLicenseInput;
}

@InputType()
export class MktBulkCreateLicenseInput {
  @Field(() => [MktCreateLicenseInput])
  items: MktCreateLicenseInput[];
}

@InputType()
export class MktBulkUpdateLicenseInput {
  @Field(() => [MktBulkUpdateLicenseItemInput])
  items: MktBulkUpdateLicenseItemInput[];
}

@InputType()
export class MktBulkDeleteLicenseInput {
  @Field(() => [String])
  ids: string[];
}
