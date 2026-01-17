/**
 * UserPermissionTemplateService - Business logic for User Template Assignments
 *
 * Provides operations for assigning, revoking, and managing permission
 * template assignments to workspace members.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  MktUserPermissionTemplateRepository,
  MktPermissionTemplateRepository,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { MktUserPermissionTemplateWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import { RbacCacheService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-cache.service';
import { USER_ASSIGNMENT_MESSAGES } from 'src/mkt-core/mkt-rbac-enterprise-grade/message';
import {
  AssignTemplateInput,
  BulkAssignTemplateInput,
  UpdateAssignmentInput,
  UserAssignmentSummary,
  TemplateUsageStats,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types';

// ============================================
// SERVICE
// ============================================

@Injectable()
export class UserPermissionTemplateService {
  private readonly logger = new Logger(UserPermissionTemplateService.name);

  constructor(
    private readonly assignmentRepository: MktUserPermissionTemplateRepository,
    private readonly templateRepository: MktPermissionTemplateRepository,
    private readonly cacheService: RbacCacheService,
  ) {}

  // ============================================
  // ASSIGNMENT OPERATIONS
  // ============================================

  /**
   * Assign a permission template to a user
   */
  async assignTemplate(
    workspaceId: string,
    input: AssignTemplateInput,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity> {
    const {
      workspaceMemberId,
      templateId,
      assignedById,
      expiresAt,
      assignmentReason,
    } = input;

    // Validate template exists
    const template = await this.templateRepository.findById(templateId);

    if (!template) {
      throw new NotFoundException(
        USER_ASSIGNMENT_MESSAGES.TEMPLATE_NOT_FOUND(templateId),
      );
    }

    // Check if already assigned
    const existing =
      await this.assignmentRepository.findByWorkspaceMemberAndTemplate(
        workspaceId,
        workspaceMemberId,
        templateId,
      );

    if (existing) {
      throw new BadRequestException(
        USER_ASSIGNMENT_MESSAGES.ALREADY_ASSIGNED(
          workspaceMemberId,
          templateId,
        ),
      );
    }

    // Validate expiry date
    const currentDate = DateTimeUtils.toDate(DateTimeUtils.now()) ?? new Date();

    if (expiresAt && expiresAt <= currentDate) {
      throw new BadRequestException(USER_ASSIGNMENT_MESSAGES.INVALID_EXPIRY);
    }

    // Create assignment
    const assignment = await this.assignmentRepository.create({
      workspaceMemberId,
      templateId,
      assignedById,
      expiresAt,
      assignmentReason: assignmentReason ?? '',
      assignedAt: currentDate,
      isActive: true,
    });

    this.logger.log(
      USER_ASSIGNMENT_MESSAGES.ASSIGNED(
        workspaceMemberId,
        template.templateKey,
      ),
    );

    // Invalidate cache for this user
    await this.invalidateUserCache(workspaceId, workspaceMemberId);

    return assignment;
  }

  /**
   * Assign a template to multiple users at once
   */
  async bulkAssignTemplate(
    workspaceId: string,
    input: BulkAssignTemplateInput,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity[]> {
    const {
      workspaceMemberIds,
      templateId,
      assignedById,
      expiresAt,
      assignmentReason,
    } = input;

    // Validate template exists
    const template = await this.templateRepository.findById(templateId);

    if (!template) {
      throw new NotFoundException(
        USER_ASSIGNMENT_MESSAGES.TEMPLATE_NOT_FOUND(templateId),
      );
    }

    // Validate expiry date
    const now = DateTimeUtils.toDate(DateTimeUtils.now()) ?? new Date();

    if (expiresAt && expiresAt <= now) {
      throw new BadRequestException(USER_ASSIGNMENT_MESSAGES.INVALID_EXPIRY);
    }

    const assignments: MktUserPermissionTemplateWorkspaceEntity[] = [];

    for (const memberId of workspaceMemberIds) {
      // Skip if already assigned
      const existing =
        await this.assignmentRepository.findByWorkspaceMemberAndTemplate(
          workspaceId,
          memberId,
          templateId,
        );

      if (existing) {
        this.logger.debug(
          `Skipping ${memberId} - already has template ${templateId}`,
        );
        continue;
      }

      // Create assignment
      const assignment = await this.assignmentRepository.create({
        workspaceMemberId: memberId,
        templateId,
        assignedById,
        expiresAt,
        assignmentReason: assignmentReason ?? '',
        assignedAt: now,
        isActive: true,
      });

      assignments.push(assignment);

      // Invalidate cache for this user
      await this.invalidateUserCache(workspaceId, memberId);
    }

    this.logger.log(
      `Bulk assigned template ${template.templateKey} to ${assignments.length} members`,
    );

    return assignments;
  }

  /**
   * Revoke a template assignment
   */
  async revokeAssignment(
    workspaceId: string,
    assignmentId: string,
  ): Promise<void> {
    const assignment = await this.assignmentRepository.findWithRelations(
      workspaceId,
      assignmentId,
    );

    if (!assignment) {
      throw new NotFoundException(
        USER_ASSIGNMENT_MESSAGES.NOT_FOUND(assignmentId),
      );
    }

    // Soft delete by setting isActive = false
    await this.assignmentRepository.updateIsActive(assignmentId, false);

    this.logger.log(USER_ASSIGNMENT_MESSAGES.REVOKED(assignmentId));

    // Invalidate cache
    await this.invalidateUserCache(workspaceId, assignment.workspaceMemberId);
  }

  /**
   * Revoke all templates from a user
   */
  async revokeAllFromUser(
    workspaceId: string,
    workspaceMemberId: string,
  ): Promise<number> {
    const assignments = await this.assignmentRepository.findByWorkspaceMemberId(
      workspaceId,
      workspaceMemberId,
    );

    let count = 0;

    for (const assignment of assignments) {
      if (assignment.isActive) {
        await this.assignmentRepository.updateIsActive(assignment.id, false);
        count++;
      }
    }

    this.logger.log(
      `Revoked ${count} templates from member ${workspaceMemberId}`,
    );

    // Invalidate cache
    await this.invalidateUserCache(workspaceId, workspaceMemberId);

    return count;
  }

  /**
   * Revoke a specific template from all users
   */
  async revokeTemplateFromAll(
    workspaceId: string,
    templateId: string,
  ): Promise<number> {
    const assignments = await this.assignmentRepository.findByTemplateId(
      workspaceId,
      templateId,
    );

    let count = 0;

    for (const assignment of assignments) {
      if (assignment.isActive) {
        await this.assignmentRepository.updateIsActive(assignment.id, false);
        await this.invalidateUserCache(
          workspaceId,
          assignment.workspaceMemberId,
        );
        count++;
      }
    }

    this.logger.log(`Revoked template ${templateId} from ${count} members`);

    return count;
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update an assignment
   */
  async updateAssignment(
    workspaceId: string,
    assignmentId: string,
    input: UpdateAssignmentInput,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity> {
    const assignment = await this.assignmentRepository.findWithRelations(
      workspaceId,
      assignmentId,
    );

    if (!assignment) {
      throw new NotFoundException(
        USER_ASSIGNMENT_MESSAGES.NOT_FOUND(assignmentId),
      );
    }

    // Validate expiry date if provided
    const currentDate = DateTimeUtils.toDate(DateTimeUtils.now()) ?? new Date();

    if (input.expiresAt && input.expiresAt <= currentDate) {
      throw new BadRequestException(USER_ASSIGNMENT_MESSAGES.INVALID_EXPIRY);
    }

    // Update assignment - convert null to undefined for TypeORM compatibility
    const updateData: Partial<MktUserPermissionTemplateWorkspaceEntity> = {
      ...(input.expiresAt !== undefined && {
        expiresAt: input.expiresAt ?? undefined,
      }),
      ...(input.assignmentReason !== undefined && {
        assignmentReason: input.assignmentReason,
      }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    };

    await this.assignmentRepository.update(assignmentId, updateData);

    this.logger.log(USER_ASSIGNMENT_MESSAGES.UPDATED(assignmentId));

    // Invalidate cache
    await this.invalidateUserCache(workspaceId, assignment.workspaceMemberId);

    // Return updated
    const updated = await this.assignmentRepository.findWithRelations(
      workspaceId,
      assignmentId,
    );

    if (!updated) {
      throw new NotFoundException(
        USER_ASSIGNMENT_MESSAGES.NOT_FOUND(assignmentId),
      );
    }

    return updated;
  }

  /**
   * Extend assignment expiry
   */
  async extendExpiry(
    workspaceId: string,
    assignmentId: string,
    newExpiresAt: Date,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity> {
    return this.updateAssignment(workspaceId, assignmentId, {
      expiresAt: newExpiresAt,
    });
  }

  /**
   * Remove expiry (make permanent)
   */
  async removeExpiry(
    workspaceId: string,
    assignmentId: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity> {
    return this.updateAssignment(workspaceId, assignmentId, {
      expiresAt: null,
    });
  }

  // ============================================
  // QUERY OPERATIONS
  // ============================================

  /**
   * Get assignment by ID
   */
  async getAssignmentById(
    workspaceId: string,
    id: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity | null> {
    return this.assignmentRepository.findWithRelations(workspaceId, id);
  }

  /**
   * Get all assignments for a user
   */
  async getUserAssignments(
    workspaceId: string,
    workspaceMemberId: string,
    includeInactive = false,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity[]> {
    if (includeInactive) {
      const repository =
        await this.assignmentRepository.getRepository(workspaceId);

      return repository.find({
        where: { workspaceMemberId },
        relations: ['template'],
      });
    }

    return this.assignmentRepository.findByWorkspaceMemberId(
      workspaceId,
      workspaceMemberId,
    );
  }

  /**
   * Get active (non-expired) assignments for a user
   */
  async getActiveUserAssignments(
    workspaceId: string,
    workspaceMemberId: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity[]> {
    return this.assignmentRepository.findActiveByWorkspaceMemberId(
      workspaceId,
      workspaceMemberId,
    );
  }

  /**
   * Get assignment summary for a user
   */
  async getUserAssignmentSummary(
    workspaceId: string,
    workspaceMemberId: string,
  ): Promise<UserAssignmentSummary> {
    const assignments = await this.getUserAssignments(
      workspaceId,
      workspaceMemberId,
      true,
    );

    const now = DateTimeUtils.toDate(DateTimeUtils.now()) ?? new Date();

    const mappedAssignments = assignments.map((a) => {
      const isExpired = a.expiresAt ? a.expiresAt <= now : false;

      return {
        id: a.id,
        templateId: a.templateId,
        templateKey: a.template?.templateKey ?? '',
        templateName: a.template?.templateName ?? '',
        hierarchyLevel: a.template?.hierarchyLevel ?? undefined,
        assignedAt: a.assignedAt,
        expiresAt: a.expiresAt,
        isActive: a.isActive,
        isExpired,
      };
    });

    return {
      workspaceMemberId,
      assignments: mappedAssignments,
      activeCount: mappedAssignments.filter((a) => a.isActive && !a.isExpired)
        .length,
      expiredCount: mappedAssignments.filter((a) => a.isExpired).length,
    };
  }

  /**
   * Get all users assigned to a template
   */
  async getTemplateUsers(
    workspaceId: string,
    templateId: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity[]> {
    return this.assignmentRepository.findByTemplateId(workspaceId, templateId);
  }

  /**
   * Get template usage statistics
   */
  async getTemplateUsageStats(
    workspaceId: string,
    templateId: string,
  ): Promise<TemplateUsageStats> {
    const template = await this.templateRepository.findById(templateId);

    if (!template) {
      throw new NotFoundException(
        USER_ASSIGNMENT_MESSAGES.TEMPLATE_NOT_FOUND(templateId),
      );
    }

    const assignments = await this.assignmentRepository.findByTemplateId(
      workspaceId,
      templateId,
    );

    const now = DateTimeUtils.toDate(DateTimeUtils.now()) ?? new Date();

    const activeAssignments = assignments.filter(
      (a) => a.isActive && (!a.expiresAt || a.expiresAt > now),
    );
    const expiredAssignments = assignments.filter(
      (a) => a.expiresAt && a.expiresAt <= now,
    );

    return {
      templateId,
      templateKey: template.templateKey,
      totalAssignments: assignments.length,
      activeAssignments: activeAssignments.length,
      expiredAssignments: expiredAssignments.length,
    };
  }

  /**
   * Check if user has a specific template
   */
  async userHasTemplate(
    workspaceId: string,
    workspaceMemberId: string,
    templateId: string,
  ): Promise<boolean> {
    const assignment =
      await this.assignmentRepository.findByWorkspaceMemberAndTemplate(
        workspaceId,
        workspaceMemberId,
        templateId,
      );

    if (!assignment) {
      return false;
    }

    // Check if expired
    if (assignment.expiresAt) {
      const now = DateTimeUtils.toDate(DateTimeUtils.now()) ?? new Date();

      return assignment.isActive && assignment.expiresAt > now;
    }

    return assignment.isActive;
  }

  // ============================================
  // EXPIRY MANAGEMENT
  // ============================================

  /**
   * Deactivate all expired assignments
   */
  async deactivateExpiredAssignments(workspaceId: string): Promise<number> {
    const count =
      await this.assignmentRepository.deactivateExpired(workspaceId);

    this.logger.log(USER_ASSIGNMENT_MESSAGES.EXPIRED_DEACTIVATED(count));

    // Invalidate workspace cache if any were deactivated
    if (count > 0) {
      await this.cacheService.invalidateWorkspace(workspaceId);
    }

    return count;
  }

  /**
   * Get expired assignments (for reporting)
   */
  async getExpiredAssignments(
    workspaceId: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity[]> {
    return this.assignmentRepository.findExpired(workspaceId);
  }

  /**
   * Get assignments expiring soon
   */
  async getExpiringSoon(
    workspaceId: string,
    daysAhead: number,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity[]> {
    const futureDate =
      DateTimeUtils.toDate(
        DateTimeUtils.add(DateTimeUtils.now(), { days: daysAhead }),
      ) ?? new Date();

    const allActive = await this.assignmentRepository.findActive(workspaceId);

    return allActive.filter((a) => a.expiresAt && a.expiresAt <= futureDate);
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Invalidate cache for a specific user
   */
  private async invalidateUserCache(
    workspaceId: string,
    workspaceMemberId: string,
  ): Promise<void> {
    // Get the userId from workspaceMemberId if needed
    // For now, we'll invalidate the workspace cache
    // A more precise approach would be to get the userId and invalidate just that user
    await this.cacheService.invalidateWorkspace(workspaceId);
    this.logger.debug(
      USER_ASSIGNMENT_MESSAGES.CACHE_INVALIDATED(
        workspaceId,
        workspaceMemberId,
      ),
    );
  }
}
