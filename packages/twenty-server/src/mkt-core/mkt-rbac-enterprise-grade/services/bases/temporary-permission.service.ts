/**
 * TemporaryPermissionService - Business logic for Temporary Permissions
 *
 * Provides operations for managing time-limited permission grants.
 * Supports emergency access, cross-department collaboration, and temporary coverage.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { MktTemporaryPermissionRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { MktTemporaryPermissionWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import { RbacCacheService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-cache.service';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { TEMP_PERMISSION_SERVICE_MESSAGES } from 'src/mkt-core/mkt-rbac-enterprise-grade/message';
import {
  TemporaryPermissionPurpose,
  RevokeReason,
  CreateTemporaryPermissionInput,
  GrantTemporaryAccessInput,
  RevokeTemporaryPermissionInput,
  TemporaryPermissionQueryOptions,
  TemporaryPermissionListResult,
  TemporaryPermissionCheckResult,
  UserTemporaryPermissionsSummary,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types';

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_DURATION_HOURS = 24;
const MAX_DURATION_HOURS = 720; // 30 days

// ============================================
// SERVICE
// ============================================

@Injectable()
export class TemporaryPermissionService {
  private readonly logger = new Logger(TemporaryPermissionService.name);

  constructor(
    private readonly permissionRepository: MktTemporaryPermissionRepository,
    private readonly cacheService: RbacCacheService,
  ) {}

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create a temporary permission
   */
  async createTemporaryPermission(
    workspaceId: string,
    input: CreateTemporaryPermissionInput,
  ): Promise<MktTemporaryPermissionWorkspaceEntity> {
    // Validate at least one permission is granted
    if (!input.canRead && !input.canUpdate && !input.canDelete) {
      throw new Error(TEMP_PERMISSION_SERVICE_MESSAGES.NO_PERMISSIONS_GRANTED);
    }

    const permission = await this.permissionRepository.create({
      granteeWorkspaceMemberId: input.granteeWorkspaceMemberId,
      granterWorkspaceMemberId: input.granterWorkspaceMemberId,
      objectName: input.objectName,
      recordId: input.recordId,
      canRead: input.canRead ?? false,
      canUpdate: input.canUpdate ?? false,
      canDelete: input.canDelete ?? false,
      expiresAt: input.expiresAt,
      reason: input.reason,
      purpose: input.purpose,
      isActive: true,
    });

    this.logger.log(
      TEMP_PERMISSION_SERVICE_MESSAGES.CREATED(
        input.granteeWorkspaceMemberId,
        input.objectName,
      ),
    );

    // Invalidate cache
    await this.invalidateCache(workspaceId, input.granteeWorkspaceMemberId);

    return permission;
  }

  /**
   * Grant temporary access with simplified input
   */
  async grantTemporaryAccess(
    workspaceId: string,
    input: GrantTemporaryAccessInput,
  ): Promise<MktTemporaryPermissionWorkspaceEntity> {
    // Validate permissions
    const { read, update, delete: del } = input.permissions;

    if (!read && !update && !del) {
      throw new Error(TEMP_PERMISSION_SERVICE_MESSAGES.NO_PERMISSIONS_GRANTED);
    }

    // Calculate expiry
    let expiresAt: Date;

    if (input.expiresAt) {
      expiresAt = input.expiresAt;
    } else {
      const hours = input.durationHours ?? DEFAULT_DURATION_HOURS;

      if (hours < 1 || hours > MAX_DURATION_HOURS) {
        throw new Error(
          TEMP_PERMISSION_SERVICE_MESSAGES.INVALID_DURATION(MAX_DURATION_HOURS),
        );
      }

      expiresAt =
        DateTimeUtils.toDate(
          DateTimeUtils.add(DateTimeUtils.now(), { hours }),
        ) ?? new Date();
    }

    return this.createTemporaryPermission(workspaceId, {
      granteeWorkspaceMemberId: input.granteeWorkspaceMemberId,
      granterWorkspaceMemberId: input.granterWorkspaceMemberId,
      objectName: input.objectName,
      recordId: input.recordId,
      canRead: read,
      canUpdate: update,
      canDelete: del,
      expiresAt,
      reason: input.reason,
      purpose: input.purpose,
    });
  }

  // ============================================
  // READ OPERATIONS
  // ============================================

  /**
   * Get temporary permission by ID
   */
  async getPermissionById(
    workspaceId: string,
    id: string,
    options?: TemporaryPermissionQueryOptions,
  ): Promise<MktTemporaryPermissionWorkspaceEntity | null> {
    if (options?.includeRelations) {
      return this.permissionRepository.findWithRelations(workspaceId, id);
    }

    return this.permissionRepository.findById(id);
  }

  /**
   * Get all temporary permissions for a grantee
   */
  async getPermissionsByGrantee(
    workspaceId: string,
    granteeWorkspaceMemberId: string,
    options?: TemporaryPermissionQueryOptions,
  ): Promise<TemporaryPermissionListResult> {
    const referenceDate =
      options?.referenceDate ??
      DateTimeUtils.toDate(DateTimeUtils.now()) ??
      new Date();

    // Get all permissions for grantee
    const allPermissions = await this.permissionRepository.findByGranteeId(
      workspaceId,
      granteeWorkspaceMemberId,
    );

    // Categorize
    let permissions = allPermissions;
    let activeCount = 0;
    let expiredCount = 0;
    let revokedCount = 0;

    for (const p of allPermissions) {
      if (p.revokedAt) {
        revokedCount++;
      } else if (p.expiresAt < referenceDate) {
        expiredCount++;
      } else if (p.isActive) {
        activeCount++;
      }
    }

    // Apply filters
    if (!options?.includeExpired && !options?.includeRevoked) {
      permissions = await this.permissionRepository.findActiveByGranteeId(
        workspaceId,
        granteeWorkspaceMemberId,
        referenceDate,
      );
    } else if (!options?.includeRevoked) {
      permissions = permissions.filter((p) => !p.revokedAt);
    } else if (!options?.includeExpired) {
      permissions = permissions.filter(
        (p) => p.expiresAt >= referenceDate || p.revokedAt,
      );
    }

    // Filter by object name
    if (options?.objectName) {
      permissions = permissions.filter(
        (p) => p.objectName === options.objectName,
      );
    }

    // Filter by purpose
    if (options?.purpose) {
      permissions = permissions.filter((p) => p.purpose === options.purpose);
    }

    return {
      permissions,
      total: permissions.length,
      activeCount,
      expiredCount,
      revokedCount,
    };
  }

  /**
   * Get permissions granted by a specific user
   */
  async getPermissionsByGranter(
    workspaceId: string,
    granterWorkspaceMemberId: string,
  ): Promise<MktTemporaryPermissionWorkspaceEntity[]> {
    return this.permissionRepository.findByGranterId(
      workspaceId,
      granterWorkspaceMemberId,
    );
  }

  /**
   * Get active permissions for a user and object
   */
  async getActivePermissionsForObject(
    workspaceId: string,
    granteeWorkspaceMemberId: string,
    objectName: string,
    recordId?: string,
  ): Promise<MktTemporaryPermissionWorkspaceEntity[]> {
    return this.permissionRepository.findActiveForGranteeAndObject(
      workspaceId,
      granteeWorkspaceMemberId,
      objectName,
      recordId,
    );
  }

  /**
   * Check if user has temporary permission
   */
  async checkTemporaryPermission(
    workspaceId: string,
    granteeWorkspaceMemberId: string,
    objectName: string,
    recordId?: string,
    action?: 'read' | 'update' | 'delete',
  ): Promise<TemporaryPermissionCheckResult> {
    const permissions =
      await this.permissionRepository.findActiveForGranteeAndObject(
        workspaceId,
        granteeWorkspaceMemberId,
        objectName,
        recordId,
      );

    if (permissions.length === 0) {
      return {
        hasPermission: false,
        canRead: false,
        canUpdate: false,
        canDelete: false,
        permissions: [],
      };
    }

    // Aggregate permissions (OR logic - any grant is sufficient)
    const canRead = permissions.some((p) => p.canRead);
    const canUpdate = permissions.some((p) => p.canUpdate);
    const canDelete = permissions.some((p) => p.canDelete);

    // Check specific action if requested
    let hasPermission = true;

    if (action === 'read') {
      hasPermission = canRead;
    } else if (action === 'update') {
      hasPermission = canUpdate;
    } else if (action === 'delete') {
      hasPermission = canDelete;
    }

    // Find earliest expiry
    const expiresAt = permissions.reduce<Date | undefined>((earliest, p) => {
      if (!earliest) {
        return p.expiresAt;
      }

      return p.expiresAt < earliest ? p.expiresAt : earliest;
    }, undefined);

    return {
      hasPermission,
      canRead,
      canUpdate,
      canDelete,
      expiresAt,
      permissions,
    };
  }

  /**
   * Get user's temporary permissions summary
   */
  async getUserPermissionsSummary(
    workspaceId: string,
    granteeWorkspaceMemberId: string,
  ): Promise<UserTemporaryPermissionsSummary> {
    const allPermissions = await this.permissionRepository.findByGranteeId(
      workspaceId,
      granteeWorkspaceMemberId,
    );

    const now = DateTimeUtils.toDate(DateTimeUtils.now()) ?? new Date();
    let activePermissions = 0;
    let expiredPermissions = 0;
    let revokedPermissions = 0;
    const permissionsByObject: Record<string, number> = {};
    const permissionsByPurpose: Record<string, number> = {};
    let earliestExpiry: Date | undefined;
    let latestExpiry: Date | undefined;

    for (const p of allPermissions) {
      // Count by status
      if (p.revokedAt) {
        revokedPermissions++;
      } else if (p.expiresAt < now) {
        expiredPermissions++;
      } else if (p.isActive) {
        activePermissions++;

        // Track expiry dates for active permissions
        if (!earliestExpiry || p.expiresAt < earliestExpiry) {
          earliestExpiry = p.expiresAt;
        }

        if (!latestExpiry || p.expiresAt > latestExpiry) {
          latestExpiry = p.expiresAt;
        }
      }

      // Count by object
      permissionsByObject[p.objectName] =
        (permissionsByObject[p.objectName] ?? 0) + 1;

      // Count by purpose
      if (p.purpose) {
        permissionsByPurpose[p.purpose] =
          (permissionsByPurpose[p.purpose] ?? 0) + 1;
      }
    }

    return {
      userId: '', // Would need to join with user table
      workspaceMemberId: granteeWorkspaceMemberId,
      activePermissions,
      expiredPermissions,
      revokedPermissions,
      permissionsByObject,
      permissionsByPurpose,
      earliestExpiry,
      latestExpiry,
    };
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Extend a temporary permission's expiry
   */
  async extendPermission(
    workspaceId: string,
    id: string,
    newExpiresAt?: Date,
    additionalHours?: number,
  ): Promise<MktTemporaryPermissionWorkspaceEntity> {
    const permission = await this.permissionRepository.findById(id);

    if (!permission) {
      throw new NotFoundException(
        TEMP_PERMISSION_SERVICE_MESSAGES.NOT_FOUND(id),
      );
    }

    if (permission.revokedAt) {
      throw new Error(TEMP_PERMISSION_SERVICE_MESSAGES.ALREADY_REVOKED(id));
    }

    // Calculate new expiry
    let expiresAt: Date;

    if (newExpiresAt) {
      expiresAt = newExpiresAt;
    } else if (additionalHours) {
      if (additionalHours < 1 || additionalHours > MAX_DURATION_HOURS) {
        throw new Error(
          TEMP_PERMISSION_SERVICE_MESSAGES.INVALID_DURATION(MAX_DURATION_HOURS),
        );
      }

      const currentDate =
        DateTimeUtils.toDate(DateTimeUtils.now()) ?? new Date();
      const baseDate =
        permission.expiresAt > currentDate
          ? DateTimeUtils.fromDate(permission.expiresAt)
          : DateTimeUtils.now();

      expiresAt =
        DateTimeUtils.toDate(
          DateTimeUtils.add(baseDate, { hours: additionalHours }),
        ) ?? new Date();
    } else {
      // Default extension: 24 hours from now
      expiresAt =
        DateTimeUtils.toDate(
          DateTimeUtils.add(DateTimeUtils.now(), {
            hours: DEFAULT_DURATION_HOURS,
          }),
        ) ?? new Date();
    }

    // Update permission
    await this.permissionRepository.update(id, {
      expiresAt,
      isActive: true,
    });

    this.logger.log(
      TEMP_PERMISSION_SERVICE_MESSAGES.EXTENDED(
        id,
        DateTimeUtils.toISO(DateTimeUtils.fromDate(expiresAt)),
      ),
    );

    // Invalidate cache
    await this.invalidateCache(
      workspaceId,
      permission.granteeWorkspaceMemberId,
    );

    const updated = await this.permissionRepository.findById(id);

    if (!updated) {
      throw new NotFoundException(
        TEMP_PERMISSION_SERVICE_MESSAGES.NOT_FOUND(id),
      );
    }

    return updated;
  }

  /**
   * Revoke a temporary permission
   */
  async revokePermission(
    workspaceId: string,
    id: string,
    input: RevokeTemporaryPermissionInput,
  ): Promise<MktTemporaryPermissionWorkspaceEntity> {
    const permission = await this.permissionRepository.findById(id);

    if (!permission) {
      throw new NotFoundException(
        TEMP_PERMISSION_SERVICE_MESSAGES.NOT_FOUND(id),
      );
    }

    if (permission.revokedAt) {
      throw new Error(TEMP_PERMISSION_SERVICE_MESSAGES.ALREADY_REVOKED(id));
    }

    await this.permissionRepository.revoke(
      workspaceId,
      id,
      input.revokedById,
      input.reason,
    );

    this.logger.log(TEMP_PERMISSION_SERVICE_MESSAGES.REVOKED(id, input.reason));

    // Invalidate cache
    await this.invalidateCache(
      workspaceId,
      permission.granteeWorkspaceMemberId,
    );

    const updated = await this.permissionRepository.findWithRelations(
      workspaceId,
      id,
    );

    if (!updated) {
      throw new NotFoundException(
        TEMP_PERMISSION_SERVICE_MESSAGES.NOT_FOUND(id),
      );
    }

    return updated;
  }

  /**
   * Bulk revoke permissions by grantee
   */
  async revokeAllForGrantee(
    workspaceId: string,
    granteeWorkspaceMemberId: string,
    revokedById: string,
    reason: RevokeReason,
  ): Promise<number> {
    const activePermissions =
      await this.permissionRepository.findActiveByGranteeId(
        workspaceId,
        granteeWorkspaceMemberId,
      );

    let revokedCount = 0;

    for (const permission of activePermissions) {
      await this.permissionRepository.revoke(
        workspaceId,
        permission.id,
        revokedById,
        reason,
      );
      revokedCount++;
    }

    this.logger.log(
      `${revokedCount} permissions revoked for grantee ${granteeWorkspaceMemberId}`,
    );

    // Invalidate cache
    await this.invalidateCache(workspaceId, granteeWorkspaceMemberId);

    return revokedCount;
  }

  /**
   * Deactivate all expired permissions
   */
  async deactivateExpiredPermissions(workspaceId: string): Promise<number> {
    const count =
      await this.permissionRepository.deactivateExpired(workspaceId);

    if (count > 0) {
      this.logger.log(
        TEMP_PERMISSION_SERVICE_MESSAGES.EXPIRED_DEACTIVATED(count),
      );
      await this.cacheService.invalidateWorkspace(workspaceId);
    }

    return count;
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Delete a temporary permission (hard delete)
   */
  async deletePermission(workspaceId: string, id: string): Promise<void> {
    const permission = await this.permissionRepository.findById(id);

    if (!permission) {
      throw new NotFoundException(
        TEMP_PERMISSION_SERVICE_MESSAGES.NOT_FOUND(id),
      );
    }

    await this.permissionRepository.hardDelete(workspaceId, id);

    this.logger.log(`Temporary permission ${id} deleted`);

    // Invalidate cache
    await this.invalidateCache(
      workspaceId,
      permission.granteeWorkspaceMemberId,
    );
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get statistics for temporary permissions in workspace
   */
  async getStatistics(workspaceId: string): Promise<{
    totalPermissions: number;
    activePermissions: number;
    expiredPermissions: number;
    revokedPermissions: number;
    permissionsByPurpose: Record<string, number>;
    permissionsByObject: Record<string, number>;
    averageDurationHours: number;
    expiringWithin24Hours: number;
  }> {
    // Get all permissions (we'd ideally have a better query for this)
    const expired = await this.permissionRepository.findExpired(workspaceId);
    const revoked = await this.permissionRepository.findRevoked(workspaceId);

    // For active, we need to query differently
    // This is a simplified implementation
    let totalPermissions = 0;
    const activePermissions = 0;
    const expiredPermissions = expired.length;
    const revokedPermissions = revoked.length;
    const permissionsByPurpose: Record<string, number> = {};
    const permissionsByObject: Record<string, number> = {};
    const totalDurationHours = 0;
    const expiringWithin24Hours = 0;

    // Count expired permissions
    for (const p of expired) {
      if (p.purpose) {
        permissionsByPurpose[p.purpose] =
          (permissionsByPurpose[p.purpose] ?? 0) + 1;
      }
      permissionsByObject[p.objectName] =
        (permissionsByObject[p.objectName] ?? 0) + 1;
    }

    // Count revoked permissions
    for (const p of revoked) {
      if (p.purpose) {
        permissionsByPurpose[p.purpose] =
          (permissionsByPurpose[p.purpose] ?? 0) + 1;
      }
      permissionsByObject[p.objectName] =
        (permissionsByObject[p.objectName] ?? 0) + 1;
    }

    totalPermissions =
      expiredPermissions + revokedPermissions + activePermissions;

    const averageDurationHours =
      totalPermissions > 0 ? totalDurationHours / totalPermissions : 0;

    return {
      totalPermissions,
      activePermissions,
      expiredPermissions,
      revokedPermissions,
      permissionsByPurpose,
      permissionsByObject,
      averageDurationHours,
      expiringWithin24Hours,
    };
  }

  // ============================================
  // VALIDATION
  // ============================================

  /**
   * Validate if a user can grant temporary permissions
   */
  async canGrantPermissions(
    _workspaceId: string,
    _granterWorkspaceMemberId: string,
    _objectName: string,
  ): Promise<{ canGrant: boolean; reason?: string }> {
    // TODO: Implement actual permission check
    // This would check if the granter has sufficient permissions to grant
    // temporary access to the specified object

    return { canGrant: true };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Invalidate permission cache for a user
   */
  private async invalidateCache(
    workspaceId: string,
    granteeWorkspaceMemberId: string,
  ): Promise<void> {
    // Invalidate user-specific cache
    await this.cacheService.invalidateUser(
      granteeWorkspaceMemberId,
      workspaceId,
    );

    this.logger.debug(
      TEMP_PERMISSION_SERVICE_MESSAGES.CACHE_INVALIDATED(workspaceId),
    );
  }
}

// Re-export types for backward compatibility
export { TemporaryPermissionPurpose, RevokeReason };
