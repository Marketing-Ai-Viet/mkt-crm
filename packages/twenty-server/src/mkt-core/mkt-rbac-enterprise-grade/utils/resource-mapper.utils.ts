/**
 * Resource Mapper Utilities
 *
 * Utilities for mapping between resource keys and entity names
 */

import {
  RESOURCE_ENTITY_MAP,
  ENTITY_RESOURCE_MAP,
  RbacResourceKey,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/enterprise-rbac.constants';

/**
 * Get entity name from resource key
 * @param resourceKey - The resource key from RBAC_RESOURCE_KEY
 * @returns The entity name or the resource key if not found
 */
export const getEntityName = (resourceKey: RbacResourceKey): string => {
  return RESOURCE_ENTITY_MAP[resourceKey] ?? resourceKey;
};

/**
 * Get resource key from entity name
 * @param entityName - The entity name (e.g., 'mktCustomer')
 * @returns The resource key or the entity name if not found
 */
export const getResourceKey = (entityName: string): string => {
  return ENTITY_RESOURCE_MAP[entityName] ?? entityName;
};
