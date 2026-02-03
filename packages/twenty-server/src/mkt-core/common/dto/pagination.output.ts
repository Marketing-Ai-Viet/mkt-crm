import { Field, ObjectType, Int } from '@nestjs/graphql';

// ============================================
// PAGE INFO OUTPUT
// ============================================

/**
 * Offset-based page info output - tái sử dụng cho tất cả paginated responses
 * Named OffsetPageInfo to avoid conflict with engine's cursor-based PageInfo
 */
@ObjectType({ description: 'Offset-based pagination information' })
export class OffsetPageInfo {
  @Field(() => Int, { description: 'Current page number (1-based)' })
  currentPage: number;

  @Field(() => Int, { description: 'Total number of pages' })
  totalPages: number;

  @Field(() => Int, { description: 'Number of items per page' })
  pageSize: number;

  @Field(() => Boolean, { description: 'Whether there is a next page' })
  hasNextPage: boolean;

  @Field(() => Boolean, { description: 'Whether there is a previous page' })
  hasPreviousPage: boolean;
}

// ============================================
// HELPER TYPE FOR GENERIC PAGINATED RESPONSE
// ============================================

/**
 * Type helper for creating paginated response
 * Use this to create concrete ObjectType classes in each module
 *
 * @example
 * ```typescript
 * @ObjectType()
 * export class PaginatedOrdersOutput {
 *   @Field(() => [OrderOutput])
 *   items: OrderOutput[];
 *
 *   @Field(() => Int)
 *   totalCount: number;
 *
 *   @Field(() => OffsetPageInfo)
 *   pageInfo: OffsetPageInfo;
 * }
 * ```
 */
export type PaginatedResponse<T> = {
  items: T[];
  totalCount: number;
  pageInfo: OffsetPageInfo;
};
