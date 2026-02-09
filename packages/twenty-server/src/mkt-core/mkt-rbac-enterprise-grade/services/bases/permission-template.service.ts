/**
 * PermissionTemplateService - Business logic for Permission Templates
 *
 * Provides CRUD operations and business logic for managing permission templates.
 * Integrates with template resource permissions, system actions, and user assignments.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  MktPermissionTemplateRepository,
  MktTemplateResourcePermissionRepository,
  MktTemplateSystemActionRepository,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { MktPermissionTemplateWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import {
  PermissionTemplateType,
  ResolutionStrategy,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';
import { RbacCacheService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-cache.service';
import { TEMPLATE_SERVICE_MESSAGES } from 'src/mkt-core/mkt-rbac-enterprise-grade/message';
import {
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateQueryOptions,
  TemplateListResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types';

// ============================================
// SERVICE
// ============================================

@Injectable()
export class PermissionTemplateService {
  private readonly logger = new Logger(PermissionTemplateService.name);

  constructor(
    private readonly templateRepository: MktPermissionTemplateRepository,
    private readonly resourcePermissionRepository: MktTemplateResourcePermissionRepository,
    private readonly systemActionRepository: MktTemplateSystemActionRepository,
    private readonly cacheService: RbacCacheService,
  ) {}

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create a new permission template
   */
  async createTemplate(
    workspaceId: string,
    input: CreateTemplateInput,
  ): Promise<MktPermissionTemplateWorkspaceEntity> {
    // Check for duplicate key
    const existing = await this.templateRepository.findByTemplateKey(
      input.templateKey,
    );

    if (existing) {
      throw new Error(
        TEMPLATE_SERVICE_MESSAGES.DUPLICATE_KEY(input.templateKey),
      );
    }

    // Create template
    const template = await this.templateRepository.create({
      templateKey: input.templateKey,
      templateName: input.templateName,
      description: input.description,
      templateType: input.templateType ?? PermissionTemplateType.ROLE_BASED,
      departmentType: input.departmentType,
      hierarchyLevel: input.hierarchyLevel,
      applicableToLevels: input.applicableToLevels ?? [],
      organizationLevelId: input.organizationLevelId,
      priority: input.priority ?? 100,
      resolutionStrategy:
        input.resolutionStrategy ?? ResolutionStrategy.PRIORITY_BASED,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo,
      isSystemTemplate: input.isSystemTemplate ?? false,
      isActive: true,
      version: '1.0.0',
      metadata: input.metadata,
      createdById: input.createdById,
      createdBySource: input.createdById ? 'USER' : 'SYSTEM',
    });

    this.logger.log(TEMPLATE_SERVICE_MESSAGES.CREATED(input.templateKey));

    // Invalidate cache
    await this.invalidateCache(workspaceId);

    return template;
  }

  // ============================================
  // READ OPERATIONS
  // ============================================

  /**
   * Get template by ID
   */
  async getTemplateById(
    workspaceId: string,
    id: string,
    options?: TemplateQueryOptions,
  ): Promise<MktPermissionTemplateWorkspaceEntity | null> {
    if (options?.includeRelations) {
      return this.templateRepository.findWithRelations(workspaceId, id);
    }

    return this.templateRepository.findById(id);
  }

  /**
   * Get template by key
   */
  async getTemplateByKey(
    templateKey: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity | null> {
    return this.templateRepository.findByTemplateKey(templateKey);
  }

  /**
   * List templates with filtering
   */
  async listTemplates(
    workspaceId: string,
    options?: TemplateQueryOptions,
  ): Promise<TemplateListResult> {
    let templates: MktPermissionTemplateWorkspaceEntity[];

    if (options?.hierarchyLevel !== undefined) {
      templates = await this.templateRepository.findByHierarchyLevel(
        workspaceId,
        options.hierarchyLevel,
      );
    } else if (options?.departmentType) {
      templates = await this.templateRepository.findByDepartmentType(
        workspaceId,
        options.departmentType,
      );
    } else if (options?.organizationLevelId) {
      templates = await this.templateRepository.findByOrganizationLevelId(
        workspaceId,
        options.organizationLevelId,
      );
    } else if (options?.includeInactive) {
      templates = await this.templateRepository.findMany({});
    } else {
      templates = await this.templateRepository.findActive(workspaceId);
    }

    // Filter by template type if specified
    if (options?.templateType) {
      templates = templates.filter(
        (t) => t.templateType === options.templateType,
      );
    }

    return {
      templates,
      total: templates.length,
    };
  }

  /**
   * Get active templates effective at a specific date
   */
  async getEffectiveTemplates(
    workspaceId: string,
    referenceDate?: Date,
  ): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    const date =
      referenceDate ?? DateTimeUtils.toDate(DateTimeUtils.now()) ?? new Date();

    return this.templateRepository.findActiveAndEffective(workspaceId, date);
  }

  /**
   * Get system templates
   */
  async getSystemTemplates(
    workspaceId: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    return this.templateRepository.findSystemTemplates(workspaceId);
  }

  /**
   * Get templates for a specific hierarchy level
   */
  async getTemplatesForLevel(
    workspaceId: string,
    hierarchyLevel: number,
  ): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    const templates = await this.templateRepository.findActive(workspaceId);

    // Filter by primary level or applicable levels
    return templates.filter(
      (t) =>
        t.hierarchyLevel === hierarchyLevel ||
        (t.applicableToLevels && t.applicableToLevels.includes(hierarchyLevel)),
    );
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update a permission template
   */
  async updateTemplate(
    workspaceId: string,
    id: string,
    input: UpdateTemplateInput,
  ): Promise<MktPermissionTemplateWorkspaceEntity> {
    const template = await this.templateRepository.findById(id);

    if (!template) {
      throw new NotFoundException(TEMPLATE_SERVICE_MESSAGES.NOT_FOUND(id));
    }

    // Prevent modification of system templates (except for activate/deactivate)
    if (template.isSystemTemplate && Object.keys(input).length > 1) {
      throw new Error(TEMPLATE_SERVICE_MESSAGES.SYSTEM_TEMPLATE_IMMUTABLE);
    }

    // Update template
    await this.templateRepository.update(id, {
      ...input,
      lastModifiedAt: DateTimeUtils.toDate(DateTimeUtils.now()),
      version: this.incrementVersion(template.version),
    });

    this.logger.log(TEMPLATE_SERVICE_MESSAGES.UPDATED(id));

    // Invalidate cache
    await this.invalidateCache(workspaceId);

    // Return updated template
    const updated = await this.templateRepository.findById(id);

    if (!updated) {
      throw new NotFoundException(TEMPLATE_SERVICE_MESSAGES.NOT_FOUND(id));
    }

    return updated;
  }

  /**
   * Activate a template
   */
  async activateTemplate(
    workspaceId: string,
    id: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity> {
    await this.templateRepository.updateIsActive(id, true);
    this.logger.log(TEMPLATE_SERVICE_MESSAGES.ACTIVATED(id));

    await this.invalidateCache(workspaceId);

    const template = await this.templateRepository.findById(id);

    if (!template) {
      throw new NotFoundException(TEMPLATE_SERVICE_MESSAGES.NOT_FOUND(id));
    }

    return template;
  }

  /**
   * Deactivate a template
   */
  async deactivateTemplate(
    workspaceId: string,
    id: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity> {
    const template = await this.templateRepository.findById(id);

    if (!template) {
      throw new NotFoundException(TEMPLATE_SERVICE_MESSAGES.NOT_FOUND(id));
    }

    // Prevent deactivation of system templates
    if (template.isSystemTemplate) {
      throw new Error(TEMPLATE_SERVICE_MESSAGES.SYSTEM_TEMPLATE_IMMUTABLE);
    }

    await this.templateRepository.updateIsActive(id, false);
    this.logger.log(TEMPLATE_SERVICE_MESSAGES.DEACTIVATED(id));

    await this.invalidateCache(workspaceId);

    const updated = await this.templateRepository.findById(id);

    if (!updated) {
      throw new NotFoundException(TEMPLATE_SERVICE_MESSAGES.NOT_FOUND(id));
    }

    return updated;
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Delete a template (soft delete via isActive = false)
   */
  async deleteTemplate(workspaceId: string, id: string): Promise<void> {
    const template = await this.templateRepository.findById(id);

    if (!template) {
      throw new NotFoundException(TEMPLATE_SERVICE_MESSAGES.NOT_FOUND(id));
    }

    // Prevent deletion of system templates
    if (template.isSystemTemplate) {
      throw new Error(TEMPLATE_SERVICE_MESSAGES.SYSTEM_TEMPLATE_IMMUTABLE);
    }

    // Soft delete
    await this.templateRepository.softDelete(id);
    this.logger.log(TEMPLATE_SERVICE_MESSAGES.DELETED(id));

    await this.invalidateCache(workspaceId);
  }

  /**
   * Hard delete a template (permanent removal)
   * Use with caution - typically only for cleanup
   */
  async hardDeleteTemplate(workspaceId: string, id: string): Promise<void> {
    const template = await this.templateRepository.findById(id);

    if (!template) {
      throw new NotFoundException(TEMPLATE_SERVICE_MESSAGES.NOT_FOUND(id));
    }

    // Prevent deletion of system templates
    if (template.isSystemTemplate) {
      throw new Error(TEMPLATE_SERVICE_MESSAGES.SYSTEM_TEMPLATE_IMMUTABLE);
    }

    // Hard delete
    await this.templateRepository.hardDelete(workspaceId, id);
    this.logger.log(`Template hard deleted: ${id}`);

    await this.invalidateCache(workspaceId);
  }

  // ============================================
  // CLONE OPERATIONS
  // ============================================

  /**
   * Clone a template with a new key
   */
  async cloneTemplate(
    workspaceId: string,
    sourceId: string,
    newTemplateKey: string,
    newTemplateName: string,
    createdById?: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity> {
    const source = await this.templateRepository.findWithRelations(
      workspaceId,
      sourceId,
    );

    if (!source) {
      throw new NotFoundException(
        TEMPLATE_SERVICE_MESSAGES.NOT_FOUND(sourceId),
      );
    }

    // Create new template with copied properties
    const cloned = await this.createTemplate(workspaceId, {
      templateKey: newTemplateKey,
      templateName: newTemplateName,
      description: source.description
        ? `Clone of ${source.templateName}: ${source.description}`
        : `Clone of ${source.templateName}`,
      templateType: source.templateType,
      departmentType: source.departmentType ?? undefined,
      hierarchyLevel: source.hierarchyLevel ?? undefined,
      applicableToLevels: source.applicableToLevels,
      organizationLevelId: source.organizationLevelId ?? undefined,
      priority: source.priority,
      resolutionStrategy: source.resolutionStrategy,
      isSystemTemplate: false, // Cloned templates are not system templates
      metadata: {
        clonedFrom: sourceId,
        clonedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
        ...(source.metadata as Record<string, unknown>),
      },
      createdById,
    });

    // RBAC-006: Clone resource permissions and system actions
    await this.cloneResourcePermissions(workspaceId, sourceId, cloned.id);
    await this.cloneSystemActions(sourceId, cloned.id);

    return cloned;
  }

  // ============================================
  // PRIVATE: CLONE HELPERS
  // ============================================

  /**
   * RBAC-006: Clone resource permissions from source template to new template
   */
  private async cloneResourcePermissions(
    workspaceId: string,
    sourceTemplateId: string,
    newTemplateId: string,
  ): Promise<void> {
    const sourcePermissions =
      await this.resourcePermissionRepository.findByTemplateId(
        workspaceId,
        sourceTemplateId,
      );

    for (const permission of sourcePermissions) {
      await this.resourcePermissionRepository.create({
        templateId: newTemplateId,
        resourceId: permission.resourceId,
        contextId: permission.contextId,
        allowedActions: permission.allowedActions,
        deniedActions: permission.deniedActions,
        conditions: permission.conditions,
        restrictions: permission.restrictions,
        isActive: permission.isActive,
      });
    }

    this.logger.debug(
      `Cloned ${sourcePermissions.length} resource permission(s) from template ${sourceTemplateId} to ${newTemplateId}`,
    );
  }

  /**
   * RBAC-006: Clone system actions from source template to new template
   */
  private async cloneSystemActions(
    sourceTemplateId: string,
    newTemplateId: string,
  ): Promise<void> {
    const sourceActions =
      await this.systemActionRepository.findByTemplateId(sourceTemplateId);

    for (const action of sourceActions) {
      await this.systemActionRepository.create({
        templateId: newTemplateId,
        actionKey: action.actionKey,
        isAllowed: action.isAllowed,
        configuration: action.configuration,
        restrictions: action.restrictions,
        isActive: action.isActive,
      });
    }

    this.logger.debug(
      `Cloned ${sourceActions.length} system action(s) from template ${sourceTemplateId} to ${newTemplateId}`,
    );
  }

  // ============================================
  // VALIDATION
  // ============================================

  /**
   * Validate if a template key is available
   */
  async isTemplateKeyAvailable(templateKey: string): Promise<boolean> {
    const existing =
      await this.templateRepository.findByTemplateKey(templateKey);

    return !existing;
  }

  /**
   * Validate template dates
   */
  validateEffectiveDates(
    effectiveFrom?: Date,
    effectiveTo?: Date,
  ): { valid: boolean; error?: string } {
    if (!effectiveFrom && !effectiveTo) {
      return { valid: true };
    }

    if (effectiveFrom && effectiveTo && effectiveFrom > effectiveTo) {
      return {
        valid: false,
        error: 'effectiveFrom must be before effectiveTo',
      };
    }

    return { valid: true };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Increment version string
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.');

    if (parts.length !== 3) {
      return '1.0.1';
    }

    const patch = parseInt(parts[2], 10) + 1;

    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  /**
   * Invalidate template-related cache
   */
  private async invalidateCache(workspaceId: string): Promise<void> {
    await this.cacheService.invalidateWorkspace(workspaceId);
    this.logger.debug(TEMPLATE_SERVICE_MESSAGES.CACHE_INVALIDATED(workspaceId));
  }
}
