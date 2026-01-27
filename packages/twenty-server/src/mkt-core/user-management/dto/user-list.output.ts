import { Field, Int, ObjectType } from '@nestjs/graphql';

import { UserOutput } from 'src/mkt-core/user-management/dto/user.output';

@ObjectType()
export class UserListOutput {
  @Field(() => [UserOutput])
  items: UserOutput[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;

  @Field(() => Boolean)
  hasNextPage: boolean;

  @Field(() => Boolean)
  hasPreviousPage: boolean;
}
