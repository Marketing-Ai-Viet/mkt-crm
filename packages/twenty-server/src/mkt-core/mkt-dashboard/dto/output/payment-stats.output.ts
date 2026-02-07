import { Field, ObjectType, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class PaymentStatusStatsItem {
  @Field(() => String)
  status: string;

  @Field(() => Int)
  count: number;

  @Field(() => Float)
  amount: number;
}

@ObjectType()
export class PaymentStatsOutput {
  @Field(() => Float)
  totalCollected: number;

  @Field(() => Float)
  pendingAmount: number;

  @Field(() => Float)
  collectionRate: number;

  @Field(() => [PaymentStatusStatsItem])
  paymentsByStatus: PaymentStatusStatsItem[];

  @Field(() => Int)
  overduePayments: number;
}
