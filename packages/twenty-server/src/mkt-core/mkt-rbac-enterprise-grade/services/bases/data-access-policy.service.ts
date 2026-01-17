/**
 * DataAccessPolicyService - Business logic for Data Access Policies
 *
 * Provides CRUD operations and business logic for managing data access policies.
 * Supports row-level, field-level, and column-level security policies.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { MktDataAccessPolicyRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { MktDataAccessPolicyWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import {
  DataAccessPolicyType,
  EvaluationMode,
  RiskLevel,
  ConflictResolution,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';
import { RbacCacheService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-cache.service';
import { DATA_ACCESS_POLICY_MESSAGES } from 'src/mkt-core/mkt-rbac-enterprise-grade/message';
import {
  CreatePolicyInput,
  UpdatePolicyInput,
  PolicyQueryOptions,
  PolicyListResult,
  FilterConditions,
  ServicePolicyEvaluationContext,
  ServicePolicyEvaluationResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types';

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_PRIORITY = 100;

// ============================================
// SERVICE
// ============================================

@Injectable()
export class DataAccessPolicyService {
  private readonly logger = new Logger(DataAccessPolicyService.name);

  constructor(
    private readonly policyRepository: MktDataAccessPolicyRepository,
    private readonly cacheService: RbacCacheService,
  ) {}

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create a new data access policy
   */
  async createPolicy(
    workspaceId: string,
    input: CreatePolicyInput,
  ): Promise<MktDataAccessPolicyWorkspaceEntity> {
    // Validate filter conditions
    if (!this.validateFilterConditions(input.filterConditions)) {
      throw new BadRequestException(DATA_ACCESS_POLICY_MESSAGES.INVALID_FILTER);
    }

    // Check for duplicate name + objectName combination
    const existing = await this.findByNameAndObject(
      workspaceId,
      input.name,
      input.objectName,
    );

    if (existing) {
      throw new BadRequestException(
        DATA_ACCESS_POLICY_MESSAGES.DUPLICATE_NAME(
          input.name,
          input.objectName,
        ),
      );
    }

    // Create policy
    const policy = await this.policyRepository.create({
      name: input.name,
      description: input.description,
      objectName: input.objectName,
      filterConditions: input.filterConditions,
      departmentId: input.departmentId,
      specificMemberId: input.specificMemberId,
      organizationLevelId: input.organizationLevelId,
      permissionTemplateId: input.permissionTemplateId,
      policyType: input.policyType ?? DataAccessPolicyType.ROW_LEVEL,
      evaluationMode: input.evaluationMode ?? EvaluationMode.BALANCED,
      riskLevel: input.riskLevel ?? RiskLevel.LOW,
      conflictResolution:
        input.conflictResolution ?? ConflictResolution.DENY_WINS,
      priority: input.priority ?? DEFAULT_PRIORITY,
      isActive: input.isActive ?? true,
    });

    this.logger.log(DATA_ACCESS_POLICY_MESSAGES.CREATED(input.name));

    // Invalidate cache
    await this.invalidateCache(workspaceId);

    return policy;
  }

  /**
   * Create multiple policies at once
   */
  async createPolicies(
    workspaceId: string,
    inputs: CreatePolicyInput[],
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    const policies: MktDataAccessPolicyWorkspaceEntity[] = [];

    for (const input of inputs) {
      const policy = await this.createPolicy(workspaceId, input);

      policies.push(policy);
    }

    return policies;
  }

  // ============================================
  // READ OPERATIONS
  // ============================================

  /**
   * Get policy by ID
   */
  async getPolicyById(
    workspaceId: string,
    id: string,
    options?: PolicyQueryOptions,
  ): Promise<MktDataAccessPolicyWorkspaceEntity | null> {
    if (options?.includeRelations) {
      return this.policyRepository.findWithRelations(workspaceId, id);
    }

    return this.policyRepository.findById(id);
  }

  /**
   * Get policy by ID or throw
   */
  async getPolicyByIdOrThrow(
    workspaceId: string,
    id: string,
    options?: PolicyQueryOptions,
  ): Promise<MktDataAccessPolicyWorkspaceEntity> {
    const policy = await this.getPolicyById(workspaceId, id, options);

    if (!policy) {
      throw new NotFoundException(DATA_ACCESS_POLICY_MESSAGES.NOT_FOUND(id));
    }

    return policy;
  }

  /**
   * List policies with filtering
   */
  async listPolicies(
    workspaceId: string,
    options?: PolicyQueryOptions,
  ): Promise<PolicyListResult> {
    let policies: MktDataAccessPolicyWorkspaceEntity[];

    if (options?.objectName) {
      policies = await this.policyRepository.findByObjectName(
        workspaceId,
        options.objectName,
      );
    } else if (options?.departmentId) {
      policies = await this.policyRepository.findByDepartmentId(
        workspaceId,
        options.departmentId,
      );
    } else if (options?.organizationLevelId) {
      policies = await this.policyRepository.findByOrganizationLevelId(
        workspaceId,
        options.organizationLevelId,
      );
    } else if (options?.policyType) {
      policies = await this.policyRepository.findByDataAccessPolicyType(
        workspaceId,
        options.policyType,
      );
    } else if (options?.riskLevel) {
      policies = await this.policyRepository.findByRiskLevel(
        workspaceId,
        options.riskLevel,
      );
    } else if (options?.includeInactive) {
      policies = await this.policyRepository.findMany({});
    } else {
      policies = await this.policyRepository.findActive(workspaceId);
    }

    return {
      policies,
      total: policies.length,
    };
  }

  /**
   * Get active policies for a specific object
   */
  async getActivePoliciesForObject(
    workspaceId: string,
    objectName: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    return this.policyRepository.findByObjectName(workspaceId, objectName);
  }

  /**
   * Get policies applicable to a member
   */
  async getPoliciesForMember(
    workspaceId: string,
    memberId: string,
    objectName: string,
    departmentId?: string,
    organizationLevelId?: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    return this.policyRepository.findForMemberAndObject(
      workspaceId,
      memberId,
      objectName,
      departmentId,
      organizationLevelId,
    );
  }

  /**
   * Get high-risk policies
   */
  async getHighRiskPolicies(
    workspaceId: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    const highRisk = await this.policyRepository.findByRiskLevel(
      workspaceId,
      RiskLevel.HIGH,
    );
    const critical = await this.policyRepository.findByRiskLevel(
      workspaceId,
      RiskLevel.CRITICAL,
    );

    return [...critical, ...highRisk];
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update a policy
   */
  async updatePolicy(
    workspaceId: string,
    id: string,
    input: UpdatePolicyInput,
  ): Promise<MktDataAccessPolicyWorkspaceEntity> {
    const policy = await this.getPolicyByIdOrThrow(workspaceId, id);

    // Validate filter conditions if provided
    if (input.filterConditions) {
      if (!this.validateFilterConditions(input.filterConditions)) {
        throw new BadRequestException(
          DATA_ACCESS_POLICY_MESSAGES.INVALID_FILTER,
        );
      }
    }

    // Check for duplicate name if name is being changed
    if (input.name && input.name !== policy.name) {
      const objectName = policy.objectName;
      const existing = await this.findByNameAndObject(
        workspaceId,
        input.name,
        objectName,
      );

      if (existing && existing.id !== id) {
        throw new BadRequestException(
          DATA_ACCESS_POLICY_MESSAGES.DUPLICATE_NAME(input.name, objectName),
        );
      }
    }

    // Update policy
    await this.policyRepository.update(id, input);

    this.logger.log(DATA_ACCESS_POLICY_MESSAGES.UPDATED(id));

    // Invalidate cache
    await this.invalidateCache(workspaceId);

    // Return updated policy
    return this.getPolicyByIdOrThrow(workspaceId, id);
  }

  /**
   * Activate a policy
   */
  async activatePolicy(
    workspaceId: string,
    id: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity> {
    await this.getPolicyByIdOrThrow(workspaceId, id);
    await this.policyRepository.updateIsActive(id, true);

    this.logger.log(DATA_ACCESS_POLICY_MESSAGES.ACTIVATED(id));
    await this.invalidateCache(workspaceId);

    return this.getPolicyByIdOrThrow(workspaceId, id);
  }

  /**
   * Deactivate a policy
   */
  async deactivatePolicy(
    workspaceId: string,
    id: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity> {
    await this.getPolicyByIdOrThrow(workspaceId, id);
    await this.policyRepository.updateIsActive(id, false);

    this.logger.log(DATA_ACCESS_POLICY_MESSAGES.DEACTIVATED(id));
    await this.invalidateCache(workspaceId);

    return this.getPolicyByIdOrThrow(workspaceId, id);
  }

  /**
   * Update policy priority
   */
  async updatePriority(
    workspaceId: string,
    id: string,
    priority: number,
  ): Promise<MktDataAccessPolicyWorkspaceEntity> {
    return this.updatePolicy(workspaceId, id, { priority });
  }

  /**
   * Update policy risk level
   */
  async updateRiskLevel(
    workspaceId: string,
    id: string,
    riskLevel: RiskLevel,
  ): Promise<MktDataAccessPolicyWorkspaceEntity> {
    return this.updatePolicy(workspaceId, id, { riskLevel });
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Delete a policy (soft delete via isActive = false)
   */
  async deletePolicy(workspaceId: string, id: string): Promise<void> {
    await this.getPolicyByIdOrThrow(workspaceId, id);
    await this.policyRepository.softDelete(id);

    this.logger.log(DATA_ACCESS_POLICY_MESSAGES.DELETED(id));
    await this.invalidateCache(workspaceId);
  }

  /**
   * Hard delete a policy (permanent removal)
   */
  async hardDeletePolicy(workspaceId: string, id: string): Promise<void> {
    await this.getPolicyByIdOrThrow(workspaceId, id);
    await this.policyRepository.hardDelete(workspaceId, id);

    this.logger.log(`Policy hard deleted: ${id}`);
    await this.invalidateCache(workspaceId);
  }

  // ============================================
  // CLONE OPERATIONS
  // ============================================

  /**
   * Clone a policy with a new name
   */
  async clonePolicy(
    workspaceId: string,
    sourceId: string,
    newName: string,
    targetObjectName?: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity> {
    const source = await this.getPolicyByIdOrThrow(workspaceId, sourceId, {
      includeRelations: true,
    });

    const objectName = targetObjectName ?? source.objectName;

    return this.createPolicy(workspaceId, {
      name: newName,
      description: source.description
        ? `Clone of ${source.name}: ${source.description}`
        : `Clone of ${source.name}`,
      objectName,
      filterConditions: source.filterConditions as FilterConditions,
      departmentId: source.departmentId ?? undefined,
      specificMemberId: source.specificMemberId ?? undefined,
      organizationLevelId: source.organizationLevelId ?? undefined,
      permissionTemplateId: source.permissionTemplateId ?? undefined,
      policyType: source.policyType,
      evaluationMode: source.evaluationMode,
      riskLevel: source.riskLevel,
      conflictResolution: source.conflictResolution,
      priority: source.priority,
      isActive: true,
    });
  }

  // ============================================
  // POLICY EVALUATION
  // ============================================

  /**
   * Evaluate policies for a given context
   */
  async evaluatePolicies(
    context: ServicePolicyEvaluationContext,
  ): Promise<ServicePolicyEvaluationResult> {
    const policies = await this.getPoliciesForMember(
      context.workspaceId,
      context.workspaceMemberId,
      context.objectName,
      context.departmentId,
      context.organizationLevelId,
    );

    if (policies.length === 0) {
      return {
        allowed: true,
        appliedPolicies: [],
        filterConditions: null,
      };
    }

    // Sort policies by priority (highest first)
    const sortedPolicies = [...policies].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
    );

    // Merge filter conditions from all applicable policies
    const mergedConditions = this.mergePolicyFilters(sortedPolicies);

    return {
      allowed: true,
      appliedPolicies: sortedPolicies,
      filterConditions: mergedConditions,
    };
  }

  /**
   * Merge filter conditions from multiple policies
   */
  private mergePolicyFilters(
    policies: MktDataAccessPolicyWorkspaceEntity[],
  ): FilterConditions {
    const merged: FilterConditions = {
      type: 'AND',
      conditions: [],
    };

    for (const policy of policies) {
      const conditions = policy.filterConditions as FilterConditions;

      if (conditions.conditions && Array.isArray(conditions.conditions)) {
        merged.conditions = [
          ...(merged.conditions ?? []),
          ...conditions.conditions,
        ];
      }

      // Merge other filter properties
      if (conditions.ownership) {
        merged.ownership = conditions.ownership;
      }
      if (conditions.timeRange) {
        merged.timeRange = conditions.timeRange;
      }
      if (conditions.status) {
        merged.status = {
          allowedValues: [
            ...(merged.status?.allowedValues ?? []),
            ...(conditions.status.allowedValues ?? []),
          ],
          deniedValues: [
            ...(merged.status?.deniedValues ?? []),
            ...(conditions.status.deniedValues ?? []),
          ],
        };
      }
    }

    return merged;
  }

  // ============================================
  // VALIDATION
  // ============================================

  /**
   * Validate filter conditions structure
   */
  private validateFilterConditions(conditions: FilterConditions): boolean {
    if (!conditions || typeof conditions !== 'object') {
      return false;
    }

    // Basic validation - conditions can be complex JSON objects
    // Just ensure it's not empty
    return Object.keys(conditions).length > 0;
  }

  /**
   * Check if policy name is available for an object
   */
  async isPolicyNameAvailable(
    workspaceId: string,
    name: string,
    objectName: string,
    excludeId?: string,
  ): Promise<boolean> {
    const existing = await this.findByNameAndObject(
      workspaceId,
      name,
      objectName,
    );

    if (!existing) {
      return true;
    }

    return excludeId ? existing.id === excludeId : false;
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get policy statistics for a workspace
   */
  async getPolicyStatistics(workspaceId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    byPolicyType: Record<string, number>;
    byRiskLevel: Record<string, number>;
    byObject: Record<string, number>;
  }> {
    const allPolicies = await this.policyRepository.findMany({});
    const activePolicies = await this.policyRepository.findActive(workspaceId);

    const byPolicyType: Record<string, number> = {};
    const byRiskLevel: Record<string, number> = {};
    const byObject: Record<string, number> = {};

    for (const policy of allPolicies) {
      // Count by policy type
      const policyType = policy.policyType;

      byPolicyType[policyType] = (byPolicyType[policyType] ?? 0) + 1;

      // Count by risk level
      const riskLevel = policy.riskLevel;

      byRiskLevel[riskLevel] = (byRiskLevel[riskLevel] ?? 0) + 1;

      // Count by object name
      const objectName = policy.objectName;

      byObject[objectName] = (byObject[objectName] ?? 0) + 1;
    }

    return {
      total: allPolicies.length,
      active: activePolicies.length,
      inactive: allPolicies.length - activePolicies.length,
      byPolicyType,
      byRiskLevel,
      byObject,
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Find policy by name and object name
   */
  private async findByNameAndObject(
    workspaceId: string,
    name: string,
    objectName: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity | null> {
    const policies = await this.policyRepository.findByObjectName(
      workspaceId,
      objectName,
    );

    return policies.find((p) => p.name === name) ?? null;
  }

  /**
   * Invalidate policy-related cache
   */
  private async invalidateCache(workspaceId: string): Promise<void> {
    await this.cacheService.invalidateWorkspace(workspaceId);
    this.logger.debug(
      DATA_ACCESS_POLICY_MESSAGES.CACHE_INVALIDATED(workspaceId),
    );
  }
}
