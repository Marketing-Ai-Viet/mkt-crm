import { Injectable } from '@nestjs/common';

import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktDepartmentLookupService } from 'src/mkt-core/user-management/services/mkt-department-lookup.service';
import { MktRoleUpdateService } from 'src/mkt-core/user-management/services/mkt-role-update.service';
import { MktWorkspaceMemberChangeLoggerService } from 'src/mkt-core/user-management/services/mkt-workspace-member-change-logger.service';
import { MktWorkspaceMemberDataBuilderService } from 'src/mkt-core/user-management/services/mkt-workspace-member-data-builder.service';

@Injectable()
export class MktWorkspaceMemberUpdateService {
  constructor(
    private readonly mktRepo: MktRepositoryService,
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
    const repo = await this.mktRepo.getWorkspaceMemberRepository();
    const member = await repo.findOne({ where: { userId } });

    const departmentId = await this.departmentLookup.getDepartmentIdFromTeamId(
      person.teamId,
    );

    if (member) {
      await this.updateExistingMember(member, person, departmentId);
    }

    if (roleId) {
      await this.roleUpdate.updateUserRole(userId, workspaceId, roleId);
    }
  }

  private async updateExistingMember(
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

    const repo = await this.mktRepo.getWorkspaceMemberRepository();
    const updateData = this.dataBuilder.buildUpdateData(person, departmentId);

    await repo.update({ id: member.id }, updateData);

    this.changeLogger.logSuccess(member.id, person?.emails?.primaryEmail);
  }
}
