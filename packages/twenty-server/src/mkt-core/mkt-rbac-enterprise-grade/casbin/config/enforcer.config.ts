import { CASBIN_CACHE_TTL } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/casbin-cache-keys.constant';

/**
 * Casbin Enforcer Configuration
 */
export type EnforcerConfig = {
  failClosed: boolean;
  cacheEnabled: boolean;
  maxEnforcersInMemory: number;
  enforcerTtlMs: number;
};

export const ENFORCER_CONFIG: EnforcerConfig = {
  failClosed: true,
  cacheEnabled: true,
  maxEnforcersInMemory: 100,
  enforcerTtlMs: CASBIN_CACHE_TTL.ENFORCER * 1000,
};
