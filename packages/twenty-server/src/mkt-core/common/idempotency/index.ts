// Module
export { IdempotencyModule } from './idempotency.module';
export type { IdempotencyModuleOptions } from './idempotency.module';

// Repository
export { IdempotencyCacheRepository } from './repositories';
export type { CacheOperationResult } from './repositories';

// Service
export { IdempotencyService } from './services/idempotency.service';
export { StuckPendingCleanupService } from './services/stuck-pending-cleanup.service';

// Types
export {
  CacheFailureMode,
  DuplicateCheckResult,
  IDEMPOTENCY_CACHE_TOKEN,
  IdempotencyContext,
  IdempotencyDomain,
  IdempotencyExecuteResult,
  IdempotencyKey,
  IdempotencyKeyOptions,
  IdempotencyMetrics,
  IdempotencyOperationOptions,
  IdempotencyRecord,
  IdempotencyStatus,
  StuckPendingRecord,
} from './types/idempotency.types';

// Config
export {
  ACTION_CONFIGS,
  DEFAULT_ACTION_CONFIG,
  getActionConfig,
  IDEMPOTENCY_GLOBAL_CONFIG,
} from './configs/idempotency.config';
export type { IdempotencyActionConfig } from './configs/idempotency.config';

// Utils
export {
  canonicalHash,
  sanitizeResponseForCache,
  toCanonicalJson,
} from 'src/mkt-core/utils/canonical-hash.util';
