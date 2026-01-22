/**
 * Department Module DTOs
 *
 * Input and Output types for GraphQL operations.
 */

// Query inputs
export * from './department-tree-options.input';

// Mutation inputs
export * from './create-department-hierarchy.input';
export * from './update-department-hierarchy.input';

// Query outputs
export * from './department-tree-node.output';
export * from './department-ancestor.output';
export * from './department-descendant.output';
export * from './hierarchy-statistics.output';

// Mutation outputs
export * from './department-hierarchy-response.output';
