import { Injectable, Logger } from '@nestjs/common';

import { DepartmentLookupService } from 'src/mkt-core/user-management/services/department-lookup.service';
import { MktWorkspaceMemberRepository } from 'src/mkt-core/workspace-member/repositories';
import { MktMemberCodeGenerationService } from 'src/mkt-core/workspace-member/services/mkt-member-code-generation.service';
import {
  CreateWorkspaceMemberData,
  UpdateWorkspaceMemberData,
} from 'src/mkt-core/workspace-member/types';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

@Injectable()
export class WorkspaceMemberService {
  private readonly logger = new Logger(WorkspaceMemberService.name);

  constructor(
    private readonly workspaceMemberRepository: MktWorkspaceMemberRepository,
    private readonly departmentLookup: DepartmentLookupService,
    private readonly memberCodeService: MktMemberCodeGenerationService,
  ) {}

  async createWorkspaceMember(
    workspaceId: string,
    data: CreateWorkspaceMemberData,
  ): Promise<WorkspaceMemberWorkspaceEntity> {
    let departmentId = data.departmentId;

    if (data.teamId) {
      const lookedUpDepartmentId =
        await this.departmentLookup.getDepartmentIdFromTeamId(data.teamId);

      if (lookedUpDepartmentId) {
        departmentId = lookedUpDepartmentId;
        this.logger.log(
          `[CREATE WORKSPACE MEMBER] Looked up departmentId: ${departmentId} from teamId: ${data.teamId}`,
        );
      }
    }

    this.logger.log(
      `[CREATE WORKSPACE MEMBER] Creating for user: ${data.userId}, email: ${data.userEmail}`,
    );
    this.logger.log(
      `[CREATE WORKSPACE MEMBER] Fields: departmentId=${departmentId}, teamId=${data.teamId}, status=${data.status}, memberType=${data.memberType}`,
    );

    let memberCode = data.memberCode;

    if (!memberCode) {
      memberCode = await this.memberCodeService.generateUniqueMemberCode(
        workspaceId,
        true,
      );
      this.logger.log(
        `[CREATE WORKSPACE MEMBER] Generated memberCode: ${memberCode}`,
      );
    }

    const member = await this.workspaceMemberRepository.create(workspaceId, {
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
    await this.workspaceMemberRepository.update(workspaceId, memberId, data);
    this.logger.log(`Updated workspace member: ${memberId}`);
  }

  async findWorkspaceMember(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberWorkspaceEntity | null> {
    return this.workspaceMemberRepository.findByUserId(workspaceId, userId);
  }

  async softDeleteWorkspaceMember(
    workspaceId: string,
    memberId: string,
  ): Promise<void> {
    await this.workspaceMemberRepository.softDelete(workspaceId, memberId);
    this.logger.log(`Soft deleted workspace member: ${memberId}`);
  }
}
