import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { ConflictError } from 'src/engine/core-modules/graphql/utils/graphql-errors.util';
import { User } from 'src/engine/core-modules/user/user.entity';
import { CreateUserInput } from 'src/mkt-core/user-management/dto/create-user.input';
import { UserOutput } from 'src/mkt-core/user-management/dto/user.output';
import { MktUserCreationService } from 'src/mkt-core/user-management/services/mkt-user-creation.service';
import { MktUserOrchestratorService } from 'src/mkt-core/user-management/services/mkt-user-orchestrator.service';

@Injectable()
export class UserManagementService {
  private readonly logger = new Logger(UserManagementService.name);

  constructor(
    @InjectRepository(User, 'core')
    private readonly userRepository: Repository<User>,
    private readonly mktUserCreationService: MktUserCreationService,
    private readonly mktUserOrchestratorService: MktUserOrchestratorService,
  ) {}

  async createPersonUser(
    workspaceId: string,
    input: CreateUserInput,
  ): Promise<UserOutput> {
    const email = input.email;
    const existing =
      await this.mktUserCreationService.findCoreUserByEmail(email);

    if (existing) {
      this.logger.warn(`Attempt to create user with existing email: ${email}`);
      throw new ConflictError('An account already exists with this email.');
    }

    return await this.mktUserOrchestratorService.createCompleteUser(
      workspaceId,
      input,
    );
  }
}
