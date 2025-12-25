import { Injectable } from '@nestjs/common';

import { MktWorkspaceMemberRepository } from 'src/mkt-core/workspace-member/repositories';
import { MktDepartmentLookupService } from 'src/mkt-core/user-management/services/mkt-department-lookup.service';
import { MktRoleUpdateService } from 'src/mkt-core/user-management/services/mkt-role-update.service';
import { MktWorkspaceMemberChangeLoggerService } from 'src/mkt-core/user-management/services/mkt-workspace-member-change-logger.service';
import { MktWorkspaceMemberDataBuilderService } from 'src/mkt-core/user-management/services/mkt-workspace-member-data-builder.service';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

@Injectable()
export class MktWorkspaceMemberUpdateService {
  constructor(
    private readonly workspaceMemberRepository: MktWorkspaceMemberRepository,
    private readonly departmentLookup: MktDepartmentLookupService,
    private readonly roleUpdate: MktRoleUpdateService,
    private readonly changeLogger: MktWorkspaceMemberChangeLoggerService,
    private readonly dataBuilder: MktWorkspaceMemberDataBuilderService,
  ) {}

  async updateFromPerson(
    userId: string,
    workspaceId: string,
    person: PersonWorkspaceEntity,
    roleId?: string | null | undefined,
  ): Promise<void> {
    const member = await this.workspaceMemberRepository.findByUserId(
      workspaceId,
      userId,
    );

    const departmentId = await this.departmentLookup.getDepartmentIdFromTeamId(
      person.teamId,
    );

    if (member) {
      await this.updateExistingMember(
        workspaceId,
        member,
        person,
        departmentId,
      );
    }

    if (roleId) {
      await this.roleUpdate.updateUserRole(userId, workspaceId, roleId);
    }
  }

  private async updateExistingMember(
    workspaceId: string,
    member: WorkspaceMemberWorkspaceEntity,
    person: PersonWorkspaceEntity,
    departmentId: string | null,
  ): Promise<void> {
    const needsUpdate = this.dataBuilder.needsUpdate(
      member,
      person,
      departmentId,
    );

    this.changeLogger.logChanges(member, person, departmentId);
    if (!needsUpdate) {
      return;
    }

    const updateData = this.dataBuilder.buildUpdateData(person, departmentId);

    await this.workspaceMemberRepository.update(
      workspaceId,
      member.id,
      updateData,
    );

    this.changeLogger.logSuccess(member.id, person?.emails?.primaryEmail);
  }
}
