import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { APP_LOCALES } from 'twenty-shared/translations';
import { Repository } from 'typeorm';

import { hashPassword } from 'src/engine/core-modules/auth/auth.util';
import { EmailService } from 'src/engine/core-modules/email/email.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserWorkspace } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { User } from 'src/engine/core-modules/user/user.entity';
import { RoleTargetsEntity } from 'src/engine/metadata-modules/role/role-targets.entity';
import { RoleEntity } from 'src/engine/metadata-modules/role/role.entity';
import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { WorkspaceCacheStorageService } from 'src/engine/workspace-cache-storage/workspace-cache-storage.service';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MKT_SENDMAIL_TEMPLATE_TYPE } from 'src/mkt-core/dev-seeder/constants/mkt-sendmail-template-seeds.constant.ts';
import { MktSendmailTemplateWorkspaceEntity } from 'src/mkt-core/mkt-sendmail-template/mkt-sendmail-template.workpace-entity';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

@Injectable()
export class MktPeopleSyncService {
  private readonly logger = new Logger(MktPeopleSyncService.name);
  private saleRoleId: string | null = null;
  private supportRoleId: string | null = null;

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    @InjectRepository(User, 'core')
    private readonly userRepository: Repository<User>,
    @InjectRepository(RoleEntity, 'core')
    private readonly roleRepo: Repository<RoleEntity>,
    private readonly workspaceDataSourceService: WorkspaceDataSourceService,
    private readonly emailService: EmailService,
    private readonly twentyConfigService: TwentyConfigService,
    private readonly mktRepo: MktRepositoryService,
    private readonly workspaceCacheStorageService: WorkspaceCacheStorageService,
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

