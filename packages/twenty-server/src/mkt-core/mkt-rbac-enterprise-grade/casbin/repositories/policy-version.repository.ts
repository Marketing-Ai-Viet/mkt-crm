import { Injectable, Logger } from '@nestjs/common';

import { createHash } from 'crypto';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import {
  CASBIN_LOG_CONTEXT,
  CASBIN_MESSAGES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import {
  CASBIN_CACHE_KEYS,
  CASBIN_CACHE_TTL,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/casbin-cache-keys.constant';
import {
  PolicyVersion,
  SyncDeadLetterEntry,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/policy-sync.types';

/**
 * Policy version entry stored in cache
 */
type PolicyVersionEntry = {
  version: number;
  hash: string;
  updatedAt: string;
  policyCount: number;
};

/**
 * Dead letter entry for failed syncs
 */
type DeadLetterEntry = {
  workspaceId: string;
  failedAt: string;
  lastError: string;
  retryCount: number;
  resolvedAt?: string;
};

const DEAD_LETTER_KEY = 'rbac-seeder:sync:dead_letter';
const DEAD_LETTER_TTL = 86400 * 7; // 7 days

/**
 * Repository cho Policy Versions
 *
 * Quản lý version tracking cho policies để:
 * - Detect policy changes
 * - Enable idempotent sync
 * - Track sync failures
 *
 * Sử dụng Redis cho high-performance access
 */
@Injectable()
export class PolicyVersionRepository {
  private readonly logger = new Logger(
    `${CASBIN_LOG_CONTEXT}:PolicyVersionRepository`,
  );

  constructor(
    @InjectCacheStorage(CacheStorageNamespace.RbacPolicy)
    private readonly cacheStorage: CacheStorageService,
  ) {}

  /**
   * Get policy version for workspace
   */
  async getVersion(workspaceId: string): Promise<PolicyVersion | null> {
    try {
      const key = CASBIN_CACHE_KEYS.POLICY_VERSION(workspaceId);
      const data = await this.cacheStorage.get<PolicyVersionEntry>(key);

      if (!data) {
        return null;
      }

      return {
        workspaceId,
        version: data.version,
        policyHash: data.hash,
        updatedAt: new Date(data.updatedAt),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get policy version for ${workspaceId}: ${error}`,
      );

      return null;
    }
  }

  /**
   * Get current version number
   */
  async getVersionNumber(workspaceId: string): Promise<number> {
    const version = await this.getVersion(workspaceId);

    return version?.version ?? 0;
  }

  /**
   * Get policy hash for workspace
   */
  async getPolicyHash(workspaceId: string): Promise<string | null> {
    try {
      const key = CASBIN_CACHE_KEYS.POLICY_HASH(workspaceId);
      const value = await this.cacheStorage.get<string>(key);

      return value ?? null;
    } catch (error) {
      this.logger.error(
        `Failed to get policy hash for ${workspaceId}: ${error}`,
      );

      return null;
    }
  }

  /**
   * Set policy version
   */
  async setVersion(
    workspaceId: string,
    version: number,
    hash: string,
    policyCount: number,
  ): Promise<void> {
    try {
      const versionKey = CASBIN_CACHE_KEYS.POLICY_VERSION(workspaceId);
      const hashKey = CASBIN_CACHE_KEYS.POLICY_HASH(workspaceId);

      const entry: PolicyVersionEntry = {
        version,
        hash,
        updatedAt: new Date().toISOString(),
        policyCount,
      };

      await Promise.all([
        this.cacheStorage.set(
          versionKey,
          entry,
          CASBIN_CACHE_TTL.POLICY_VERSION * 1000,
        ),
        this.cacheStorage.set(
          hashKey,
          hash,
          CASBIN_CACHE_TTL.POLICY_VERSION * 1000,
        ),
      ]);

      this.logger.debug(
        `Set policy version for ${workspaceId}: v${version}, ${policyCount} policies`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to set policy version for ${workspaceId}: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Increment version and update hash
   */
  async incrementVersion(
    workspaceId: string,
    newHash: string,
    policyCount: number,
  ): Promise<number> {
    const currentVersion = await this.getVersionNumber(workspaceId);
    const newVersion = currentVersion + 1;

    await this.setVersion(workspaceId, newVersion, newHash, policyCount);

    return newVersion;
  }

  /**
   * Check if policy has changed (hash mismatch)
   */
  async hasChanged(workspaceId: string, newHash: string): Promise<boolean> {
    const currentHash = await this.getPolicyHash(workspaceId);

    if (!currentHash) {
      return true; // No existing hash = new
    }

    return currentHash !== newHash;
  }

  /**
   * Calculate hash from policy rules
   */
  calculateHash(rules: string[][]): string {
    // Sort rules for consistent hash
    const sortedRules = rules
      .map((r) => r.join(','))
      .sort()
      .join('|');

    return createHash('sha256')
      .update(sortedRules)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Delete version for workspace
   */
  async deleteVersion(workspaceId: string): Promise<void> {
    try {
      const versionKey = CASBIN_CACHE_KEYS.POLICY_VERSION(workspaceId);
      const hashKey = CASBIN_CACHE_KEYS.POLICY_HASH(workspaceId);

      await Promise.all([
        this.cacheStorage.del(versionKey),
        this.cacheStorage.del(hashKey),
      ]);

      this.logger.debug(`Deleted policy version for ${workspaceId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete policy version for ${workspaceId}: ${error}`,
      );
    }
  }

  // ==================== Sync Lock ====================

  /**
   * Acquire sync lock for workspace
   * Returns true if lock acquired, false if already locked
   */
  async acquireSyncLock(workspaceId: string): Promise<boolean> {
    try {
      const key = CASBIN_CACHE_KEYS.SYNC_LOCK(workspaceId);
      const lockValue = `lock:${Date.now()}`;

      // Use setNX-style behavior (set if not exists)
      const existing = await this.cacheStorage.get<string>(key);

      if (existing) {
        this.logger.debug(`Sync lock exists for ${workspaceId}`);

        return false;
      }

      await this.cacheStorage.set(
        key,
        lockValue,
        CASBIN_CACHE_TTL.SYNC_LOCK * 1000,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to acquire sync lock for ${workspaceId}: ${error}`,
      );

      return false;
    }
  }

  /**
   * Release sync lock for workspace
   */
  async releaseSyncLock(workspaceId: string): Promise<void> {
    try {
      const key = CASBIN_CACHE_KEYS.SYNC_LOCK(workspaceId);

      await this.cacheStorage.del(key);
    } catch (error) {
      this.logger.error(
        `Failed to release sync lock for ${workspaceId}: ${error}`,
      );
    }
  }

  /**
   * Check if workspace is locked for sync
   */
  async isSyncLocked(workspaceId: string): Promise<boolean> {
    try {
      const key = CASBIN_CACHE_KEYS.SYNC_LOCK(workspaceId);
      const value = await this.cacheStorage.get<string>(key);

      return value !== null;
    } catch (error) {
      return false;
    }
  }

  // ==================== Dead Letter Queue ====================

  /**
   * Add entry to dead letter queue
   */
  async addToDeadLetter(
    workspaceId: string,
    error: string,
    retryCount: number,
  ): Promise<void> {
    try {
      // Get raw entries from cache
      const rawEntries =
        (await this.cacheStorage.get<DeadLetterEntry[]>(DEAD_LETTER_KEY)) ?? [];
      const existingIndex = rawEntries.findIndex(
        (e) => e.workspaceId === workspaceId,
      );

      const entry: DeadLetterEntry = {
        workspaceId,
        failedAt: new Date().toISOString(),
        lastError: error,
        retryCount,
      };

      if (existingIndex >= 0) {
        rawEntries[existingIndex] = entry;
      } else {
        rawEntries.push(entry);
      }

      await this.cacheStorage.set(
        DEAD_LETTER_KEY,
        rawEntries,
        DEAD_LETTER_TTL * 1000,
      );

      this.logger.warn(
        CASBIN_MESSAGES.ERROR.SYNC_FAILED_PERMANENTLY(workspaceId, retryCount),
      );
    } catch (err) {
      this.logger.error(`Failed to add dead letter entry: ${err}`);
    }
  }

  /**
   * Remove from dead letter queue (resolved)
   */
  async removeFromDeadLetter(workspaceId: string): Promise<void> {
    try {
      const entries = await this.getDeadLetterEntries();
      const filtered = entries.filter((e) => e.workspaceId !== workspaceId);

      if (filtered.length !== entries.length) {
        await this.cacheStorage.set(
          DEAD_LETTER_KEY,
          filtered,
          DEAD_LETTER_TTL * 1000,
        );

        this.logger.log(`Removed ${workspaceId} from dead letter queue`);
      }
    } catch (error) {
      this.logger.error(`Failed to remove dead letter entry: ${error}`);
    }
  }

  /**
   * Get all dead letter entries
   */
  async getDeadLetterEntries(): Promise<SyncDeadLetterEntry[]> {
    try {
      const entries =
        await this.cacheStorage.get<DeadLetterEntry[]>(DEAD_LETTER_KEY);

      if (!entries) {
        return [];
      }

      return entries.map((e) => ({
        id: `${e.workspaceId}:${e.failedAt}`,
        workspaceId: e.workspaceId,
        failedAt: new Date(e.failedAt),
        lastError: e.lastError,
        retryCount: e.retryCount,
        resolvedAt: e.resolvedAt ? new Date(e.resolvedAt) : undefined,
      }));
    } catch (error) {
      this.logger.error(`Failed to get dead letter entries: ${error}`);

      return [];
    }
  }

  /**
   * Get dead letter entry for workspace
   */
  async getDeadLetterEntry(
    workspaceId: string,
  ): Promise<SyncDeadLetterEntry | null> {
    const entries = await this.getDeadLetterEntries();

    return entries.find((e) => e.workspaceId === workspaceId) ?? null;
  }

  /**
   * Check if workspace is in dead letter queue
   */
  async isInDeadLetter(workspaceId: string): Promise<boolean> {
    const entry = await this.getDeadLetterEntry(workspaceId);

    return entry !== null;
  }
}
