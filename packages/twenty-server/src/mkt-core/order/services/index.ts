/**
 * Order Services - Clean Architecture
 *
 * Structure:
 * - core/: Stateless business logic (status, calculation, validation, events)
 * - domain/: Domain operations (CRUD, order items)
 * - application/: Orchestration/Facade
 * - legacy/: Deprecated services (for backward compatibility)
 */

// Core Services
export * from './core';

// Domain Services
export * from './domain';

// Application Services
export * from './application';

// Legacy Services (deprecated - use new services instead)
export * from './legacy';
