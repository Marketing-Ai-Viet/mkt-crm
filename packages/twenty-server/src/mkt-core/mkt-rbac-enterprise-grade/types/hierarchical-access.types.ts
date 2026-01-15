/**
 * Hierarchical Access Types
 *
 * Types for evaluating data access based on organization hierarchy
 */

import {
  ACCESS_SCOPE,
  AccessScope,
  PEER_DEFINITION,
  PeerDefinition,
  HIERARCHY_LEVEL_RANGES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/policy.constants';

import { HierarchyLevel } from './hierarchy.types';

// Re-export constants for backward compatibility
export {
  ACCESS_SCOPE,
  AccessScope,
  PEER_DEFINITION,
  PeerDefinition,
  HIERARCHY_LEVEL_RANGES,
};

// ============================================
// HIERARCHICAL ACCESS RULE TYPES
// ============================================

/**
 * Single hierarchical access rule
 */
export type HierarchicalAccessRule = {
  /** Rule name for identification */
  name: string;
  /** Description of the rule */
  description?: string;
  /** Minimum hierarchy level this rule applies to (inclusive) */
  minHierarchyLevel: number;
  /** Maximum hierarchy level this rule applies to (inclusive) */
  maxHierarchyLevel: number;
  /** Access scope granted by this rule */
  accessScope: AccessScope;
};

/**
 * Peer restriction configuration
 */
export type PeerRestriction = {
  /** Whether peer restriction is enabled */
  enabled: boolean;
  /** Description of the restriction */
  description?: string;
  /** Whether to block peer access */
  blockPeerAccess: boolean;
  /** How to define peers */
  peerDefinition: PeerDefinition;
};

/**
 * Department scope configuration
 */
export type DepartmentScope = {
  /** Whether department scope filtering is enabled */
  enabled: boolean;
  /** List of allowed department codes */
  allowedDepartments: string[];
  /** Whether to allow cross-department access */
  crossDepartmentAccess: boolean;
};

/**
 * Complete hierarchical access configuration
 */
export type HierarchicalAccessConfig = {
  /** Whether hierarchical access is enabled */
  enabled: boolean;
  /** Field to check for ownership (e.g., 'createdById') */
  ownershipField: string;
  /** List of access rules */
  rules: HierarchicalAccessRule[];
  /** Peer restriction configuration */
  peerRestriction?: PeerRestriction;
};

// ============================================
// EVALUATION CONTEXT & RESULT TYPES
// ============================================

/**
 * Context for evaluating hierarchical access
 */
export type HierarchicalAccessContext = {
  /** Current user's workspace member ID */
  currentUserId: string;
  /** Current user's hierarchy level */
  currentHierarchyLevel: HierarchyLevel;
  /** Current user's department ID */
  currentDepartmentId: string | null;
  /** Current user's department code */
  currentDepartmentCode: string | null;
  /** Current user's manager ID */
  currentManagerId: string | null;
  /** IDs of direct subordinates */
  directSubordinateIds: string[];
  /** IDs of all subordinates in reporting chain */
  reportingChainIds: string[];
  /** IDs of peer managers (same level, same parent) */
  peerManagerIds: string[];
  /** IDs of team members */
  teamMemberIds: string[];
};

/**
 * Target record information for access check
 */
export type TargetRecordInfo = {
  /** ID of the record */
  recordId: string;
  /** ID of the user who created the record */
  createdById: string;
  /** ID of the account owner (if applicable) */
  accountOwnerId?: string;
  /** Department ID of the record owner */
  ownerDepartmentId?: string;
  /** Department code of the record owner */
  ownerDepartmentCode?: string;
  /** Manager ID of the record owner */
  ownerManagerId?: string;
  /** Hierarchy level of the record owner */
  ownerHierarchyLevel?: HierarchyLevel;
};

/**
 * Result of hierarchical access evaluation
 */
export type HierarchicalAccessResult = {
  /** Whether access is allowed */
  allowed: boolean;
  /** Rule that was applied */
  appliedRule?: string;
  /** Access scope that was granted */
  grantedScope?: AccessScope;
  /** Reason for the decision */
  reason: string;
  /** Whether peer restriction was applied */
  peerRestrictionApplied?: boolean;
  /** Additional details */
  details?: Record<string, string | number | boolean>;
};

// Re-export messages from message folder for backward compatibility
export { HIERARCHICAL_ACCESS_MESSAGES } from 'src/mkt-core/mkt-rbac-enterprise-grade/message';
