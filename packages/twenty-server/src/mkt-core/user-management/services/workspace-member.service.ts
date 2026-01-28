import { Injectable, Logger } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { SearchUserInput } from 'src/mkt-core/user-management/dto';
import { MktWorkspaceMemberRepository } from 'src/mkt-core/workspace-member/repositories';
import { MktMemberCodeGenerationService } from 'src/mkt-core/workspace-member/services/mkt-member-code-generation.service';
import {
  CreateWorkspaceMemberData,
  UpdateWorkspaceMemberData,
} from 'src/mkt-core/workspace-member/types';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

type SearchResult = {
  items: WorkspaceMemberWorkspaceEntity[];
  total: number;
};

@Injectable()
export class WorkspaceMemberService {
  private readonly logger = new Logger(WorkspaceMemberService.name);

  constructor(
    private readonly workspaceMemberRepository: MktWorkspaceMemberRepository,
    private readonly memberCodeService: MktMemberCodeGenerationService,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  async createWorkspaceMember(
    data: CreateWorkspaceMemberData,
  ): Promise<WorkspaceMemberWorkspaceEntity> {
    const departmentId = data.departmentId;

    this.logger.log(
      `[CREATE WORKSPACE MEMBER] Creating for user: ${data.userId}, email: ${data.userEmail}`,
    );
    this.logger.log(
      `[CREATE WORKSPACE MEMBER] Fields: departmentId=${departmentId}, status=${data.status}, memberType=${data.memberType}`,
    );

    let memberCode = data.memberCode;

    if (!memberCode) {
      const workspaceId =
        this.scopedWorkspaceContextFactory.create().workspaceId;

      if (workspaceId) {
        memberCode = await this.memberCodeService.generateUniqueMemberCode(
          workspaceId,
          true,
        );
        this.logger.log(
          `[CREATE WORKSPACE MEMBER] Generated memberCode: ${memberCode}`,
        );
      }
    }

    const member = await this.workspaceMemberRepository.createMember({
      ...data,
      departmentId,
      memberCode,
    });

    this.logger.log(
      `[CREATE WORKSPACE MEMBER] Created workspace member: ${member.id}`,
    );

    return member;
  }

  async updateWorkspaceMember(
    workspaceId: string,
    memberId: string,
    data: UpdateWorkspaceMemberData,
  ): Promise<void> {
    await this.workspaceMemberRepository.updateMemberWithWorkspace(
      workspaceId,
      memberId,
      data,
    );
    this.logger.log(
      `[UPDATE WORKSPACE MEMBER] Updated member: ${memberId} in workspace: ${workspaceId}`,
    );
  }

  async findWorkspaceMember(
    userId: string,
  ): Promise<WorkspaceMemberWorkspaceEntity | null> {
    return this.workspaceMemberRepository.findByUserId(userId);
  }

  async findWorkspaceMemberById(
    workspaceId: string,
    memberId: string,
  ): Promise<WorkspaceMemberWorkspaceEntity | null> {
    return this.workspaceMemberRepository.findMemberByIdWithWorkspace(
      workspaceId,
      memberId,
    );
  }

  async softDeleteWorkspaceMember(
    workspaceId: string,
    memberId: string,
  ): Promise<void> {
    await this.workspaceMemberRepository.softDeleteMemberWithWorkspace(
      workspaceId,
      memberId,
    );
    this.logger.log(
      `[DELETE WORKSPACE MEMBER] Soft deleted member: ${memberId} in workspace: ${workspaceId}`,
    );
  }

  /**
   * Search workspace members với nhiều tiêu chí và pagination
   */
  async searchWorkspaceMembers(
    workspaceId: string,
    input: SearchUserInput,
  ): Promise<SearchResult> {
    const { page = 1, limit = 20 } = input;

    const result =
      await this.workspaceMemberRepository.searchMembersWithWorkspace(
        workspaceId,
        {
          keyword: input.keyword,
          email: input.email,
          memberCode: input.memberCode,
          status: input.status,
          memberType: input.memberType,
          departmentId: input.departmentId,
          organizationLevelId: input.organizationLevelId,
          employmentStatusId: input.employmentStatusId,
          page,
          limit,
        },
      );

    this.logger.log(
      `[SEARCH WORKSPACE MEMBERS] Found ${result.total} members in workspace ${workspaceId}, page ${page}/${Math.ceil(result.total / limit)}`,
    );

    return result;
  }
}
