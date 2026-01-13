import { Injectable } from '@nestjs/common';

import { DeepPartial } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MktOptionWorkspaceEntity } from 'src/mkt-core/setting/objects/mkt-option.workspace-entity';
import { safeJsonParse } from 'src/mkt-core/utils/json.util';

const LOG_CONTEXT = 'MktOption:Repository';

/**
 * MktOptionRepository - Data access layer for Option entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 *
 * Responsibilities:
 * - Database operations for MktOptionWorkspaceEntity
 * - System configuration management
 * - Thread-safe workspace context handling
 */
@Injectable()
export class MktOptionRepository extends BaseWorkspaceRepository<MktOptionWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktOptionWorkspaceEntity,
      LOG_CONTEXT,
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find option by key
   * Primary lookup method for configuration values
   */
  async findByKey(
    workspaceId: string,
    key: string,
  ): Promise<MktOptionWorkspaceEntity | null> {
    this.logger.debug(`Finding option by key: ${key}`);

    return this.findOne(workspaceId, { key });
  }

  /**
   * Get value by key with optional default
   */
  async getValue(
    workspaceId: string,
    key: string,
    defaultValue?: string,
  ): Promise<string | null> {
    const option = await this.findByKey(workspaceId, key);

    return option?.value ?? defaultValue ?? null;
  }

  /**
   * Get value as number
   */
  async getNumberValue(
    workspaceId: string,
    key: string,
    defaultValue?: number,
  ): Promise<number> {
    const value = await this.getValue(workspaceId, key);

    if (value === null) {
      return defaultValue ?? 0;
    }

    const parsed = parseInt(value, 10);

    return isNaN(parsed) ? (defaultValue ?? 0) : parsed;
  }

  /**
   * Get value as boolean
   */
  async getBooleanValue(
    workspaceId: string,
    key: string,
    defaultValue = false,
  ): Promise<boolean> {
    const value = await this.getValue(workspaceId, key);

    if (value === null) {
      return defaultValue;
    }

    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Get value as JSON object
   */
  async getJsonValue<T>(
    workspaceId: string,
    key: string,
    defaultValue?: T,
  ): Promise<T | null> {
    const value = await this.getValue(workspaceId, key);

    if (value === null) {
      return defaultValue ?? null;
    }

    const result = safeJsonParse<T>(value);

    if (result.success) {
      return result.data;
    }

    this.logger.warn(`Failed to parse JSON for key ${key}: ${result.error}`);

    return defaultValue ?? null;
  }

  /**
   * Find all options with ordering
   */
  async findAllOrdered(
    workspaceId: string,
  ): Promise<MktOptionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      order: { position: 'ASC', key: 'ASC' },
    });
  }

  /**
   * Find options by key pattern (prefix)
   */
  async findByKeyPrefix(
    workspaceId: string,
    prefix: string,
  ): Promise<MktOptionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository
      .createQueryBuilder('option')
      .where('option.key LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('option.key', 'ASC')
      .getMany();
  }

  // ============================================
  // CREATE/UPDATE OPERATIONS
  // ============================================

  /**
   * Create new option
   */
  async create(
    workspaceId: string,
    data: DeepPartial<MktOptionWorkspaceEntity>,
  ): Promise<MktOptionWorkspaceEntity> {
    this.logger.log(`Creating option: ${data.key}`);

    const repository = await this.getRepository(workspaceId);
    const option = repository.create(data);

    return repository.save(option);
  }

  /**
   * Set option value by key
   * Creates if not exists, updates if exists
   */
  async setValue(
    workspaceId: string,
    key: string,
    value: string,
    options?: { name?: string; description?: string },
  ): Promise<MktOptionWorkspaceEntity> {
    const existing = await this.findByKey(workspaceId, key);

    if (existing) {
      await this.update(workspaceId, existing.id, { value });

      return { ...existing, value } as MktOptionWorkspaceEntity;
    }

    return this.create(workspaceId, {
      key,
      value,
      name: options?.name ?? key,
      description: options?.description,
    });
  }

  /**
   * Bulk set options
   */
  async setValues(
    workspaceId: string,
    options: Array<{ key: string; value: string; name?: string }>,
  ): Promise<void> {
    for (const option of options) {
      await this.setValue(workspaceId, option.key, option.value, {
        name: option.name,
      });
    }
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Delete option by key
   */
  async deleteByKey(workspaceId: string, key: string): Promise<void> {
    this.logger.warn(`Deleting option by key: ${key}`);

    const repository = await this.getRepository(workspaceId);

    await repository.delete({ key });
  }

  // ============================================
  // EXISTENCE CHECKS
  // ============================================

  /**
   * Check if option exists by key
   */
  async existsByKey(workspaceId: string, key: string): Promise<boolean> {
    return this.existsWhere(workspaceId, { key });
  }
}
