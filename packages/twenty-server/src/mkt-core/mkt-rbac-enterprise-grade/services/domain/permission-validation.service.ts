/**
 * Permission Validation Domain Service
 *
 * Core business logic for permission validation
 * Coordinates validation rules without orchestration logic
 */

import { Injectable, Logger } from '@nestjs/common';

import {
  CheckResult,
  PermissionAction,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';
import {
  MktPermissionTemplateRepository,
  MktUserPermissionTemplateRepository,
  MktUserPermissionOverrideRepository,
  MktTemplateResourcePermissionRepository,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';

export type PermissionValidationInput = {
  workspaceMemberId: string;
  action: PermissionAction;
  resourceKey: string;
  recordId?: string;
  workspaceId: string;
};

export type PermissionValidationResult = {
  isAllowed: boolean;
  checkResult: CheckResult;
  source: string;
  templateIds: string[];
  appliedOverrides: string[];
  denyReason?: string;
};

@Injectable()
export class PermissionValidationService {
  private readonly logger = new Logger(PermissionValidationService.name);

  constructor(
    private readonly permissionTemplateRepository: MktPermissionTemplateRepository,
    private readonly userPermissionTemplateRepository: MktUserPermissionTemplateRepository,
    private readonly userPermissionOverrideRepository: MktUserPermissionOverrideRepository,
    private readonly templateResourcePermissionRepository: MktTemplateResourcePermissionRepository,
  ) {}

  /**
   * Validate permission for a user action on a resource
   */
  async validatePermission(
    input: PermissionValidationInput,
  ): Promise<PermissionValidationResult> {
    this.logger.debug(
      `Validating permission: ${input.workspaceMemberId} -> ${input.action} on ${input.resourceKey}`,
    );

    const { workspaceMemberId, action, resourceKey, workspaceId } = input;

    // Step 1: Check user-level overrides first (highest priority)
    const overrideResult = await this.checkUserOverrides(
      workspaceMemberId,
      resourceKey,
      action,
      workspaceId,
    );

    if (overrideResult.hasOverride) {
      return {
        isAllowed: overrideResult.isAllowed,
        checkResult: overrideResult.isAllowed
          ? CheckResult.PASS
          : CheckResult.FAIL,
        source: 'USER_OVERRIDE',
        templateIds: [],
        appliedOverrides: overrideResult.overrideId
          ? [overrideResult.overrideId]
          : [],
        denyReason: overrideResult.isAllowed
          ? undefined
          : 'User override denied',
      };
    }

    // Step 2: Get user's assigned templates
    const userTemplates =
      await this.userPermissionTemplateRepository.findActiveByWorkspaceMemberId(
        workspaceMemberId,
        new Date(),
        workspaceId,
      );

    if (userTemplates.length === 0) {
      this.logger.debug(`No templates assigned to user ${workspaceMemberId}`);

      return {
        isAllowed: false,
        checkResult: CheckResult.FAIL,
        source: 'NO_TEMPLATE',
        templateIds: [],
        appliedOverrides: [],
        denyReason: 'No permission templates assigned to user',
      };
    }

    const templateIds = userTemplates.map((ut) => ut.templateId);

    // Step 3: Check template resource permissions
    const templateResult = await this.checkTemplatePermissions(
      templateIds,
      resourceKey,
      action,
      workspaceId,
    );

    return {
      isAllowed: templateResult.isAllowed,
      checkResult: templateResult.isAllowed
        ? CheckResult.PASS
        : CheckResult.FAIL,
      source: 'PERMISSION_TEMPLATE',
      templateIds: templateResult.matchedTemplateIds,
      appliedOverrides: [],
      denyReason: templateResult.isAllowed
        ? undefined
        : templateResult.denyReason,
    };
  }

  /**
   * Check user-level permission overrides
   */
  private async checkUserOverrides(
    workspaceMemberId: string,
    resourceKey: string,
    action: PermissionAction,
    workspaceId: string,
  ): Promise<{
    hasOverride: boolean;
    isAllowed: boolean;
    overrideId?: string;
  }> {
    const overrides =
      await this.userPermissionOverrideRepository.findActiveByWorkspaceMemberId(
        workspaceMemberId,
        new Date(),
        workspaceId,
      );

    // Find matching override for resource and action
    for (const override of overrides) {
      const resourceMatch = override.resource?.resourceKey === resourceKey;
      const actionMatch = override.action?.actionKey === action;

      if (resourceMatch && actionMatch) {
        return {
          hasOverride: true,
          isAllowed: override.isAllowed,
          overrideId: override.id,
        };
      }
    }

    return { hasOverride: false, isAllowed: false };
  }

  /**
   * Check template-based permissions
   */
  private async checkTemplatePermissions(
    templateIds: string[],
    resourceKey: string,
    action: PermissionAction,
    workspaceId: string,
  ): Promise<{
    isAllowed: boolean;
    matchedTemplateIds: string[];
    denyReason?: string;
  }> {
    const permissions =
      await this.templateResourcePermissionRepository.findActiveByTemplateIds(
        templateIds,
        workspaceId,
      );

    const matchedTemplateIds: string[] = [];
    let isAllowed = false;

    for (const permission of permissions) {
      if (permission.resource?.resourceKey !== resourceKey) {
        continue;
      }

      if (!permission.isActive) {
        continue;
      }

      // Check if action is in denied list first
      if (permission.deniedActions?.includes(action)) {
        return {
          isAllowed: false,
          matchedTemplateIds: [permission.templateId],
          denyReason: `Action ${action} explicitly denied by template`,
        };
      }

      // Check if action is in allowed list
      if (permission.allowedActions?.includes(action)) {
        matchedTemplateIds.push(permission.templateId);
        isAllowed = true;
      }
    }

    if (!isAllowed) {
      return {
        isAllowed: false,
        matchedTemplateIds: [],
        denyReason: `No template grants ${action} permission on ${resourceKey}`,
      };
    }

    return {
      isAllowed: true,
      matchedTemplateIds,
    };
  }

  /**
   * Check if user has any permission on a resource
   */
  async hasAnyPermission(
    workspaceMemberId: string,
    resourceKey: string,
    workspaceId: string,
  ): Promise<boolean> {
    const userTemplates =
      await this.userPermissionTemplateRepository.findActiveByWorkspaceMemberId(
        workspaceMemberId,
        new Date(),
        workspaceId,
      );

    if (userTemplates.length === 0) {
      return false;
    }

    const templateIds = userTemplates.map((ut) => ut.templateId);

    const permissions =
      await this.templateResourcePermissionRepository.findActiveByTemplateIds(
        templateIds,
        workspaceId,
      );

    return permissions.some(
      (p) =>
        p.resource?.resourceKey === resourceKey &&
        p.isActive &&
        (p.allowedActions?.length ?? 0) > 0,
    );
  }

  /**
   * Get all allowed actions for a user on a resource
   */
  async getAllowedActions(
    workspaceMemberId: string,
    resourceKey: string,
    workspaceId: string,
  ): Promise<PermissionAction[]> {
    const userTemplates =
      await this.userPermissionTemplateRepository.findActiveByWorkspaceMemberId(
        workspaceMemberId,
        new Date(),
        workspaceId,
      );

    if (userTemplates.length === 0) {
      return [];
    }

    const templateIds = userTemplates.map((ut) => ut.templateId);

    const permissions =
      await this.templateResourcePermissionRepository.findActiveByTemplateIds(
        templateIds,
        workspaceId,
      );

    const allowedActions = new Set<PermissionAction>();
    const deniedActions = new Set<PermissionAction>();

    for (const permission of permissions) {
      if (
        permission.resource?.resourceKey !== resourceKey ||
        !permission.isActive
      ) {
        continue;
      }

      // Collect denied actions first
      for (const action of (permission.deniedActions ??
        []) as PermissionAction[]) {
        deniedActions.add(action);
      }

      // Collect allowed actions
      for (const action of (permission.allowedActions ??
        []) as PermissionAction[]) {
        allowedActions.add(action);
      }
    }

    // Remove denied actions from allowed
    for (const denied of deniedActions) {
      allowedActions.delete(denied);
    }

    // Apply user overrides
    const overrides =
      await this.userPermissionOverrideRepository.findActiveByWorkspaceMemberId(
        workspaceMemberId,
        new Date(),
        workspaceId,
      );

    for (const override of overrides) {
      if (override.resource?.resourceKey !== resourceKey) {
        continue;
      }

      const action = override.action?.actionKey as PermissionAction;

      if (action) {
        if (override.isAllowed) {
          allowedActions.add(action);
        } else {
          allowedActions.delete(action);
        }
      }
    }

    return Array.from(allowedActions);
  }
}
