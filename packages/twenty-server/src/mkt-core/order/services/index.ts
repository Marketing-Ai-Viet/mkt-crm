/**
 * Order Services - Clean Architecture
 *
 * Structure:
 * - core/: Stateless business logic (status, calculation, validation, events, overdue)
 * - domain/: Domain operations (CRUD, order items)
 * - application/: Orchestration/Facade
 * - integration/: Bridge services to other MKT modules
 */

// Core Services
export * from './core';

// Domain Services
export * from './domain';

// Application Services
export * from './application';

// Integration Services
export * from './integration';

// Public Services
export * from './public';
