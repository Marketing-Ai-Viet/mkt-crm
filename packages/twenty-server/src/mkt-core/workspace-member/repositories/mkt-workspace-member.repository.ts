import { Injectable } from '@nestjs/common';

import { FindOptionsWhere, IsNull, DeepPartial, ILike } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  MKT_WORKSPACE_MEMBER_LOG_CONTEXT,
  MKT_WORKSPACE_MEMBER_LOG_MESSAGES,
} from 'src/mkt-core/workspace-member/messages';
import {
  DEFAULT_WORKSPACE_MEMBER_RELATIONS,
  FindWorkspaceMemberOptions,
  SearchMemberParams,
  SearchMemberResult,
} from 'src/mkt-core/workspace-member/types';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

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
  async findMemberById(
    memberId: string,
    options?: FindWorkspaceMemberOptions,
  ): Promise<WorkspaceMemberWorkspaceEntity | null> {
    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.FIND_BY_ID_START(memberId),
    );

    const repository = await this.getRepository();

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
    memberId: string,
  ): Promise<WorkspaceMemberWorkspaceEntity | null> {
    return this.findMemberById(memberId, {
      relations: [...DEFAULT_WORKSPACE_MEMBER_RELATIONS],
    });
  }

  /**
   * Find workspace member by email
   */
  async findByEmail(
    email: string,
    options?: FindWorkspaceMemberOptions,
  ): Promise<WorkspaceMemberWorkspaceEntity | null> {
    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.FIND_BY_EMAIL_START(email),
    );

    const repository = await this.getRepository();

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
    memberCode: string,
    options?: FindWorkspaceMemberOptions,
  ): Promise<WorkspaceMemberWorkspaceEntity | null> {
    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.FIND_BY_CODE_START(memberCode),
    );

    const repository = await this.getRepository();

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
    userId: string,
    options?: FindWorkspaceMemberOptions,
  ): Promise<WorkspaceMemberWorkspaceEntity | null> {
    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.FIND_BY_USER_ID_START(userId),
    );

    const repository = await this.getRepository();

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
    departmentId: string,
    options?: FindWorkspaceMemberOptions,
  ): Promise<WorkspaceMemberWorkspaceEntity[]> {
    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.FIND_BY_DEPARTMENT_START(departmentId),
    );

    const repository = await this.getRepository();

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
    teamId: string,
    options?: FindWorkspaceMemberOptions,
  ): Promise<WorkspaceMemberWorkspaceEntity[]> {
    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.FIND_BY_TEAM_START(teamId),
    );

    const repository = await this.getRepository();

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
    status: string,
    options?: FindWorkspaceMemberOptions,
  ): Promise<WorkspaceMemberWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { status },
      relations: options?.relations,
      order: { position: 'ASC' },
    });
  }

  /**
   * Find all workspace members
   */
  async findAllMembers(
    options?: FindWorkspaceMemberOptions,
  ): Promise<WorkspaceMemberWorkspaceEntity[]> {
    const repository = await this.getRepository();

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
    options?: FindWorkspaceMemberOptions,
  ): Promise<WorkspaceMemberWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { deletedAt: IsNull() },
      relations: options?.relations,
      order: { position: 'ASC' },
    });
  }

  /**
   * Find workspace members with custom where clause
   */
  async findManyMembers(
    where: FindOptionsWhere<WorkspaceMemberWorkspaceEntity>,
    options?: FindWorkspaceMemberOptions,
  ): Promise<WorkspaceMemberWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where,
      relations: options?.relations,
      order: { position: 'ASC' },
    });
  }

  /**
   * Check if workspace member exists
   */
  async memberExists(memberId: string): Promise<boolean> {
    const repository = await this.getRepository();

    const count = await repository.count({
      where: { id: memberId },
    });

    return count > 0;
  }

  /**
   * Check if member code exists
   */
  async existsByMemberCode(memberCode: string): Promise<boolean> {
    const repository = await this.getRepository();

    const count = await repository.count({
      where: { memberCode },
    });

    return count > 0;
  }

  /**
   * Check if email exists in workspace
   */
  async existsByEmail(email: string): Promise<boolean> {
    const repository = await this.getRepository();

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
  async createMember(
    data: DeepPartial<WorkspaceMemberWorkspaceEntity>,
  ): Promise<WorkspaceMemberWorkspaceEntity> {
    this.logger.debug(MKT_WORKSPACE_MEMBER_LOG_MESSAGES.CREATE_START());

    const repository = await this.getRepository();

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
  async updateMember(
    memberId: string,
    data: DeepPartial<WorkspaceMemberWorkspaceEntity>,
  ): Promise<void> {
    this.logger.debug(MKT_WORKSPACE_MEMBER_LOG_MESSAGES.UPDATE_START(memberId));

    const repository = await this.getRepository();

    await repository.update(memberId, data as never);

    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.UPDATE_SUCCESS(memberId),
    );
  }

  /**
   * Update workspace member status
   */
  async updateStatus(memberId: string, status: string): Promise<void> {
    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.STATUS_UPDATE_START(memberId, status),
    );

    await this.updateMember(memberId, { status });

    this.logger.debug(
      MKT_WORKSPACE_MEMBER_LOG_MESSAGES.STATUS_UPDATE_SUCCESS(memberId, status),
    );
  }

  /**
   * Update and return the updated workspace member
   */
  async updateAndReturn(
    memberId: string,
    data: DeepPartial<WorkspaceMemberWorkspaceEntity>,
  ): Promise<WorkspaceMemberWorkspaceEntity | null> {
    await this.updateMember(memberId, data);

    return this.findMemberById(memberId);
  }

  /**
   * Assign member to department
   */
  async assignToDepartment(
    memberId: string,
    departmentId: string,
  ): Promise<void> {
    await this.updateMember(memberId, { departmentId });
  }

  /**
   * Assign member to team
   */
  async assignToTeam(memberId: string, teamId: string): Promise<void> {
    await this.updateMember(memberId, { teamId });
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Soft delete workspace member by setting deletedAt timestamp
   */
  async softDeleteMember(memberId: string): Promise<void> {
    this.logger.warn(MKT_WORKSPACE_MEMBER_LOG_MESSAGES.DELETE_START(memberId));

    const repository = await this.getRepository();

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
  async countByDepartment(departmentId: string): Promise<number> {
    const repository = await this.getRepository();

    return repository.count({
      where: { departmentId },
    });
  }

  /**
   * Count workspace members by team
   */
  async countByTeam(teamId: string): Promise<number> {
    const repository = await this.getRepository();

    return repository.count({
      where: { teamId },
    });
  }

  /**
   * Count workspace members by status
   */
  async countByStatus(status: string): Promise<number> {
    const repository = await this.getRepository();

    return repository.count({
      where: { status },
    });
  }

  /**
   * Count total workspace members
   */
  async countAllMembers(): Promise<number> {
    const repository = await this.getRepository();

    return repository.count();
  }

  // ============================================
  // SEARCH OPERATIONS
  // ============================================

  /**
   * Search workspace members với nhiều tiêu chí và pagination
   */
  async searchMembers(params: SearchMemberParams): Promise<SearchMemberResult> {
    const {
      keyword,
      email,
      memberCode,
      status,
      memberType,
      departmentId,
      teamId,
      organizationLevelId,
      employmentStatusId,
      page = 1,
      limit = 20,
    } = params;

    this.logger.debug(
      `[SEARCH] Starting search with params: ${JSON.stringify(params)}`,
    );

    const repository = await this.getRepository();

    // Build where conditions
    const whereConditions: FindOptionsWhere<WorkspaceMemberWorkspaceEntity>[] =
      [];

    const baseCondition: FindOptionsWhere<WorkspaceMemberWorkspaceEntity> = {
      deletedAt: IsNull(),
    };

    // Thêm các filter cụ thể
    if (status) {
      baseCondition.status = status;
    }

    if (memberType) {
      baseCondition.memberType = memberType;
    }

    if (departmentId) {
      baseCondition.departmentId = departmentId;
    }

    if (teamId) {
      baseCondition.teamId = teamId;
    }

    if (organizationLevelId) {
      baseCondition.organizationLevelId = organizationLevelId;
    }

    if (employmentStatusId) {
      baseCondition.employmentStatusId = employmentStatusId;
    }

    // Tìm theo email chính xác
    if (email) {
      baseCondition.userEmail = ILike(`%${email}%`);
    }

    // Tìm theo memberCode chính xác
    if (memberCode) {
      baseCondition.memberCode = memberCode;
    }

    // Tìm theo keyword (search trong name, email)
    if (keyword) {
      // Search trong firstName
      whereConditions.push({
        ...baseCondition,
        name: { firstName: ILike(`%${keyword}%`) } as never,
      });

      // Search trong lastName
      whereConditions.push({
        ...baseCondition,
        name: { lastName: ILike(`%${keyword}%`) } as never,
      });

      // Search trong email
      whereConditions.push({
        ...baseCondition,
        userEmail: ILike(`%${keyword}%`),
      });

      // Search trong memberCode
      whereConditions.push({
        ...baseCondition,
        memberCode: ILike(`%${keyword}%`),
      });
    } else {
      whereConditions.push(baseCondition);
    }

    const skip = (page - 1) * limit;

    // Execute query với pagination
    const [items, total] = await repository.findAndCount({
      where: whereConditions.length > 0 ? whereConditions : baseCondition,
      relations: [...DEFAULT_WORKSPACE_MEMBER_RELATIONS],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    this.logger.debug(
      `[SEARCH] Found ${total} members, returning ${items.length} items for page ${page}`,
    );

    return { items, total };
  }

  // ============================================
  // WORKSPACE-SCOPED OPERATIONS
  // ============================================

  /**
   * Find workspace member by ID with explicit workspaceId
   */
  async findMemberByIdWithWorkspace(
    workspaceId: string,
    memberId: string,
    options?: FindWorkspaceMemberOptions,
  ): Promise<WorkspaceMemberWorkspaceEntity | null> {
    this.logger.debug(
      `[FIND BY ID WITH WORKSPACE] workspaceId=${workspaceId}, memberId=${memberId}`,
    );

    const repository = await this.getRepository(workspaceId);

    const member = await repository.findOne({
      where: { id: memberId, deletedAt: IsNull() },
      relations: options?.relations ?? [...DEFAULT_WORKSPACE_MEMBER_RELATIONS],
    });

    if (!member) {
      this.logger.debug(
        `[FIND BY ID WITH WORKSPACE] Member not found: ${memberId}`,
      );

      return null;
    }

    return member;
  }

  /**
   * Update workspace member by ID with explicit workspaceId
   */
  async updateMemberWithWorkspace(
    workspaceId: string,
    memberId: string,
    data: DeepPartial<WorkspaceMemberWorkspaceEntity>,
  ): Promise<void> {
    this.logger.debug(
      `[UPDATE WITH WORKSPACE] workspaceId=${workspaceId}, memberId=${memberId}`,
    );

    const repository = await this.getRepository(workspaceId);

    await repository.update(memberId, data as never);

    this.logger.debug(
      `[UPDATE WITH WORKSPACE] Updated member: ${memberId} in workspace: ${workspaceId}`,
    );
  }

  /**
   * Soft delete workspace member with explicit workspaceId
   */
  async softDeleteMemberWithWorkspace(
    workspaceId: string,
    memberId: string,
  ): Promise<void> {
    this.logger.warn(
      `[DELETE WITH WORKSPACE] workspaceId=${workspaceId}, memberId=${memberId}`,
    );

    const repository = await this.getRepository(workspaceId);

    await repository.update(memberId, {
      deletedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    } as never);

    this.logger.warn(
      `[DELETE WITH WORKSPACE] Soft deleted member: ${memberId} in workspace: ${workspaceId}`,
    );
  }

  /**
   * Search workspace members with explicit workspaceId
   */
  async searchMembersWithWorkspace(
    workspaceId: string,
    params: SearchMemberParams,
  ): Promise<SearchMemberResult> {
    const {
      keyword,
      email,
      memberCode,
      status,
      memberType,
      departmentId,
      teamId,
      organizationLevelId,
      employmentStatusId,
      page = 1,
      limit = 20,
    } = params;

    this.logger.debug(
      `[SEARCH WITH WORKSPACE] workspaceId=${workspaceId}, params=${JSON.stringify(params)}`,
    );

    const repository = await this.getRepository(workspaceId);

    // Build where conditions
    const whereConditions: FindOptionsWhere<WorkspaceMemberWorkspaceEntity>[] =
      [];

    const baseCondition: FindOptionsWhere<WorkspaceMemberWorkspaceEntity> = {
      deletedAt: IsNull(),
    };

    // Thêm các filter cụ thể
    if (status) {
      baseCondition.status = status;
    }

    if (memberType) {
      baseCondition.memberType = memberType;
    }

    if (departmentId) {
      baseCondition.departmentId = departmentId;
    }

    if (teamId) {
      baseCondition.teamId = teamId;
    }

    if (organizationLevelId) {
      baseCondition.organizationLevelId = organizationLevelId;
    }

    if (employmentStatusId) {
      baseCondition.employmentStatusId = employmentStatusId;
    }

    // Tìm theo email
    if (email) {
      baseCondition.userEmail = ILike(`%${email}%`);
    }

    // Tìm theo memberCode chính xác
    if (memberCode) {
      baseCondition.memberCode = memberCode;
    }

    // Tìm theo keyword (search trong name, email)
    if (keyword) {
      // Search trong firstName
      whereConditions.push({
        ...baseCondition,
        name: { firstName: ILike(`%${keyword}%`) } as never,
      });

      // Search trong lastName
      whereConditions.push({
        ...baseCondition,
        name: { lastName: ILike(`%${keyword}%`) } as never,
      });

      // Search trong email
      whereConditions.push({
        ...baseCondition,
        userEmail: ILike(`%${keyword}%`),
      });

      // Search trong memberCode
      whereConditions.push({
        ...baseCondition,
        memberCode: ILike(`%${keyword}%`),
      });
    } else {
      whereConditions.push(baseCondition);
    }

    const skip = (page - 1) * limit;

    // Execute query với pagination
    const [items, total] = await repository.findAndCount({
      where: whereConditions.length > 0 ? whereConditions : baseCondition,
      relations: [...DEFAULT_WORKSPACE_MEMBER_RELATIONS],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    this.logger.debug(
      `[SEARCH WITH WORKSPACE] Found ${total} members in workspace ${workspaceId}, returning ${items.length} items for page ${page}`,
    );

    return { items, total };
  }
}
