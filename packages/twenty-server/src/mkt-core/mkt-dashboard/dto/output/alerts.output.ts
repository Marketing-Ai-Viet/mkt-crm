import { Field, ObjectType, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class OverdueOrderItem {
  @Field(() => String)
  id: string;

  @Field(() => String)
  orderCode: string;

  @Field(() => Int)
  daysOverdue: number;
}

@ObjectType()
export class ExpiringContractItem {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => Int)
  daysToExpiry: number;
}

@ObjectType()
export class PendingPaymentItem {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => Float)
  amount: number;

  @Field(() => Int)
  daysPending: number;
}

@ObjectType()
export class UnderperformingKpiItem {
  @Field(() => String)
  kpiName: string;

  @Field(() => Float)
  progress: number;

  @Field(() => Float)
  target: number;
}

@ObjectType()
export class AlertsOutput {
  @Field(() => [OverdueOrderItem])
  overdueOrders: OverdueOrderItem[];

  @Field(() => [ExpiringContractItem])
  expiringContracts: ExpiringContractItem[];

  @Field(() => [PendingPaymentItem])
  pendingPayments: PendingPaymentItem[];

  @Field(() => [UnderperformingKpiItem])
  underperformingKpis: UnderperformingKpiItem[];
}
