/**
 * Base Optimistic Locking Service
 *
 * Abstract base service cho optimistic locking operations.
 * Extend class này cho từng entity cần concurrent edit protection.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class OrderConcurrencyService extends BaseOptimisticLockingService<MktOrderWorkspaceEntity> {
 *   constructor(twentyORMGlobalManager: TwentyORMGlobalManager) {
 *     super(twentyORMGlobalManager, {
 *       entityName: 'mktOrder',
 *       editableFields: EDITABLE_ORDER_FIELDS,
 *       logContext: 'OrderConcurrency',
 *     });
 *   }
 *
 *   protected getEntityClass() {
 *     return MktOrderWorkspaceEntity;
 *   }
 * }
 * ```
 */

import { Logger } from '@nestjs/common';

import isEqual from 'lodash.isequal';
import { FindOptionsWhere } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { OPTIMISTIC_LOCKING_MESSAGES } from 'src/mkt-core/common/optimistic-locking/messages/optimistic-locking.messages';
import {
  ConflictInfo,
  FieldConflict,
  OptimisticLockingConfig,
  OptimisticUpdateResult,
  VersionedEntity,
} from 'src/mkt-core/common/optimistic-locking/types/optimistic-locking.types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * Abstract base service for optimistic locking operations
 *
 * Provides:
 * - Atomic update với version check
 * - Conflict detection
 * - Force update sau khi user resolve conflict
 */
export abstract class BaseOptimisticLockingService<T extends VersionedEntity> {
  protected readonly logger: Logger;
  protected readonly config: OptimisticLockingConfig;

  constructor(
    protected readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    config: OptimisticLockingConfig,
  ) {
    this.config = config;
    this.logger = new Logger(config.logContext);
  }

  /**
   * Update entity với optimistic locking
   *
   * Flow:
   * 1. Validate expectedVersion (internal guard cho calls không qua GraphQL)
   * 2. Thực hiện atomic UPDATE với WHERE version = expectedVersion
   * 3. Nếu affected = 1 → Success, return new version
   * 4. Nếu affected = 0 → Version mismatch, fetch current data và detect conflicts
   *
   * @param workspaceId - Workspace ID
   * @param entityId - Entity ID cần update
   * @param data - Partial data cần update
   * @param expectedVersion - Version number mà client expect (must be >= 1)
   * @returns Result với success status và conflict info nếu version mismatch
   *
   * **Note về validation:**
   * - DTO validation ở GraphQL layer check expectedVersion >= 1
   * - Service cũng validate để bảo vệ internal callers không qua GraphQL
   * - Theo guidelines, không silent fail mà log + return error
   */
  async updateWithOptimisticLock(
    workspaceId: string,
    entityId: string,
    data: Partial<T>,
    expectedVersion: number,
  ): Promise<OptimisticUpdateResult<T>> {
    // Internal validation guard cho calls không qua GraphQL DTO validation
    // expectedVersion phải >= 1 (version bắt đầu từ 1)
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      this.logger.warn(
        `Invalid expectedVersion: entityId=${entityId}, expectedVersion=${expectedVersion}`,
      );

      return {
        success: false,
        error: OPTIMISTIC_LOCKING_MESSAGES.INVALID_VERSION_MUST_BE_POSITIVE,
      };
    }

    this.logger.debug(
      `Optimistic update: entityId=${entityId}, expectedVersion=${expectedVersion}`,
    );

    // TODO: Remove shouldBypassPermissionChecks after proper RBAC setup
    const repository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<T>(
        workspaceId,
        this.config.entityName,
        { shouldBypassPermissionChecks: true },
      );

    // Atomic update với version check
    // Chỉ update nếu version trong DB match với expectedVersion
    const result = await repository
      .createQueryBuilder()
      .update()
      .set({
        ...data,
        version: () => 'version + 1',
        updatedAt: DateTimeUtils.toDate(DateTimeUtils.now()),
      } as QueryDeepPartialEntity<T>)
      .where('id = :id AND version = :version', {
        id: entityId,
        version: expectedVersion,
      })
      .execute();

    // Success - version matched và update đã apply
    if (result.affected === 1) {
      this.logger.debug(
        `Update success: entityId=${entityId}, newVersion=${expectedVersion + 1}`,
      );

      return {
        success: true,
        newVersion: expectedVersion + 1,
      };
    }

