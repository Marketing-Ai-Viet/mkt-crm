/**
 * Match Type Value Object
 *
 * Defines the types of payment matching strategies.
 */

export const MATCH_TYPE = {
  VA: 'VA',
  EXACT_CODE: 'EXACT_CODE',
  FUZZY: 'FUZZY',
  MANUAL: 'MANUAL',
} as const;

export type MatchType = (typeof MATCH_TYPE)[keyof typeof MATCH_TYPE];

/**
 * Match confidence thresholds
 */
export const MATCH_CONFIDENCE = {
  /** VA matching - 100% confidence */
  VA: 1.0,
  /** Exact code from webhook code field */
  EXACT_CODE_FIELD: 0.95,
  /** Exact code extracted from content */
  EXACT_CODE_CONTENT: 0.85,
  /** Auto-match threshold for fuzzy matching */
  FUZZY_AUTO: 0.7,
  /** Suggest threshold for manual review */
  FUZZY_SUGGEST: 0.5,
  /** No match */
  NO_MATCH: 0,
} as const;