  async syncPeopleToUsers(workspaceId: string): Promise<void> {
    this.logger.log(`Starting people sync for workspace: ${workspaceId}`);

    try {
      // get repository for people in workspace
      const peopleRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<PersonWorkspaceEntity>(
          workspaceId,
          'person',
          { shouldBypassPermissionChecks: true },
        );

      const roleEntities = await this.roleRepo
        .createQueryBuilder('role')
        .where('role.label IN (:...labels)', { labels: ['Sales', 'Support'] })
        .getMany();

      for (const roleEntity of roleEntities) {
        if (roleEntity.label === 'Sales') {
          this.saleRoleId = roleEntity.id;
        } else if (roleEntity.label === 'Support') {
          this.supportRoleId = roleEntity.id;
        }
      }

      this.logger.log(
        `Using Sale Role ID: ${this.saleRoleId}, Support Role ID: ${this.supportRoleId}`,
      );

      // Get all people with email that might need user creation
      const peopleWithEmails = await peopleRepository
        .createQueryBuilder('person')
        .where('person.emailsPrimaryEmail IS NOT NULL')
        .andWhere("person.emailsPrimaryEmail != ''")
        .andWhere('person.memberType in (:...memberTypes)', {
          memberTypes: ['SALES', 'SUPPORT'],
        }) // Only get people with memberType 'SALES' or 'SUPPORT'
        .getMany();

      this.logger.log(
        `Found ${peopleWithEmails.length} people with emails in workspace: ${workspaceId}`,
      );

      if (peopleWithEmails.length === 0) {
        this.logger.log(
          `No people with emails found for workspace: ${workspaceId}`,
        );

        return;
      }

      // Check which people don't have corresponding users
      const peopleWithoutUsers = [];

      for (const person of peopleWithEmails) {
        const email = person.emails?.primaryEmail;

        if (email) {
          const existingUser = await this.userRepository.findOne({
            where: { email },
          });

          if (!existingUser) {
            peopleWithoutUsers.push(person);
          }
        }
      }

      if (peopleWithoutUsers.length === 0) {
        this.logger.log(
          `No people found that need user creation for workspace: ${workspaceId}`,
        );

        return;
      }

      this.logger.log(
        `Found ${peopleWithoutUsers.length} people to create users for`,
      );

      let successCount = 0;
      let failureCount = 0;

      for (const person of peopleWithoutUsers) {
        try {
          await this.createUserFromPerson(workspaceId, person);
          successCount++;
          this.logger.log(
            `Successfully created user for person: ${person.emails?.primaryEmail || 'unknown'}`,
          );
        } catch (error) {
          failureCount++;
          this.logger.error(
            `Failed to create user for person ${person.emails?.primaryEmail || 'unknown'}:`,
            error,
          );
        }
      }
      await this.workspaceCacheStorageService.flush(workspaceId, undefined);
      this.logger.log(
        `People sync completed for workspace ${workspaceId}: ${successCount} successful, ${failureCount} failed`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to sync people for workspace ${workspaceId}:`,
        error,
      );
      throw error;
    }
  }

  private async createUserFromPerson(
    workspaceId: string,
    person: PersonWorkspaceEntity,
  ): Promise<void> {
    const email = person.emails?.primaryEmail;

    if (!email) {
      throw new Error('Person does not have a primary email');
    }

    // User existence already checked in syncPeopleToUsers

    const mainDataSource =
      await this.workspaceDataSourceService.connectToMainDataSource();

    if (!mainDataSource) {
      this.logger.error('Could not connect to main data source');
      throw new Error('Could not connect to main data source');
    }

    let coreUserId: string | undefined;
    let userWorkspaceId: string | undefined;

    const passwordRandom = this.generatePassword();

    await mainDataSource.transaction(
      async (entityManager: WorkspaceEntityManager) => {
        const userRepo = entityManager.getRepository(User);
        const userWorkspaceRepo = entityManager.getRepository(UserWorkspace);
        const roleTargetsRepo = entityManager.getRepository(RoleTargetsEntity);
        const workspaceRepo = entityManager.getRepository('Workspace');

        // 1) create core.user
        const coreUser = await userRepo.save({
          email,
          firstName: person.name?.firstName || '',
          lastName: person.name?.lastName || '',
          passwordHash: await hashPassword(passwordRandom),
          isEmailVerified: true,
          canImpersonate: false,
          canAccessFullAdminPanel: false,
          locale: 'en',
          defaultAvatarUrl: person.avatarUrl || undefined,
        });

        coreUserId = coreUser.id;

        // 2) create core.userWorkspace
        const userWorkspace = await userWorkspaceRepo.save({
          userId: coreUser.id,
          workspaceId,
          locale: 'en' as keyof typeof APP_LOCALES,
          defaultAvatarUrl: person.avatarUrl || undefined,
        });

        userWorkspaceId = userWorkspace.id;

        // 3) get defaultRoleId from workspace

        let roleId = null;

        switch (person.memberType) {
          case 'SALES':
            roleId = this.saleRoleId;
            break;
          case 'SUPPORT':
            roleId = this.supportRoleId;
            break;
          default: {
            const workspace = await workspaceRepo.findOne({
              where: { id: workspaceId },
            });

            if (workspace?.defaultRoleId) {
              roleId = workspace.defaultRoleId;
            }
          }
        }

        if (roleId) {
          await roleTargetsRepo.save({
            userWorkspaceId: userWorkspace.id,
            workspaceId,
            roleId,
          });
        }
      },
    );

    // 4) create workspace member
    const workspaceMemberRepo =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<WorkspaceMemberWorkspaceEntity>(
        workspaceId,
        'workspaceMember',
        { shouldBypassPermissionChecks: true },
      );

    try {
      await workspaceMemberRepo.save({
        name: {
          firstName: person.name?.firstName || '',
          lastName: person.name?.lastName || '',
        },
        position: person.position || 0,
        memberType: person.memberType,
        colorScheme: 'Light',
        locale: 'en' as keyof typeof APP_LOCALES,
        avatarUrl: person.avatarUrl ?? '',
        userId: coreUserId as string,
        userEmail: email,
        calendarStartDay: 7,
        timeZone: 'SYSTEM',
        dateFormat: 'SYSTEM',
        timeFormat: 'SYSTEM',
        departmentId: null,
        employmentStatusId: null,
        organizationLevelId: null,
      });
    } catch (error) {
      this.logger.error(
        'Failed to create workspace member, rolling back core creations',
        error,
      );

      // Rollback core creations if workspace step fails
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
      throw error;
    }

    // 5) Send welcome email (optional)
    try {
      await this.sendWelcomeEmail(workspaceId, email, passwordRandom);
    } catch (error) {
      this.logger.error(
        'User created successfully, but failed to send welcome email',
        error,
      );
      // Do not throw error here to avoid rolling back user creation
    }
  }

  private async sendWelcomeEmail(
    workspaceId: string,
    email: string,
    password: string,
  ): Promise<void> {
    try {
      const sendmailTemplateRepo =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktSendmailTemplateWorkspaceEntity>(
          workspaceId,
          'mktSendmailTemplate',
          { shouldBypassPermissionChecks: true },
        );

      const sendmailTemplate = await sendmailTemplateRepo.findOne({
        where: {
          type: MKT_SENDMAIL_TEMPLATE_TYPE.WELCOME_EMAIL,
          language: 'en' as keyof typeof APP_LOCALES,
        },
      });

      if (!sendmailTemplate) {
        this.logger.warn('Welcome email template not found');

        return;
      }

      await this.emailService.send({
        from: `${this.twentyConfigService.get('EMAIL_FROM_NAME')} <${this.twentyConfigService.get('EMAIL_FROM_ADDRESS')}>`,
        to: email,
        subject: sendmailTemplate.subject,
        html: sendmailTemplate.body.replace('{{password}}', password),
      });

      this.logger.log(`Welcome email sent to: ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}:`, error);
      throw error;
    }
  }

  async processAllWorkspaces(): Promise<void> {
    this.logger.log('Starting people sync for all workspaces');

    try {
      // Lấy danh sách tất cả workspaces có people với email
      // Note: Cần implement logic để lấy tất cả workspaces
      // Tạm thời chỉ log warning
      this.logger.warn(
        'processAllWorkspaces not fully implemented - requires workspace enumeration logic',
      );
    } catch (error) {
      this.logger.error(
        'Failed to process people sync for all workspaces:',
        error,
      );
      throw error;
    }
  }
}
