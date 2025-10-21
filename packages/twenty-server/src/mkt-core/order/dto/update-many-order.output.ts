import { Field, Int, ObjectType } from '@nestjs/graphql';

import { MktOrderOutput } from './mkt-order.output';

@ObjectType()
export class UpdateManyOrdersResult {
  @Field(() => Int, { description: 'Number of orders successfully updated' })
  updatedCount!: number;

  @Field(() => [MktOrderOutput], { description: 'Successfully updated orders' })
  updatedOrders!: MktOrderOutput[];

  @Field(() => [String], {
    description: 'IDs of orders that failed to update',
    nullable: true,
  })
  failedIds?: string[];

  @Field(() => [String], {
    description: 'Error messages for failed updates',
    nullable: true,
  })
  errors?: string[];
}

@ObjectType()
export class UpdateManyOrdersOutput {
  @Field(() => UpdateManyOrdersResult)
  result!: UpdateManyOrdersResult;

  @Field({ description: 'Overall operation success status' })
  success!: boolean;

  @Field({ description: 'General message about the operation' })
  message!: string;
}
