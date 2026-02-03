/**
 * PermissionContextService - Business logic for Permission Context
 *
 * Manages permission context definitions (template layer).
 * Provides methods to get context by key/type and resolve filter expressions.
 *
 * Permission Context là TEMPLATE LAYER, chứa filterExpression với template variables
 * ($user.*, $context.*) sẽ được resolve runtime thành actual values.
 *
 * @see /docs/RBAC-REFACTOR-PLAN.md
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { MktPermissionContextRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { MktPermissionContextWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import { RbacCacheService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-cache.service';
import { CONTEXT_TYPE } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/permission-template/options.constants';
import {
  DATA_ACCESS_SCOPE_TO_CONTEXT_KEY,
  MKT_PERMISSION_CONTEXT_DATA_SEEDS,
} from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-context/mkt-permission-context-data-seeds.constants';
import {
  PermissionContextCreateInput,
  PermissionContextListResult,
  PermissionContextQueryOptions,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types';

@Injectable()
export class PermissionContextService {
  private readonly logger = new Logger(PermissionContextService.name);

  // ============================================
  // STATIC CONSTANTS
  // ============================================

  private static readonly DEFAULT_PRIORITY = 0;

  constructor(
    private readonly contextRepository: MktPermissionContextRepository,
    private readonly cacheService: RbacCacheService,
  ) {}

  // ============================================
  // READ OPERATIONS
  // ============================================

  /**
   * Lấy context theo contextKey
   *
   * @param workspaceId - Workspace ID
   * @param contextKey - Context key (e.g., 'own', 'team', 'department', 'all')
   * @returns Permission context hoặc null nếu không tìm thấy
   */
  async getByContextKey(
    workspaceId: string,
    contextKey: string,
  ): Promise<MktPermissionContextWorkspaceEntity | null> {
    // Check cache first (sử dụng workspaceId làm cache key prefix)
    const cacheKey = `context:${workspaceId}:${contextKey}`;
    const cached = await this.getCachedContext(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for context: ${contextKey}`);

      return cached;
    }

    // Query từ repository
    const context = await this.contextRepository.findByContextKey(contextKey);

    if (context) {
      await this.setCachedContext(cacheKey, context);
    }

    return context;
  }

  /**
   * Lấy context theo contextKey hoặc throw exception
   *
   * @throws NotFoundException nếu không tìm thấy context
   */
  async getByContextKeyOrThrow(
    workspaceId: string,
    contextKey: string,
  ): Promise<MktPermissionContextWorkspaceEntity> {
    const context = await this.getByContextKey(workspaceId, contextKey);

    if (!context) {
      throw new NotFoundException(
        `Permission context not found: ${contextKey}`,
      );
    }

    return context;
  }

  /**
   * Lấy context theo ID
   */
  async getById(
    workspaceId: string,
    id: string,
  ): Promise<MktPermissionContextWorkspaceEntity | null> {
    return this.contextRepository.findById(id);
  }

  /**
   * Lấy context theo ID hoặc throw exception
   */
  async getByIdOrThrow(
    workspaceId: string,
    id: string,
  ): Promise<MktPermissionContextWorkspaceEntity> {
    const context = await this.getById(workspaceId, id);

    if (!context) {
      throw new NotFoundException(`Permission context not found: ${id}`);
    }

    return context;
  }

  /**
   * Lấy danh sách contexts theo contextType
   */
  async getByContextType(
    workspaceId: string,
    contextType: CONTEXT_TYPE,
  ): Promise<MktPermissionContextWorkspaceEntity[]> {
    return this.contextRepository.findByContextType(workspaceId, contextType);
  }

  /**
   * Lấy danh sách system default contexts
   */
  async getSystemDefaults(
    workspaceId: string,
  ): Promise<MktPermissionContextWorkspaceEntity[]> {
    return this.contextRepository.findSystemDefaults(workspaceId);
  }

  /**
   * Lấy tất cả contexts active
   */
  async getAllActive(
    workspaceId: string,
  ): Promise<MktPermissionContextWorkspaceEntity[]> {
    return this.contextRepository.findActive(workspaceId);
  }

  /**
   * List contexts với options
   */
  async listContexts(
    workspaceId: string,
    options?: PermissionContextQueryOptions,
  ): Promise<PermissionContextListResult> {
    let contexts: MktPermissionContextWorkspaceEntity[];

    if (options?.includeInactive) {
      contexts = await this.contextRepository.findMany({});
    } else {
      contexts = await this.contextRepository.findActive(workspaceId);
    }

    return {
      contexts,
      total: contexts.length,
    };
  }

  // ============================================
  // CONTEXT MAPPING
  // ============================================

  /**
   * Map dataAccessScope từ OrganizationLevel sang contextKey
   *
   * @param dataAccessScope - Data access scope từ OrganizationLevel
   * @returns contextKey tương ứng trong PermissionContext
   *
   * @example
   * getContextKeyForDataAccessScope('ALL_DEPARTMENTS') // → 'all'
   * getContextKeyForDataAccessScope('OWN_RECORDS')     // → 'own'
   */
  getContextKeyForDataAccessScope(dataAccessScope: string): string {
    return DATA_ACCESS_SCOPE_TO_CONTEXT_KEY[dataAccessScope] ?? 'own';
  }

  /**
   * Lấy context cho dataAccessScope cụ thể
   *
   * @param workspaceId - Workspace ID
   * @param dataAccessScope - Data access scope từ OrganizationLevel
   * @returns Permission context tương ứng hoặc null
   */
  async getContextForDataAccessScope(
    workspaceId: string,
    dataAccessScope: string,
  ): Promise<MktPermissionContextWorkspaceEntity | null> {
    const contextKey = this.getContextKeyForDataAccessScope(dataAccessScope);

    return this.getByContextKey(workspaceId, contextKey);
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Tạo permission context mới
   */
  async createContext(
    workspaceId: string,
    input: PermissionContextCreateInput,
  ): Promise<MktPermissionContextWorkspaceEntity> {
    // Check duplicate contextKey
    const existing = await this.getByContextKey(workspaceId, input.contextKey);

    if (existing) {
      this.logger.warn(`Context already exists: ${input.contextKey}`);

      return existing;
    }

    // Create context
    const context = await this.contextRepository.create({
      contextKey: input.contextKey,
      contextType: input.contextType,
      name: input.name,
      description: input.description,
      filterExpression: input.filterExpression,
      priority: input.priority ?? PermissionContextService.DEFAULT_PRIORITY,
      isSystemDefault: input.isSystemDefault ?? false,
      isActive: input.isActive ?? true,
      position: input.position ?? 0,
      validationRules: input.validationRules,
    });

    this.logger.log(`Created permission context: ${input.contextKey}`);

    // Invalidate cache
    await this.invalidateCache(workspaceId);

    return context;
  }

  /**
   * Tạo system default contexts từ seed data
   *
   * @param workspaceId - Workspace ID
   */
  async createSystemDefaults(workspaceId: string): Promise<void> {
    const defaults = MKT_PERMISSION_CONTEXT_DATA_SEEDS;

    for (const def of defaults) {
      const existing = await this.getByContextKey(workspaceId, def.contextKey);

      if (!existing) {
        await this.createContext(workspaceId, {
          contextKey: def.contextKey,
          contextType: def.contextType as CONTEXT_TYPE,
          name: def.name,
          description: def.description,
          filterExpression: def.filterExpression as Record<string, unknown>,
          priority: def.priority,
          isSystemDefault: def.isSystemDefault,
          isActive: def.isActive,
          position: def.position,
          validationRules: def.validationRules as Record<string, unknown>,
        });
      }
    }

    this.logger.log(
      `System default contexts created for workspace: ${workspaceId}`,
    );
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Cập nhật permission context
   */
  async updateContext(
    workspaceId: string,
    id: string,
    input: Partial<PermissionContextCreateInput>,
  ): Promise<MktPermissionContextWorkspaceEntity> {
    await this.getByIdOrThrow(workspaceId, id);

    await this.contextRepository.update(id, input);

    this.logger.log(`Updated permission context: ${id}`);

    // Invalidate cache
    await this.invalidateCache(workspaceId);

    return this.getByIdOrThrow(workspaceId, id);
  }

  /**
   * Activate context
   */
  async activateContext(
    workspaceId: string,
    id: string,
  ): Promise<MktPermissionContextWorkspaceEntity> {
    await this.contextRepository.updateIsActive(id, true);
    this.logger.log(`Activated permission context: ${id}`);
    await this.invalidateCache(workspaceId);

    return this.getByIdOrThrow(workspaceId, id);
  }

  /**
   * Deactivate context
   */
  async deactivateContext(
    workspaceId: string,
    id: string,
  ): Promise<MktPermissionContextWorkspaceEntity> {
    await this.contextRepository.updateIsActive(id, false);
    this.logger.log(`Deactivated permission context: ${id}`);
    await this.invalidateCache(workspaceId);

    return this.getByIdOrThrow(workspaceId, id);
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Soft delete context (set isActive = false)
   */
  async deleteContext(workspaceId: string, id: string): Promise<void> {
    const context = await this.getByIdOrThrow(workspaceId, id);

    // Không cho phép xóa system default contexts
    if (context.isSystemDefault) {
      throw new Error('Cannot delete system default context');
    }

    await this.contextRepository.updateIsActive(id, false);
    this.logger.log(`Deleted permission context: ${id}`);
    await this.invalidateCache(workspaceId);
  }

  /**
   * Hard delete context (permanent removal)
   */
  async hardDeleteContext(workspaceId: string, id: string): Promise<void> {
    const context = await this.getByIdOrThrow(workspaceId, id);

    // Không cho phép xóa system default contexts
    if (context.isSystemDefault) {
      throw new Error('Cannot hard delete system default context');
    }

    await this.contextRepository.hardDelete(workspaceId, id);
    this.logger.log(`Hard deleted permission context: ${id}`);
    await this.invalidateCache(workspaceId);
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Lấy thống kê về permission contexts
   */
  async getStatistics(workspaceId: string): Promise<{
    total: number;
    active: number;
    systemDefault: number;
    byContextType: Record<string, number>;
  }> {
    const allContexts = await this.contextRepository.findMany({});
    const activeContexts = await this.contextRepository.findActive(workspaceId);
    const systemDefaults =
      await this.contextRepository.findSystemDefaults(workspaceId);

    const byContextType: Record<string, number> = {};

    for (const context of allContexts) {
      const contextType = context.contextType;

      byContextType[contextType] = (byContextType[contextType] ?? 0) + 1;
    }

    return {
      total: allContexts.length,
      active: activeContexts.length,
      systemDefault: systemDefaults.length,
      byContextType,
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Lấy context từ cache
   * Note: Tạm thời trả về null vì RbacCacheService chưa có method getContext
   * TODO: Implement caching cho permission context trong RbacCacheService
   */
  private async getCachedContext(
    _cacheKey: string,
  ): Promise<MktPermissionContextWorkspaceEntity | null> {
    // TODO: Implement caching
    return null;
  }

  /**
   * Set context vào cache
   * Note: Tạm thời không làm gì vì RbacCacheService chưa có method setContext
   * TODO: Implement caching cho permission context trong RbacCacheService
   */
  private async setCachedContext(
    _cacheKey: string,
    _context: MktPermissionContextWorkspaceEntity,
  ): Promise<void> {
    // TODO: Implement caching
  }

  /**
   * Invalidate cache cho workspace
   */
  private async invalidateCache(workspaceId: string): Promise<void> {
    await this.cacheService.invalidateWorkspace(workspaceId);
    this.logger.debug(`Cache invalidated for workspace: ${workspaceId}`);
  }
}
