import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { APP_LOCALES } from 'twenty-shared/translations';
import { Repository } from 'typeorm';

import { hashPassword } from 'src/engine/core-modules/auth/auth.util';
import { EmailService } from 'src/engine/core-modules/email/email.service';
import { ConflictError } from 'src/engine/core-modules/graphql/utils/graphql-errors.util';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserWorkspace } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { User } from 'src/engine/core-modules/user/user.entity';
import { RoleTargetsEntity } from 'src/engine/metadata-modules/role/role-targets.entity';
import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';
import { CreateUserInput } from 'src/mkt-core/user-management/dto/create-user.input';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

import {
  SendEmailToolException,
  SendEmailToolExceptionCode,
} from 'src/engine/core-modules/tool/tools/send-email-tool/exceptions/send-email-tool.exception';
import { MktSendmailTemplateWorkspaceEntity } from 'src/mkt-core/mkt-sendmail-template/mkt-sendmail-template.workpace-entity';
import { UserOutput } from './dto/user.output';

@Injectable()
export class UserManagementService {
  private readonly logger = new Logger(UserManagementService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    @InjectRepository(User, 'core')
    private readonly userRepository: Repository<User>,
    private readonly workspaceDataSourceService: WorkspaceDataSourceService,
    private readonly emailService: EmailService,
    private readonly twentyConfigService: TwentyConfigService,
  ) {}

  generatePassword(length = 12): string {
    if (length < 8 || length > 16) {
      this.logger.error('Password length must be between 8 and 16 characters');
      throw new Error('Password length must be between 8 and 16 characters');
    }

    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '@$!%*?&';
    const all = upper + lower + digits + special;

    // Đảm bảo mỗi nhóm có ít nhất 1 ký tự
    const password = [
      upper[Math.floor(Math.random() * upper.length)],
      lower[Math.floor(Math.random() * lower.length)],
      digits[Math.floor(Math.random() * digits.length)],
      special[Math.floor(Math.random() * special.length)],
    ];

    // Thêm các ký tự ngẫu nhiên còn lại
    for (let i = password.length; i < length; i++) {
      password.push(all[Math.floor(Math.random() * all.length)]);
    }

    // Trộn ngẫu nhiên
    for (let i = password.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [password[i], password[j]] = [password[j], password[i]];
    }

    return password.join('');
  }

  // Tạo mới user trong core + tạo userWorkspace + tạo workspaceMember
  async createPersonUser(
    workspaceId: string,
    input: CreateUserInput,
  ): Promise<UserOutput> {
    const email = input.email;
    const existing = await this.userRepository.findOne({ where: { email } });

    if (existing) {
      this.logger.warn(`Attempt to create user with existing email: ${email}`);
      throw new ConflictError('An account already exists with this email.');
    }

    const mainDataSource =
      await this.workspaceDataSourceService.connectToMainDataSource();

    if (!mainDataSource) {
      this.logger.error('Could not connect to main data source');
      throw new InternalServerErrorException(
        'Could not connect to main data source',
      );
    }

    let coreUserId: string | undefined;
    let userWorkspaceId: string | undefined;

    const passwordRandom = this.generatePassword();

    await mainDataSource.transaction(
      async (entityManager: WorkspaceEntityManager) => {
        const userRepo = entityManager.getRepository(User);
        const userWorkspaceRepo = entityManager.getRepository(UserWorkspace);
        const roleTargetsRepo = entityManager.getRepository(RoleTargetsEntity);

        // 2) Tạo core.user
        const coreUser = await userRepo.save({
          email,
          firstName: input.firstName || '',
          lastName: input.lastName || '',
          passwordHash: await hashPassword(passwordRandom),
          isEmailVerified: false,
          canImpersonate: input.canImpersonate,
          canAccessFullAdminPanel: input.canAdmin || false,
          locale: input.language,
          defaultAvatarUrl: input.avatarUrl || undefined,
        });

        coreUserId = coreUser.id;
        // 3) Tạo core.userWorkspace
        const userWorkspace = await userWorkspaceRepo.save({
          userId: coreUser.id,
          workspaceId,
          locale: input.language as keyof typeof APP_LOCALES,
          defaultAvatarUrl: input.avatarUrl || undefined,
        });

        // 4) Tạo roleTargets
        await roleTargetsRepo.save({
          userWorkspaceId: userWorkspace.id,
          workspaceId,
          roleId: input.roleId,
        });

        if (!userWorkspace) {
          this.logger.error('Could not create user workspace');
          throw new InternalServerErrorException(
            'Could not create user workspace',
          );
        }
        userWorkspaceId = userWorkspace.id;
      },
    );

    const workspaceMemberRepo =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<WorkspaceMemberWorkspaceEntity>(
        workspaceId,
        'workspaceMember',
        { shouldBypassPermissionChecks: true },
      );
    let savedWorkspaceMember: WorkspaceMemberWorkspaceEntity;
    try {
      savedWorkspaceMember = await workspaceMemberRepo.save({
        name: {
          firstName: input.firstName || '',
          lastName: input.lastName || '',
        },
        position: input.position != null ? Number(input.position) : 0,
        colorScheme: 'Light',
        locale: (input.language || 'en') as keyof typeof APP_LOCALES,
        avatarUrl: input.avatarUrl ?? '',
        userId: coreUserId as string,
        userEmail: email,
        calendarStartDay: input.calendarStartDay ?? 7,
        timeZone: 'SYSTEM',
        dateFormat: 'SYSTEM',
        timeFormat: 'SYSTEM',
        departmentId: input.departmentId ?? null,
        employmentStatusId: input.employmentStatusId ?? null,
        organizationLevelId: input.organizationLevelId ?? null,
      });
    } catch (error) {
      this.logger.error(
        'Failed to create workspace member, rolling back core creations',
        error,
      );
      // Compensate: rollback core creations if workspace step fails
      await mainDataSource.transaction(
        async (entityManager: WorkspaceEntityManager) => {
          const userWorkspaceRepository =
            entityManager.getRepository(UserWorkspace);
          const userRepository = entityManager.getRepository(User);

          if (userWorkspaceId) {
            await userWorkspaceRepository.delete({ id: userWorkspaceId });
          }
          if (coreUserId) {
            await userRepository.delete({ id: coreUserId });
          }
        },
      );
      throw new InternalServerErrorException(
        'Failed to create workspace member',
      );
    }

    const sendmailTemplateRepo =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktSendmailTemplateWorkspaceEntity>(
        workspaceId,
        'mktSendmailTemplate',
        { shouldBypassPermissionChecks: true },
      );
    const sendmailTemplate = await sendmailTemplateRepo.findOne({
      where: {
        type: 'WELCOME_EMAIL',
        language: input.language as keyof typeof APP_LOCALES,
      },
    });

    if (!sendmailTemplate) {
      this.logger.error('Sendmail template not found');
      throw new InternalServerErrorException('Sendmail template not found');
    }
    try {
      await this.emailService.send({
        from: `${this.twentyConfigService.get('EMAIL_FROM_NAME')} <${this.twentyConfigService.get('EMAIL_FROM_ADDRESS')}>`,
        to: email,
        subject: sendmailTemplate.subject,
        html: sendmailTemplate.body.replace('{{password}}', passwordRandom),
      });
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
