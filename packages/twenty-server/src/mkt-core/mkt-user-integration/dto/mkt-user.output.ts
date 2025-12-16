import { Field, Int, ObjectType } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

// ============================================
// USER OUTPUT
// ============================================

@ObjectType({ description: 'User from MKT Server' })
export class MktUserDto {
  @Field(() => String)
  id: string;

  @Field(() => String)
  email: string;

  @Field(() => String, { nullable: true })
  username?: string;

  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  @Field(() => String)
  fullName: string;

  @Field(() => String, { nullable: true })
  code?: string;

  @Field(() => String, { nullable: true })
  phone?: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string;

  @Field(() => String, { nullable: true })
  roleId?: string;

  @Field(() => String, {
    description: 'Status: active, pending, suspended, inactive',
  })
  status: string;

  @Field(() => String, {
    description: 'Auth method: local, google, facebook, apple',
  })
  authMethod: string;

  @Field(() => Boolean)
  emailVerified: boolean;

  @Field(() => Boolean)
  phoneVerified: boolean;

  @Field(() => Boolean)
  twoFactorEnabled: boolean;

  @Field(() => String, { nullable: true })
  crmCustomerId?: string;

  @Field(() => Boolean)
  crmSyncEnabled: boolean;

  @Field(() => GraphQLJSON, { nullable: true })
  preferences?: Record<string, unknown>;

  @Field(() => GraphQLJSON, { nullable: true })
  settings?: Record<string, unknown>;

  @Field(() => String, { nullable: true })
  lastLoginAt?: string;

  @Field(() => String, { nullable: true })
  lastLoginIp?: string;

  @Field(() => String)
  createdAt: string;

  @Field(() => String)
  updatedAt: string;
}

// ============================================
// LOGIN HISTORY OUTPUT
// ============================================

@ObjectType({ description: 'User login history from MKT Server' })
export class MktUserLoginHistoryDto {
  @Field(() => String)
  userId: string;

  @Field(() => String, { nullable: true })
  lastLoginAt?: string;

  @Field(() => String, { nullable: true })
  lastLoginIp?: string;

  @Field(() => String, { nullable: true })
  lockedUntil?: string;
}

// ============================================
// RESPONSE WRAPPERS
// ============================================

@ObjectType({ description: 'Single user response' })
export class MktUserResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => MktUserDto, { nullable: true })
  data?: MktUserDto;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType({ description: 'Paginated user list response' })
export class MktUserListResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => [MktUserDto])
  users: MktUserDto[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType({ description: 'User login history response' })
export class MktUserLoginHistoryResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => MktUserLoginHistoryDto, { nullable: true })
  data?: MktUserLoginHistoryDto;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}
