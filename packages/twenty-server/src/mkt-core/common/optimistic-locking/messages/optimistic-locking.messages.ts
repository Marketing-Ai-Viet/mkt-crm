/**
 * Optimistic Locking Messages
 *
 * Centralized messages cho optimistic locking operations.
 * Sử dụng cho error responses và logging.
 */

export const OPTIMISTIC_LOCKING_MESSAGES = {
  // Success messages
  UPDATE_SUCCESS: 'Entity updated successfully',
  CONFLICT_RESOLVED: 'Conflict resolved successfully',

  // Error messages
  ENTITY_NOT_FOUND: 'Entity not found',
  VERSION_CONFLICT: 'Entity was modified by another user',
  INVALID_VERSION: 'Invalid version number',
  INVALID_VERSION_MUST_BE_POSITIVE:
    'Expected version must be a positive integer (>= 1)',
  UPDATE_FAILED: 'Failed to update entity',

  // Info messages (for logging)
  NO_CONFLICTS: 'No conflicts detected',
  FORCE_UPDATE_APPLIED: 'Force update applied',
} as const;

export type OptimisticLockingMessageKey =
  keyof typeof OPTIMISTIC_LOCKING_MESSAGES;
export type OptimisticLockingMessageValue =
  (typeof OPTIMISTIC_LOCKING_MESSAGES)[OptimisticLockingMessageKey];
