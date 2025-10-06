/**
 * Step 12: Dynamic Conditions Service
 * Validates dynamic conditions including time, location, device, and business rule restrictions
 * Part of the 15-step Enterprise RBAC validation process
 * Uses workspace entities only, no core module dependencies
 */

import { Injectable, Logger, Optional } from '@nestjs/common';

import { IsNull } from 'typeorm';
import { DateTime } from 'luxon';

import {
  PermissionValidationStep,
  StepValidationResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/interfaces/validation-step.interface';

import { EnhancedPermissionContext } from 'src/mkt-core/mkt-rbac-enterprise-grade/types/enhanced-permission-context.type';
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
import {
  RBAC_CACHE_KEYS,
  RBAC_CACHE_TTL,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';

import { RbacCacheManagerService } from './rbac-cache-manager.service';

/**
 * Data access policy entity from workspace
 */
export interface MktDataAccessPolicyWorkspaceEntity {
  id: string;
  name: string;
  description: string;
  minHierarchyLevel: number;
  maxHierarchyLevel: number;
  objectName: string;
  filterConditions: Record<string, unknown>;
  priority: number;
  isActive: boolean;
  departmentId: string;
  organizationLevelId: string;
  permissionTemplateId: string;
  specificMemberId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Permission context entity from workspace
 */
export interface MktPermissionContextWorkspaceEntity {
  id: string;
  name: string;
  description: string;
  contextType: string;
  filterExpression: Record<string, unknown>;
  contextKey: string;
  priority: number;
  isActive: boolean;
  isSystemDefault: boolean;
  validationRules: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Template access limitation entity from workspace
 */
export interface MktTemplateAccessLimitationWorkspaceEntity {
  id: string;
  limitationType: string;
  limitationKey: string;
  limitationValue: Record<string, unknown>;
  isEnforced: boolean;
  severity: string;
  isActive: boolean;
  templateId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Dynamic conditions evaluation result
 */
type DynamicConditionsEvaluation = {
  hasPermission: boolean;
  source:
    | 'POLICY_ALLOWED'
    | 'CONTEXT_ALLOWED'
    | 'LIMITATION_DENIED'
    | 'NO_CONDITIONS'
    | 'SYSTEM_DEFAULT';
  conditionsType: 'TIME' | 'LOCATION' | 'DEVICE' | 'BUSINESS_RULE' | 'MIXED';
  restrictions: string[];
  confidence: number;
  metadata: {
    appliedPolicyIds: string[];
    appliedContextIds: string[];
    appliedLimitationIds: string[];
    conditionCount: number;
    evaluationMode: 'STRICT' | 'BALANCED' | 'PERMISSIVE';
    hasTimeRestrictions: boolean;
    hasLocationRestrictions: boolean;
    hasDeviceRestrictions: boolean;
    hasBusinessRules: boolean;
  };
};

/**
 * Condition match result with scoring
 */
type ConditionMatchResult = {
  condition:
    | MktDataAccessPolicyWorkspaceEntity
    | MktPermissionContextWorkspaceEntity
    | MktTemplateAccessLimitationWorkspaceEntity;
  matchScore: number;
  conditionType: 'POLICY' | 'CONTEXT' | 'LIMITATION';
  applicabilityReason: string;
  evaluationResult: boolean;
  restrictions: string[];
};

@Injectable()
export class Step12DynamicConditionsService
  implements PermissionValidationStep
{
  private readonly logger = new Logger(Step12DynamicConditionsService.name);
  readonly stepNumber = VALIDATION_STEPS.DYNAMIC_CONDITIONS;
  readonly stepName =
    VALIDATION_STEP_NAMES[VALIDATION_STEPS.DYNAMIC_CONDITIONS];
  readonly description =
    VALIDATION_STEP_DESCRIPTIONS[VALIDATION_STEPS.DYNAMIC_CONDITIONS];
  readonly isRequired = true;
  readonly canSkip = false;
  readonly isAsync = true;
  readonly priority = 120;

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    @Optional() private readonly cacheManager?: RbacCacheManagerService,
  ) {}

  /**
   * Get data access policy repository
   */
  private async getDataAccessPolicyRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktDataAccessPolicyWorkspaceEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktDataAccessPolicyWorkspaceEntity>(
      workspaceId,
      'mktDataAccessPolicy',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Get permission context repository
   */
  private async getPermissionContextRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktPermissionContextWorkspaceEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPermissionContextWorkspaceEntity>(
      workspaceId,
      'mktPermissionContext',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Get Permission Context by contextKey with caching
   * Cache TTL: 12 hours (moderately stable data)
   */
  private async getPermissionContextByKey(
    workspaceId: string,
    contextKey: string,
  ): Promise<MktPermissionContextWorkspaceEntity | null> {
    try {
      const cacheKey = `${RBAC_CACHE_KEYS.CONFIG_CONTEXTS}:${workspaceId}:${contextKey}`;

      // Try cache first
      let contextConfig: MktPermissionContextWorkspaceEntity | null = null;

      if (this.cacheManager) {
        contextConfig =
          await this.cacheManager.get<MktPermissionContextWorkspaceEntity>(
            cacheKey,
          );

        if (contextConfig) {
          this.logger.debug(
            `Cache HIT: Permission context ${contextKey} (Redis)`,
          );

          return contextConfig;
        }
      }

      // Load from DB if cache miss
      this.logger.debug(
        `Cache MISS: Loading permission context from DB for ${contextKey}`,
      );

      const contextRepository =
        await this.getPermissionContextRepository(workspaceId);

      contextConfig = await contextRepository.findOne({
        where: { contextKey, isActive: true },
      });

      // Cache for 12 hours (using centralized TTL constant)
      if (this.cacheManager && contextConfig) {
        await this.cacheManager.set(
          cacheKey,
          contextConfig,
          RBAC_CACHE_TTL.CONFIG_CONTEXTS,
        );
        this.logger.debug(
          `Cache SET: Permission context ${contextKey} with 12h TTL`,
        );
      }

      return contextConfig;
    } catch (error) {
      this.logger.error(
        `Error getting permission context ${contextKey}: ${error.message}`,
      );

      return null;
    }
  }

  /**
   * Get all active Permission Contexts with caching
   * Cache TTL: 12 hours (moderately stable data)
   */
  private async getAllPermissionContexts(
    workspaceId: string,
  ): Promise<MktPermissionContextWorkspaceEntity[]> {
    try {
      const cacheKey = `${RBAC_CACHE_KEYS.CONFIG_CONTEXTS}:${workspaceId}:all`;

      // Try cache first
      let contexts: MktPermissionContextWorkspaceEntity[] | null = null;

      if (this.cacheManager) {
        contexts =
          await this.cacheManager.get<MktPermissionContextWorkspaceEntity[]>(
            cacheKey,
          );

        if (contexts) {
          this.logger.debug(
            `Cache HIT: All permission contexts (${contexts.length} items) (Redis)`,
          );

          return contexts;
        }
      }

      // Load from DB if cache miss
      this.logger.debug(`Cache MISS: Loading all permission contexts from DB`);

      const contextRepository =
        await this.getPermissionContextRepository(workspaceId);

      contexts = await contextRepository.find({
        where: { isActive: true },
        order: { priority: 'DESC' },
      });

      // Cache for 12 hours (using centralized TTL constant)
      if (this.cacheManager && contexts) {
        await this.cacheManager.set(
          cacheKey,
          contexts,
          RBAC_CACHE_TTL.CONFIG_CONTEXTS,
        );
        this.logger.debug(
          `Cache SET: All permission contexts (${contexts.length} items) with 12h TTL`,
        );
      }

      return contexts;
    } catch (error) {
      this.logger.error(
        `Error getting all permission contexts: ${error.message}`,
      );

      return [];
    }
  }

  /**
   * Get Permission Contexts by type with caching
   * Cache TTL: 12 hours (moderately stable data)
   */
  private async getPermissionContextsByType(
    workspaceId: string,
    contextType: string,
  ): Promise<MktPermissionContextWorkspaceEntity[]> {
    try {
      const cacheKey = `${RBAC_CACHE_KEYS.CONFIG_CONTEXTS}:${workspaceId}:type:${contextType}`;

      // Try cache first
      let contexts: MktPermissionContextWorkspaceEntity[] | null = null;

      if (this.cacheManager) {
        contexts =
          await this.cacheManager.get<MktPermissionContextWorkspaceEntity[]>(
            cacheKey,
          );

        if (contexts) {
          this.logger.debug(
            `Cache HIT: Permission contexts for type ${contextType} (${contexts.length} items) (Redis)`,
          );

          return contexts;
        }
      }

      // Load from DB if cache miss
      this.logger.debug(
        `Cache MISS: Loading permission contexts from DB for type ${contextType}`,
      );

      const contextRepository =
        await this.getPermissionContextRepository(workspaceId);

      contexts = await contextRepository.find({
        where: { contextType, isActive: true },
        order: { priority: 'DESC' },
      });

      // Cache for 12 hours (using centralized TTL constant)
      if (this.cacheManager && contexts) {
        await this.cacheManager.set(
          cacheKey,
          contexts,
          RBAC_CACHE_TTL.CONFIG_CONTEXTS,
        );
        this.logger.debug(
          `Cache SET: Permission contexts for type ${contextType} (${contexts.length} items) with 12h TTL`,
        );
      }

      return contexts;
    } catch (error) {
      this.logger.error(
        `Error getting permission contexts for type ${contextType}: ${error.message}`,
      );

      return [];
    }
  }

  /**
   * Get template access limitation repository
   */
  private async getTemplateAccessLimitationRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktTemplateAccessLimitationWorkspaceEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktTemplateAccessLimitationWorkspaceEntity>(
      workspaceId,
      'mktTemplateAccessLimitation',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Validate Step 12: Dynamic Conditions
   */
  async validate(
    context: EnhancedPermissionContext,
  ): Promise<StepValidationResult> {
    const stepStartTime = DateTime.now();

    try {
      this.logger.debug(
        `Step 12: ${this.stepName} - Starting dynamic conditions check`,
      );

      // Validate prerequisites
      if (!context.userContext) {
        return {
          result: CheckResult.FAIL,
          continue: false,
          reason: 'Missing user context for dynamic conditions check',
          executionTime: DateTime.now().diff(stepStartTime).toMillis(),
          metadata: {
            error: 'USER_CONTEXT_MISSING',
            stepNumber: this.stepNumber,
          },
        };
      }

      const workspaceId = context.userContext.workspaceId || '';

      // Get complete dynamic conditions evaluation
      const dynamicConditionsEvaluation = await this.evaluateDynamicConditions(
        context,
        workspaceId,
      );

      // Update context with dynamic conditions information
      this.updateContextWithDynamicConditions(
        context,
        dynamicConditionsEvaluation,
      );

      this.logger.debug(`Step 12: ${this.stepName} completed successfully`);

      const result = dynamicConditionsEvaluation.hasPermission
        ? CheckResult.PASS
        : CheckResult.FAIL;

      return {
        result,
        continue: true,
        reason: dynamicConditionsEvaluation.hasPermission
          ? `Dynamic conditions allow access - ${dynamicConditionsEvaluation.source}`
          : `Dynamic conditions deny access - ${dynamicConditionsEvaluation.source}`,
        executionTime: DateTime.now().diff(stepStartTime).toMillis(),
        metadata: {
          source: dynamicConditionsEvaluation.source,
          conditionsType: dynamicConditionsEvaluation.conditionsType,
          conditionCount: dynamicConditionsEvaluation.metadata.conditionCount,
          evaluationMode: dynamicConditionsEvaluation.metadata.evaluationMode,
        },
      };
    } catch (error) {
      this.logger.error(
        `Step 12: ${this.stepName} failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      return {
        result: CheckResult.FAIL,
        continue: true,
        reason: `Dynamic conditions check failed: ${error instanceof Error ? error.message : String(error)}`,
        executionTime: DateTime.now().diff(stepStartTime).toMillis(),
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stepNumber: this.stepNumber,
        },
      };
    }
  }

  /**
   * Evaluate dynamic conditions for the given context
   */
  private async evaluateDynamicConditions(
    context: EnhancedPermissionContext,
    workspaceId: string,
  ): Promise<DynamicConditionsEvaluation> {
    try {
      // Find applicable dynamic conditions
      const applicableConditions = await this.findApplicableDynamicConditions(
        context,
        workspaceId,
      );

      if (applicableConditions.length === 0) {
        return this.getNoDynamicConditionsEvaluation();
      }

      // Process dynamic conditions by priority and type
      return await this.processDynamicConditions(
        context,
        applicableConditions,
        workspaceId,
      );
    } catch (error) {
      this.logger.error(
        `Error evaluating dynamic conditions: ${error instanceof Error ? error.message : String(error)}`,
      );

      return this.getNoDynamicConditionsEvaluation();
    }
  }

  /**
   * Find applicable dynamic conditions
   */
  private async findApplicableDynamicConditions(
    context: EnhancedPermissionContext,
    workspaceId: string,
  ): Promise<ConditionMatchResult[]> {
    try {
      const policyRepository =
        await this.getDataAccessPolicyRepository(workspaceId);
      const contextRepository =
        await this.getPermissionContextRepository(workspaceId);
      const limitationRepository =
        await this.getTemplateAccessLimitationRepository(workspaceId);

      const matchResults: ConditionMatchResult[] = [];

      // Get active data access policies
      const policies = await policyRepository.find({
        where: {
          objectName: context.resourceContext?.objectName || '',
          isActive: true,
          deletedAt: IsNull(),
        },
      });

      // Evaluate data access policies
      for (const policy of policies) {
        const matchResult = await this.evaluatePolicyMatch(policy, context);

        if (matchResult.matchScore > 0) {
          matchResults.push(matchResult);
        }
      }

      // Get active permission contexts
      const contexts = await contextRepository.find({
        where: {
          isActive: true,
          deletedAt: IsNull(),
        },
      });

      // Evaluate permission contexts
      for (const permContext of contexts) {
        const matchResult = await this.evaluateContextMatch(
          permContext,
          context,
        );

        if (matchResult.matchScore > 0) {
          matchResults.push(matchResult);
        }
      }

      // Get active template access limitations
      const limitations = await limitationRepository.find({
        where: {
          isActive: true,
          isEnforced: true,
          deletedAt: IsNull(),
        },
      });

      // Evaluate template access limitations
      for (const limitation of limitations) {
        const matchResult = await this.evaluateLimitationMatch(
          limitation,
          context,
        );

        if (matchResult.matchScore > 0) {
          matchResults.push(matchResult);
        }
      }

      // Sort by match score and condition type priority
      matchResults.sort((a, b) => {
        if (a.matchScore !== b.matchScore) {
          return b.matchScore - a.matchScore;
        }
        // Limitations have higher priority than policies and contexts
        const typePriority = { LIMITATION: 3, POLICY: 2, CONTEXT: 1 };

        return typePriority[a.conditionType] - typePriority[b.conditionType];
      });

      this.logger.debug(
        `Found ${matchResults.length} applicable dynamic conditions`,
      );

      return matchResults;
    } catch (error) {
      this.logger.error(
        `Error finding applicable dynamic conditions: ${error instanceof Error ? error.message : String(error)}`,
      );

      return [];
    }
  }

  /**
   * Evaluate if a data access policy matches the context
   */
  private async evaluatePolicyMatch(
    policy: MktDataAccessPolicyWorkspaceEntity,
    context: EnhancedPermissionContext,
  ): Promise<ConditionMatchResult> {
    let matchScore = 0;
    let applicabilityReason = '';
    let evaluationResult = false;
    const restrictions: string[] = [];

    // Check hierarchy level constraints
    const userHierarchyLevel = context.userContext?.hierarchyLevel || 0;

    if (
      policy.minHierarchyLevel &&
      userHierarchyLevel < policy.minHierarchyLevel
    ) {
      restrictions.push(
        `Requires minimum hierarchy level: ${policy.minHierarchyLevel}`,
      );
    } else if (
      policy.maxHierarchyLevel &&
      userHierarchyLevel > policy.maxHierarchyLevel
    ) {
      restrictions.push(
        `Exceeds maximum hierarchy level: ${policy.maxHierarchyLevel}`,
      );
    } else {
      matchScore = 80;
      evaluationResult = true;
      applicabilityReason = 'Hierarchy level requirements met';
    }

    // Evaluate filter conditions
    if (
      policy.filterConditions &&
      Object.keys(policy.filterConditions).length > 0
    ) {
      const filterResult = await this.evaluateFilterConditions(
        policy.filterConditions,
        context,
      );

      if (filterResult.passed) {
        matchScore = Math.max(matchScore, 85);
        evaluationResult = true;
        applicabilityReason = 'Filter conditions satisfied';
      } else {
        matchScore = 0;
        evaluationResult = false;
        restrictions.push(...filterResult.failedConditions);
        applicabilityReason = 'Filter conditions not met';
      }
    }

    return {
      condition: policy,
      matchScore,
      conditionType: 'POLICY',
      applicabilityReason,
      evaluationResult,
      restrictions,
    };
  }

  /**
   * Evaluate if a permission context matches the current context
   */
  private async evaluateContextMatch(
    permContext: MktPermissionContextWorkspaceEntity,
    context: EnhancedPermissionContext,
  ): Promise<ConditionMatchResult> {
    let matchScore = 0;
    let applicabilityReason = '';
    let evaluationResult = false;
    const restrictions: string[] = [];

    // Evaluate context type specific conditions
    switch (permContext.contextType.toUpperCase()) {
      case 'TIME': {
        const timeResult = this.evaluateTimeConditions(permContext, context);

        matchScore = timeResult.score;
        evaluationResult = timeResult.passed;
        applicabilityReason = timeResult.reason;
        restrictions.push(...timeResult.restrictions);
        break;
      }

      case 'LOCATION': {
        const locationResult = this.evaluateLocationConditions(
          permContext,
          context,
        );

        matchScore = locationResult.score;
        evaluationResult = locationResult.passed;
        applicabilityReason = locationResult.reason;
        restrictions.push(...locationResult.restrictions);
        break;
      }

      case 'DEVICE': {
        const deviceResult = this.evaluateDeviceConditions(
          permContext,
          context,
        );

        matchScore = deviceResult.score;
        evaluationResult = deviceResult.passed;
        applicabilityReason = deviceResult.reason;
        restrictions.push(...deviceResult.restrictions);
        break;
      }

      case 'BUSINESS_RULE': {
        const businessResult = this.evaluateBusinessRuleConditions(
          permContext,
          context,
        );

        matchScore = businessResult.score;
        evaluationResult = businessResult.passed;
        applicabilityReason = businessResult.reason;
        restrictions.push(...businessResult.restrictions);
        break;
      }

      default:
        matchScore = 50;
        evaluationResult = true;
        applicabilityReason = 'Generic context type allowed';
    }

    return {
      condition: permContext,
      matchScore,
      conditionType: 'CONTEXT',
      applicabilityReason,
      evaluationResult,
      restrictions,
    };
  }

  /**
   * Evaluate if a template access limitation applies
   */
  private async evaluateLimitationMatch(
    limitation: MktTemplateAccessLimitationWorkspaceEntity,
    context: EnhancedPermissionContext,
  ): Promise<ConditionMatchResult> {
    let matchScore = 0;
    let applicabilityReason = '';
    let evaluationResult = true; // Limitations default to allowing access unless violated
    const restrictions: string[] = [];

    // Evaluate limitation based on type
    switch (limitation.limitationType.toUpperCase()) {
      case 'TIME': {
        const timeCheck = this.evaluateTimeLimitation(limitation, context);

        if (!timeCheck.passed) {
          matchScore = 95; // High score for violated limitations
          evaluationResult = false;
          applicabilityReason = 'Time limitation violated';
          restrictions.push(...timeCheck.restrictions);
        }
        break;
      }

      case 'LOCATION': {
        const locationCheck = this.evaluateLocationLimitation(
          limitation,
          context,
        );

        if (!locationCheck.passed) {
          matchScore = 95;
          evaluationResult = false;
          applicabilityReason = 'Location limitation violated';
          restrictions.push(...locationCheck.restrictions);
        }
        break;
      }

      case 'DEVICE': {
        const deviceCheck = this.evaluateDeviceLimitation(limitation, context);

        if (!deviceCheck.passed) {
          matchScore = 95;
          evaluationResult = false;
          applicabilityReason = 'Device limitation violated';
          restrictions.push(...deviceCheck.restrictions);
        }
        break;
      }

      case 'CONCURRENT_SESSIONS': {
        const sessionCheck = this.evaluateSessionLimitation(
          limitation,
          context,
        );

        if (!sessionCheck.passed) {
          matchScore = 90;
          evaluationResult = false;
          applicabilityReason = 'Session limitation violated';
          restrictions.push(...sessionCheck.restrictions);
        }
        break;
      }

      default:
        // Unknown limitation type - be permissive
        matchScore = 0;
        evaluationResult = true;
        applicabilityReason = 'Unknown limitation type';
    }

    return {
      condition: limitation,
      matchScore,
      conditionType: 'LIMITATION',
      applicabilityReason,
      evaluationResult,
      restrictions,
    };
  }

  /**
   * Evaluate filter conditions from policy
   */
  private async evaluateFilterConditions(
    filterConditions: Record<string, unknown>,
    context: EnhancedPermissionContext,
  ): Promise<{ passed: boolean; failedConditions: string[] }> {
    const failedConditions: string[] = [];

    try {
      // Handle basic field conditions
      for (const [field, condition] of Object.entries(filterConditions)) {
        if (typeof condition === 'object' && condition !== null) {
          const condObj = condition as Record<string, unknown>;

          if (condObj.operator && condObj.value !== undefined) {
            const fieldValue = this.getContextFieldValue(field, context);
            const passed = this.evaluateOperatorCondition(
              fieldValue,
              condObj.operator as string,
              condObj.value,
            );

            if (!passed) {
              failedConditions.push(
                `${field} ${condObj.operator} ${condObj.value}`,
              );
            }
          }
        }
      }

      return {
        passed: failedConditions.length === 0,
        failedConditions,
      };
    } catch (error) {
      this.logger.error('Error evaluating filter conditions:', error);

      return {
        passed: false,
        failedConditions: ['FILTER_EVALUATION_ERROR'],
      };
    }
  }

  /**
   * Evaluate time-based conditions
   */
  private evaluateTimeConditions(
    permContext: MktPermissionContextWorkspaceEntity,
    context: EnhancedPermissionContext,
  ): {
    score: number;
    passed: boolean;
    reason: string;
    restrictions: string[];
  } {
    const restrictions: string[] = [];
    const currentTime = DateTime.now();
    const currentHour = currentTime.hour;
    const currentDay = currentTime.weekday; // 1-7 (Monday-Sunday)

    try {
      const timeConditions = context.dynamicConditions?.timeRestrictions || {};

      // Check business hours
      if (timeConditions.businessHoursOnly) {
        if (currentHour < 8 || currentHour > 18) {
          restrictions.push(
            'Access restricted to business hours (8 AM - 6 PM)',
          );

          return {
            score: 90,
            passed: false,
            reason: 'Outside business hours',
            restrictions,
          };
        }
      }

      // Check allowed hours
      if (
        timeConditions.allowedHours &&
        timeConditions.allowedHours.length > 0
      ) {
        const isAllowedHour = timeConditions.allowedHours.some(
          (range) => currentHour >= range.start && currentHour <= range.end,
        );

        if (!isAllowedHour) {
          restrictions.push('Current time not in allowed hours');

          return {
            score: 85,
            passed: false,
            reason: 'Time not allowed',
            restrictions,
          };
        }
      }

      // Check weekends
      if (
        timeConditions.blockWeekends &&
        (currentDay === 6 || currentDay === 7)
      ) {
        restrictions.push('Access blocked on weekends');

        return {
          score: 80,
          passed: false,
          reason: 'Weekend access blocked',
          restrictions,
        };
      }

      // Check allowed days
      if (timeConditions.allowedDays && timeConditions.allowedDays.length > 0) {
        if (!timeConditions.allowedDays.includes(currentDay)) {
          restrictions.push('Current day not in allowed days');

          return {
            score: 85,
            passed: false,
            reason: 'Day not allowed',
            restrictions,
          };
        }
      }

      return {
        score: 75,
        passed: true,
        reason: 'Time conditions satisfied',
        restrictions,
      };
    } catch (error) {
      this.logger.error('Error evaluating time conditions:', error);

      return {
        score: 0,
        passed: false,
        reason: 'Time evaluation error',
        restrictions: ['TIME_EVALUATION_ERROR'],
      };
    }
  }

  /**
   * Evaluate location-based conditions
   */
  private evaluateLocationConditions(
    permContext: MktPermissionContextWorkspaceEntity,
    context: EnhancedPermissionContext,
  ): {
    score: number;
    passed: boolean;
    reason: string;
    restrictions: string[];
  } {
    const restrictions: string[] = [];
    const userIpAddress = context.userContext?.ipAddress || '';

    try {
      const locationConditions =
        context.dynamicConditions?.locationRestrictions || {};

      // Check VPN requirement
      if (
        locationConditions.requireVPN &&
        !this.isVpnConnection(userIpAddress)
      ) {
        restrictions.push('VPN connection required');

        return {
          score: 90,
          passed: false,
          reason: 'VPN required',
          restrictions,
        };
      }

      // Check corporate network requirement
      if (
        locationConditions.requireCorporateNetwork &&
        !this.isCorporateNetwork(userIpAddress)
      ) {
        restrictions.push('Corporate network access required');

        return {
          score: 85,
          passed: false,
          reason: 'Corporate network required',
          restrictions,
        };
      }

      // Check allowed IPs
      if (
        locationConditions.allowedIPs &&
        locationConditions.allowedIPs.length > 0
      ) {
        if (!locationConditions.allowedIPs.includes(userIpAddress)) {
          restrictions.push('IP address not in allowed list');

          return {
            score: 95,
            passed: false,
            reason: 'IP not allowed',
            restrictions,
          };
        }
      }

      // Check restricted IPs
      if (
        locationConditions.restrictedIPs &&
        locationConditions.restrictedIPs.includes(userIpAddress)
      ) {
        restrictions.push('IP address is restricted');

        return {
          score: 95,
          passed: false,
          reason: 'IP restricted',
          restrictions,
        };
      }

      return {
        score: 75,
        passed: true,
        reason: 'Location conditions satisfied',
        restrictions,
      };
    } catch (error) {
      this.logger.error('Error evaluating location conditions:', error);

      return {
        score: 0,
        passed: false,
        reason: 'Location evaluation error',
        restrictions: ['LOCATION_EVALUATION_ERROR'],
      };
    }
  }

  /**
   * Evaluate device-based conditions
   */
  private evaluateDeviceConditions(
    permContext: MktPermissionContextWorkspaceEntity,
    context: EnhancedPermissionContext,
  ): {
    score: number;
    passed: boolean;
    reason: string;
    restrictions: string[];
  } {
    const restrictions: string[] = [];
    const userAgent = context.userContext?.userAgent || '';

    try {
      const deviceConditions =
        context.dynamicConditions?.deviceRestrictions || {};

      // Check MFA requirement
      if (deviceConditions.requireMFA && !this.hasMfaToken(context)) {
        restrictions.push('Multi-factor authentication required');

        return {
          score: 95,
          passed: false,
          reason: 'MFA required',
          restrictions,
        };
      }

      // Check trusted devices
      if (
        deviceConditions.trustedDevicesOnly &&
        !this.isTrustedDevice(context)
      ) {
        restrictions.push('Trusted device required');

        return {
          score: 90,
          passed: false,
          reason: 'Untrusted device',
          restrictions,
        };
      }

      // Check allowed user agents
      if (
        deviceConditions.allowedUserAgents &&
        deviceConditions.allowedUserAgents.length > 0
      ) {
        const isAllowedAgent = deviceConditions.allowedUserAgents.some(
          (agent) => userAgent.toLowerCase().includes(agent.toLowerCase()),
        );

        if (!isAllowedAgent) {
          restrictions.push('User agent not allowed');

          return {
            score: 80,
            passed: false,
            reason: 'User agent not allowed',
            restrictions,
          };
        }
      }

      // Check restricted user agents
      if (deviceConditions.restrictedUserAgents) {
        const isRestrictedAgent = deviceConditions.restrictedUserAgents.some(
          (agent) => userAgent.toLowerCase().includes(agent.toLowerCase()),
        );

        if (isRestrictedAgent) {
          restrictions.push('User agent is restricted');

          return {
            score: 85,
            passed: false,
            reason: 'User agent restricted',
            restrictions,
          };
        }
      }

      return {
        score: 75,
        passed: true,
        reason: 'Device conditions satisfied',
        restrictions,
      };
    } catch (error) {
      this.logger.error('Error evaluating device conditions:', error);

      return {
        score: 0,
        passed: false,
        reason: 'Device evaluation error',
        restrictions: ['DEVICE_EVALUATION_ERROR'],
      };
    }
  }

  /**
   * Evaluate business rule conditions
   */
  private evaluateBusinessRuleConditions(
    permContext: MktPermissionContextWorkspaceEntity,
    context: EnhancedPermissionContext,
  ): {
    score: number;
    passed: boolean;
    reason: string;
    restrictions: string[];
  } {
    const restrictions: string[] = [];

    try {
      const businessRules = context.dynamicConditions?.businessRules || {};

      // Check approval requirement
      if (businessRules.requireApproval && !this.hasRequiredApproval(context)) {
        restrictions.push('Approval required for this action');

        return {
          score: 90,
          passed: false,
          reason: 'Approval required',
          restrictions,
        };
      }

      // Check workflow requirement
      if (
        businessRules.workflowRequired &&
        !this.hasCompletedWorkflow(context)
      ) {
        restrictions.push('Workflow completion required');

        return {
          score: 85,
          passed: false,
          reason: 'Workflow required',
          restrictions,
        };
      }

      // Check pending review block
      if (
        businessRules.blockOnPendingReview &&
        this.hasPendingReview(context)
      ) {
        restrictions.push('Access blocked due to pending review');

        return {
          score: 95,
          passed: false,
          reason: 'Pending review',
          restrictions,
        };
      }

      // Check daily access limit
      if (
        businessRules.maxDailyAccess &&
        this.exceedsDailyLimit(context, businessRules.maxDailyAccess)
      ) {
        restrictions.push(
          `Daily access limit exceeded: ${businessRules.maxDailyAccess}`,
        );

        return {
          score: 80,
          passed: false,
          reason: 'Daily limit exceeded',
          restrictions,
        };
      }

      return {
        score: 75,
        passed: true,
        reason: 'Business rules satisfied',
        restrictions,
      };
    } catch (error) {
      this.logger.error('Error evaluating business rule conditions:', error);

      return {
        score: 0,
        passed: false,
        reason: 'Business rule evaluation error',
        restrictions: ['BUSINESS_RULE_EVALUATION_ERROR'],
      };
    }
  }

  /**
   * Evaluate time limitation
   */
  private evaluateTimeLimitation(
    limitation: MktTemplateAccessLimitationWorkspaceEntity,
    context: EnhancedPermissionContext,
  ): { passed: boolean; restrictions: string[] } {
    const restrictions: string[] = [];

    try {
      const timeLimit = limitation.limitationValue as {
        maxDuration?: number;
        allowedHours?: number[];
      };

      if (timeLimit.maxDuration) {
        // Check if session duration would exceed limit
        const sessionStartTime = context.startTime || Date.now();
        const sessionDuration = Date.now() - sessionStartTime;

        if (sessionDuration > timeLimit.maxDuration * 60 * 1000) {
          // Convert minutes to ms
          restrictions.push(
            `Session duration exceeds limit: ${timeLimit.maxDuration} minutes`,
          );

          return { passed: false, restrictions };
        }
      }

      if (timeLimit.allowedHours) {
        const currentHour = DateTime.now().hour;

        if (!timeLimit.allowedHours.includes(currentHour)) {
          restrictions.push(
            `Current hour not in allowed hours: ${timeLimit.allowedHours.join(', ')}`,
          );

          return { passed: false, restrictions };
        }
      }

      return { passed: true, restrictions };
    } catch (error) {
      this.logger.error('Error evaluating time limitation:', error);

      return { passed: false, restrictions: ['TIME_LIMITATION_ERROR'] };
    }
  }

  /**
   * Evaluate location limitation
   */
  private evaluateLocationLimitation(
    limitation: MktTemplateAccessLimitationWorkspaceEntity,
    context: EnhancedPermissionContext,
  ): { passed: boolean; restrictions: string[] } {
    const restrictions: string[] = [];

    try {
      const locationLimit = limitation.limitationValue as {
        blockedIPs?: string[];
        requiredRegions?: string[];
        allowedCountries?: string[];
      };

      const userIpAddress = context.userContext?.ipAddress || '';

      if (
        locationLimit.blockedIPs &&
        locationLimit.blockedIPs.includes(userIpAddress)
      ) {
        restrictions.push('IP address is in blocked list');

        return { passed: false, restrictions };
      }

      if (locationLimit.allowedCountries) {
        const userCountry = this.getCountryFromIp(userIpAddress);

        if (!locationLimit.allowedCountries.includes(userCountry)) {
          restrictions.push(`Country not allowed: ${userCountry}`);

          return { passed: false, restrictions };
        }
      }

      return { passed: true, restrictions };
    } catch (error) {
      this.logger.error('Error evaluating location limitation:', error);

      return { passed: false, restrictions: ['LOCATION_LIMITATION_ERROR'] };
    }
  }

  /**
   * Evaluate device limitation
   */
  private evaluateDeviceLimitation(
    limitation: MktTemplateAccessLimitationWorkspaceEntity,
    context: EnhancedPermissionContext,
  ): { passed: boolean; restrictions: string[] } {
    const restrictions: string[] = [];

    try {
      const deviceLimit = limitation.limitationValue as {
        blockedUserAgents?: string[];
        requiresCertificate?: boolean;
        maxConcurrentDevices?: number;
      };

      const userAgent = context.userContext?.userAgent || '';

      if (deviceLimit.blockedUserAgents) {
        const isBlocked = deviceLimit.blockedUserAgents.some((agent) =>
          userAgent.toLowerCase().includes(agent.toLowerCase()),
        );

        if (isBlocked) {
          restrictions.push('User agent is blocked');

          return { passed: false, restrictions };
        }
      }

      if (
        deviceLimit.requiresCertificate &&
        !this.hasClientCertificate(context)
      ) {
        restrictions.push('Client certificate required');

        return { passed: false, restrictions };
      }

      if (
        deviceLimit.maxConcurrentDevices &&
        this.exceedsConcurrentDeviceLimit(
          context,
          deviceLimit.maxConcurrentDevices,
        )
      ) {
        restrictions.push(
          `Concurrent device limit exceeded: ${deviceLimit.maxConcurrentDevices}`,
        );

        return { passed: false, restrictions };
      }

      return { passed: true, restrictions };
    } catch (error) {
      this.logger.error('Error evaluating device limitation:', error);

      return { passed: false, restrictions: ['DEVICE_LIMITATION_ERROR'] };
    }
  }

  /**
   * Evaluate session limitation
   */
  private evaluateSessionLimitation(
    limitation: MktTemplateAccessLimitationWorkspaceEntity,
    context: EnhancedPermissionContext,
  ): { passed: boolean; restrictions: string[] } {
    const restrictions: string[] = [];

    try {
      const sessionLimit = limitation.limitationValue as {
        maxConcurrentSessions?: number;
        maxSessionDuration?: number;
        maxIdleTime?: number;
      };

      if (
        sessionLimit.maxConcurrentSessions &&
        this.exceedsConcurrentSessionLimit(
          context,
          sessionLimit.maxConcurrentSessions,
        )
      ) {
        restrictions.push(
          `Concurrent session limit exceeded: ${sessionLimit.maxConcurrentSessions}`,
        );

        return { passed: false, restrictions };
      }

      if (sessionLimit.maxSessionDuration) {
        const sessionDuration =
          (Date.now() - (context.startTime || Date.now())) / (1000 * 60); // minutes

        if (sessionDuration > sessionLimit.maxSessionDuration) {
          restrictions.push(
            `Session duration limit exceeded: ${sessionLimit.maxSessionDuration} minutes`,
          );

          return { passed: false, restrictions };
        }
      }

      return { passed: true, restrictions };
    } catch (error) {
      this.logger.error('Error evaluating session limitation:', error);

      return { passed: false, restrictions: ['SESSION_LIMITATION_ERROR'] };
    }
  }

  /**
   * Process dynamic conditions to determine final permission
   */
  private async processDynamicConditions(
    context: EnhancedPermissionContext,
    applicableConditions: ConditionMatchResult[],
    _workspaceId: string,
  ): Promise<DynamicConditionsEvaluation> {
    let finalDecision = true;
    const restrictionsList: string[] = [];
    const appliedPolicyIds: string[] = [];
    const appliedContextIds: string[] = [];
    const appliedLimitationIds: string[] = [];
    let finalSource: DynamicConditionsEvaluation['source'] = 'NO_CONDITIONS';
    let conditionsType: DynamicConditionsEvaluation['conditionsType'] = 'MIXED';
    let confidence = 100;

    let hasTimeRestrictions = false;
    let hasLocationRestrictions = false;
    let hasDeviceRestrictions = false;
    let hasBusinessRules = false;

    // Process conditions in order of priority
    for (const conditionMatch of applicableConditions) {
      const condition = conditionMatch.condition;

      if (conditionMatch.conditionType === 'LIMITATION') {
        // Limitations can deny access
        if (!conditionMatch.evaluationResult) {
          finalDecision = false;
          finalSource = 'LIMITATION_DENIED';
          confidence = Math.max(confidence, conditionMatch.matchScore);
          appliedLimitationIds.push(condition.id);
          restrictionsList.push(...conditionMatch.restrictions);

          // Track condition types
          const limitation =
            condition as MktTemplateAccessLimitationWorkspaceEntity;

          switch (limitation.limitationType.toUpperCase()) {
            case 'TIME':
              hasTimeRestrictions = true;
              conditionsType = 'TIME';
              break;
            case 'LOCATION':
              hasLocationRestrictions = true;
              conditionsType = 'LOCATION';
              break;
            case 'DEVICE':
              hasDeviceRestrictions = true;
              conditionsType = 'DEVICE';
              break;
            default:
              hasBusinessRules = true;
              conditionsType = 'BUSINESS_RULE';
          }

          // Stop on first limitation violation
          break;
        }
      } else if (conditionMatch.conditionType === 'POLICY') {
        // Policies can allow or enhance access
        if (conditionMatch.evaluationResult) {
          finalDecision = true;
          finalSource = 'POLICY_ALLOWED';
          confidence = Math.min(confidence, conditionMatch.matchScore);
          appliedPolicyIds.push(condition.id);
        }
      } else if (conditionMatch.conditionType === 'CONTEXT') {
        // Contexts provide conditional access
        if (conditionMatch.evaluationResult) {
          finalSource = 'CONTEXT_ALLOWED';
          confidence = Math.min(confidence, conditionMatch.matchScore);
          appliedContextIds.push(condition.id);

          // Track condition types
          const permContext = condition as MktPermissionContextWorkspaceEntity;

          switch (permContext.contextType.toUpperCase()) {
            case 'TIME':
              hasTimeRestrictions = true;
              break;
            case 'LOCATION':
              hasLocationRestrictions = true;
              break;
            case 'DEVICE':
              hasDeviceRestrictions = true;
              break;
            case 'BUSINESS_RULE':
              hasBusinessRules = true;
              break;
          }
        } else {
          restrictionsList.push(...conditionMatch.restrictions);
        }
      }
    }

    // Determine evaluation mode
    const evaluationMode = this.determineEvaluationMode(confidence, context);

    // Determine final conditions type
    const typeCount = [
      hasTimeRestrictions,
      hasLocationRestrictions,
      hasDeviceRestrictions,
      hasBusinessRules,
    ].filter(Boolean).length;

    if (typeCount > 1) {
      conditionsType = 'MIXED';
    }

    return {
      hasPermission: finalDecision,
      source: finalSource,
      conditionsType,
      restrictions: restrictionsList,
      confidence: confidence / 100, // Convert to 0-1 scale
      metadata: {
        appliedPolicyIds,
        appliedContextIds,
        appliedLimitationIds,
        conditionCount: applicableConditions.length,
        evaluationMode,
        hasTimeRestrictions,
        hasLocationRestrictions,
        hasDeviceRestrictions,
        hasBusinessRules,
      },
    };
  }

  /**
   * Get default evaluation when no dynamic conditions are found
   */
  private getNoDynamicConditionsEvaluation(): DynamicConditionsEvaluation {
    return {
      hasPermission: true, // Default to allowing when no conditions are specified
      source: 'NO_CONDITIONS',
      conditionsType: 'MIXED',
      restrictions: [],
      confidence: 1.0,
      metadata: {
        appliedPolicyIds: [],
        appliedContextIds: [],
        appliedLimitationIds: [],
        conditionCount: 0,
        evaluationMode: 'BALANCED',
        hasTimeRestrictions: false,
        hasLocationRestrictions: false,
        hasDeviceRestrictions: false,
        hasBusinessRules: false,
      },
    };
  }

  /**
   * Update context with dynamic conditions evaluation results
   */
  private updateContextWithDynamicConditions(
    context: EnhancedPermissionContext,
    evaluation: DynamicConditionsEvaluation,
  ): void {
    // Store dynamic conditions information in context metadata
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
      dynamicConditionsSource: evaluation.source,
      dynamicConditionsType: evaluation.conditionsType,
      dynamicConditionsConfidence: evaluation.confidence,
      dynamicConditionsCount: evaluation.metadata.conditionCount,
      ...convertedMetadata,
    });
  }

  /**
   * Helper methods for condition evaluation
   */
  private getContextFieldValue(
    field: string,
    context: EnhancedPermissionContext,
  ): unknown {
    switch (field) {
      case 'userId':
        return context.userContext?.id;
      case 'departmentId':
        return context.userContext?.departmentId;
      case 'hierarchyLevel':
        return context.userContext?.hierarchyLevel;
      case 'resourceType':
        return context.resourceContext?.resourceType;
      case 'objectName':
        return context.resourceContext?.objectName;
      case 'action':
        return context.action;
      default:
        return null;
    }
  }

  private evaluateOperatorCondition(
    fieldValue: unknown,
    operator: string,
    expectedValue: unknown,
  ): boolean {
    switch (operator) {
      case 'eq':
        return fieldValue === expectedValue;
      case 'ne':
        return fieldValue !== expectedValue;
      case 'gt':
        return (
          typeof fieldValue === 'number' &&
          typeof expectedValue === 'number' &&
          fieldValue > expectedValue
        );
      case 'gte':
        return (
          typeof fieldValue === 'number' &&
          typeof expectedValue === 'number' &&
          fieldValue >= expectedValue
        );
      case 'lt':
        return (
          typeof fieldValue === 'number' &&
          typeof expectedValue === 'number' &&
          fieldValue < expectedValue
        );
      case 'lte':
        return (
          typeof fieldValue === 'number' &&
          typeof expectedValue === 'number' &&
          fieldValue <= expectedValue
        );
      case 'in':
        return (
          Array.isArray(expectedValue) && expectedValue.includes(fieldValue)
        );
      case 'nin':
        return (
          Array.isArray(expectedValue) && !expectedValue.includes(fieldValue)
        );
      default:
        return true; // Unknown operator defaults to true
    }
  }

  private isVpnConnection(ipAddress: string): boolean {
    // Simplified VPN detection - in real implementation, check against VPN IP ranges
    return (
      ipAddress.startsWith('10.') ||
      ipAddress.startsWith('192.168.') ||
      ipAddress.startsWith('172.')
    );
  }

  private isCorporateNetwork(ipAddress: string): boolean {
    // Simplified corporate network detection
    return ipAddress.startsWith('10.0.') || ipAddress.startsWith('192.168.1.');
  }

  private hasMfaToken(context: EnhancedPermissionContext): boolean {
    // Check if user has valid MFA token in session
    return context.userContext?.sessionId ? true : false;
  }

  private isTrustedDevice(context: EnhancedPermissionContext): boolean {
    // Check if device is in trusted devices list
    return context.userContext?.deviceFingerprint ? true : false;
  }

  private hasRequiredApproval(_context: EnhancedPermissionContext): boolean {
    // Check if required approval exists for this action
    return false; // Simplified - would check approval records
  }

  private hasCompletedWorkflow(_context: EnhancedPermissionContext): boolean {
    // Check if required workflow is completed
    return false; // Simplified - would check workflow status
  }

  private hasPendingReview(_context: EnhancedPermissionContext): boolean {
    // Check if there are pending reviews that block access
    return false; // Simplified - would check review status
  }

  private exceedsDailyLimit(
    _context: EnhancedPermissionContext,
    _maxDaily: number,
  ): boolean {
    // Check if user has exceeded daily access limit
    return false; // Simplified - would check access logs
  }

  private hasClientCertificate(_context: EnhancedPermissionContext): boolean {
    // Check if client has valid certificate
    return false; // Simplified - would check certificate
  }

  private exceedsConcurrentDeviceLimit(
    _context: EnhancedPermissionContext,
    _maxDevices: number,
  ): boolean {
    // Check if user has too many concurrent devices
    return false; // Simplified - would check active sessions
  }

  private exceedsConcurrentSessionLimit(
    _context: EnhancedPermissionContext,
    _maxSessions: number,
  ): boolean {
    // Check if user has too many concurrent sessions
    return false; // Simplified - would check active sessions
  }

  private getCountryFromIp(_ipAddress: string): string {
    // Simplified country detection from IP
    return 'VN'; // Default to Vietnam
  }

  private determineEvaluationMode(
    confidence: number,
    context: EnhancedPermissionContext,
  ): DynamicConditionsEvaluation['metadata']['evaluationMode'] {
    const userRoles = context.userContext?.roles || [];
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
    // Always execute dynamic conditions check
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
      STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.DYNAMIC_CONDITIONS]
        ?.estimatedExecutionTime || 600
    );
  }

  /**
   * Check if step execution time exceeds threshold
   */
  isPerformanceOptimal(executionTime: number): boolean {
    const threshold =
      STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.DYNAMIC_CONDITIONS]
        ?.maxExecutionTime || 6000;

    return executionTime <= threshold;
  }
}
