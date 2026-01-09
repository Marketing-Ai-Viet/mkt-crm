/**
 * Repositories barrel export
 *
 * Repositories for 13 workspace entities
 */

export { MktPermissionTemplateRepository } from './mkt-permission-template.repository';
export { MktPermissionActionRepository } from './mkt-permission-action.repository';
export { MktPermissionResourceRepository } from './mkt-permission-resource.repository';
export { MktPermissionAuditRepository } from './mkt-permission-audit.repository';
export { MktDataAccessPolicyRepository } from './mkt-data-access-policy.repository';
export { MktUserPermissionTemplateRepository } from './mkt-user-permission-template.repository';
export { MktUserPermissionOverrideRepository } from './mkt-user-permission-override.repository';
export { MktTemplateResourcePermissionRepository } from './mkt-template-resource-permission.repository';
export { MktTemplateSystemActionRepository } from './mkt-template-system-action.repository';
export { MktTemplateAccessLimitationRepository } from './mkt-template-access-limitation.repository';
export { MktPermissionContextRepository } from './mkt-permission-context.repository';
export { MktPermissionPriorityConfigRepository } from './mkt-permission-priority-config.repository';
export { MktTemporaryPermissionRepository } from './mkt-temporary-permission.repository';

// Import for RBAC_REPOSITORIES array
import { MktPermissionTemplateRepository } from './mkt-permission-template.repository';
import { MktPermissionActionRepository } from './mkt-permission-action.repository';
import { MktPermissionResourceRepository } from './mkt-permission-resource.repository';
import { MktPermissionAuditRepository } from './mkt-permission-audit.repository';
import { MktDataAccessPolicyRepository } from './mkt-data-access-policy.repository';
import { MktUserPermissionTemplateRepository } from './mkt-user-permission-template.repository';
import { MktUserPermissionOverrideRepository } from './mkt-user-permission-override.repository';
import { MktTemplateResourcePermissionRepository } from './mkt-template-resource-permission.repository';
import { MktTemplateSystemActionRepository } from './mkt-template-system-action.repository';
import { MktTemplateAccessLimitationRepository } from './mkt-template-access-limitation.repository';
import { MktPermissionContextRepository } from './mkt-permission-context.repository';
import { MktPermissionPriorityConfigRepository } from './mkt-permission-priority-config.repository';
import { MktTemporaryPermissionRepository } from './mkt-temporary-permission.repository';

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
