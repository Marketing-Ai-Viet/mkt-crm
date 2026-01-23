import { Field, InputType } from '@nestjs/graphql';

/**
 * Input type for delete organization level mutation
 */
@InputType('DeleteOrganizationLevelInput')
export class DeleteOrganizationLevelInput {
  @Field(() => String, { description: 'Organization level ID to delete' })
  id: string;
}
