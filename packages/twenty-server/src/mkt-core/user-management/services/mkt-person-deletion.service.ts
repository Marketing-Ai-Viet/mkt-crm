import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { User } from 'src/engine/core-modules/user/user.entity';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

@Injectable()
export class MktPersonDeletionService {
  private readonly logger = new Logger(MktPersonDeletionService.name);

  constructor(
    @InjectRepository(User, 'core')
    private readonly userRepository: Repository<User>,
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  async softDeleteByPerson(
    workspaceId: string,
    person: PersonWorkspaceEntity,
  ): Promise<void> {
    const email = person.emails?.primaryEmail;

    if (!email) {
      this.logger.warn(`Person ${person.id} has no email, cannot delete users`);

      return;
    }

    this.logger.log(
      `[DELETE BY EMAIL] Starting soft delete for email: ${email}, person: ${person.id}`,
    );

    // Find all users with this email
    const users = await this.userRepository.find({
      where: { email },
    });

    this.logger.log(
      `[DELETE BY EMAIL] Found ${users.length} user(s) with email: ${email}`,
    );

    // CASE 1: Soft delete all users with this email
    this.logger.log(
      `[DELETE BY EMAIL] === CASE 1: Deleting users with email: ${email} ===`,
    );

    if (users.length === 0) {
      this.logger.log(`[DELETE BY EMAIL] No users found - skipping Case 1`);
    } else {
      for (const user of users) {
        await this.userRepository.softDelete({ id: user.id });
        this.logger.log(
          `[DELETE BY EMAIL] ✓ Soft deleted user: ${user.id} (${email})`,
        );
      }
      this.logger.log(
        `[DELETE BY EMAIL] Case 1 completed - Deleted ${users.length} user(s)`,
      );
    }

    // CASE 2: Soft delete all workspace members with this email (independent)
    this.logger.log(
      `[DELETE BY EMAIL] === CASE 2: Deleting workspace members with email: ${email} ===`,
    );

    const workspaceMemberRepo =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<WorkspaceMemberWorkspaceEntity>(
        workspaceId,
        'workspaceMember',
        { shouldBypassPermissionChecks: true },
      );

    const members = await workspaceMemberRepo.find({
      where: { userEmail: email },
    });

    this.logger.log(
      `[DELETE BY EMAIL] Found ${members.length} workspace member(s) with email: ${email}`,
    );

    let totalMembersDeleted = 0;

    for (const member of members) {
      await workspaceMemberRepo.update(
        { id: member.id },
        { deletedAt: new Date().toISOString() },
      );
      this.logger.log(
        `[DELETE BY EMAIL] ✓ Soft deleted workspace member: ${member.id} (email: ${email})`,
      );
      totalMembersDeleted++;
    }

    this.logger.log(
      `[DELETE BY EMAIL] Case 2 completed - Deleted ${totalMembersDeleted} workspace member(s)`,
    );

    this.logger.log(
      `[DELETE BY EMAIL] ✅ Completed deletion for email: ${email} - Total: ${users.length} user(s) and ${totalMembersDeleted} workspace member(s)`,
    );
  }
}
