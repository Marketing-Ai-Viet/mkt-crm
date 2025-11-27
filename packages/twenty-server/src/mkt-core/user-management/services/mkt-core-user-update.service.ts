import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { User } from 'src/engine/core-modules/user/user.entity';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';

@Injectable()
export class MktCoreUserUpdateService {
  constructor(
    @InjectRepository(User, 'core')
    private readonly userRepository: Repository<User>,
  ) {}

  async updateFromPerson(
    user: User,
    person: PersonWorkspaceEntity,
  ): Promise<void> {
    const needsEmailUpdate = person.newEmail && user.email !== person.newEmail;
    const needsUpdate =
      user.firstName !== person.name?.firstName ||
      user.lastName !== person.name?.lastName ||
      user.defaultAvatarUrl !== person.avatarUrl ||
      needsEmailUpdate;

    if (!needsUpdate) return;

    await this.userRepository.update(
      { id: user.id },
      {
        firstName: person.name?.firstName || '',
        lastName: person.name?.lastName || '',
        defaultAvatarUrl: person.avatarUrl || undefined,
        ...(needsEmailUpdate && person.newEmail && { email: person.newEmail }),
      },
    );
  }
}
