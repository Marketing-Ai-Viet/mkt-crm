/**
 * TemplateResourcePermissionService - Business logic for Template Resource Permissions
 *
 * Provides CRUD operations and business logic for managing resource permissions
 * within permission templates. Links templates to resources with specific actions.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import uniq from 'lodash.uniq';

import {
  MktTemplateResourcePermissionRepository,
  MktPermissionResourceRepository,
  MktPermissionTemplateRepository,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { MktTemplateResourcePermissionWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import { RbacCacheService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-cache.service';
import { RESOURCE_PERMISSION_MESSAGES } from 'src/mkt-core/mkt-rbac-enterprise-grade/message';
import {
  CreateResourcePermissionInput,
  UpdateResourcePermissionInput,
  BulkCreateResourcePermissionInput,
  ResourcePermissionQueryOptions,
  ResourcePermissionListResult,
  TemplatePermissionSummary,
  EffectiveResourcePermission,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types';

@Injectable()
export class TemplateResourcePermissionService {
  private readonly logger = new Logger(TemplateResourcePermissionService.name);

  // ============================================
  // STATIC CONSTANTS
  // ============================================

  /** Standard RBAC actions */
  private static readonly STANDARD_ACTIONS = [
    'READ',
    'CREATE',
    'UPDATE',
    'DELETE',
  ] as const;

  constructor(
    private readonly resourcePermissionRepository: MktTemplateResourcePermissionRepository,
    private readonly resourceRepository: MktPermissionResourceRepository,
    private readonly templateRepository: MktPermissionTemplateRepository,
    private readonly cacheService: RbacCacheService,
  ) {}

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create a new resource permission for a template
   */
  async createResourcePermission(
    workspaceId: string,
    input: CreateResourcePermissionInput,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity> {
    // Validate template exists
    const template = await this.templateRepository.findById(input.templateId);

    if (!template) {
      throw new NotFoundException(
        RESOURCE_PERMISSION_MESSAGES.TEMPLATE_NOT_FOUND(input.templateId),
      );
    }

    // Validate resource exists
    const resource = await this.resourceRepository.findById(input.resourceId);

    if (!resource) {
      throw new NotFoundException(
        RESOURCE_PERMISSION_MESSAGES.RESOURCE_NOT_FOUND(input.resourceId),
      );
    }

    // Check for duplicate
    const existing =
      await this.resourcePermissionRepository.findByTemplateResourceContext(
        workspaceId,
        input.templateId,
        input.resourceId,
        input.contextId,
      );

    if (existing) {
      throw new Error(
        RESOURCE_PERMISSION_MESSAGES.DUPLICATE_PERMISSION(
          input.templateId,
          input.resourceId,
        ),
      );
    }

    // Validate at least one allowed action
    if (!input.allowedActions || input.allowedActions.length === 0) {
      throw new Error(RESOURCE_PERMISSION_MESSAGES.NO_ALLOWED_ACTIONS);
    }

    // Create permission
    const permission = await this.resourcePermissionRepository.create({
      templateId: input.templateId,
      resourceId: input.resourceId,
      contextId: input.contextId,
      allowedActions: input.allowedActions,
      deniedActions: input.deniedActions ?? [],
      conditions: input.conditions ?? {},
      restrictions: input.restrictions ?? {},
      isActive: input.isActive ?? true,
    });

    this.logger.log(
      RESOURCE_PERMISSION_MESSAGES.CREATED(input.templateId, input.resourceId),
    );

    // Invalidate cache
    await this.invalidateCache(workspaceId);

    return permission;
  }

  /**
   * Bulk create resource permissions for a template
   */
  async bulkCreateResourcePermissions(
    workspaceId: string,
    input: BulkCreateResourcePermissionInput,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity[]> {
    // Validate template exists
    const template = await this.templateRepository.findById(input.templateId);

    if (!template) {
      throw new NotFoundException(
        RESOURCE_PERMISSION_MESSAGES.TEMPLATE_NOT_FOUND(input.templateId),
      );
    }

    // Validate all resources exist
    const resourceIds = input.permissions.map((p) => p.resourceId);
    const resources = await this.resourceRepository.findByIdsResource(
      workspaceId,
      resourceIds,
    );
    const foundResourceIds = new Set(resources.map((r) => r.id));

    for (const resourceId of resourceIds) {
      if (!foundResourceIds.has(resourceId)) {
        throw new NotFoundException(
          RESOURCE_PERMISSION_MESSAGES.RESOURCE_NOT_FOUND(resourceId),
        );
      }
    }

    // Create permissions
    const createdPermissions: MktTemplateResourcePermissionWorkspaceEntity[] =
      [];

    for (const permissionInput of input.permissions) {
      // Skip if already exists
      const existing =
        await this.resourcePermissionRepository.findByTemplateResourceContext(
          workspaceId,
          input.templateId,
          permissionInput.resourceId,
          permissionInput.contextId,
        );

      if (existing) {
        continue;
      }

      const permission = await this.resourcePermissionRepository.create({
        templateId: input.templateId,
        resourceId: permissionInput.resourceId,
        contextId: permissionInput.contextId,
        allowedActions: permissionInput.allowedActions,
        deniedActions: permissionInput.deniedActions ?? [],
        conditions: permissionInput.conditions ?? {},
        restrictions: permissionInput.restrictions ?? {},
        isActive: true,
      });

      createdPermissions.push(permission);
    }

    this.logger.log(
      RESOURCE_PERMISSION_MESSAGES.BULK_CREATED(
        createdPermissions.length,
        input.templateId,
      ),
    );

    // Invalidate cache
    await this.invalidateCache(workspaceId);

    return createdPermissions;
  }

  // ============================================
  // READ OPERATIONS
  // ============================================

  /**
   * Get resource permission by ID
   */
  async getPermissionById(
    workspaceId: string,
    id: string,
    options?: ResourcePermissionQueryOptions,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity | null> {
    if (options?.includeRelations) {
      return this.resourcePermissionRepository.findWithRelations(
        workspaceId,
        id,
      );
    }

    return this.resourcePermissionRepository.findById(id);
  }

  /**
   * Get all resource permissions for a template
   */
  async getPermissionsByTemplate(
    workspaceId: string,
    templateId: string,
    options?: ResourcePermissionQueryOptions,
  ): Promise<ResourcePermissionListResult> {
    let permissions = await this.resourcePermissionRepository.findByTemplateId(
      workspaceId,
      templateId,
    );

    // Filter by active status
    if (!options?.includeInactive) {
      permissions = permissions.filter((p) => p.isActive);
    }

    // Filter by resource IDs
    if (options?.resourceIds && options.resourceIds.length > 0) {
      const resourceIdSet = new Set(options.resourceIds);

      permissions = permissions.filter((p) => resourceIdSet.has(p.resourceId));
    }

    // Filter by context
    if (options?.contextId) {
      permissions = permissions.filter(
        (p) => p.contextId === options.contextId,
      );
    }

    return {
      permissions,
      total: permissions.length,
    };
  }

  /**
   * Get all resource permissions for a resource
   */
  async getPermissionsByResource(
    workspaceId: string,
    resourceId: string,
    options?: ResourcePermissionQueryOptions,
  ): Promise<ResourcePermissionListResult> {
    let permissions = await this.resourcePermissionRepository.findByResourceId(
      workspaceId,
      resourceId,
    );

    // Filter by active status
    if (!options?.includeInactive) {
      permissions = permissions.filter((p) => p.isActive);
    }

    return {
      permissions,
      total: permissions.length,
    };
  }

  /**
   * Get permissions for multiple templates
   */
  async getPermissionsByTemplateIds(
    workspaceId: string,
    templateIds: string[],
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity[]> {
    if (templateIds.length === 0) {
      return [];
    }

    return this.resourcePermissionRepository.findActiveByTemplateIds(
      workspaceId,
      templateIds,
    );
  }

  /**
   * Get effective permissions for a template (merged view)
   */
  async getEffectivePermissions(
    workspaceId: string,
    templateId: string,
  ): Promise<EffectiveResourcePermission[]> {
    const permissions =
      await this.resourcePermissionRepository.findByTemplateId(
        workspaceId,
        templateId,
      );

    const activePermissions = permissions.filter((p) => p.isActive);

    return activePermissions.map((p) => ({
      resourceId: p.resourceId,
      resourceKey: p.resource?.resourceKey ?? '',
      resourceName: p.resource?.resourceName ?? '',
      allowedActions: p.allowedActions,
      deniedActions: p.deniedActions ?? [],
      hasConditions: p.conditions
        ? Object.keys(p.conditions).length > 0
        : false,
      hasRestrictions: p.restrictions
        ? Object.keys(p.restrictions).length > 0
        : false,
      isActive: p.isActive,
    }));
  }

  /**
   * Get permission summary for a template
   */
  async getPermissionSummary(
    workspaceId: string,
    templateId: string,
  ): Promise<TemplatePermissionSummary> {
    const permissions =
      await this.resourcePermissionRepository.findByTemplateId(
        workspaceId,
        templateId,
      );

    const activePermissions = permissions.filter((p) => p.isActive);
    const uniqueResources = new Set(activePermissions.map((p) => p.resourceId));

    // Count actions
    const actionSummary: Record<string, number> = {};

    for (const permission of activePermissions) {
      for (const action of permission.allowedActions) {
        actionSummary[action] = (actionSummary[action] ?? 0) + 1;
      }
    }

    return {
      templateId,
      totalPermissions: permissions.length,
      activePermissions: activePermissions.length,
      resourceCount: uniqueResources.size,
      actionSummary,
    };
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update a resource permission
   */
  async updateResourcePermission(
    workspaceId: string,
    id: string,
    input: UpdateResourcePermissionInput,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity> {
    const permission = await this.resourcePermissionRepository.findById(id);

    if (!permission) {
      throw new NotFoundException(RESOURCE_PERMISSION_MESSAGES.NOT_FOUND(id));
    }

    // Validate at least one allowed action if updating
    if (input.allowedActions && input.allowedActions.length === 0) {
      throw new Error(RESOURCE_PERMISSION_MESSAGES.NO_ALLOWED_ACTIONS);
    }

    // Update permission
    await this.resourcePermissionRepository.update(id, {
      ...(input.allowedActions && { allowedActions: input.allowedActions }),
      ...(input.deniedActions !== undefined && {
        deniedActions: input.deniedActions,
      }),
      ...(input.conditions !== undefined && { conditions: input.conditions }),
      ...(input.restrictions !== undefined && {
        restrictions: input.restrictions,
      }),
      ...(input.contextId !== undefined && { contextId: input.contextId }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    });

    this.logger.log(RESOURCE_PERMISSION_MESSAGES.UPDATED(id));

    // Invalidate cache
    await this.invalidateCache(workspaceId);

    // Return updated permission
    const updated = await this.resourcePermissionRepository.findWithRelations(
      workspaceId,
      id,
    );

    if (!updated) {
      throw new NotFoundException(RESOURCE_PERMISSION_MESSAGES.NOT_FOUND(id));
    }

    return updated;
  }

  /**
   * Add actions to a resource permission
   */
  async addActions(
    workspaceId: string,
    id: string,
    actions: string[],
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity> {
    const permission = await this.resourcePermissionRepository.findById(id);

    if (!permission) {
      throw new NotFoundException(RESOURCE_PERMISSION_MESSAGES.NOT_FOUND(id));
    }

    const currentActions = permission.allowedActions ?? [];
    const newActions = uniq([...currentActions, ...actions]);

    return this.updateResourcePermission(workspaceId, id, {
      allowedActions: newActions,
    });
  }

  /**
   * Remove actions from a resource permission
   */
  async removeActions(
    workspaceId: string,
    id: string,
    actions: string[],
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity> {
    const permission = await this.resourcePermissionRepository.findById(id);

    if (!permission) {
      throw new NotFoundException(RESOURCE_PERMISSION_MESSAGES.NOT_FOUND(id));
    }

    const currentActions = permission.allowedActions ?? [];
    const actionsToRemove = new Set(actions);
    const newActions = currentActions.filter((a) => !actionsToRemove.has(a));

    if (newActions.length === 0) {
      throw new Error(RESOURCE_PERMISSION_MESSAGES.NO_ALLOWED_ACTIONS);
    }

    return this.updateResourcePermission(workspaceId, id, {
      allowedActions: newActions,
    });
  }

  /**
   * Activate a resource permission
   */
  async activatePermission(
    workspaceId: string,
    id: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity> {
    await this.resourcePermissionRepository.updateIsActive(id, true);
    this.logger.log(RESOURCE_PERMISSION_MESSAGES.ACTIVATED(id));

    await this.invalidateCache(workspaceId);

    const permission =
      await this.resourcePermissionRepository.findWithRelations(
        workspaceId,
        id,
      );

    if (!permission) {
      throw new NotFoundException(RESOURCE_PERMISSION_MESSAGES.NOT_FOUND(id));
    }

    return permission;
  }

  /**
   * Deactivate a resource permission
   */
  async deactivatePermission(
    workspaceId: string,
    id: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity> {
    await this.resourcePermissionRepository.updateIsActive(id, false);
    this.logger.log(RESOURCE_PERMISSION_MESSAGES.DEACTIVATED(id));

    await this.invalidateCache(workspaceId);

    const permission =
      await this.resourcePermissionRepository.findWithRelations(
        workspaceId,
        id,
      );

    if (!permission) {
      throw new NotFoundException(RESOURCE_PERMISSION_MESSAGES.NOT_FOUND(id));
    }

    return permission;
  }

  /**
   * Set standard CRUD permissions for a template-resource pair
   */
  async setStandardCrudPermissions(
    workspaceId: string,
    templateId: string,
    resourceId: string,
    options?: {
      includeCreate?: boolean;
      includeRead?: boolean;
      includeUpdate?: boolean;
      includeDelete?: boolean;
    },
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity> {
    const actions: string[] = [];

    if (options?.includeRead !== false) {
      actions.push('READ');
    }

    if (options?.includeCreate !== false) {
      actions.push('CREATE');
    }

    if (options?.includeUpdate !== false) {
      actions.push('UPDATE');
    }

    if (options?.includeDelete !== false) {
      actions.push('DELETE');
    }

    // Check if permission exists
    const existing =
      await this.resourcePermissionRepository.findByTemplateAndResource(
        workspaceId,
        templateId,
        resourceId,
      );

    if (existing) {
      return this.updateResourcePermission(workspaceId, existing.id, {
        allowedActions: actions,
      });
    }

    return this.createResourcePermission(workspaceId, {
      templateId,
      resourceId,
      allowedActions: actions,
    });
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Delete a resource permission
   */
  async deleteResourcePermission(
    workspaceId: string,
    id: string,
  ): Promise<void> {
    const permission = await this.resourcePermissionRepository.findById(id);

    if (!permission) {
      throw new NotFoundException(RESOURCE_PERMISSION_MESSAGES.NOT_FOUND(id));
    }

    await this.resourcePermissionRepository.hardDelete(workspaceId, id);
    this.logger.log(RESOURCE_PERMISSION_MESSAGES.DELETED(id));

    await this.invalidateCache(workspaceId);
  }

  /**
   * Delete all resource permissions for a template
   */
  async deletePermissionsByTemplate(
    workspaceId: string,
    templateId: string,
  ): Promise<void> {
    await this.resourcePermissionRepository.deleteByTemplateId(
      workspaceId,
      templateId,
    );

    this.logger.log(`All permissions deleted for template: ${templateId}`);

    await this.invalidateCache(workspaceId);
  }

  /**
   * Deactivate all resource permissions for a template (soft delete)
   */
  async deactivatePermissionsByTemplate(
    workspaceId: string,
    templateId: string,
  ): Promise<void> {
    await this.resourcePermissionRepository.deactivateByTemplateId(templateId);

    this.logger.log(`All permissions deactivated for template: ${templateId}`);

    await this.invalidateCache(workspaceId);
  }

  // ============================================
  // VALIDATION
  // ============================================

  /**
   * Check if a permission exists for template-resource pair
   */
  async hasPermission(
    workspaceId: string,
    templateId: string,
    resourceId: string,
  ): Promise<boolean> {
    const permission =
      await this.resourcePermissionRepository.findByTemplateAndResource(
        workspaceId,
        templateId,
        resourceId,
      );

    return permission !== null;
  }

  /**
   * Check if a specific action is allowed
   */
  async isActionAllowed(
    workspaceId: string,
    templateId: string,
    resourceId: string,
    action: string,
  ): Promise<boolean> {
    const permission =
      await this.resourcePermissionRepository.findByTemplateAndResource(
        workspaceId,
        templateId,
        resourceId,
      );

    if (!permission || !permission.isActive) {
      return false;
    }

    // Check denied actions first (explicit deny wins)
    if (permission.deniedActions?.includes(action)) {
      return false;
    }

    return permission.allowedActions.includes(action);
  }

  /**
   * Validate actions are standard RBAC actions
   */
  validateActions(actions: string[]): {
    valid: boolean;
    invalidActions: string[];
  } {
    const standardActionSet = new Set<string>(
      TemplateResourcePermissionService.STANDARD_ACTIONS,
    );
    const invalidActions = actions.filter((a) => !standardActionSet.has(a));

    return {
      valid: invalidActions.length === 0,
      invalidActions,
    };
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get statistics for all resource permissions in workspace
   */
  async getStatistics(workspaceId: string): Promise<{
    totalPermissions: number;
    activePermissions: number;
    inactivePermissions: number;
    permissionsByResource: Record<string, number>;
    permissionsByTemplate: Record<string, number>;
    actionDistribution: Record<string, number>;
  }> {
    const allPermissions =
      await this.resourcePermissionRepository.findActive(workspaceId);

    const activePermissions = allPermissions.filter((p) => p.isActive);
    const inactivePermissions = allPermissions.filter((p) => !p.isActive);

    // Group by resource
    const permissionsByResource = this.countByKey(allPermissions, 'resourceId');

    // Group by template
    const permissionsByTemplate = this.countByKey(allPermissions, 'templateId');

    // Count action distribution
    const actionDistribution: Record<string, number> = {};

    for (const permission of activePermissions) {
      for (const action of permission.allowedActions) {
        actionDistribution[action] = (actionDistribution[action] ?? 0) + 1;
      }
    }

    return {
      totalPermissions: allPermissions.length,
      activePermissions: activePermissions.length,
      inactivePermissions: inactivePermissions.length,
      permissionsByResource,
      permissionsByTemplate,
      actionDistribution,
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Count items by a specific key
   */
  private countByKey<T>(items: T[], key: keyof T): Record<string, number> {
    const result: Record<string, number> = {};

    for (const item of items) {
      const keyValue = String(item[key]);

      result[keyValue] = (result[keyValue] ?? 0) + 1;
    }

    return result;
  }

  /**
   * Invalidate permission-related cache
   */
  private async invalidateCache(workspaceId: string): Promise<void> {
    await this.cacheService.invalidateWorkspace(workspaceId);
    this.logger.debug(
      RESOURCE_PERMISSION_MESSAGES.CACHE_INVALIDATED(workspaceId),
    );
  }
}
