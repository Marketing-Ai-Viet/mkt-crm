import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class PolicySummaryItem {
  @Field()
  levelCode: string;

  @Field()
  levelName: string;

  @Field(() => Int)
  hierarchyLevel: number;

  @Field()
  hasPolicyCreated: boolean;

  @Field()
  templateUsed: string;
}

@ObjectType()
export class PolicyCreationSummaryOutput {
  @Field(() => Int)
  totalLevels: number;

  @Field(() => Int)
  policiesCreated: number;

  @Field(() => [String])
  missingPolicies: string[];

  @Field(() => [PolicySummaryItem])
  summary: PolicySummaryItem[];
}
