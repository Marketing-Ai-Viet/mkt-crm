import { Field, ObjectType, Int } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

/**
 * Individual step result output
 */
@ObjectType('ValidationStepResultOutput')
export class ValidationStepResultOutput {
  @Field(() => Int, { description: 'Step number' })
  stepNumber: number;

  @Field(() => String, { description: 'Step name' })
  stepName: string;

  @Field(() => String, {
    description: 'Step result (PASS, FAIL, SKIP, WARNING, ERROR)',
  })
  result: string;

  @Field(() => Boolean, { description: 'Whether step passed' })
  passed: boolean;

  @Field(() => String, { nullable: true, description: 'Failure reason' })
  reason?: string;

  @Field(() => Int, { nullable: true, description: 'Execution time in ms' })
  executionTimeMs?: number;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Whether cache was hit',
  })
  cacheHit?: boolean;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Step-specific data',
  })
  stepData?: Record<string, unknown>;
}

/**
 * Full validation result with all steps
 */
@ObjectType('ValidationResultOutput')
export class ValidationResultOutput {
  @Field(() => Boolean, { description: 'Whether all validations passed' })
  success: boolean;

  @Field(() => String, {
    description: 'Final decision (ALLOW, DENY, CONDITIONAL)',
  })
  decision: string;

  @Field(() => [ValidationStepResultOutput], {
    description: 'Individual step results',
  })
  steps: ValidationStepResultOutput[];

  @Field(() => Int, { description: 'Total steps executed' })
  stepsExecuted: number;

  @Field(() => Int, { description: 'Steps passed' })
  stepsPassed: number;

  @Field(() => Int, { description: 'Steps failed' })
  stepsFailed: number;

  @Field(() => Int, { description: 'Steps skipped' })
  stepsSkipped: number;

  @Field(() => Int, { description: 'Total execution time in ms' })
  totalExecutionTimeMs: number;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Additional metadata',
  })
  metadata?: Record<string, unknown>;

  @Field(() => [String], { nullable: true, description: 'Warnings' })
  warnings?: string[];

  @Field(() => [String], { nullable: true, description: 'Errors' })
  errors?: string[];
}
