import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';

import { DataSource, Repository } from 'typeorm';
import { APP_LOCALES } from 'twenty-shared/translations';

import { hashPassword } from 'src/engine/core-modules/auth/auth.util';
import { ConflictError } from 'src/engine/core-modules/graphql/utils/graphql-errors.util';
import {
  SendEmailToolException,
  SendEmailToolExceptionCode,
} from 'src/engine/core-modules/tool/tools/send-email-tool/exceptions/send-email-tool.exception';
import { UserWorkspace } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { User } from 'src/engine/core-modules/user/user.entity';
import { RoleTargetsEntity } from 'src/engine/metadata-modules/role/role-targets.entity';
import { CreateUserInput } from 'src/mkt-core/user-management/dto/create-user.input';
import { UserOutput } from 'src/mkt-core/user-management/dto/user.output';
import { EmailNotificationService } from 'src/mkt-core/user-management/services/email-notification.service';
import { WorkspaceMemberService } from 'src/mkt-core/user-management/services/workspace-member.service';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

const PASSWORD_CHARS = {
  UPPER: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  LOWER: 'abcdefghijklmnopqrstuvwxyz',
  DIGITS: '0123456789',
  SPECIAL: '@$!%*?&',
} as const;

const DEFAULT_PASSWORD_LENGTH = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 16;

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectDataSource('core')
    private readonly coreDataSource: DataSource,
    @InjectRepository(User, 'core')
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserWorkspace, 'core')
    private readonly userWorkspaceRepository: Repository<UserWorkspace>,
    @InjectRepository(RoleTargetsEntity, 'core')
    private readonly roleTargetsRepository: Repository<RoleTargetsEntity>,
    private readonly workspaceMemberService: WorkspaceMemberService,
    private readonly emailNotificationService: EmailNotificationService,
  ) {}

  // ==================== Public API ====================

  /**
   * Create a new user with validation
   * Main entry point for user creation
   */
  async createUser(
    workspaceId: string,
    input: CreateUserInput,
  ): Promise<UserOutput> {
    const email = input.email;
    const existing = await this.findCoreUserByEmail(email);

    if (existing) {
      this.logger.warn(`Attempt to create user with existing email: ${email}`);
      throw new ConflictError('An account already exists with this email.');
    }

    return this.createCompleteUser(workspaceId, input);
  }

  async findCoreUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findUserWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<UserWorkspace | null> {
    return this.userWorkspaceRepository.findOne({
      where: { userId, workspaceId },
    });
  }

  /**
   * Delete user workspace with transaction wrapper
   */
  async deleteUserWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<void> {
    const userWorkspace = await this.userWorkspaceRepository.findOne({
      where: { userId, workspaceId },
    });

    if (!userWorkspace) {
      this.logger.warn(
        `User workspace not found for user ${userId} in workspace ${workspaceId}`,
      );

      return;
    }

    await this.coreDataSource.transaction(
      async (transactionalEntityManager) => {
        await transactionalEntityManager.delete(RoleTargetsEntity, {
          userWorkspaceId: userWorkspace.id,
          workspaceId,
        });

        await transactionalEntityManager.softDelete(UserWorkspace, {
          id: userWorkspace.id,
        });

        this.logger.log(`Soft deleted user workspace for user: ${userId}`);
      },
    );
  }

  /**
   * Soft delete user if they have no remaining workspaces
   */
  async softDeleteUserIfNoWorkspaces(userId: string): Promise<void> {
    await this.coreDataSource.transaction(
      async (transactionalEntityManager) => {
        const remainingUserWorkspaces = await transactionalEntityManager.find(
          UserWorkspace,
          { where: { userId } },
        );

        if (remainingUserWorkspaces.length === 0) {
          await transactionalEntityManager.softDelete(User, { id: userId });
          this.logger.log(`Soft deleted user: ${userId}`);
        } else {
          this.logger.log(
            `User ${userId} still has ${remainingUserWorkspaces.length} workspaces`,
          );
        }
      },
    );
  }

  // ==================== Password Generation ====================

  generatePassword(length = DEFAULT_PASSWORD_LENGTH): string {
    if (length < MIN_PASSWORD_LENGTH || length > MAX_PASSWORD_LENGTH) {
      throw new Error(
        `Password length must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
      );
    }

    const allChars =
      PASSWORD_CHARS.UPPER +
      PASSWORD_CHARS.LOWER +
      PASSWORD_CHARS.DIGITS +
      PASSWORD_CHARS.SPECIAL;

    const password = [
      PASSWORD_CHARS.UPPER[
        Math.floor(Math.random() * PASSWORD_CHARS.UPPER.length)
      ],
      PASSWORD_CHARS.LOWER[
        Math.floor(Math.random() * PASSWORD_CHARS.LOWER.length)
      ],
      PASSWORD_CHARS.DIGITS[
        Math.floor(Math.random() * PASSWORD_CHARS.DIGITS.length)
      ],
      PASSWORD_CHARS.SPECIAL[
        Math.floor(Math.random() * PASSWORD_CHARS.SPECIAL.length)
      ],
    ];

    for (let i = password.length; i < length; i++) {
      password.push(allChars[Math.floor(Math.random() * allChars.length)]);
    }

    // Shuffle
    for (let i = password.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [password[i], password[j]] = [password[j], password[i]];
    }

    return password.join('');
  }

  // ==================== Private Methods ====================

  private async createCompleteUser(
    workspaceId: string,
    input: CreateUserInput,
  ): Promise<UserOutput> {
    const passwordRandom = this.generatePassword();
    const email = input.email;

    let coreUserId: string | undefined;
    let userWorkspaceId: string | undefined;

    try {
      const coreUser = await this.createCoreUser(
        email,
        input.firstName ?? '',
        input.lastName ?? '',
        passwordRandom,
        input.avatarUrl ?? undefined,
      );

      coreUserId = coreUser.id;

      const userWorkspace = await this.createUserWorkspaceRecord(
        coreUser.id,
        workspaceId,
        input.avatarUrl ?? undefined,
      );

      userWorkspaceId = userWorkspace.id;

      await this.assignRole(userWorkspace.id, workspaceId, input.roleId);

      const savedWorkspaceMember = await this.createWorkspaceMember(
        workspaceId,
        coreUserId,
        email,
        input,
      );

      await this.sendWelcomeEmail(workspaceId, email, passwordRandom);

      return this.buildUserOutput(savedWorkspaceMember, email, input);
    } catch (error) {
      await this.cleanupOnError(coreUserId, userWorkspaceId, workspaceId);
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  private async createCoreUser(
    email: string,
    firstName: string,
    lastName: string,
    password: string,
    avatarUrl?: string,
  ): Promise<User> {
    const coreUser = await this.userRepository.save({
      email,
      firstName,
      lastName,
      passwordHash: await hashPassword(password),
      isEmailVerified: true,
      canImpersonate: false,
      canAccessFullAdminPanel: false,
      locale: 'en',
      defaultAvatarUrl: avatarUrl,
    });

    this.logger.log(`Created core user: ${email}`);

    return coreUser;
  }

  private async createUserWorkspaceRecord(
    userId: string,
    workspaceId: string,
    avatarUrl?: string,
  ): Promise<UserWorkspace> {
    const userWorkspace = await this.userWorkspaceRepository.save({
      userId,
      workspaceId,
      locale: 'en',
      defaultAvatarUrl: avatarUrl,
    });

    this.logger.log(`Created user workspace for user: ${userId}`);

    return userWorkspace;
  }

  private async assignRole(
    userWorkspaceId: string,
    workspaceId: string,
    roleId: string,
  ): Promise<void> {
    await this.roleTargetsRepository.save({
      userWorkspaceId,
      workspaceId,
      roleId,
    });

    this.logger.log(
      `Assigned role ${roleId} to user workspace ${userWorkspaceId}`,
    );
  }

  private async createWorkspaceMember(
    workspaceId: string,
    userId: string,
    email: string,
    input: CreateUserInput,
  ): Promise<WorkspaceMemberWorkspaceEntity> {
    return this.workspaceMemberService.createWorkspaceMember({
      name: {
        firstName: input.firstName ?? '',
        lastName: input.lastName ?? '',
      },
      position: input.position != null ? Number(input.position) : 0,
      colorScheme: 'Light',
      locale: (input.language ?? 'en') as keyof typeof APP_LOCALES,
      avatarUrl: input.avatarUrl ?? '',
      userId,
      userEmail: email,
      calendarStartDay: input.calendarStartDay ?? 7,
      timeZone: 'SYSTEM',
      dateFormat: 'SYSTEM',
      timeFormat: 'SYSTEM',
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      teamId: input.teamId ?? null,
      status: input.status ?? '',
      memberType: input.memberType ?? '',
      employmentStatusId: input.employmentStatusId ?? null,
      organizationLevelId: input.organizationLevelId ?? null,
    });
  }

  private async sendWelcomeEmail(
    workspaceId: string,
    email: string,
    password: string,
  ): Promise<void> {
    try {
      await this.emailNotificationService.sendWelcomeEmail(
        workspaceId,
        email,
        password,
      );
    } catch (error) {
      this.logger.error(
        'User created successfully, but failed to send welcome email',
        error,
      );
      throw new SendEmailToolException(
        'User created successfully, but failed to send welcome email',
        SendEmailToolExceptionCode.CONNECTED_ACCOUNT_NOT_FOUND,
      );
    }
  }

  private async cleanupOnError(
    coreUserId: string | undefined,
    userWorkspaceId: string | undefined,
    workspaceId: string,
  ): Promise<void> {
    this.logger.error('Failed to create user, performing cleanup');

    if (userWorkspaceId && coreUserId) {
      try {
        await this.deleteUserWorkspace(coreUserId, workspaceId);
      } catch (cleanupError) {
        this.logger.error('Failed to cleanup user workspace', cleanupError);
      }
    }

    if (coreUserId) {
      try {
        await this.softDeleteUserIfNoWorkspaces(coreUserId);
      } catch (cleanupError) {
        this.logger.error('Failed to cleanup core user', cleanupError);
      }
    }
  }

  private buildUserOutput(
    savedWorkspaceMember: WorkspaceMemberWorkspaceEntity,
    email: string,
    input: CreateUserInput,
  ): UserOutput {
    return {
      id: savedWorkspaceMember.id,
      email,
      firstName: savedWorkspaceMember.name?.firstName ?? '',
      lastName: savedWorkspaceMember.name?.lastName ?? '',
      jobTitle: input.jobTitle ?? '',
      city: input.city ?? '',
      phone: input.phone ?? '',
      language: savedWorkspaceMember.locale ?? input.language ?? 'en',
      avatarUrl: savedWorkspaceMember.avatarUrl ?? input.avatarUrl ?? undefined,
    };
  }
}
