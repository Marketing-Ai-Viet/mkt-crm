/**
 * Department Module Hooks
 *
 * Block hooks để tắt các auto-generated operations.
 * Ép dùng custom resolvers thay vì auto-generated mutations.
 */

// Block hooks (disable createOne, updateOne - use custom resolvers instead)
export * from './department-block.pre-query.hook';
