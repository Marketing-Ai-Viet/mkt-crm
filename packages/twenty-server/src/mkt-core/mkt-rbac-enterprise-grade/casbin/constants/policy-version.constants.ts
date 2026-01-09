/**
 * Policy Version Constants
 *
 * Dead letter queue constants for failed syncs
 */

export const DEAD_LETTER_KEY = 'rbac-seeder:sync:dead_letter';
export const DEAD_LETTER_TTL = 86400 * 7; // 7 days in seconds
