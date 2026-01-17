/**
 * Repositories barrel export
 *
 * Organized by domain:
 * - template/: Permission template and related repositories
 * - permission/: Permission action and resource repositories
 * - policy/: Data access policy repositories
 * - override/: User permission override and temporary permission repositories
 * - audit/: Permission audit repositories
 * - config/: Permission priority config and context repositories
 */

// Import for RBAC_REPOSITORIES array and re-export
import {
  MktPermissionTemplateRepository,
  MktUserPermissionTemplateRepository,
  MktTemplateResourcePermissionRepository,
  MktTemplateSystemActionRepository,
  MktTemplateAccessLimitationRepository,
} from './template';
import {
  MktPermissionActionRepository,
  MktPermissionResourceRepository,
} from './permission';
import { MktPermissionAuditRepository } from './audit';
import { MktDataAccessPolicyRepository } from './policy';
import {
  MktUserPermissionOverrideRepository,
  MktTemporaryPermissionRepository,
} from './override';
import {
  MktPermissionContextRepository,
  MktPermissionPriorityConfigRepository,
} from './config';

// Re-export all repositories
export {
  // Template
  MktPermissionTemplateRepository,
  MktUserPermissionTemplateRepository,
  MktTemplateResourcePermissionRepository,
  MktTemplateSystemActionRepository,
  MktTemplateAccessLimitationRepository,
  // Permission
  MktPermissionActionRepository,
  MktPermissionResourceRepository,
  // Audit
  MktPermissionAuditRepository,
  // Policy
  MktDataAccessPolicyRepository,
  // Override
  MktUserPermissionOverrideRepository,
  MktTemporaryPermissionRepository,
  // Config
  MktPermissionContextRepository,
  MktPermissionPriorityConfigRepository,
};

/**
 * Array of all RBAC repositories for module registration
 */
export const RBAC_REPOSITORIES = [
  MktPermissionTemplateRepository,
  MktPermissionActionRepository,
  MktPermissionResourceRepository,
  MktPermissionAuditRepository,
  MktDataAccessPolicyRepository,
  MktUserPermissionTemplateRepository,
  MktUserPermissionOverrideRepository,
  MktTemplateResourcePermissionRepository,
  MktTemplateSystemActionRepository,
  MktTemplateAccessLimitationRepository,
  MktPermissionContextRepository,
  MktPermissionPriorityConfigRepository,
  MktTemporaryPermissionRepository,
];
