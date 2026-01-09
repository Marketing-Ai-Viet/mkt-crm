import { Injectable, Logger } from '@nestjs/common';

import { createHash } from 'crypto';

import { TwentyORMManager } from 'src/engine/twenty-orm/twenty-orm.manager';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
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
  PolicyVersionEntry,
  DeadLetterEntry,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/types';
import {
  RBAC_DEAD_LETTER_KEY,
  RBAC_DEAD_LETTER_TTL,
} from 'src/mkt-core/infrastructure/redis/constants/rbac.constant';
import { MktPolicyVersionWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/entities/mkt-policy-version.workspace-entity';

/**
 * Repository cho Policy Versions
 *
 * Quản lý version tracking cho policies với hybrid approach:
 * - Database (MktPolicyVersionWorkspaceEntity): Source of truth, durability, audit trail
 * - Redis cache: High-performance read access
 *
 * Features:
 * - Detect policy changes via hash comparison
 * - Enable idempotent sync
 * - Track sync failures (dead letter queue)
 * - Version history for compliance (SOC2)
 *
 * Strategy:
 * - Write-through: Write to DB first, then update cache
 * - Read: Cache first, fallback to DB on miss
 */
@Injectable()
export class PolicyVersionRepository {
  private readonly logger = new Logger(
    `${CASBIN_LOG_CONTEXT}:PolicyVersionRepository`,
  );

  constructor(
    private readonly twentyORMManager: TwentyORMManager,
    @InjectCacheStorage(CacheStorageNamespace.RbacPolicy)
    private readonly cacheStorage: CacheStorageService,
  ) {}

  // ==================== Private Helpers ====================

  /**
   * Get workspace entity repository
   */
  private async getRepository() {
    return this.twentyORMManager.getRepository<MktPolicyVersionWorkspaceEntity>(
      'mktPolicyVersion',
    );
  }

  // ==================== Read Operations ====================

  /**
   * Get policy version for workspace
   * Strategy: Cache first, fallback to DB on miss
   */
  async getVersion(workspaceId: string): Promise<PolicyVersion | null> {
    try {
      // 1. Try cache first
      const cached = await this.getVersionFromCache(workspaceId);

      if (cached) {
        return cached;
      }

      // 2. Cache miss - read from database
      const dbVersion = await this.getVersionFromDatabase();

      if (!dbVersion) {
        return null;
      }

      // 3. Populate cache for next read
      await this.updateCache(workspaceId, dbVersion);

      return {
        workspaceId,
        version: dbVersion.version,
        policyHash: dbVersion.policyHash ?? '',
        updatedAt: dbVersion.syncedAt
          ? DateTimeUtils.toDateRequired(
              DateTimeUtils.fromDate(dbVersion.syncedAt),
            )
          : DateTimeUtils.toDateRequired(DateTimeUtils.now()),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get policy version for ${workspaceId}: ${error}`,
      );

      return null;
    }
  }

  /**
   * Get version from cache
   */
  private async getVersionFromCache(
    workspaceId: string,
  ): Promise<PolicyVersion | null> {
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
        updatedAt: DateTimeUtils.toDateRequired(
          DateTimeUtils.fromISO(data.updatedAt),
        ),
      };
    } catch (error) {
      this.logger.debug(`Cache miss for policy version ${workspaceId}`);

      return null;
    }
  }

  /**
   * Get latest version from database
   * Note: Each workspace has one version record (upsert pattern)
   */
  private async getVersionFromDatabase(): Promise<MktPolicyVersionWorkspaceEntity | null> {
    try {
      const repository = await this.getRepository();

      // Get the latest version record
      return repository.findOne({
        where: {},
        order: { version: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get version from database: ${error}`);

      return null;
    }
  }

  /**
   * Update cache with version data
   */
  private async updateCache(
    workspaceId: string,
    entity: MktPolicyVersionWorkspaceEntity,
  ): Promise<void> {
    try {
      const versionKey = CASBIN_CACHE_KEYS.POLICY_VERSION(workspaceId);
      const hashKey = CASBIN_CACHE_KEYS.POLICY_HASH(workspaceId);

      const entry: PolicyVersionEntry = {
        version: entity.version,
        hash: entity.policyHash ?? '',
        updatedAt: entity.syncedAt
          ? DateTimeUtils.toISO(DateTimeUtils.fromDate(entity.syncedAt))
          : DateTimeUtils.toISO(DateTimeUtils.now()),
        policyCount: entity.policyCount,
      };

      await Promise.all([
        this.cacheStorage.set(
          versionKey,
          entry,
          CASBIN_CACHE_TTL.POLICY_VERSION * 1000,
        ),
        this.cacheStorage.set(
          hashKey,
          entity.policyHash ?? '',
          CASBIN_CACHE_TTL.POLICY_VERSION * 1000,
        ),
      ]);
    } catch (error) {
      this.logger.debug(`Failed to update cache: ${error}`);
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
   * Strategy: Cache first, fallback to DB
   */
  async getPolicyHash(workspaceId: string): Promise<string | null> {
    try {
      // 1. Try cache first
      const key = CASBIN_CACHE_KEYS.POLICY_HASH(workspaceId);
      const cached = await this.cacheStorage.get<string>(key);

      if (cached) {
        return cached;
      }

      // 2. Fallback to database
      const dbVersion = await this.getVersionFromDatabase();

      if (dbVersion?.policyHash) {
        // Populate cache
        await this.cacheStorage.set(
          key,
          dbVersion.policyHash,
          CASBIN_CACHE_TTL.POLICY_VERSION * 1000,
        );

        return dbVersion.policyHash;
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get policy hash for ${workspaceId}: ${error}`,
      );

      return null;
    }
  }

  // ==================== Write Operations ====================

  /**
   * Set policy version (write-through: DB first, then cache)
   */
  async setVersion(
    workspaceId: string,
    version: number,
    hash: string,
    policyCount: number,
  ): Promise<void> {
    try {
      const repository = await this.getRepository();
      const now = DateTimeUtils.toDateRequired(DateTimeUtils.now());

      // 1. Find existing or create new
      const existing = await this.getVersionFromDatabase();

      if (existing) {
        // Update existing record
        await repository.update(existing.id, {
          version,
          policyHash: hash,
          policyCount,
          syncedAt: now,
        });
      } else {
        // Create new record
        const entity = repository.create({
          version,
          policyHash: hash,
          policyCount,
          syncedAt: now,
        });

        await repository.save(entity);
      }

      // 2. Update cache (write-through)
      const versionKey = CASBIN_CACHE_KEYS.POLICY_VERSION(workspaceId);
      const hashKey = CASBIN_CACHE_KEYS.POLICY_HASH(workspaceId);

      const entry: PolicyVersionEntry = {
        version,
        hash,
        updatedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
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
   * Delete version for workspace (from both DB and cache)
   */
  async deleteVersion(workspaceId: string): Promise<void> {
    try {
      // 1. Delete from database
      const repository = await this.getRepository();
      const existing = await this.getVersionFromDatabase();

      if (existing) {
        await repository.delete(existing.id);
      }

      // 2. Delete from cache
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

  /**
   * Invalidate cache only (force next read from DB)
   */
  async invalidateCache(workspaceId: string): Promise<void> {
    try {
      const versionKey = CASBIN_CACHE_KEYS.POLICY_VERSION(workspaceId);
      const hashKey = CASBIN_CACHE_KEYS.POLICY_HASH(workspaceId);

      await Promise.all([
        this.cacheStorage.del(versionKey),
        this.cacheStorage.del(hashKey),
      ]);

      this.logger.debug(`Invalidated policy version cache for ${workspaceId}`);
    } catch (error) {
      this.logger.debug(
        `Failed to invalidate cache for ${workspaceId}: ${error}`,
      );
    }
  }

  /**
   * Get version history for audit (from database only)
   */
  async getVersionHistory(
    limit = 100,
  ): Promise<MktPolicyVersionWorkspaceEntity[]> {
    try {
      const repository = await this.getRepository();

      return repository.find({
        order: { version: 'DESC' },
        take: limit,
      });
    } catch (error) {
      this.logger.error(`Failed to get version history: ${error}`);

      return [];
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
      const lockValue = `lock:${DateTimeUtils.toMillis(DateTimeUtils.now())}`;

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
        (await this.cacheStorage.get<DeadLetterEntry[]>(
          RBAC_DEAD_LETTER_KEY,
        )) ?? [];
      const existingIndex = rawEntries.findIndex(
        (e) => e.workspaceId === workspaceId,
      );

      const entry: DeadLetterEntry = {
        workspaceId,
        failedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
        lastError: error,
        retryCount,
      };

      if (existingIndex >= 0) {
        rawEntries[existingIndex] = entry;
      } else {
        rawEntries.push(entry);
      }

      await this.cacheStorage.set(
        RBAC_DEAD_LETTER_KEY,
        rawEntries,
        RBAC_DEAD_LETTER_TTL * 1000,
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
          RBAC_DEAD_LETTER_KEY,
          filtered,
          RBAC_DEAD_LETTER_TTL * 1000,
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
        await this.cacheStorage.get<DeadLetterEntry[]>(RBAC_DEAD_LETTER_KEY);

      if (!entries) {
        return [];
      }

      return entries.map((e) => ({
        id: `${e.workspaceId}:${e.failedAt}`,
        workspaceId: e.workspaceId,
        failedAt: DateTimeUtils.toDateRequired(
          DateTimeUtils.fromISO(e.failedAt),
        ),
        lastError: e.lastError,
        retryCount: e.retryCount,
        resolvedAt: e.resolvedAt
          ? DateTimeUtils.toDateRequired(DateTimeUtils.fromISO(e.resolvedAt))
          : undefined,
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
