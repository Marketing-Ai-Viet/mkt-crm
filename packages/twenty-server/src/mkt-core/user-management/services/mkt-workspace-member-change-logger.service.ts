import { Injectable, Logger } from '@nestjs/common';

import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

@Injectable()
export class MktWorkspaceMemberChangeLoggerService {
  private readonly logger = new Logger(
    MktWorkspaceMemberChangeLoggerService.name,
  );

  logChanges(
    member: WorkspaceMemberWorkspaceEntity,
    person: PersonWorkspaceEntity,
    departmentId: string | null,
  ): void {
    const changes = this.detectChanges(member, person, departmentId);

    if (changes.length === 0) {
      this.logger.log(
        `[UPDATE WORKSPACE MEMBER] No changes detected for member: ${member.id} (${person?.emails?.primaryEmail})`,
      );

      return;
    }

    this.logger.log(
      `[UPDATE WORKSPACE MEMBER] Updating member: ${member.id} for person: ${person?.emails?.primaryEmail}`,
    );
    this.logger.log(
      `[UPDATE WORKSPACE MEMBER] Changes detected: ${changes.join(', ')}`,
    );
  }

  logSuccess(memberId: string, email: string): void {
    this.logger.log(
      `[UPDATE WORKSPACE MEMBER] ✓ Successfully updated member: ${memberId} (${email})`,
    );
  }

  private detectChanges(
    member: WorkspaceMemberWorkspaceEntity,
    person: PersonWorkspaceEntity,
    departmentId: string | null,
  ): string[] {
    const changes: string[] = [];
    const targetEmail = person.newEmail || person.emails.primaryEmail;

    if (member.name?.firstName !== person.name?.firstName) {
      changes.push(
        `firstName: "${member.name?.firstName}" → "${person.name?.firstName}"`,
      );
    }
    if (member.name?.lastName !== person.name?.lastName) {
      changes.push(
        `lastName: "${member.name?.lastName}" → "${person.name?.lastName}"`,
      );
    }
    if (member.avatarUrl !== person.avatarUrl) {
      changes.push(`avatarUrl: "${member.avatarUrl}" → "${person.avatarUrl}"`);
    }
    if (member.memberType !== person.memberType) {
      changes.push(
        `memberType: "${member.memberType}" → "${person.memberType}"`,
      );
    }
    if (member.status !== person.status) {
      changes.push(`status: "${member.status}" → "${person.status}"`);
    }
    if (member.departmentId !== departmentId) {
      changes.push(
        `departmentId: "${member.departmentId}" → "${departmentId}"`,
      );
    }
    if (member.teamId !== person.teamId) {
      changes.push(`teamId: "${member.teamId}" → "${person.teamId}"`);
    }
    if (member.userEmail !== targetEmail) {
      changes.push(`userEmail: "${member.userEmail}" → "${targetEmail}"`);
    }

    return changes;
  }
}
