import { Field, InputType, Int, registerEnumType } from '@nestjs/graphql';

// ============================================
// ENUMS
// ============================================

export enum MktUserStatusFilter {
  ACTIVE = 'active',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
}

registerEnumType(MktUserStatusFilter, {
  name: 'MktUserStatusFilter',
  description: 'User status filter values',
});

// ============================================
// INPUT TYPES
// ============================================

@InputType({ description: 'Query input for listing users' })
export class MktUserQueryInput {
  @Field(() => Int, {
    nullable: true,
    defaultValue: 1,
    description: 'Page number (default: 1)',
  })
  page?: number;

  @Field(() => Int, {
    nullable: true,
    defaultValue: 10,
    description: 'Items per page (default: 10, max: 100)',
  })
  limit?: number;

  @Field(() => String, { nullable: true, description: 'Filter by role' })
  role?: string;

  @Field(() => MktUserStatusFilter, {
    nullable: true,
    description: 'Filter by status',
  })
  status?: MktUserStatusFilter;

  @Field(() => String, {
    nullable: true,
    description: 'Search by name, email, or code',
  })
  search?: string;
}

@InputType({ description: 'Input for creating a new user' })
export class MktCreateUserInputDto {
  @Field(() => String, { description: 'User email address' })
  email: string;

  @Field(() => String, {
    nullable: true,
    description: 'User password (optional, will generate if not provided)',
  })
  password?: string;

  @Field(() => String, { description: 'First name' })
  firstName: string;

  @Field(() => String, { description: 'Last name' })
  lastName: string;

  @Field(() => String, {
    nullable: true,
    description: 'Full name (optional, will be generated from first + last)',
  })
  fullName?: string;

  @Field(() => String, { nullable: true, description: 'Phone number' })
  phone?: string;

  @Field(() => String, { nullable: true, description: 'User code' })
  code?: string;

  @Field(() => String, { nullable: true, description: 'Role ID' })
  roleId?: string;

  @Field(() => MktUserStatusFilter, {
    nullable: true,
    description: 'Initial status (default: pending)',
  })
  status?: MktUserStatusFilter;
}

@InputType({ description: 'Input for updating an existing user' })
export class MktUpdateUserInputDto {
  @Field(() => String, { nullable: true, description: 'User email' })
  email?: string;

  @Field(() => String, { nullable: true, description: 'Username' })
  username?: string;

  @Field(() => String, { nullable: true, description: 'Full name' })
  fullName?: string;

  @Field(() => String, { nullable: true, description: 'Phone number' })
  phone?: string;

  @Field(() => String, { nullable: true, description: 'Role' })
  role?: string;

  @Field(() => MktUserStatusFilter, { nullable: true, description: 'Status' })
  status?: MktUserStatusFilter;

  @Field(() => String, { nullable: true, description: 'Avatar URL' })
  avatarUrl?: string;
}
