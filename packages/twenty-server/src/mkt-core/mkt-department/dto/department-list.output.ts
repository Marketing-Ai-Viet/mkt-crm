import { Field, Int, ObjectType } from '@nestjs/graphql';

import { DepartmentOutput } from './department-response.output';

/**
 * Paginated list of departments
 */
@ObjectType()
export class DepartmentListOutput {
  @Field(() => [DepartmentOutput], { description: 'List of departments' })
  items: DepartmentOutput[];

  @Field(() => Int, { description: 'Total number of departments' })
  total: number;

  @Field(() => Int, { description: 'Current page number' })
  page: number;

  @Field(() => Int, { description: 'Items per page' })
  limit: number;

  @Field(() => Int, { description: 'Total number of pages' })
  totalPages: number;

  @Field({ description: 'Whether there is a next page' })
  hasNextPage: boolean;

  @Field({ description: 'Whether there is a previous page' })
  hasPreviousPage: boolean;
}
