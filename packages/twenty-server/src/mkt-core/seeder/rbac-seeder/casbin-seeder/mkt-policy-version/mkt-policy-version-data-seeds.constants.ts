/**
 * Policy Version Seed Data Constants
 *
 * Contains seed data for MktPolicyVersionWorkspaceEntity
 * Tracks policy sync versions for cache invalidation
 */

type MktPolicyVersionDataSeed = {
  id: string;
  version: number;
  policyHash: string | null;
  policyCount: number;
  syncedAt: Date | null;
  position: number | null;
};

export const MKT_POLICY_VERSION_DATA_SEED_COLUMNS: (keyof MktPolicyVersionDataSeed)[] =
  ['id', 'version', 'policyHash', 'policyCount', 'syncedAt', 'position'];

export const MKT_POLICY_VERSION_DATA_SEEDS_IDS = {
  INITIAL_VERSION: '22222222-0001-4000-8000-000000000001',
};

// SHA-256 hash of initial seed policies (pre-computed)
const INITIAL_POLICY_HASH =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

export const MKT_POLICY_VERSION_DATA_SEEDS: MktPolicyVersionDataSeed[] = [
  {
    id: MKT_POLICY_VERSION_DATA_SEEDS_IDS.INITIAL_VERSION,
    version: 1,
    policyHash: INITIAL_POLICY_HASH,
    policyCount: 24, // Number of seed policies
    syncedAt: new Date(),
    position: 1,
  },
];
