/**
 * Optimistic Locking Module
 *
 * Reusable infrastructure cho optimistic locking pattern.
 * Sử dụng cho các entity cần concurrent edit protection.
 *
 * @example
 * ```typescript
 * import {
 *   BaseOptimisticLockingService,
 *   OptimisticUpdateResult,
 *   OptimisticUpdateOutput,
 * } from 'src/mkt-core/common/optimistic-locking';
 * ```
 */

// Types
export * from './types/optimistic-locking.types';

// DTOs
export * from './dto/optimistic-locking.dto';

// Messages
export * from './messages/optimistic-locking.messages';

// Services
export { BaseOptimisticLockingService } from './services/base-optimistic-locking.service';
