/**
 * Domain Ports (Interfaces)
 *
 * Ports define contracts for infrastructure layer implementations.
 * Following Ports & Adapters (Hexagonal) Architecture.
 */

// Matching Strategy
export {
  createMatchResult,
  createNoMatchResult,
} from './matching-strategy.interface';
export type {
  IMatchingStrategy,
  MatchResult,
  MatchContext,
} from './matching-strategy.interface';

// VA Provider
export { VA_PROVIDER_TOKEN } from './va-provider.port';
export type {
  IVAProvider,
  CreateVARequest,
  CreateVAResponse,
  VAStatus,
} from './va-provider.port';

// Order Repository
export { ORDER_REPOSITORY_PORT_TOKEN } from './order.repository.port';
export type {
  IOrderRepositoryPort,
  OrderForMatching,
  OrderCandidateFilter,
} from './order.repository.port';

// VA Repository
export { VA_REPOSITORY_PORT_TOKEN } from './va.repository.port';
export type {
  IVARepositoryPort,
  VAForMatching,
  CreateVAData,
} from './va.repository.port';
