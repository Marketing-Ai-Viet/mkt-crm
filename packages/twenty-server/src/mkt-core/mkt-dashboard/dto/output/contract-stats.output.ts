import { Field, ObjectType, Int } from '@nestjs/graphql';

@ObjectType()
export class ContractStatsOutput {
  @Field(() => Int)
  totalActive: number;

  @Field(() => Int)
  expiringThisMonth: number;

  @Field(() => Int)
  newThisPeriod: number;
}
