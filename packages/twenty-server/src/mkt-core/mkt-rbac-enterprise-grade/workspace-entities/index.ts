/**
 * Workspace Entities barrel export
 *
 * Organized by domain:
 * - template/: Permission template and related workspace entities
 * - permission/: Permission action and resource workspace entities
 * - policy/: Data access policy workspace entities
 * - override/: User permission override and temporary permission workspace entities
 * - audit/: Permission audit workspace entities
 * - config/: Permission priority config and context workspace entities
 */

// Template workspace entities
export * from './template';

// Permission workspace entities
export * from './permission';

// Policy workspace entities
export * from './policy';

// Override workspace entities
export * from './override';

// Audit workspace entities
export * from './audit';

// Config workspace entities
export * from './config';

// Casbin RBAC Entities (from casbin module)
export { MktCasbinRuleWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/entities/mkt-casbin-rule.workspace-entity';
export { MktPolicyVersionWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/entities/mkt-policy-version.workspace-entity';
export { MktPolicyChangeRequestWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/entities/mkt-policy-change-request.workspace-entity';
export { MktPolicyApprovalWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/entities/mkt-policy-approval.workspace-entity';
