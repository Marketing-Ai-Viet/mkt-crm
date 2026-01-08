import { Injectable, Logger } from '@nestjs/common';

import * as bcrypt from 'bcrypt';
import { v5 as uuidv5 } from 'uuid';

import {
  parseSeedProfile,
  SeedProfile,
  shouldSeedBusinessData,
  shouldSeedDemoData,
} from 'src/mkt-core/seeder/types/seed-profile.types';

/**
 * UUID namespace for generating deterministic user IDs
 */
const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * bcrypt salt rounds for password hashing
 */
const DEFAULT_PASSWORD_SALT_ROUNDS = 10;

/**
 * Default values for seed configuration
 */
const SEED_DEFAULTS = {
  WORKSPACE_ID: '20202020-1c25-4d02-bf25-6aeccf7ea419',
  WORKSPACE_NAME: 'MKT CRM',
  WORKSPACE_SUBDOMAIN: 'mkt',
  USER_EMAIL: 'admin@mkt.dev',
  USER_PASSWORD: 'Admin@123456',
  USER_FIRST_NAME: 'Admin',
  USER_LAST_NAME: 'User',
} as const;

/**
 * Workspace configuration for seeding
 */
export interface SeedWorkspaceConfig {
  id: string;
  displayName: string;
  subdomain: string;
  inviteHash: string;
}

/**
 * User configuration for seeding
 */
export interface SeedUserConfig {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}

/**
 * Complete seed configuration
 */
export interface SeedConfig {
  profile: SeedProfile;
  workspace: SeedWorkspaceConfig;
  user: SeedUserConfig;
}

/**
 * SeedConfigService
 *
 * Provides seed configuration from environment variables.
 * Centralizes all seed-related configuration for workspace, user, and profile.
 *
 * @example
 * ```typescript
 * const config = await seedConfigService.getConfig();
 * console.log(config.profile); // 'development' or 'production'
 * console.log(config.workspace.id); // UUID from env or default
 * console.log(config.user.email); // Email from env or default
 * ```
 */
@Injectable()
export class SeedConfigService {
  private readonly logger = new Logger(SeedConfigService.name);
  private config: SeedConfig | null = null;

  /**
   * Get complete seed configuration from environment variables.
   * Configuration is cached after first call.
   *
   * Environment variables:
   * - MKT_SEED_PROFILE: Seed profile (development, production, staging, demo, empty)
   * - MKT_SEED_WORKSPACE_ID: Workspace UUID
   * - MKT_SEED_WORKSPACE_NAME: Workspace display name
   * - MKT_SEED_WORKSPACE_SUBDOMAIN: Workspace subdomain
   * - MKT_SEED_USER_ID: User UUID (auto-generated if not provided)
   * - MKT_SEED_USER_EMAIL: User email
   * - MKT_SEED_USER_PASSWORD: User password (plain text, will be hashed)
   * - MKT_SEED_USER_FIRST_NAME: User first name
   * - MKT_SEED_USER_LAST_NAME: User last name
   */
  async getConfig(): Promise<SeedConfig> {
    if (this.config) {
      return this.config;
    }

    const profile = this.getProfile();

    const workspaceId =
      process.env.MKT_SEED_WORKSPACE_ID || SEED_DEFAULTS.WORKSPACE_ID;

    const userEmail =
      process.env.MKT_SEED_USER_EMAIL || SEED_DEFAULTS.USER_EMAIL;
    const userId =
      process.env.MKT_SEED_USER_ID || this.generateUserId(workspaceId);

    const password =
      process.env.MKT_SEED_USER_PASSWORD || SEED_DEFAULTS.USER_PASSWORD;
    const passwordHash = await this.hashPassword(password);

    const subdomain =
      process.env.MKT_SEED_WORKSPACE_SUBDOMAIN ||
      SEED_DEFAULTS.WORKSPACE_SUBDOMAIN;

    this.config = {
      profile,
      workspace: {
        id: workspaceId,
        displayName:
          process.env.MKT_SEED_WORKSPACE_NAME || SEED_DEFAULTS.WORKSPACE_NAME,
        subdomain,
        inviteHash: `${subdomain}-invite-hash`,
      },
      user: {
        id: userId,
        email: userEmail,
        passwordHash,
        firstName:
          process.env.MKT_SEED_USER_FIRST_NAME || SEED_DEFAULTS.USER_FIRST_NAME,
        lastName:
          process.env.MKT_SEED_USER_LAST_NAME || SEED_DEFAULTS.USER_LAST_NAME,
      },
    };

    this.logger.log(`Seed configuration loaded:`);
    this.logger.log(`  Profile: ${this.config.profile}`);
    this.logger.log(`  Workspace ID: ${this.config.workspace.id}`);
    this.logger.log(`  Workspace Name: ${this.config.workspace.displayName}`);
    this.logger.log(`  User Email: ${this.config.user.email}`);

    return this.config;
  }

  /**
   * Get seed profile from environment variable
   */
  getProfile(): SeedProfile {
    return parseSeedProfile(process.env.MKT_SEED_PROFILE);
  }

  /**
   * Check if should seed demo data based on current profile
   */
  shouldSeedDemoData(): boolean {
    return shouldSeedDemoData(this.getProfile());
  }

  /**
   * Check if should seed any business data based on current profile
   */
  shouldSeedBusinessData(): boolean {
    return shouldSeedBusinessData(this.getProfile());
  }

  /**
   * Check if current profile is production
   */
  isProductionProfile(): boolean {
    return this.getProfile() === SeedProfile.PRODUCTION;
  }

  /**
   * Check if current profile is development
   */
  isDevelopmentProfile(): boolean {
    return this.getProfile() === SeedProfile.DEVELOPMENT;
  }

  /**
   * Get workspace ID from environment or default
   */
  getWorkspaceId(): string {
    return process.env.MKT_SEED_WORKSPACE_ID || SEED_DEFAULTS.WORKSPACE_ID;
  }

  /**
   * Reset cached configuration (useful for testing)
   */
  resetConfig(): void {
    this.config = null;
  }

  /**
   * Generate deterministic user ID from workspace ID
   * Uses UUIDv5 to ensure same workspace always gets same user ID
   */
  private generateUserId(workspaceId: string): string {
    return uuidv5(`user-${workspaceId}`, UUID_NAMESPACE);
  }

  /**
   * Hash password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, DEFAULT_PASSWORD_SALT_ROUNDS);
  }
}
