/**
 * Step 9: Special Permissions Service
 * Validates template permissions and user permission overrides
 * Part of the 15-step Enterprise RBAC validation process
 * Uses workspace entities only, no core module dependencies
 *
 * MIGRATION NOTE: This service has been migrated from the deprecated mktTemporaryPermission
 * system to the new template-based permission system:
 * - mktTemporaryPermission → mktUserPermissionTemplate + mktPermissionTemplate
 * - Enhanced with approval workflows, context filters, and structured templates
 * - Maintains backward compatibility in evaluation logic
 */

import { Injectable, Logger } from '@nestjs/common';

import { IsNull } from 'typeorm';
import { DateTime } from 'luxon';

import {
  PermissionValidationStep,
  StepValidationResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/interfaces/validation-step.interface';

import {
  EnhancedPermissionContext,
  EnhancedUserContext,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/enhanced-permission-context.type';
import {
  CheckResult,
  VALIDATION_STEPS,
  STEP_PERFORMANCE_CONFIG,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';
import {
  VALIDATION_STEP_DESCRIPTIONS,
  VALIDATION_STEP_NAMES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';

/**
 * Special permissions evaluation result
 */
type SpecialPermissionsEvaluation = {
  hasPermission: boolean;
  source:
    | 'PERMISSION_TEMPLATE'
    | 'USER_OVERRIDE_ALLOW'
    | 'USER_OVERRIDE_DENY'
    | 'NO_SPECIAL_PERMISSIONS'
    | 'SYSTEM_DEFAULT';
  level: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN';
  restrictions: string[];
  confidence: number;
  expiresAt?: Date;
  metadata: {
    appliedPermissionIds: string[];
    templatePermissionCount: number;
    overrideCount: number;
    evaluationMode: 'STRICT' | 'BALANCED' | 'PERMISSIVE';
    hasActiveOverrides: boolean;
    hasActiveTemplatePermissions: boolean;
  };
};

/**
 * Template permission entity from workspace (replaces temporary permissions)
 */
type TemplatePermissionEntity = {
  id: string;
  isActive: boolean;
  assignedAt: Date;
  expiresAt?: Date;
  assignmentReason: string;
  position?: number;
  templateId?: string;
  workspaceMemberId?: string;
  assignedById?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Relations
  template?: {
    id: string;
    templateKey: string;
    templateName: string;
    hierarchyLevel: number;
    isActive: boolean;
    resourcePermissions: Array<{
      resourceId: string;
      actionId: string;
      isAllowed: boolean;
      contextFilter: Record<string, unknown>;
    }>;
  };
};

/**
 * User permission override entity from workspace
 */
type UserPermissionOverrideEntity = {
  id: string;
  isAllowed: boolean;
  contextFilter: Record<string, unknown>;
  expiresAt: Date;
  reason: string;
  reasonDescription: string;
  approvedAt: Date;
  isActive: boolean;
  position?: number;
  actionId?: string;
  resourceId?: string;
  workspaceMemberId?: string;
  approvedById?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
};

/**
 * Special permission match result with scoring
 */
type SpecialPermissionMatchResult = {
  permission: TemplatePermissionEntity | UserPermissionOverrideEntity;
  matchScore: number;
  permissionType: 'TEMPLATE' | 'OVERRIDE';
  applicabilityReason: string;
  conditions: Record<string, unknown>;
};

@Injectable()
export class Step9SpecialPermissionsService
  implements PermissionValidationStep
{
  private readonly logger = new Logger(Step9SpecialPermissionsService.name);
  readonly stepNumber = VALIDATION_STEPS.SPECIAL_PERMISSIONS;
  readonly stepName =
    VALIDATION_STEP_NAMES[VALIDATION_STEPS.SPECIAL_PERMISSIONS];
  readonly description =
    VALIDATION_STEP_DESCRIPTIONS[VALIDATION_STEPS.SPECIAL_PERMISSIONS];
  readonly isRequired = true;
  readonly canSkip = false;
  readonly isAsync = true;
  readonly priority = 90;

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  /**
   * Get user permission template repository
   */
  private async getUserPermissionTemplateRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<TemplatePermissionEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<TemplatePermissionEntity>(
      workspaceId,
      'mktUserPermissionTemplate',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Get user permission override repository
   */
  private async getUserPermissionOverrideRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<UserPermissionOverrideEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<UserPermissionOverrideEntity>(
      workspaceId,
      'mktUserPermissionOverride',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Validate Step 9: Special Permissions
   */
  async validate(
    context: EnhancedPermissionContext,
  ): Promise<StepValidationResult> {
    const stepStartTime = DateTime.now();

    try {
      this.logger.debug(
        `Step 9: ${this.stepName} - Starting special permissions check`,
      );

      // Validate prerequisites
      if (!context.userContext) {
        return {
          result: CheckResult.FAIL,
          continue: false,
          reason: 'Missing user context for special permissions check',
          executionTime: DateTime.now().diff(stepStartTime).toMillis(),
          metadata: {
            error: 'USER_CONTEXT_MISSING',
            stepNumber: this.stepNumber,
          },
        };
      }

      const workspaceId = context.userContext.workspaceId || '';

      // Get complete special permissions evaluation
      const specialPermissionsEvaluation =
        await this.evaluateSpecialPermissions(
          context.userContext,
          context,
          context.resourceContext?.resourceType || '',
          context.resourceContext?.objectName || '',
          context.resourceContext?.recordId || '',
          context.action || '',
          workspaceId,
        );

      // Update context with special permissions information
      this.updateContextWithSpecialPermissions(
        context,
        specialPermissionsEvaluation,
      );

      this.logger.debug(`Step 9: ${this.stepName} completed successfully`);

      // Special permissions are additive - not finding them should not fail validation
      // Only fail if there's an explicit denial through user override
      const result =
        specialPermissionsEvaluation.source === 'USER_OVERRIDE_DENY'
          ? CheckResult.FAIL
          : CheckResult.PASS;

      return {
        result,
        continue: true, // Always continue regardless of result for special permissions
        reason: specialPermissionsEvaluation.hasPermission
          ? `Special permissions granted - ${specialPermissionsEvaluation.source}`
          : `No special permissions found - ${specialPermissionsEvaluation.source}`,
        executionTime: DateTime.now().diff(stepStartTime).toMillis(),
        metadata: {
          source: specialPermissionsEvaluation.source,
          confidence: specialPermissionsEvaluation.confidence,
          appliedPermissionCount:
            specialPermissionsEvaluation.metadata.appliedPermissionIds.length,
          evaluationMode: specialPermissionsEvaluation.metadata.evaluationMode,
        },
      };
    } catch (error) {
      this.logger.error(
        `Step 9: ${this.stepName} failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      return {
        result: CheckResult.FAIL,
        continue: true, // Continue even on error
        reason: `Special permissions check failed: ${error instanceof Error ? error.message : String(error)}`,
        executionTime: DateTime.now().diff(stepStartTime).toMillis(),
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stepNumber: this.stepNumber,
        },
      };
    }
  }

  /**
   * Evaluate special permissions for the given context
   */
  private async evaluateSpecialPermissions(
    userContext: EnhancedUserContext,
    context: EnhancedPermissionContext,
    resourceType: string,
    objectName: string,
    recordId: string,
    action: string,
    workspaceId: string,
  ): Promise<SpecialPermissionsEvaluation> {
    try {
      // Find applicable special permissions
      const applicablePermissions = await this.findApplicableSpecialPermissions(
        userContext,
        resourceType,
        objectName,
        recordId,
        workspaceId,
      );

      if (applicablePermissions.length === 0) {
        return this.getNoSpecialPermissionsEvaluation();
      }

      // Process special permissions by priority
      return await this.processSpecialPermissions(
        userContext,
        context,
        applicablePermissions,
        action,
        workspaceId,
      );
    } catch (error) {
      this.logger.error(
        `Error evaluating special permissions: ${error instanceof Error ? error.message : String(error)}`,
      );

      return this.getNoSpecialPermissionsEvaluation();
    }
  }

  /**
   * Find applicable special permissions
   */
  private async findApplicableSpecialPermissions(
    userContext: EnhancedUserContext,
    resourceType: string,
    objectName: string,
    recordId: string,
    workspaceId: string,
  ): Promise<SpecialPermissionMatchResult[]> {
    try {
      const templatePermissionRepository =
        await this.getUserPermissionTemplateRepository(workspaceId);
      const overrideRepository =
        await this.getUserPermissionOverrideRepository(workspaceId);

      const matchResults: SpecialPermissionMatchResult[] = [];

      // Get active template permissions for the user
      const templatePermissions = await templatePermissionRepository.find({
        where: {
          workspaceMemberId: userContext.workspaceMemberId,
          isActive: true,
          deletedAt: IsNull(),
        },
        relations: ['template', 'template.resourcePermissions'],
      });

      // Evaluate template permissions
      for (const templatePerm of templatePermissions) {
        const matchResult = await this.evaluateTemplatePermissionMatch(
          templatePerm,
          userContext,
          resourceType,
          objectName,
          recordId,
        );

        if (matchResult.matchScore > 0) {
          matchResults.push(matchResult);
        }
      }

      // Get active user permission overrides
      const overrides = await overrideRepository.find({
        where: {
          workspaceMemberId: userContext.workspaceMemberId,
          isActive: true,
        },
      });

      // Evaluate permission overrides
      for (const override of overrides) {
        const matchResult = await this.evaluateOverrideMatch(
          override,
          userContext,
          resourceType,
          recordId,
        );

        if (matchResult.matchScore > 0) {
          matchResults.push(matchResult);
        }
      }

      // Sort by match score (highest first) and permission type priority
      matchResults.sort((a, b) => {
        if (a.matchScore !== b.matchScore) {
          return b.matchScore - a.matchScore;
        }
        // User overrides have higher priority than template permissions
        if (a.permissionType !== b.permissionType) {
          return a.permissionType === 'OVERRIDE' ? -1 : 1;
        }

        return 0;
      });

      this.logger.debug(
        `Found ${matchResults.length} applicable special permissions`,
      );

      return matchResults;
    } catch (error) {
      this.logger.error(
        `Error finding applicable special permissions: ${error instanceof Error ? error.message : String(error)}`,
      );

      return [];
    }
  }

  /**
   * Evaluate if a template permission matches the context
   */
  private async evaluateTemplatePermissionMatch(
    permission: TemplatePermissionEntity,
    _userContext: EnhancedUserContext,
    _resourceType: string,
    _objectName: string,
    _recordId: string,
  ): Promise<SpecialPermissionMatchResult> {
    let matchScore = 0;
    let applicabilityReason = '';

    // Check if permission is not expired
    if (permission.expiresAt) {
      const now = DateTime.now();
      const expiresAt = DateTime.fromJSDate(permission.expiresAt);

      if (now >= expiresAt) {
        return {
          permission,
          matchScore: 0,
          permissionType: 'TEMPLATE',
          applicabilityReason: 'Template permission has expired',
          conditions: {},
        };
      }
    }

    // Check if template exists and is active
    if (!permission.template || !permission.template.isActive) {
      return {
        permission,
        matchScore: 0,
        permissionType: 'TEMPLATE',
        applicabilityReason: 'Template is inactive or not found',
        conditions: {},
      };
    }

    // Check if template has resource permissions for this object/resource
    const hasResourcePermission = permission.template.resourcePermissions?.some(
      (resPerm) => {
        // This would need to be enhanced with actual resource matching logic
        return resPerm.isAllowed;
      },
    );

    if (hasResourcePermission) {
      matchScore = 85; // High priority for template permissions
      applicabilityReason = 'Template permission grants access';
    } else {
      matchScore = 30; // Low priority, but still considered
      applicabilityReason =
        'Template permission exists but no specific resource grant';
    }

    return {
      permission,
      matchScore,
      permissionType: 'TEMPLATE',
      applicabilityReason,
      conditions: {
        templateKey: permission.template.templateKey,
        hierarchyLevel: permission.template.hierarchyLevel,
        expiresAt: permission.expiresAt,
        assignmentReason: permission.assignmentReason,
      },
    };
  }

  /**
   * Evaluate if a user permission override matches the context
   */
  private async evaluateOverrideMatch(
    override: UserPermissionOverrideEntity,
    userContext: EnhancedUserContext,
    resourceType: string,
    recordId: string,
  ): Promise<SpecialPermissionMatchResult> {
    let matchScore = 0;
    let applicabilityReason = '';

    // Check if override is not expired
    const now = DateTime.now();
    const expiresAt = DateTime.fromJSDate(override.expiresAt);

    if (now >= expiresAt) {
      return {
        permission: override,
        matchScore: 0,
        permissionType: 'OVERRIDE',
        applicabilityReason: 'User permission override has expired',
        conditions: {},
      };
    }

    // Check if override is approved
    if (!override.approvedAt) {
      return {
        permission: override,
        matchScore: 0,
        permissionType: 'OVERRIDE',
        applicabilityReason: 'User permission override is not approved',
        conditions: {},
      };
    }

    // Evaluate context filter conditions
    const contextFilterMatch = await this.evaluateContextFilter(
      override.contextFilter,
      userContext,
      resourceType,
      recordId,
    );

    if (contextFilterMatch.matches) {
      matchScore = override.isAllowed ? 95 : 90; // Slightly lower than specific temporary permissions
      applicabilityReason = override.isAllowed
        ? 'User permission override allows access'
        : 'User permission override denies access';
    }

    return {
      permission: override,
      matchScore,
      permissionType: 'OVERRIDE',
      applicabilityReason,
      conditions: {
        ...override.contextFilter,
        isAllowed: override.isAllowed,
        reason: override.reason,
      },
    };
  }

  /**
   * Evaluate context filter conditions for permission overrides
   */
  private async evaluateContextFilter(
    contextFilter: Record<string, unknown>,
    userContext: EnhancedUserContext,
    resourceType: string,
    recordId: string,
  ): Promise<{ matches: boolean; failedConditions: string[] }> {
    const failedConditions: string[] = [];

    try {
      // Handle simple field conditions
      if (
        contextFilter.field &&
        contextFilter.operator &&
        contextFilter.value !== undefined
      ) {
        const field = contextFilter.field as string;
        const operator = contextFilter.operator as string;
        const value = contextFilter.value;

        const conditionMet = await this.evaluateFieldCondition(
          field,
          operator,
          value,
          userContext,
          resourceType,
          recordId,
        );

        if (!conditionMet) {
          failedConditions.push(`${field} ${operator} ${value}`);
        }
      }

      // Handle complex logic conditions
      if (
        contextFilter.logic &&
        contextFilter.conditions &&
        Array.isArray(contextFilter.conditions)
      ) {
        const logic = contextFilter.logic as string;
        const conditions = contextFilter.conditions as Array<
          Record<string, unknown>
        >;

        const conditionResults = await Promise.all(
          conditions.map(async (condition) => {
            return await this.evaluateContextFilter(
              condition,
              userContext,
              resourceType,
              recordId,
            );
          }),
        );

        if (logic === 'AND') {
          const allPassed = conditionResults.every((result) => result.matches);

          if (!allPassed) {
            failedConditions.push(
              ...conditionResults.flatMap((result) => result.failedConditions),
            );
          }
        } else if (logic === 'OR') {
          const anyPassed = conditionResults.some((result) => result.matches);

          if (!anyPassed) {
            failedConditions.push(
              ...conditionResults.flatMap((result) => result.failedConditions),
            );
          }
        }
      }

      return {
        matches: failedConditions.length === 0,
        failedConditions,
      };
    } catch (error) {
      this.logger.error(
        `Error evaluating context filter: ${error instanceof Error ? error.message : String(error)}`,
      );

      return {
        matches: false,
        failedConditions: ['CONTEXT_FILTER_EVALUATION_ERROR'],
      };
    }
  }

  /**
   * Evaluate individual field condition
   */
  private async evaluateFieldCondition(
    field: string,
    operator: string,
    value: unknown,
    userContext: EnhancedUserContext,
    _resourceType: string,
    _recordId: string,
  ): Promise<boolean> {
    try {
      // Handle dynamic values
      let actualValue = value;

      if (
        typeof value === 'string' &&
        value.startsWith('{{') &&
        value.endsWith('}}')
      ) {
        const dynamicField = value.slice(2, -2);

        actualValue = this.resolveDynamicValue(dynamicField, userContext);
      }

      // Simple operator evaluation (simplified for demo)
      switch (operator) {
        case 'eq':
          return actualValue === this.getFieldValue(field, userContext);
        case 'gte': {
          const fieldValue = this.getFieldValue(field, userContext);

          return typeof fieldValue === 'number' &&
            typeof actualValue === 'number'
            ? fieldValue >= actualValue
            : false;
        }
        case 'in':
          return (
            Array.isArray(actualValue) &&
            actualValue.includes(this.getFieldValue(field, userContext))
          );
        default:
          return true; // Unknown operator defaults to true
      }
    } catch (error) {
      this.logger.error(
        `Error evaluating field condition: ${error instanceof Error ? error.message : String(error)}`,
      );

      return false;
    }
  }

  /**
   * Resolve dynamic values in context filters
   */
  private resolveDynamicValue(
    dynamicField: string,
    userContext: EnhancedUserContext,
  ): unknown {
    switch (dynamicField) {
      case 'currentUserDepartmentId':
        return userContext.departmentId;
      case 'currentUserHierarchyLevel':
        return userContext.hierarchyLevel;
      case 'currentUserId':
        return userContext.id;
      case 'currentUserRoles':
        return userContext.roles;
      default:
        return null;
    }
  }

  /**
   * Get field value from user context (simplified)
   */
  private getFieldValue(
    field: string,
    userContext: EnhancedUserContext,
  ): unknown {
    switch (field) {
      case 'departmentId':
        return userContext.departmentId;
      case 'hierarchyLevel':
        return userContext.hierarchyLevel;
      case 'userId':
        return userContext.id;
      case 'priority':
        return 'high'; // Simplified - would come from resource context
      case 'status':
        return 'active'; // Simplified - would come from resource context
      default:
        return null;
    }
  }

  /**
   * Process special permissions to determine final permission
   */
  private async processSpecialPermissions(
    userContext: EnhancedUserContext,
    _context: EnhancedPermissionContext,
    applicablePermissions: SpecialPermissionMatchResult[],
    action: string,
    _workspaceId: string,
  ): Promise<SpecialPermissionsEvaluation> {
    let finalDecision = false;
    const restrictionsList: string[] = [];
    const appliedPermissionIds: string[] = [];
    let finalSource: SpecialPermissionsEvaluation['source'] =
      'NO_SPECIAL_PERMISSIONS';
    let confidence = 0;
    let hasActiveOverrides = false;
    let hasActiveTemplatePermissions = false;
    let earliestExpiration: Date | undefined;

    // Process permissions in order of match score and priority
    for (const permissionMatch of applicablePermissions) {
      const permission = permissionMatch.permission;

      if (permissionMatch.permissionType === 'OVERRIDE') {
        const override = permission as UserPermissionOverrideEntity;

        if (override.isAllowed) {
          finalDecision = true;
          finalSource = 'USER_OVERRIDE_ALLOW';
          confidence = Math.max(confidence, permissionMatch.matchScore);
          appliedPermissionIds.push(permission.id);
          hasActiveOverrides = true;
        } else {
          // Override denies access - this takes precedence
          finalDecision = false;
          finalSource = 'USER_OVERRIDE_DENY';
          confidence = Math.max(confidence, permissionMatch.matchScore);
          appliedPermissionIds.push(permission.id);
          hasActiveOverrides = true;
          restrictionsList.push(
            `Access denied by user permission override: ${override.reason}`,
          );
          break; // Stop processing on explicit deny
        }
      } else if (permissionMatch.permissionType === 'TEMPLATE') {
        const templatePerm = permission as TemplatePermissionEntity;

        // Check if template permission grants the required action
        const hasActionPermission = this.checkTemplatePermissionAction(
          templatePerm,
          action,
        );

        if (hasActionPermission) {
          finalDecision = true;
          finalSource = 'PERMISSION_TEMPLATE';
          confidence = Math.max(confidence, permissionMatch.matchScore);
          appliedPermissionIds.push(permission.id);
          hasActiveTemplatePermissions = true;

          // Track earliest expiration
          if (
            templatePerm.expiresAt &&
            (!earliestExpiration || templatePerm.expiresAt < earliestExpiration)
          ) {
            earliestExpiration = templatePerm.expiresAt;
          }

          if (templatePerm.expiresAt) {
            restrictionsList.push(
              `Template access expires: ${DateTime.fromJSDate(templatePerm.expiresAt).toLocaleString()}`,
            );
          }
        }
      }
    }

    const evaluationMode = this.determineEvaluationMode(
      confidence,
      userContext,
    );

    return {
      hasPermission: finalDecision,
      source: finalSource,
      level: this.determineAccessLevel(action, finalDecision),
      restrictions: restrictionsList,
      confidence: confidence / 100, // Convert to 0-1 scale
      expiresAt: earliestExpiration,
      metadata: {
        appliedPermissionIds,
        templatePermissionCount: applicablePermissions.filter(
          (p) => p.permissionType === 'TEMPLATE',
        ).length,
        overrideCount: applicablePermissions.filter(
          (p) => p.permissionType === 'OVERRIDE',
        ).length,
        evaluationMode,
        hasActiveOverrides,
        hasActiveTemplatePermissions,
      },
    };
  }

  /**
   * Check if template permission allows the requested action
   */
  private checkTemplatePermissionAction(
    permission: TemplatePermissionEntity,
    action: string,
  ): boolean {
    // Template permissions are more sophisticated and based on resource permissions
    if (!permission.template?.resourcePermissions) {
      return false;
    }

    // Check if any resource permission in the template allows this action
    return permission.template.resourcePermissions.some((resPerm) => {
      if (!resPerm.isAllowed) {
        return false;
      }

      // This would need to be enhanced with actual action matching logic
      // For now, we'll allow all actions if the resource permission allows access
      const actionMatches = this.checkActionMatch(action, resPerm.actionId);

      return actionMatches;
    });
  }

  /**
   * Check if action matches the resource permission action
   * This is a simplified implementation - would need enhancement based on actual action/resource mapping
   */
  private checkActionMatch(
    requestedAction: string,
    _permissionActionId: string,
  ): boolean {
    // Simplified logic - in a real implementation, you'd look up the action by ID
    // and match it against the requested action type
    const normalizedAction = requestedAction?.toLowerCase() || 'read';

    // For now, assume all template permissions grant read access at minimum
    // and higher permissions based on action type
    switch (normalizedAction) {
      case 'read':
      case 'view':
      case 'get':
        return true; // Templates generally grant read access
      case 'update':
      case 'edit':
      case 'modify':
      case 'delete':
      case 'destroy':
        // Would need to check actual permission action type
        return true; // Simplified - allow all actions for active templates
      default:
        return true;
    }
  }

  /**
   * Get default evaluation when no special permissions are found
   */
  private getNoSpecialPermissionsEvaluation(): SpecialPermissionsEvaluation {
    return {
      hasPermission: false,
      source: 'NO_SPECIAL_PERMISSIONS',
      level: 'READ',
      restrictions: ['No special permissions found'],
      confidence: 0,
      metadata: {
        appliedPermissionIds: [],
        templatePermissionCount: 0,
        overrideCount: 0,
        evaluationMode: 'BALANCED',
        hasActiveOverrides: false,
        hasActiveTemplatePermissions: false,
      },
    };
  }

  /**
   * Update context with special permissions evaluation results
   */
  private updateContextWithSpecialPermissions(
    context: EnhancedPermissionContext,
    evaluation: SpecialPermissionsEvaluation,
  ): void {
    // Store special permissions information in context metadata or create specialized context
    if (!context.metadata) {
      context.metadata = {};
    }

    const convertedMetadata: Record<string, string | number | boolean | Date> =
      {};

    for (const [key, value] of Object.entries(evaluation.metadata)) {
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        convertedMetadata[key] = value;
      } else if (Array.isArray(value)) {
        convertedMetadata[key] = value.join(',');
      } else {
        convertedMetadata[key] = String(value);
      }
    }

    Object.assign(context.metadata, {
      specialPermissionsSource: evaluation.source,
      specialPermissionsConfidence: evaluation.confidence,
      specialPermissionsExpiration: evaluation.expiresAt || new Date(0),
      ...convertedMetadata,
    });
  }

  /**
   * Determine access level based on action and permission result
   */
  private determineAccessLevel(
    action: string,
    hasPermission: boolean,
  ): SpecialPermissionsEvaluation['level'] {
    if (!hasPermission) {
      return 'READ';
    }

    switch (action?.toLowerCase()) {
      case 'delete':
      case 'destroy':
        return 'DELETE';
      case 'update':
      case 'edit':
      case 'modify':
        return 'WRITE';
      case 'admin':
      case 'manage':
        return 'ADMIN';
      default:
        return 'READ';
    }
  }

  /**
   * Determine evaluation mode based on confidence and user context
   */
  private determineEvaluationMode(
    confidence: number,
    userContext: EnhancedUserContext,
  ): SpecialPermissionsEvaluation['metadata']['evaluationMode'] {
    const userRoles = userContext.roles || [];
    const isSensitiveRole = userRoles.some((role) =>
      ['SYSTEM_ADMIN', 'SECURITY_ADMIN', 'COMPLIANCE_OFFICER'].includes(role),
    );

    if (confidence >= 90 || isSensitiveRole) {
      return 'STRICT';
    } else if (confidence >= 70) {
      return 'BALANCED';
    } else {
      return 'PERMISSIVE';
    }
  }

  /**
   * Determine if this step should execute based on context
   */
  shouldExecute(_context: EnhancedPermissionContext): boolean {
    // Always execute special permissions check
    return true;
  }

  /**
   * Get step dependencies
   */
  getDependencies(): number[] {
    return [
      VALIDATION_STEPS.PRE_VALIDATION,
      VALIDATION_STEPS.USER_CONTEXT_RESOLUTION,
      VALIDATION_STEPS.RESOURCE_IDENTIFICATION,
    ];
  }

  /**
   * Get estimated execution time for this step
   */
  getEstimatedExecutionTime(_context: EnhancedPermissionContext): number {
    return (
      STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.SPECIAL_PERMISSIONS]
        ?.estimatedExecutionTime || 120
    );
  }

  /**
   * Check if step execution time exceeds threshold
   */
  isPerformanceOptimal(executionTime: number): boolean {
    const threshold =
      STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.SPECIAL_PERMISSIONS]
        ?.maxExecutionTime || 3000;

    return executionTime <= threshold;
  }
}
