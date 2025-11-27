import { Injectable } from '@nestjs/common';

import { CreateUserInput } from 'src/mkt-core/user-management/dto/create-user.input';
import { UserOutput } from 'src/mkt-core/user-management/dto/user.output';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

@Injectable()
export class MktUserOutputBuilderService {
  buildUserOutput(
    savedWorkspaceMember: WorkspaceMemberWorkspaceEntity,
    email: string,
    input: CreateUserInput,
  ): UserOutput {
    return {
      id: savedWorkspaceMember.id,
      email,
      firstName: savedWorkspaceMember.name?.firstName || '',
      lastName: savedWorkspaceMember.name?.lastName || '',
      jobTitle: input.jobTitle || '',
      city: input.city || '',
      phone: input.phone || '',
      language: savedWorkspaceMember.locale || input.language || 'en',
      avatarUrl: savedWorkspaceMember.avatarUrl || input.avatarUrl || undefined,
    };
  }
}
