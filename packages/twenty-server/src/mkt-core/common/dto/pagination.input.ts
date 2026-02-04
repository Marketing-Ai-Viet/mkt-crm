import { Field, InputType, Int, registerEnumType } from '@nestjs/graphql';

import { IsInt, IsOptional, Max, Min } from 'class-validator';

// ============================================
// SORT DIRECTION
// ============================================

/**
 * Sort direction enum - tái sử dụng cho tất cả modules
 */
export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

registerEnumType(SortDirection, {
  name: 'SortDirection',
  description: 'Sort direction (ASC or DESC)',
});

// ============================================
// PAGINATION INPUT
// ============================================

/**
 * Pagination input - tái sử dụng cho tất cả modules
 *
 * @example
 * ```graphql
 * query {
 *   getOrders(pagination: { page: 1, limit: 20 }) { ... }
 * }
 * ```
 */
@InputType({ description: 'Pagination parameters' })
export class PaginationInput {
  @Field(() => Int, {
    nullable: true,
    defaultValue: 1,
    description: 'Page number (1-based)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Field(() => Int, {
    nullable: true,
    defaultValue: 20,
    description: 'Number of items per page (max 100)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

// ============================================
// PAGINATION DEFAULTS
// ============================================

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// ============================================
// HELPER TYPES
// ============================================

/**
 * Type for pagination options used in repository/service
 */
export type PaginationOptions = {
  page: number;
  limit: number;
  skip: number;
};

/**
 * Convert PaginationInput to PaginationOptions with skip calculation
 */
export const toPaginationOptions = (
  input?: PaginationInput,
): PaginationOptions => {
  const page = input?.page ?? PAGINATION_DEFAULTS.PAGE;
  const limit = Math.min(
    input?.limit ?? PAGINATION_DEFAULTS.LIMIT,
    PAGINATION_DEFAULTS.MAX_LIMIT,
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Calculate page info from total count and pagination options
 */
export const calculatePageInfo = (
  totalCount: number,
  options: PaginationOptions,
) => {
  const totalPages = Math.ceil(totalCount / options.limit);

  return {
    currentPage: options.page,
    totalPages,
    pageSize: options.limit,
    hasNextPage: options.page < totalPages,
    hasPreviousPage: options.page > 1,
  };
};
