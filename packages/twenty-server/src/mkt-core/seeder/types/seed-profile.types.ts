/**
 * Seed Profile Types
 *
 * Defines the available seed profiles and utilities for
 * environment-based data seeding.
 *
 * @see docs/MKT_ENVIRONMENT_BASED_SEEDING.md
 */

/**
 * Seed profile determines which data set to use during database seeding
 */
export enum SeedProfile {
  /** Minimal master data only (organization levels, payment methods, etc.) */
  PRODUCTION = 'production',

  /** Master data + full demo data for development */
  DEVELOPMENT = 'development',

  /** Master data + limited demo data for staging */
  STAGING = 'staging',

  /** Master data + showcase data for customer demos */
  DEMO = 'demo',

  /** No business data seeding - only schema */
  EMPTY = 'empty',
}

/**
 * Default seed profile when not specified
 */
export const DEFAULT_SEED_PROFILE = SeedProfile.DEVELOPMENT;

/**
 * All valid seed profile values
 */
export const VALID_SEED_PROFILES = Object.values(SeedProfile);

/**
 * Validate and parse seed profile from string
 *
 * @param value - Raw value from environment variable
 * @returns Valid SeedProfile enum value
 *
 * @example
 * ```typescript
 * const profile = parseSeedProfile(process.env.MKT_SEED_PROFILE);
 * // Returns SeedProfile.DEVELOPMENT if invalid or undefined
 * ```
 */
export const parseSeedProfile = (value: string | undefined): SeedProfile => {
  if (!value) {
    return DEFAULT_SEED_PROFILE;
  }

  const normalized = value.toLowerCase().trim();

  if (VALID_SEED_PROFILES.includes(normalized as SeedProfile)) {
    return normalized as SeedProfile;
  }

  return DEFAULT_SEED_PROFILE;
};

/**
 * Check if profile includes demo data
 *
 * @param profile - Seed profile to check
 * @returns true if profile should seed demo data
 */
export const shouldSeedDemoData = (profile: SeedProfile): boolean => {
  return [SeedProfile.DEVELOPMENT, SeedProfile.DEMO].includes(profile);
};

/**
 * Check if profile includes master data
 *
 * @param profile - Seed profile to check
 * @returns true if profile should seed master data
 */
export const shouldSeedMasterData = (profile: SeedProfile): boolean => {
  return profile !== SeedProfile.EMPTY;
};

/**
 * Check if profile includes any business data
 *
 * @param profile - Seed profile to check
 * @returns true if profile should seed any business data
 */
export const shouldSeedBusinessData = (profile: SeedProfile): boolean => {
  return profile !== SeedProfile.EMPTY;
};

/**
 * Get human-readable description for seed profile
 *
 * @param profile - Seed profile
 * @returns Description string
 */
export const getSeedProfileDescription = (profile: SeedProfile): string => {
  const descriptions: Record<SeedProfile, string> = {
    [SeedProfile.PRODUCTION]:
      'Production - Minimal master data only (org levels, payment methods)',
    [SeedProfile.DEVELOPMENT]:
      'Development - Full demo data for testing (customers, orders, etc.)',
    [SeedProfile.STAGING]:
      'Staging - Master data + limited demo data for staging environment',
    [SeedProfile.DEMO]: 'Demo - Showcase data for customer demonstrations',
    [SeedProfile.EMPTY]: 'Empty - No business data, only schema',
  };

  return descriptions[profile];
};

/**
 * Seed profile configuration type
 */
export type SeedProfileConfig = {
  profile: SeedProfile;
  /** Override specific entities */
  overrides?: {
    [entityName: string]: 'skip' | 'minimal' | 'full';
  };
};

/**
 * Record seed configuration type
 */
export type RecordSeedConfig = {
  tableName: string;
  pgColumns: string[];
  recordSeeds: Record<string, unknown>[];
};
