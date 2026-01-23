import { Field, ObjectType } from '@nestjs/graphql';

import { OrganizationLevelHierarchyNode } from './organization-level-hierarchy-node.type';

/**
 * Response type for organization level mutations
 * Trả về kết quả với success flag, data và error message nếu có
 */
@ObjectType('OrganizationLevelMutationResponse')
export class OrganizationLevelMutationResponse {
  @Field(() => Boolean, { description: 'Operation success status' })
  success: boolean;

  @Field(() => String, { nullable: true, description: 'Organization level ID' })
  organizationLevelId?: string;

  @Field(() => OrganizationLevelHierarchyNode, {
    nullable: true,
    description: 'Updated organization level data',
  })
  organizationLevel?: OrganizationLevelHierarchyNode;

  @Field(() => String, {
    nullable: true,
    description: 'Error message if failed',
  })
  error?: string;
}
