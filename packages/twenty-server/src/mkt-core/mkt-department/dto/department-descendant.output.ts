import { ObjectType, Field, Int, ID } from '@nestjs/graphql';

@ObjectType()
export class DepartmentDescendant {
  @Field(() => ID)
  id: string;

  @Field()
  departmentName: string;

  @Field(() => String, {
    nullable: true,
    description: 'Detailed description of the department',
  })
  description?: string;

  @Field(() => Int)
  level: number;

  @Field()
  relationshipType: string;

  @Field(() => ID)
  hierarchyId: string;

  @Field(() => Int)
  distance: number;

  @Field(() => [String])
  path: string[];
}
