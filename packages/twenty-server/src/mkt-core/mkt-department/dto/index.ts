/**
 * Department Module DTOs
 *
 * Input and Output types for GraphQL operations.
 */

// Query inputs
export * from './department-tree-options.input';

// Mutation inputs - Department CRUD
export * from './create-department.input';
export * from './update-department.input';

// Mutation inputs - Hierarchy
export * from './create-department-hierarchy.input';
export * from './update-department-hierarchy.input';

// Query outputs
export * from './department-tree-node.output';
export * from './department-ancestor.output';
export * from './department-descendant.output';
export * from './hierarchy-statistics.output';
export * from './manager-info.output';

// Mutation outputs - Department CRUD
export * from './department-response.output';

// Mutation outputs - Hierarchy
export * from './department-hierarchy-response.output';

// Sub-Manager DTOs
export * from './sub-manager';
