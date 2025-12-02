import { Injectable, Logger } from '@nestjs/common';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
import { MktDepartmentLookupService } from 'src/mkt-core/user-management/services/mkt-department-lookup.service';
import { MktMemberCodeGenerationService } from 'src/mkt-core/workspace-member/services/mkt-member-code-generation.service';

@Injectable()
export class MktWorkspaceMemberService {
  private readonly logger = new Logger(MktWorkspaceMemberService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly departmentLookup: MktDepartmentLookupService,
    private readonly memberCodeService: MktMemberCodeGenerationService,
  ) {}

  async createWorkspaceMember(
    workspaceId: string,
    data: Partial<WorkspaceMemberWorkspaceEntity>,
  ): Promise<WorkspaceMemberWorkspaceEntity> {
    const workspaceMemberRepo =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<WorkspaceMemberWorkspaceEntity>(
        workspaceId,
        'workspaceMember',
        { shouldBypassPermissionChecks: true },
      );

    // Lookup departmentId from teamId
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

    // Tạo memberCode tự động nếu chưa có
    let memberCode = data.memberCode;

    if (!memberCode) {
      memberCode = await this.memberCodeService.generateUniqueMemberCode(
        workspaceId,
        true, // dùng year prefix: MEM2025001
      );
      this.logger.log(
        `[CREATE WORKSPACE MEMBER] Generated memberCode: ${memberCode}`,
      );
    }

    const member = await workspaceMemberRepo.save({
      ...data,
      departmentId,
      memberCode,
    });

    this.logger.log(
      `[CREATE WORKSPACE MEMBER] ✓ Created workspace member: ${member.id}`,
    );

    return member;
  }

  async updateWorkspaceMember(
    workspaceId: string,
    memberId: string,
    data: Partial<WorkspaceMemberWorkspaceEntity>,
  ): Promise<void> {
    const workspaceMemberRepo =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<WorkspaceMemberWorkspaceEntity>(
        workspaceId,
        'workspaceMember',
        { shouldBypassPermissionChecks: true },
      );

    await workspaceMemberRepo.update({ id: memberId }, data);
    this.logger.log(`Updated workspace member: ${memberId}`);
  }

  async findWorkspaceMember(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberWorkspaceEntity | null> {
    const workspaceMemberRepo =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<WorkspaceMemberWorkspaceEntity>(
        workspaceId,
        'workspaceMember',
        { shouldBypassPermissionChecks: true },
      );

    return await workspaceMemberRepo.findOne({ where: { userId } });
  }

  async softDeleteWorkspaceMember(
    workspaceId: string,
    memberId: string,
  ): Promise<void> {
    const workspaceMemberRepo =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<WorkspaceMemberWorkspaceEntity>(
        workspaceId,
        'workspaceMember',
        { shouldBypassPermissionChecks: true },
      );

    await workspaceMemberRepo.softDelete(memberId);
    this.logger.log(`Soft deleted workspace member: ${memberId}`);
  }
}
