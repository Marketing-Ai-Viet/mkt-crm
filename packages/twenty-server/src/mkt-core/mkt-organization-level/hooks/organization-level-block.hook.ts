/**
 * Organization Level Block Pre-Query Hooks
 *
 * Blocks auto-generated GraphQL mutations on mktOrganizationLevel entity.
 * Forces users to use OrganizationLevelMutationResolver.
 *
 * Blocked operations:
 * - CREATE_ONE, CREATE_MANY (use createOrganizationLevel mutation)
 * - UPDATE_ONE, UPDATE_MANY (use updateOrganizationLevel mutation)
 * - DELETE_ONE, DELETE_MANY (use deleteOrganizationLevel mutation)
 * - DESTROY_ONE, DESTROY_MANY (use deleteOrganizationLevel mutation)
 * - RESTORE_MANY
 *
 * Auto-generated queries (findMany, findOne) vẫn hoạt động bình thường.
 */

import {
  BlockHookConfig,
  createBlockHooks,
  WRITE_OPERATIONS,
  DELETE_OPERATIONS,
} from 'src/mkt-core/common/hooks';
import { MKT_ORGANIZATION_LEVEL_ENTITY_NAME } from 'src/mkt-core/mkt-organization-level/workspace-entity';

// ============================================
// BLOCK HOOK CONFIGURATION
// ============================================

/**
 * Block hook configuration for mktOrganizationLevel entity
 * Block TẤT CẢ write và delete operations - phải dùng OrganizationLevelMutationResolver
 */
export const ORGANIZATION_LEVEL_BLOCK_CONFIG: BlockHookConfig = {
  entityName: MKT_ORGANIZATION_LEVEL_ENTITY_NAME,
  logContext: 'OrganizationLevel:BlockHook',
  blockedMessage:
    'Direct mutations are disabled. Use OrganizationLevelMutationResolver instead ' +
    '(createOrganizationLevel, updateOrganizationLevel, deleteOrganizationLevel)',
  blockedOperations: [...WRITE_OPERATIONS, ...DELETE_OPERATIONS],
};

// ============================================
// GENERATE BLOCK HOOKS
// ============================================

const blockResult = createBlockHooks(ORGANIZATION_LEVEL_BLOCK_CONFIG);

// ============================================
// EXPORTS
// ============================================

/**
 * All Organization Level block hook providers
 * Import vào MktOrganizationLevelModule
 */
export const ORGANIZATION_LEVEL_BLOCK_HOOKS = blockResult.providers;

/**
 * List of blocked operations for reference
 */
export const ORGANIZATION_LEVEL_BLOCKED_OPERATIONS =
  blockResult.blockedOperations;
