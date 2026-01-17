/**
 * Ancestor data with distance
 */
export type AncestorData = {
  ancestorId: string;
  distance: number;
  departmentCode?: string;
  departmentName?: string;
};

/**
 * Ancestry staleness result
 */
export type AncestryStaleResult = {
  stale: boolean;
  ageMs: number;
  computedAt?: Date;
};

/**
 * Rebuild result
 */
export type RebuildAncestryResult = {
  departmentId: string;
  ancestorsCount: number;
  durationMs: number;
};

/**
 * Full rebuild result
 */
export type FullRebuildAncestryResult = {
  totalDepartments: number;
  totalAncestryRecords: number;
  durationMs: number;
  errors: Array<{ departmentId: string; error: string }>;
};
