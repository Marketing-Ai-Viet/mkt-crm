import { FeatureFlagKey } from 'src/engine/core-modules/feature-flag/enums/feature-flag-key.enum';

/**
 * MKT Core Workspace Gate Configuration
 *
 * Single feature flag to control visibility of all mkt-core entities
 * in the GraphQL Workspace API.
 *
 * Usage:
 * - excludeFromDatabase: false → Database schema remains intact
 * - excludeFromWorkspaceApi: true → Hidden from GraphQL API when flag is OFF
 *
 * When IS_MKT_CORE_ENABLED is:
 * - undefined/false: All mkt-core entities hidden from GraphQL API
 * - true: All mkt-core entities visible in GraphQL API
 */

export const MKT_FEATURE_FLAG = FeatureFlagKey.IS_MKT_CORE_ENABLED;

export const MKT_WORKSPACE_GATE = {
  featureFlag: MKT_FEATURE_FLAG,
  excludeFromDatabase: false,
  excludeFromWorkspaceApi: true,
} as const;
