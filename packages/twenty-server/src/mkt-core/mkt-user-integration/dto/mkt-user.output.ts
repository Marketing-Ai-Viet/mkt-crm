import { Field, Int, ObjectType } from '@nestjs/graphql';

// ============================================
// USER OUTPUT
// ============================================

@ObjectType({ description: 'User from MKT Admin Backend' })
export class MktUserDto {
  @Field(() => String)
  id: string;

  @Field(() => String, { description: 'Role: User or Admin' })
  role: string;

  @Field(() => String)
  username: string;

  @Field(() => String)
  email: string;

  @Field(() => String, { nullable: true })
  firstName?: string;

  @Field(() => String, { nullable: true })
  lastName?: string;

  @Field(() => String, { nullable: true })
  image?: string;

  @Field(() => String, { nullable: true })
  bio?: string;

  @Field(() => String)
  createdAt: string;

  @Field(() => String)
  updatedAt: string;
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
  data: MktUserDto[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}
