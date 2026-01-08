import { Injectable, Logger } from '@nestjs/common';

import { IsNull, LessThanOrEqual, QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { PERMISSION_TEMPLATE_LOG_CONTEXT } from 'src/mkt-core/mkt-permission-template/constants';
import { MktUserPermissionTemplateWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

/**
 * Repository for MktUserPermissionTemplateWorkspaceEntity
 * Handles database operations for user permission template assignments
 */
@Injectable()
export class MktUserPermissionTemplateRepository {
  private readonly logger = new Logger(PERMISSION_TEMPLATE_LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  private async getRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktUserPermissionTemplateWorkspaceEntity>(
      workspaceId,
      'mktUserPermissionTemplate',
    );
  }

  /**
   * Find assignment by ID
   */
  async findById(
    workspaceId: string,
    assignmentId: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: {
        id: assignmentId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Find all assignments for a user
   */
  async findByWorkspaceMemberId(
    workspaceId: string,
    workspaceMemberId: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        workspaceMemberId,
        deletedAt: IsNull(),
      },
      order: {
        assignedAt: 'DESC',
      },
    });
  }

  /**
   * Find active assignments for a user
   */
  async findActiveByWorkspaceMemberId(
    workspaceId: string,
    workspaceMemberId: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        workspaceMemberId,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: {
        assignedAt: 'DESC',
      },
    });
  }

  /**
   * Find all users assigned to a template
   */
  async findByTemplateId(
    workspaceId: string,
    templateId: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        templateId,
        deletedAt: IsNull(),
      },
      order: {
        assignedAt: 'DESC',
      },
    });
  }

  /**
   * Find active users assigned to a template
   */
  async findActiveByTemplateId(
    workspaceId: string,
    templateId: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        templateId,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: {
        assignedAt: 'DESC',
      },
    });
  }

  /**
   * Find assignment by user and template
   */
  async findByWorkspaceMemberAndTemplate(
    workspaceId: string,
    workspaceMemberId: string,
    templateId: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: {
        workspaceMemberId,
        templateId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Find expired assignments
   */
  async findExpired(
    workspaceId: string,
    atDate?: Date,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);
    const checkDate = atDate ?? new Date();

    return repository.find({
      where: {
        isActive: true,
        expiresAt: LessThanOrEqual(checkDate),
        deletedAt: IsNull(),
      },
      order: {
        expiresAt: 'ASC',
      },
    });
  }

  /**
   * Find assignments expiring soon
   */
  async findExpiringSoon(
    workspaceId: string,
    daysAhead: number,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);
    const now = new Date();
    const futureDate = new Date();

    futureDate.setDate(futureDate.getDate() + daysAhead);

    return repository
      .createQueryBuilder('assignment')
      .where('assignment.isActive = :isActive', { isActive: true })
      .andWhere('assignment.deletedAt IS NULL')
      .andWhere('assignment.expiresAt IS NOT NULL')
      .andWhere('assignment.expiresAt > :now', { now })
      .andWhere('assignment.expiresAt <= :futureDate', { futureDate })
      .orderBy('assignment.expiresAt', 'ASC')
      .getMany();
  }

  /**
   * Check if user has template assigned
   */
  async hasTemplateAssigned(
    workspaceId: string,
    workspaceMemberId: string,
    templateId: string,
  ): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const count = await repository.count({
      where: {
        workspaceMemberId,
        templateId,
        isActive: true,
        deletedAt: IsNull(),
      },
    });

    return count > 0;
  }

  /**
   * Create a new assignment
   */
  async create(
    workspaceId: string,
    data: Partial<MktUserPermissionTemplateWorkspaceEntity>,
    queryRunner?: QueryRunner,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);

    const assignment = repository.create({
      ...data,
      assignedAt: data.assignedAt ?? new Date(),
    });

    let savedAssignment: MktUserPermissionTemplateWorkspaceEntity;

    if (queryRunner) {
      savedAssignment = await queryRunner.manager.save(assignment);
    } else {
      savedAssignment = await repository.save(assignment);
    }

    this.logger.log(
      `Assigned template ${savedAssignment.templateId} to user ${savedAssignment.workspaceMemberId}`,
    );

    return savedAssignment;
  }

  /**
   * Create multiple assignments at once
   */
  async createMany(
    workspaceId: string,
    assignmentsData: Array<Partial<MktUserPermissionTemplateWorkspaceEntity>>,
    queryRunner?: QueryRunner,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity[]> {
    if (assignmentsData.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    const assignments = assignmentsData.map((data) =>
      repository.create({
        ...data,
        assignedAt: data.assignedAt ?? new Date(),
      }),
    );

    let savedAssignments: MktUserPermissionTemplateWorkspaceEntity[];

    if (queryRunner) {
      savedAssignments = await queryRunner.manager.save(assignments);
    } else {
      savedAssignments = await repository.save(assignments);
    }

    this.logger.log(`Created ${savedAssignments.length} assignments in bulk`);

    return savedAssignments;
  }

  /**
   * Update assignment
   */
  async update(
    workspaceId: string,
    assignmentId: string,
    data: Partial<MktUserPermissionTemplateWorkspaceEntity>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.update(
      'MktUserPermissionTemplateWorkspaceEntity',
      { id: assignmentId },
      data,
    );

    this.logger.log(`Updated user permission assignment ${assignmentId}`);
  }

  /**
   * Update assignment status
   */
  async updateStatus(
    workspaceId: string,
    assignmentId: string,
    isActive: boolean,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    await this.update(workspaceId, assignmentId, { isActive }, queryRunner);
  }

  /**
   * Deactivate assignments by template ID
   */
  async deactivateByTemplateId(
    workspaceId: string,
    templateId: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.update(
      'MktUserPermissionTemplateWorkspaceEntity',
      { templateId, isActive: true },
      { isActive: false },
    );

    this.logger.log(`Deactivated all assignments for template ${templateId}`);
  }

  /**
   * Soft delete assignment
   */
  async softDelete(
    workspaceId: string,
    id: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.softDelete('MktUserPermissionTemplateWorkspaceEntity', id);

    this.logger.log(`Soft deleted user permission assignment ${id}`);
  }
}
