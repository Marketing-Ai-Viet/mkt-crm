/**
 * Cache Warmer Configuration
 */
export type CacheWarmerConfig = {
  enabled: boolean;
  warmOnStartup: boolean;
  concurrency: number;
  priorityWorkspaces: string[];
};

export const CACHE_WARMER_CONFIG: CacheWarmerConfig = {
  enabled: true,
  warmOnStartup: true,
  concurrency: 5,
  priorityWorkspaces: [],
};
