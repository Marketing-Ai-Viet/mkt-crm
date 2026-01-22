/**
 * Customer Module Hooks
 *
 * Block hooks to disable auto-generated GraphQL operations.
 * All customer CRUD operations should go through custom resolvers.
 */

// Block hooks - disable all 13 auto-generated operations
export * from './customer-block.pre-query.hook';
