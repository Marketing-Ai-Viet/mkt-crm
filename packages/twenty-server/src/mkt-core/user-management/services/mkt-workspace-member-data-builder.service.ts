import { Injectable } from '@nestjs/common';

import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

@Injectable()
export class MktWorkspaceMemberDataBuilderService {
  buildUpdateData(person: PersonWorkspaceEntity, departmentId: string | null) {
    const userEmail = person.newEmail || person.emails.primaryEmail;

    return {
      name: this.getNameObject(person),
      avatarUrl: person.avatarUrl || '',
      memberType: person.memberType || '',
      status: person.status || '',
      departmentId: departmentId,
      teamId: person.teamId || null,
      deletedAt: null,
      userEmail: userEmail,
    };
  }

  buildCreateData(
    userId: string,
    person: PersonWorkspaceEntity,
    departmentId: string | null,
  ) {
    return {
      userId,
      name: this.getNameObject(person),
      avatarUrl: person.avatarUrl || '',
      memberType: person.memberType || '',
      status: person.status || '',
      departmentId: departmentId,
      teamId: person.teamId || null,
      colorScheme: 'Light',
      locale: 'en',
      userEmail: person.emails.primaryEmail,
    };
  }

  needsUpdate(
    member: WorkspaceMemberWorkspaceEntity,
    person: PersonWorkspaceEntity,
    departmentId: string | null,
  ): boolean {
    const targetEmail = person.newEmail || person.emails.primaryEmail;

    return (
      member.name?.firstName !== person.name?.firstName ||
      member.name?.lastName !== person.name?.lastName ||
      member.avatarUrl !== person.avatarUrl ||
      member.memberType !== person.memberType ||
      member.status !== person.status ||
      member.departmentId !== departmentId ||
      member.teamId !== person.teamId ||
      member.userEmail !== targetEmail
    );
  }

  private getNameObject(person: PersonWorkspaceEntity) {
    return {
      firstName: person.name?.firstName || '',
      lastName: person.name?.lastName || '',
    };
  }
}
