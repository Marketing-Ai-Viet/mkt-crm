/**
 * Department Module Resolvers
 *
 * GraphQL resolvers for department operations.
 */

// Tree resolver (queries for hierarchy, ancestors, descendants)
export * from './department-tree.resolver';

// CRUD resolver (create/update/delete department)
export * from './department-crud.resolver';

// Mutation resolver (create/update hierarchy)
export * from './department-mutation.resolver';

// Sub-Manager resolver (CRUD for sub-manager assignments)
export * from './sub-manager.resolver';
