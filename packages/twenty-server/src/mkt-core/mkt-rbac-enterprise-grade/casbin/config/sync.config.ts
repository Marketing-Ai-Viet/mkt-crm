/**
 * Policy Sync Configuration
 */
export type PolicySyncConfig = {
  maxRetries: number;
  retryDelayMs: number;
  debounceMs: number;
  maxPoliciesPerWorkspace: number;
};

export const SYNC_CONFIG: PolicySyncConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  debounceMs: 500,
  maxPoliciesPerWorkspace: 10000,
};
