/**
 * Data Classification Types
 *
 * Types for data classification check in RBAC pipeline.
 * Used by RbacEnforcerService to determine if a resource can bypass
 * Casbin permission check based on its classification level.
 */

import { FilterConditions } from 'src/mkt-core/mkt-rbac-enterprise-grade/types/data-access-policy.types';

/**
 * Result of data classification check in the RBAC pipeline.
 *
 * - bypass=true: Skip Casbin check, use `allowed` directly
 * - bypass=false: Continue normal Casbin pipeline
 */
export type ClassificationCheckResult = {
  /** Whether to bypass Casbin permission check */
  bypass: boolean;
  /** Permission result when bypass=true */
  allowed?: boolean;
  /** Reason for the classification decision */
  reason?: string;
  /** Data filter to apply (null = no filter, all records accessible) */
  dataFilter?: FilterConditions | null;
  /** Whether audit logging is required for this access */
  requireAudit?: boolean;
  /** Minimum template priority required (for TOP_SECRET resources) */
  minimumTemplatePriority?: number;
};

/**
 * Data classification levels for resources.
 *
 * - PUBLIC: All active users can READ
 * - INTERNAL: All active users can READ (EXPORT needs template)
 * - CONFIDENTIAL: Fully controlled by templates (default)
 * - RESTRICTED: Templates + audit logging required
 * - TOP_SECRET: Only high-priority templates (CEO/VP, priority >= 900)
 */
export type DataClassificationLevel =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'CONFIDENTIAL'
  | 'RESTRICTED'
  | 'TOP_SECRET';
