import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { User } from 'src/engine/core-modules/user/user.entity';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';

@Injectable()
export class MktPersonDeletionService {
  private readonly logger = new Logger(MktPersonDeletionService.name);

  constructor(
    @InjectRepository(User, 'core')
    private readonly userRepository: Repository<User>,
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly mktRepo: MktRepositoryService,
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

    this.logger.log(`[DELETE BY EMAIL] Starting deletion for email: ${email}`);

    // CASE 1: Soft delete all users with this email
    const users = await this.userRepository.find({
      where: { email },
    });

    for (const user of users) {
      await this.userRepository.softDelete({ id: user.id });
    }

    // CASE 2: Soft delete all workspace members with this email
    const memberRepo = await this.mktRepo.getWorkspaceMemberRepository();
    const members = await memberRepo.find({
      where: { userEmail: email },
    });

    for (const member of members) {
      await memberRepo.update(
        { id: member.id },
        { deletedAt: new Date().toISOString() },
      );
    }

    // CASE 3: Soft delete all customers with this email
    const cusRepo = await this.mktRepo.getCustomerRepository();
    const customers = await cusRepo.find({
      where: { email },
    });

    for (const customer of customers) {
      await cusRepo.update(
        { id: customer.id },
        { deletedAt: new Date().toISOString() },
      );
    }

    this.logger.log(
      `[DELETE BY EMAIL] ✅ Deleted ${users.length} user(s), ${members.length} member(s), ${customers.length} customer(s) for: ${email}`,
    );
  }
}
