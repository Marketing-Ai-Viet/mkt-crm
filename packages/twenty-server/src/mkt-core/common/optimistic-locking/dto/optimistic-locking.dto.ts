/**
 * Optimistic Locking DTOs
 *
 * GraphQL Input/Output types cho optimistic locking operations.
 * Base classes có thể extend cho từng entity cụ thể.
 */

import {
  Field,
  InputType,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';

import { IsNumber, Min } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

// ============================================
// ENUMS
// ============================================

export enum ConflictResolutionStrategyEnum {
  KEEP_MINE = 'KEEP_MINE',
  KEEP_THEIRS = 'KEEP_THEIRS',
  MERGE = 'MERGE',
}

registerEnumType(ConflictResolutionStrategyEnum, {
  name: 'ConflictResolutionStrategy',
  description: 'Strategy for resolving edit conflicts',
});

// ============================================
// INPUT DTOs (Base classes - extend per entity)
// ============================================

/**
 * Base input cho optimistic update
 * Extend class này và thêm entity-specific ID field
 *
 * @example
 * ```typescript
 * @InputType()
 * export class UpdateOrderWithVersionInput extends BaseUpdateWithVersionInput {
 *   @Field(() => ID)
 *   @IsUUID()
 *   @IsNotEmpty()
 *   orderId: string;
 *
 *   get entityId(): string {
 *     return this.orderId;
 *   }
 * }
 * ```
 */
@InputType({ isAbstract: true })
export abstract class BaseUpdateWithVersionInput {
  @Field(() => Int, { description: 'Expected version number' })
  @IsNumber()
  @Min(1)
  expectedVersion: number;

  @Field(() => GraphQLJSON, { description: 'Fields to update' })
  data: Record<string, unknown>;

  /** Override trong subclass để return entity ID */
  abstract get entityId(): string;
}

/**
 * Base input cho conflict resolution
 * Extend class này và thêm entity-specific ID field
 *
 * @example
 * ```typescript
 * @InputType()
 * export class ResolveOrderConflictInput extends BaseResolveConflictInput {
 *   @Field(() => ID)
 *   @IsUUID()
 *   @IsNotEmpty()
 *   orderId: string;
 *
 *   get entityId(): string {
 *     return this.orderId;
 *   }
 * }
 * ```
 */
@InputType({ isAbstract: true })
export abstract class BaseResolveConflictInput {
  @Field(() => Int, { description: 'Current version in database' })
  @IsNumber()
  @Min(1)
  currentVersion: number;

  @Field(() => GraphQLJSON, { description: 'Resolved data to save' })
  resolvedData: Record<string, unknown>;

  /** Override trong subclass để return entity ID */
  abstract get entityId(): string;
}

// ============================================
// OUTPUT DTOs (Reusable as-is)
// ============================================

/**
 * Output cho single field conflict
 */
@ObjectType()
export class FieldConflictOutput {
  @Field(() => String, { description: 'Field name that has conflict' })
  field: string;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Value user is trying to save',
  })
  yourValue?: unknown;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Current value in database',
  })
  currentValue?: unknown;
}

/**
 * Output cho conflict information
 */
@ObjectType()
export class ConflictInfoOutput {
  @Field(() => Int, { description: 'Current version in database' })
  currentVersion: number;

  @Field(() => [FieldConflictOutput], {
    description: 'List of field conflicts',
  })
  conflicts: FieldConflictOutput[];

  @Field(() => Date, {
    nullable: true,
    description: 'When entity was last modified',
  })
  modifiedAt?: Date;
}

/**
 * Output cho optimistic update operation
 * Sử dụng trực tiếp hoặc re-export với alias cho từng entity
 *
 * @example
 * ```typescript
 * // Re-export với alias
 * export { OptimisticUpdateOutput as UpdateOrderWithVersionOutput };
 * ```
 */
@ObjectType()
export class OptimisticUpdateOutput {
  @Field(() => Boolean, { description: 'Whether update was successful' })
  success: boolean;

  @Field(() => Int, {
    nullable: true,
    description: 'New version after successful update',
  })
  newVersion?: number;

  @Field(() => String, {
    nullable: true,
    description: 'Error message if failed',
  })
  error?: string;

  @Field(() => ConflictInfoOutput, {
    nullable: true,
    description: 'Conflict details if version mismatch',
  })
  conflict?: ConflictInfoOutput;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description:
      'Current entity data when conflict occurs. Use for merge UI or refetch typed data via standard query.',
  })
  currentData?: Record<string, unknown>;
}
