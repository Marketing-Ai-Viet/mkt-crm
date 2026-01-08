import { Field, Int, ObjectType } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class CustomerExportOutput {
  @Field(() => Boolean, { description: 'Whether the export was successful' })
  success: boolean;

  @Field(() => String, { description: 'CSV data as base64 encoded string' })
  data: string;

  @Field(() => String, { description: 'Suggested filename for the export' })
  fileName: string;

  @Field(() => Int, { description: 'Total number of records exported' })
  totalRecords: number;

  @Field(() => String, {
    description: 'Timestamp when the export was generated',
  })
  generatedAt: string;
}

@ObjectType()
export class CustomerExportStatisticsOutput {
  @Field(() => Boolean, { description: 'Whether the operation was successful' })
  success: boolean;

  @Field(() => Int, { description: 'Total number of records' })
  totalRecords: number;

  @Field(() => GraphQLJSON, { description: 'Breakdown by customer status' })
  byStatus: Record<string, number>;

  @Field(() => GraphQLJSON, { description: 'Breakdown by customer tier' })
  byTier: Record<string, number>;

  @Field(() => GraphQLJSON, { description: 'Breakdown by customer type' })
  byType: Record<string, number>;

  @Field(() => String, {
    description: 'Timestamp when statistics were generated',
  })
  generatedAt: string;
}
