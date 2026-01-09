/**
 * RBAC Cache Service
 *
 * Wrapper service for RBAC caching operations.
 * This service provides a domain-specific interface that wraps the existing
 * RbacCacheManagerService, providing additional semantic methods for RBAC use cases.
 *
 * Note: This is a thin wrapper that delegates to RbacCacheManagerService.
 * For new features, consider adding them directly to RbacCacheManagerService.
 */

import { Injectable, Logger } from '@nestjs/common';

import { RBAC_LOG_CONTEXT } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';
import { EnhancedPermissionResult } from 'src/mkt-core/mkt-rbac-enterprise-grade/types';
import { RbacCacheManagerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-cache-manager.service';

/**
 * Cache tags for RBAC data (for documentation/reference)
 */
export const RBAC_CACHE_TAGS = {
  PERMISSION_TEMPLATE: 'rbac:template',
  USER: 'rbac:user',
  POLICY: 'rbac:policy',
  HIERARCHY: 'rbac:hierarchy',
  VALIDATION: 'rbac:validation',
} as const;

@Injectable()
export class RbacCacheService {
  private readonly logger = new Logger(RBAC_LOG_CONTEXT);

  constructor(private readonly cacheManager: RbacCacheManagerService) {
    this.logger.debug('RBAC Cache Service initialized (wrapper)');
  }

  // ============================================
  // PERMISSION TEMPLATE CACHE
  // ============================================

  async getPermissionTemplate<T>(templateId: string): Promise<T | null> {
    return this.cacheManager.getCachedTemplatePermissions(
      templateId,
    ) as Promise<T | null>;
  }

  async setPermissionTemplate<T extends Record<string, unknown>>(
    templateId: string,
    data: T,
    ttl?: number,
  ): Promise<void> {
    await this.cacheManager.cacheTemplatePermissions(templateId, data, ttl);
  }

  async invalidatePermissionTemplate(templateId: string): Promise<void> {
    await this.cacheManager.invalidateByPattern(`*template*${templateId}*`);
  }

  // ============================================
  // USER PERMISSIONS CACHE
  // ============================================

  async getUserPermissions<T>(userId: string): Promise<T | null> {
    return this.cacheManager.get<T>(`rbac:user:permissions:${userId}`);
  }

  async setUserPermissions<T>(
    userId: string,
    data: T,
    ttl?: number,
  ): Promise<void> {
    await this.cacheManager.set(`rbac:user:permissions:${userId}`, data, ttl);
  }

  async invalidateUserPermissions(userId: string): Promise<void> {
    await this.cacheManager.invalidateByPattern(`*user*${userId}*`);
  }

  // ============================================
  // USER CONTEXT CACHE
  // ============================================

  async getUserContext<T>(workspaceMemberId: string): Promise<T | null> {
    return this.cacheManager.getCachedUserContext(
      workspaceMemberId,
    ) as Promise<T | null>;
  }

  async setUserContext<T extends Record<string, unknown>>(
    workspaceMemberId: string,
    data: T,
    ttl?: number,
  ): Promise<void> {
    await this.cacheManager.cacheUserContext(workspaceMemberId, data, ttl);
  }

  // ============================================
  // VALIDATION RESULT CACHE
  // ============================================

  async getValidationResult(
    userId: string,
    action: string,
    resource: string,
  ): Promise<EnhancedPermissionResult | null> {
    const key = `rbac:validation:${userId}:${action}:${resource}`;

    return this.cacheManager.get<EnhancedPermissionResult>(key);
  }

  async setValidationResult(
    userId: string,
    action: string,
    resource: string,
    data: EnhancedPermissionResult,
    ttl?: number,
  ): Promise<void> {
    const key = `rbac:validation:${userId}:${action}:${resource}`;

    await this.cacheManager.set(key, data, ttl);
  }

  // ============================================
  // GENERIC CACHE OPERATIONS
  // ============================================

  async get<T>(key: string): Promise<T | null> {
    return this.cacheManager.get<T>(key);
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, data, ttl);
  }

  // ============================================
  // BULK INVALIDATION
  // ============================================

  async invalidateAll(): Promise<void> {
    await this.cacheManager.invalidateByPattern('rbac:*');
    this.logger.log('All RBAC cache invalidated');
  }

  async invalidateByUser(userId: string): Promise<void> {
    await this.cacheManager.invalidateByPattern(`*${userId}*`);
    this.logger.debug(`All cache for user invalidated: ${userId}`);
  }

  async invalidateAllTemplates(): Promise<void> {
    await this.cacheManager.invalidateByPattern('*template*');
    this.logger.log('All permission template cache invalidated');
  }

  async invalidateAllPolicies(): Promise<void> {
    await this.cacheManager.invalidateByPattern('*policy*');
    this.logger.log('All policy cache invalidated');
  }

  // ============================================
  // WARMUP
  // ============================================

  async warmup(): Promise<void> {
    // Delegate to cache manager if it has warmup capability
    this.logger.log('RBAC cache warmup started');
    // Implementation would be added based on specific requirements
    this.logger.log('RBAC cache warmup completed');
  }
}
