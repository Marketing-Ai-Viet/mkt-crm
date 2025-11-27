import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import { APP_LOCALES } from 'twenty-shared/translations';

import {
  SendEmailToolException,
  SendEmailToolExceptionCode,
} from 'src/engine/core-modules/tool/tools/send-email-tool/exceptions/send-email-tool.exception';
import { CreateUserInput } from 'src/mkt-core/user-management/dto/create-user.input';
import { UserOutput } from 'src/mkt-core/user-management/dto/user.output';
import { MktEmailNotificationService } from 'src/mkt-core/user-management/services/mkt-email-notification.service';
import { MktPasswordService } from 'src/mkt-core/user-management/services/mkt-password.service';
import { MktUserCleanupService } from 'src/mkt-core/user-management/services/mkt-user-cleanup.service';
import { MktUserCreationService } from 'src/mkt-core/user-management/services/mkt-user-creation.service';
import { MktUserOutputBuilderService } from 'src/mkt-core/user-management/services/mkt-user-output-builder.service';
import { MktWorkspaceMemberService } from 'src/mkt-core/user-management/services/mkt-workspace-member.service';

@Injectable()
export class MktUserOrchestratorService {
  private readonly logger = new Logger(MktUserOrchestratorService.name);

  constructor(
    private readonly mktUserCreationService: MktUserCreationService,
    private readonly mktWorkspaceMemberService: MktWorkspaceMemberService,
    private readonly mktPasswordService: MktPasswordService,
    private readonly mktEmailNotificationService: MktEmailNotificationService,
    private readonly mktUserCleanupService: MktUserCleanupService,
    private readonly mktUserOutputBuilderService: MktUserOutputBuilderService,
  ) {}

  async createCompleteUser(
    workspaceId: string,
    input: CreateUserInput,
  ): Promise<UserOutput> {
    const passwordRandom = this.mktPasswordService.generatePassword();
    const email = input.email;

    let coreUserId: string | undefined;
    let userWorkspaceId: string | undefined;

    try {
      const coreUser = await this.createCoreUserStep(
        email,
        input,
        passwordRandom,
      );

      coreUserId = coreUser.id;

      const userWorkspace = await this.createUserWorkspaceStep(
        coreUser.id,
        workspaceId,
        input,
      );

      userWorkspaceId = userWorkspace.id;

      const savedWorkspaceMember = await this.createWorkspaceMemberStep(
        workspaceId,
        coreUserId,
        email,
        input,
      );

      await this.sendWelcomeEmailStep(workspaceId, email, passwordRandom);

      return this.mktUserOutputBuilderService.buildUserOutput(
        savedWorkspaceMember,
        email,
        input,
      );
    } catch (error) {
      await this.mktUserCleanupService.cleanupOnError(
        coreUserId,
        userWorkspaceId,
        workspaceId,
      );
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  private async createCoreUserStep(
    email: string,
    input: CreateUserInput,
    password: string,
  ) {
    return await this.mktUserCreationService.createCoreUser(
      email,
      input.firstName || '',
      input.lastName || '',
      password,
      input.avatarUrl || undefined,
    );
  }

  private async createUserWorkspaceStep(
    userId: string,
    workspaceId: string,
    input: CreateUserInput,
  ) {
    const userWorkspace = await this.mktUserCreationService.createUserWorkspace(
      userId,
      workspaceId,
      input.avatarUrl || undefined,
    );

    await this.mktUserCreationService.assignRole(
      userWorkspace.id,
      workspaceId,
      input.roleId,
    );

    return userWorkspace;
  }

  private async createWorkspaceMemberStep(
    workspaceId: string,
    userId: string,
    email: string,
    input: CreateUserInput,
  ) {
    return await this.mktWorkspaceMemberService.createWorkspaceMember(
      workspaceId,
      {
        name: {
          firstName: input.firstName || '',
          lastName: input.lastName || '',
        },
        position: input.position != null ? Number(input.position) : 0,
        colorScheme: 'Light',
        locale: (input.language || 'en') as keyof typeof APP_LOCALES,
        avatarUrl: input.avatarUrl ?? '',
        userId,
        userEmail: email,
        calendarStartDay: input.calendarStartDay ?? 7,
        timeZone: 'SYSTEM',
        dateFormat: 'SYSTEM',
        timeFormat: 'SYSTEM',
        teamId: input.teamId ?? null,
        status: input.status ?? '',
        memberType: input.memberType ?? '',
        employmentStatusId: input.employmentStatusId ?? null,
        organizationLevelId: input.organizationLevelId ?? null,
      },
    );
  }

  private async sendWelcomeEmailStep(
    workspaceId: string,
    email: string,
    password: string,
  ) {
    try {
      await this.mktEmailNotificationService.sendWelcomeEmail(
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
}
