import { ObjectType, Field, Int, ID } from '@nestjs/graphql';

import { ManagerInfo, SubManagerInfo } from './manager-info.output';

@ObjectType()
export class DepartmentTreeNode {
  @Field(() => ID)
  id: string;

  @Field()
  departmentName: string;

  @Field(() => Int)
  level: number;

  @Field(() => [DepartmentTreeNode])
  children: DepartmentTreeNode[];

  @Field({ nullable: true })
  relationshipType?: string;

  @Field(() => ID, { nullable: true })
  hierarchyId?: string;

  // New fields
  @Field(() => String, {
    nullable: true,
    description: 'Department type (DEPARTMENT or TEAM)',
  })
  departmentType?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Detailed description of the department',
  })
  description?: string;

  @Field(() => String, { nullable: true, description: 'Department address' })
  address?: string;

  @Field(() => ManagerInfo, {
    nullable: true,
    description: 'Manager of the department',
  })
  manager?: ManagerInfo;

  @Field(() => [SubManagerInfo], {
    nullable: true,
    description: 'Sub-managers of the department',
  })
  subManagers?: SubManagerInfo[];

  @Field(() => Int, {
    nullable: true,
    description: 'Number of members in this department',
  })
  memberCount?: number;
}
