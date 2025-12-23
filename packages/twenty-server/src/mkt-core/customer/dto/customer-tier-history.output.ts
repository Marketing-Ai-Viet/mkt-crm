import { Field, Float, InputType, Int, ObjectType } from '@nestjs/graphql';

/**
 * Single tier history record output
 */
@ObjectType()
export class CustomerTierHistoryOutput {
  @Field(() => String, { description: 'History record ID' })
  id: string;

  @Field(() => String, { description: 'Customer ID' })
  customerId: string;

  @Field(() => String, { nullable: true, description: 'Previous tier' })
  previousTier: string | null;

  @Field(() => String, { description: 'New tier after change' })
  newTier: string;

  @Field(() => String, { description: 'Reason for tier change' })
  reason: string;

  @Field(() => Float, { description: 'Order value at time of change (VND)' })
  orderValueAtChange: number;

  @Field(() => Int, { description: 'Order count at time of change' })
  orderCountAtChange: number;

  @Field(() => Date, { description: 'Date/time of tier change' })
  createdAt: Date;
}

/**
 * Paginated tier history response
 */
@ObjectType()
export class CustomerTierHistoryListOutput {
  @Field(() => [CustomerTierHistoryOutput], {
    description: 'Tier history records',
  })
  items: CustomerTierHistoryOutput[];

  @Field(() => Int, { description: 'Total count of records' })
  totalCount: number;
}

/**
 * Tier change statistics by reason
 */
@ObjectType()
export class TierChangeByReasonOutput {
  @Field(() => String, { description: 'Change reason' })
  reason: string;

  @Field(() => Int, { description: 'Number of changes' })
  count: number;
}

/**
 * Tier change statistics output
 */
@ObjectType()
export class TierChangeStatisticsOutput {
  @Field(() => Int, { description: 'Total number of tier changes' })
  totalChanges: number;

  @Field(() => Int, { description: 'Number of upgrades' })
  upgradeCount: number;

  @Field(() => Int, { description: 'Number of downgrades' })
  downgradeCount: number;

  @Field(() => [TierChangeByReasonOutput], {
    description: 'Breakdown of changes by reason',
  })
  changesByReason: TierChangeByReasonOutput[];
}

/**
 * Input for tier history query
 */
@InputType()
export class CustomerTierHistoryInput {
  @Field(() => String, { description: 'Customer ID to get history for' })
  customerId: string;

  @Field(() => Int, {
    nullable: true,
    description: 'Maximum records to return',
  })
  limit?: number;

  @Field(() => Int, { nullable: true, description: 'Offset for pagination' })
  offset?: number;
}

/**
 * Input for date range tier history query
 */
@InputType()
export class TierHistoryDateRangeInput {
  @Field(() => Date, { description: 'Start date' })
  startDate: Date;

  @Field(() => Date, { description: 'End date' })
  endDate: Date;

  @Field(() => Int, {
    nullable: true,
    description: 'Maximum records to return',
  })
  limit?: number;

  @Field(() => Int, { nullable: true, description: 'Offset for pagination' })
  offset?: number;
}
