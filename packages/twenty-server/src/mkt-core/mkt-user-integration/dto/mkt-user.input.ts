import { Field, InputType, Int } from '@nestjs/graphql';

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

  @Field(() => String, {
    nullable: true,
    description: 'Search by name, email, or username',
  })
  search?: string;
}

@InputType({
  description: 'Input for creating a new user via Better Auth sign-up',
})
export class MktCreateUserInputDto {
  @Field(() => String, { description: 'User email address' })
  email: string;

  @Field(() => String, { description: 'User password' })
  password: string;

  @Field(() => String, { description: 'User display name' })
  name: string;
}

@InputType({ description: 'Input for updating user profile' })
export class MktUpdateUserInputDto {
  @Field(() => String, { nullable: true, description: 'Username' })
  username?: string;

  @Field(() => String, { nullable: true, description: 'First name' })
  firstName?: string;

  @Field(() => String, { nullable: true, description: 'Last name' })
  lastName?: string;

  @Field(() => String, { nullable: true, description: 'Profile image URL' })
  image?: string;
}
