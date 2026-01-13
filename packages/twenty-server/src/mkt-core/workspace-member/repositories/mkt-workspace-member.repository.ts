import { Injectable } from '@nestjs/common';

import { FindOptionsWhere, IsNull, DeepPartial } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import {
  MKT_WORKSPACE_MEMBER_LOG_CONTEXT,
  MKT_WORKSPACE_MEMBER_LOG_MESSAGES,
} from 'src/mkt-core/workspace-member/messages';
import {
  DEFAULT_WORKSPACE_MEMBER_RELATIONS,
  FindWorkspaceMemberOptions,
} from 'src/mkt-core/workspace-member/types';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * MktWorkspaceMemberRepository - Data access layer for WorkspaceMember entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 *
 * Responsibilities:
 * - Database operations for WorkspaceMember entity
 * - Query building and execution
 * - Transaction support via QueryRunner
 *
 * Does NOT handle:
 * - Business logic (handled by Service layer)
 * - Validation (handled by Service layer)
 */
@Injectable()
export class MktWorkspaceMemberRepository extends BaseWorkspaceRepository<WorkspaceMemberWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      WorkspaceMemberWorkspaceEntity,
      `${MKT_WORKSPACE_MEMBER_LOG_CONTEXT}:Repository`,
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find workspace member by ID (override for logging)
   */
  async findById(
    workspaceId: string,
    memberId: string,
    options?: FindWorkspaceMemberOptions,
  ): Promise<WorkspaceMemberWorkspaceEntity | null> {
    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.FIND_BY_ID_START(memberId),
    );

    const repository = await this.getRepository(workspaceId);

    const member = await repository.findOne({
      where: { id: memberId },
      relations: options?.relations,
    });

    if (!member) {
      this.logger.debug(
        MKT_WORKSPACE_MEMBER_LOG_MESSAGES.FIND_BY_ID_NOT_FOUND(memberId),
      );

      return null;
    }

    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.FIND_BY_ID_SUCCESS(memberId),
    );

    return member;
  }

  /**
   * Find workspace member by ID with default relations
   */
  async findByIdWithRelations(
    workspaceId: string,
    memberId: string,
  ): Promise<WorkspaceMemberWorkspaceEntity | null> {
    return this.findById(workspaceId, memberId, {
      relations: [...DEFAULT_WORKSPACE_MEMBER_RELATIONS],
    });
  }

  /**
   * Find workspace member by email
   */
  async findByEmail(
    workspaceId: string,
    email: string,
    options?: FindWorkspaceMemberOptions,
  ): Promise<WorkspaceMemberWorkspaceEntity | null> {
    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.FIND_BY_EMAIL_START(email),
    );

    const repository = await this.getRepository(workspaceId);

    const member = await repository.findOne({
      where: { userEmail: email },
      relations: options?.relations,
    });

    if (!member) {
      this.logger.debug(
        MKT_WORKSPACE_MEMBER_LOG_MESSAGES.FIND_BY_EMAIL_NOT_FOUND(email),
      );

      return null;
    }

    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.FIND_BY_EMAIL_SUCCESS(email),
    );

    return member;
  }

  /**
   * Find workspace member by member code
   */
  async findByMemberCode(
    workspaceId: string,
    memberCode: string,
    options?: FindWorkspaceMemberOptions,
  ): Promise<WorkspaceMemberWorkspaceEntity | null> {
    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.FIND_BY_CODE_START(memberCode),
    );

    const repository = await this.getRepository(workspaceId);

    const member = await repository.findOne({
      where: { memberCode },
      relations: options?.relations,
    });

    if (!member) {
      this.logger.debug(
        MKT_WORKSPACE_MEMBER_LOG_MESSAGES.FIND_BY_CODE_NOT_FOUND(memberCode),
      );

      return null;
    }

    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.FIND_BY_CODE_SUCCESS(memberCode),
    );

    return member;
  }

  /**
   * Find workspace member by user ID
   */
  async findByUserId(
    workspaceId: string,
    userId: string,
    options?: FindWorkspaceMemberOptions,
  ): Promise<WorkspaceMemberWorkspaceEntity | null> {
    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.FIND_BY_USER_ID_START(userId),
    );

    const repository = await this.getRepository(workspaceId);

    const member = await repository.findOne({
      where: { userId },
      relations: options?.relations,
    });

    if (!member) {
      this.logger.debug(
        MKT_WORKSPACE_MEMBER_LOG_MESSAGES.FIND_BY_USER_ID_NOT_FOUND(userId),
      );

      return null;
    }

    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.FIND_BY_USER_ID_SUCCESS(userId),
    );

    return member;
  }

  /**
   * Find workspace members by department
   */
  async findByDepartment(
    workspaceId: string,
    departmentId: string,
    options?: FindWorkspaceMemberOptions,
  ): Promise<WorkspaceMemberWorkspaceEntity[]> {
    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.FIND_BY_DEPARTMENT_START(departmentId),
    );

    const repository = await this.getRepository(workspaceId);

    const members = await repository.find({
      where: { departmentId },
      relations: options?.relations,
      order: { position: 'ASC' },
    });

    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.FIND_BY_DEPARTMENT_SUCCESS(
        departmentId,
        members.length,
      ),
    );

    return members;
  }

  /**
   * Find workspace members by team
   */
  async findByTeam(
    workspaceId: string,
    teamId: string,
    options?: FindWorkspaceMemberOptions,
  ): Promise<WorkspaceMemberWorkspaceEntity[]> {
    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.FIND_BY_TEAM_START(teamId),
    );

    const repository = await this.getRepository(workspaceId);

    const members = await repository.find({
      where: { teamId },
      relations: options?.relations,
      order: { position: 'ASC' },
    });

    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.FIND_BY_TEAM_SUCCESS(
        teamId,
        members.length,
      ),
    );

    return members;
  }

  /**
   * Find workspace members by status
   */
  async findByStatus(
    workspaceId: string,
    status: string,
    options?: FindWorkspaceMemberOptions,
  ): Promise<WorkspaceMemberWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { status },
      relations: options?.relations,
      order: { position: 'ASC' },
    });
  }

  /**
   * Find all workspace members
   */
  async findAll(
    workspaceId: string,
    options?: FindWorkspaceMemberOptions,
  ): Promise<WorkspaceMemberWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      relations: options?.relations,
      order: { position: 'ASC' },
    });
  }

  /**
   * Find all active workspace members (not soft-deleted)
   * Used for auto-assignment and statistics
   */
  async findAllActive(
    workspaceId: string,
    options?: FindWorkspaceMemberOptions,
  ): Promise<WorkspaceMemberWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { deletedAt: IsNull() },
      relations: options?.relations,
      order: { position: 'ASC' },
    });
  }

  /**
   * Find workspace members with custom where clause
   */
  async findMany(
    workspaceId: string,
    where: FindOptionsWhere<WorkspaceMemberWorkspaceEntity>,
    options?: FindWorkspaceMemberOptions,
  ): Promise<WorkspaceMemberWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where,
      relations: options?.relations,
      order: { position: 'ASC' },
    });
  }

  /**
   * Check if workspace member exists
   */
  async exists(workspaceId: string, memberId: string): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const count = await repository.count({
      where: { id: memberId },
    });

    return count > 0;
  }

  /**
   * Check if member code exists
   */
  async existsByMemberCode(
    workspaceId: string,
    memberCode: string,
  ): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const count = await repository.count({
      where: { memberCode },
    });

    return count > 0;
  }

  /**
   * Check if email exists in workspace
   */
  async existsByEmail(workspaceId: string, email: string): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const count = await repository.count({
      where: { userEmail: email },
    });

    return count > 0;
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create new workspace member
   */
  async create(
    workspaceId: string,
    data: DeepPartial<WorkspaceMemberWorkspaceEntity>,
  ): Promise<WorkspaceMemberWorkspaceEntity> {
    this.logger.debug(MKT_WORKSPACE_MEMBER_LOG_MESSAGES.CREATE_START());

    const repository = await this.getRepository(workspaceId);

    const member = repository.create(data);

    const savedMember = await repository.save(member);

    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.CREATE_SUCCESS(savedMember.id),
    );

    return savedMember;
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update workspace member by ID
   */
  async update(
    workspaceId: string,
    memberId: string,
    data: DeepPartial<WorkspaceMemberWorkspaceEntity>,
  ): Promise<void> {
    this.logger.debug(MKT_WORKSPACE_MEMBER_LOG_MESSAGES.UPDATE_START(memberId));

    const repository = await this.getRepository(workspaceId);

    await repository.update(memberId, data as never);

    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.UPDATE_SUCCESS(memberId),
    );
  }

  /**
   * Update workspace member status
   */
  async updateStatus(
    workspaceId: string,
    memberId: string,
    status: string,
  ): Promise<void> {
    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.STATUS_UPDATE_START(memberId, status),
    );

    await this.update(workspaceId, memberId, { status });

    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.STATUS_UPDATE_SUCCESS(memberId, status),
    );
  }

  /**
   * Update and return the updated workspace member
   */
  async updateAndReturn(
    workspaceId: string,
    memberId: string,
    data: DeepPartial<WorkspaceMemberWorkspaceEntity>,
  ): Promise<WorkspaceMemberWorkspaceEntity | null> {
    await this.update(workspaceId, memberId, data);

    return this.findById(workspaceId, memberId);
  }

  /**
   * Assign member to department
   */
  async assignToDepartment(
    workspaceId: string,
    memberId: string,
    departmentId: string,
  ): Promise<void> {
    await this.update(workspaceId, memberId, { departmentId });
  }

  /**
   * Assign member to team
   */
  async assignToTeam(
    workspaceId: string,
    memberId: string,
    teamId: string,
  ): Promise<void> {
    await this.update(workspaceId, memberId, { teamId });
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Soft delete workspace member by setting deletedAt timestamp
   */
  async softDelete(workspaceId: string, memberId: string): Promise<void> {
    this.logger.warn(MKT_WORKSPACE_MEMBER_LOG_MESSAGES.DELETE_START(memberId));

    const repository = await this.getRepository(workspaceId);

    await repository.update(memberId, {
      deletedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    } as never);

    this.logger.warn(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.DELETE_SUCCESS(memberId),
    );
  }

  // ============================================
  // AGGREGATION OPERATIONS
  // ============================================

  /**
   * Count workspace members by department
   */
  async countByDepartment(
    workspaceId: string,
    departmentId: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({
      where: { departmentId },
    });
  }

  /**
   * Count workspace members by team
   */
  async countByTeam(workspaceId: string, teamId: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({
      where: { teamId },
    });
  }

  /**
   * Count workspace members by status
   */
  async countByStatus(workspaceId: string, status: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({
      where: { status },
    });
  }

  /**
   * Count total workspace members
   */
  async countAll(workspaceId: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count();
  }
}