    // Version mismatch - fetch current data để detect conflicts
    // Sử dụng selectFields nếu được config (privacy/perf optimization)
    const findOptions: {
      where: FindOptionsWhere<T>;
      select?: (keyof T)[];
    } = {
      where: { id: entityId } as FindOptionsWhere<T>,
    };

    if (this.config.selectFields?.length) {
      // Đảm bảo luôn include các fields cần thiết cho conflict detection
      const requiredFields = ['id', 'version', 'updatedAt'];
      const allFields = [
        ...new Set([...requiredFields, ...this.config.selectFields]),
      ];

      findOptions.select = allFields as (keyof T)[];
    }

    const currentEntity = await repository.findOne(findOptions);

    // Entity không tồn tại
    if (!currentEntity) {
      this.logger.warn(`Entity not found: entityId=${entityId}`);

      return {
        success: false,
        error: OPTIMISTIC_LOCKING_MESSAGES.ENTITY_NOT_FOUND,
      };
    }

    // Detect field-level conflicts
    const conflicts = this.detectConflicts(data, currentEntity);

    this.logger.debug(
      `Version conflict: entityId=${entityId}, expectedVersion=${expectedVersion}, ` +
        `currentVersion=${currentEntity.version}, conflictCount=${conflicts.length}`,
    );

    return {
      success: false,
      error: OPTIMISTIC_LOCKING_MESSAGES.VERSION_CONFLICT,
      conflict: this.buildConflictInfo(currentEntity, conflicts),
      currentData: currentEntity,
    };
  }

  /**
   * Force update sau khi user resolve conflict
   *
   * Sử dụng currentVersion để đảm bảo không có thay đổi khác xảy ra
   * trong quá trình user đang resolve conflict.
   * Nếu có conflict mới, trả về conflict info mới.
   *
   * @param workspaceId - Workspace ID
   * @param entityId - Entity ID cần update
   * @param resolvedData - Data sau khi user đã resolve conflicts
   * @param currentVersion - Current version từ conflict info
   */
  async forceUpdate(
    workspaceId: string,
    entityId: string,
    resolvedData: Partial<T>,
    currentVersion: number,
  ): Promise<OptimisticUpdateResult<T>> {
    this.logger.debug(
      `Force update: entityId=${entityId}, currentVersion=${currentVersion}`,
    );

    return this.updateWithOptimisticLock(
      workspaceId,
      entityId,
      resolvedData,
      currentVersion,
    );
  }

  /**
   * Detect field-level conflicts giữa user's changes và current data
   *
   * Chỉ compare các fields được define trong editableFields config.
   * Trả về list các fields có giá trị khác nhau.
   */
  protected detectConflicts(
    userChanges: Partial<T>,
    currentData: T,
  ): FieldConflict[] {
    const conflicts: FieldConflict[] = [];

    for (const field of this.config.editableFields) {
      if (field in userChanges) {
        const yourValue = userChanges[field as keyof typeof userChanges];
        const currentValue = currentData[field as keyof typeof currentData];

        // Chỉ add vào conflicts nếu values khác nhau
        if (!this.isEqual(yourValue, currentValue)) {
          conflicts.push({
            field,
            yourValue,
            currentValue,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Build ConflictInfo từ entity và detected conflicts
   *
   * Note: updatedAt có thể là Date object hoặc ISO string tùy context.
   * Sử dụng DateTimeUtils.parse() để handle cả 2 trường hợp.
   */
  protected buildConflictInfo(
    entity: T,
    conflicts: FieldConflict[],
  ): ConflictInfo {
    return {
      currentVersion: entity.version ?? 0,
      conflicts,
      // parse() handles Date, string (ISO), number (millis) safely
      modifiedAt: entity.updatedAt
        ? DateTimeUtils.toDate(DateTimeUtils.parse(entity.updatedAt))
        : undefined,
    };
  }

  /**
   * Compare 2 values for equality
   *
   * Sử dụng lodash.isEqual để deep equality comparison.
   * Handles: nested objects, arrays, dates, key order differences.
   *
   * Override trong subclass nếu cần custom comparison logic.
   */
  protected isEqual(a: unknown, b: unknown): boolean {
    // lodash.isEqual handles all cases:
    // - null/undefined
    // - primitives
    // - Date objects
    // - nested objects (với correct key order handling)
    // - arrays
    return isEqual(a, b);
  }
}
