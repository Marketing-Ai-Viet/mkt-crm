import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { APP_LOCALES } from 'twenty-shared/translations';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import { Repository } from 'typeorm';

import { hashPassword } from 'src/engine/core-modules/auth/auth.util';
import { EmailService } from 'src/engine/core-modules/email/email.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserWorkspace } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { User } from 'src/engine/core-modules/user/user.entity';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { RoleTargetsEntity } from 'src/engine/metadata-modules/role/role-targets.entity';
import { RoleEntity } from 'src/engine/metadata-modules/role/role.entity';
import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { WorkspaceCacheStorageService } from 'src/engine/workspace-cache-storage/workspace-cache-storage.service';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MKT_SENDMAIL_TEMPLATE_TYPE } from 'src/mkt-core/dev-seeder/constants/mkt-sendmail-template-seeds.constant.ts';
import { MktDepartmentHierarchyWorkspaceEntity } from 'src/mkt-core/mkt-department-hierarchy/mkt-department-hierarchy.workspace-entity';
import { MktDepartmentWorkspaceEntity } from 'src/mkt-core/mkt-department/mkt-department.workspace-entity';
import { MktSendmailTemplateWorkspaceEntity } from 'src/mkt-core/mkt-sendmail-template/mkt-sendmail-template.workpace-entity';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

@Injectable()
export class MktPeopleSyncService {
  private readonly logger = new Logger(MktPeopleSyncService.name);
  private saleRoleId: string | null = null;
  private supportRoleId: string | null = null;
  private accountantRoleId: string | null = null;

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    @InjectRepository(User, 'core')
    private readonly userRepository: Repository<User>,
    @InjectRepository(Workspace, 'core')
    private readonly workspaceRepository: Repository<Workspace>,
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
        .where('role.label IN (:...labels)', {
          labels: ['Sales', 'Support', 'Accountant'],
        })
        .getMany();

      for (const roleEntity of roleEntities) {
        if (roleEntity.label === 'Sales') {
          this.saleRoleId = roleEntity.id;
        } else if (roleEntity.label === 'Support') {
          this.supportRoleId = roleEntity.id;
        } else if (roleEntity.label === 'Accountant') {
          this.accountantRoleId = roleEntity.id;
        }
      }

      this.logger.log(
        `Using Sale Role ID: ${this.saleRoleId}, Support Role ID: ${this.supportRoleId}`,
      );

      // Get all people with email that might need user creation
      // Only get people updated within the last 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      const peopleWithEmails = await peopleRepository
        .createQueryBuilder('person')
        .where('person.emailsPrimaryEmail IS NOT NULL')
        .andWhere('person.deletedAt IS NULL')
        .andWhere("person.emailsPrimaryEmail != ''")
        .andWhere('person.memberType in (:...memberTypes)', {
          memberTypes: ['SALES', 'SUPPORT', 'ACCOUNTANT'],
        }) // Only get people with memberType 'SALES' or 'SUPPORT'
        .andWhere('person.updatedAt >= :tenMinutesAgo', {
          tenMinutesAgo,
        }) // Only get people updated within the last 10 minutes
        .getMany();

      // Sync deleted people after syncing active people
      this.logger.log(
        `Starting deleted people sync within syncPeopleToUsers for workspace: ${workspaceId}`,
      );

      await this.syncDeletedPeople(workspaceId);

      this.logger.log(
        `Found ${peopleWithEmails.length} people with emails in workspace: ${workspaceId}`,
      );

      if (peopleWithEmails.length === 0) {
        this.logger.log(
          `No people with emails found for workspace: ${workspaceId}`,
        );

        return;
      }

      // Check which people don't have corresponding users and which need updates
      const peopleWithoutUsers = [];
      const peopleWithUsers = [];

      for (const person of peopleWithEmails) {
        const email = person.emails?.primaryEmail;

        if (email) {
          const existingUser = await this.userRepository.findOne({
            where: { email },
          });

          if (!existingUser) {
            peopleWithoutUsers.push(person);
          } else {
            peopleWithUsers.push({ person, user: existingUser });
          }
        }
      }

      this.logger.log(
        `Found ${peopleWithoutUsers.length} people to create users for`,
      );
      this.logger.log(
        `Found ${peopleWithUsers.length} people with existing users to update`,
      );

      let successCount = 0;
      let failureCount = 0;

      // Create new users
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

      // Update existing users
      for (const { person, user } of peopleWithUsers) {
        try {
          await this.updateWorkspaceMemberFromPerson(workspaceId, person, user);
          successCount++;
          this.logger.log(
            `Successfully updated workspace member for person: ${person.emails?.primaryEmail || 'unknown'}`,
          );
        } catch (error) {
          failureCount++;
          this.logger.error(
            `Failed to update workspace member for person ${person.emails?.primaryEmail || 'unknown'}:`,
            error,
          );
        }
      }

      await this.workspaceCacheStorageService.flush(workspaceId, undefined);
      this.logger.log(
        `People sync completed for workspace ${workspaceId}: ${successCount} successful operations (${peopleWithoutUsers.length} created, ${peopleWithUsers.length} updated), ${failureCount} failed`,
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
          case 'ACCOUNTANT':
            roleId = this.accountantRoleId;
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

    const { teamId, departmentId } =
      await this.getTeamDepartmentFromPerson(person);

    const supportForMemberId =
      person.memberType === 'SUPPORT' ? person.supportForMemberId : null;

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
        departmentId,
        teamId,
        employmentStatusId: null,
        organizationLevelId: null,
        startDate: person.startDate || null,
        endDate: person.endDate || null,
        status: person.status || null,
        supportForMemberId,
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

  private async updateWorkspaceMemberFromPerson(
    workspaceId: string,
    person: PersonWorkspaceEntity,
    user: User,
  ): Promise<void> {
    const email = person.emails?.primaryEmail;

    if (!email) {
      throw new Error('Person does not have a primary email');
    }

    const mainDataSource =
      await this.workspaceDataSourceService.connectToMainDataSource();

    if (!mainDataSource) {
      this.logger.error('Could not connect to main data source');
      throw new Error('Could not connect to main data source');
    }

    // Get workspace member repository
    const workspaceMemberRepo =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<WorkspaceMemberWorkspaceEntity>(
        workspaceId,
        'workspaceMember',
        { shouldBypassPermissionChecks: true },
      );

    // Find existing workspace member
    const existingMember = await workspaceMemberRepo.findOne({
      where: { userId: user.id },
    });

    if (!existingMember) {
      this.logger.warn(
        `No workspace member found for user ${email} in workspace ${workspaceId}`,
      );

      return;
    }

    const { teamId, departmentId } =
      await this.getTeamDepartmentFromPerson(person);

    const supportForMemberId =
      person.memberType === 'SUPPORT' ? person.supportForMemberId : null;

    // Update workspace member with new department and member type
    await workspaceMemberRepo.update(
      { id: existingMember.id },
      {
        memberType: person.memberType,
        departmentId,
        teamId,
        name: {
          firstName: person.name?.firstName || '',
          lastName: person.name?.lastName || '',
        },
        avatarUrl: person.avatarUrl ?? '',
        supportForMemberId,
        startDate: person.startDate || null,
        endDate: person.endDate || null,
        status: person.status || null,
      },
    );

    // Update role assignment
    await this.updateUserRole(workspaceId, user.id, person.memberType);

    this.logger.log(
      `Updated workspace member for user ${email}: memberType=${person.memberType}`,
    );
  }

  private async updateUserRole(
    workspaceId: string,
    userId: string,
    memberType: string,
  ): Promise<void> {
    const mainDataSource =
      await this.workspaceDataSourceService.connectToMainDataSource();

    if (!mainDataSource) {
      this.logger.error('Could not connect to main data source');
      throw new Error('Could not connect to main data source');
    }

    await mainDataSource.transaction(
      async (entityManager: WorkspaceEntityManager) => {
        const userWorkspaceRepo = entityManager.getRepository(UserWorkspace);
        const roleTargetsRepo = entityManager.getRepository(RoleTargetsEntity);
        const workspaceRepo = entityManager.getRepository('Workspace');

        // Find user workspace
        const userWorkspace = await userWorkspaceRepo.findOne({
          where: { userId, workspaceId },
        });

        if (!userWorkspace) {
          this.logger.warn(
            `No user workspace found for user ${userId} in workspace ${workspaceId}`,
          );

          return;
        }

        // Determine the new role ID based on member type
        let newRoleId = null;

        switch (memberType) {
          case 'SALES':
            newRoleId = this.saleRoleId;
            break;
          case 'SUPPORT':
            newRoleId = this.supportRoleId;
            break;
          case 'ACCOUNTANT':
            newRoleId = this.accountantRoleId;
            break;
          default: {
            const workspace = await workspaceRepo.findOne({
              where: { id: workspaceId },
            });

            if (workspace?.defaultRoleId) {
              newRoleId = workspace.defaultRoleId;
            }
          }
        }

        // Check current role assignment
        const currentRoleTarget = await roleTargetsRepo.findOne({
          where: {
            userWorkspaceId: userWorkspace.id,
            workspaceId,
          },
        });

        // Only update if role is different
        if (currentRoleTarget?.roleId !== newRoleId) {
          // Delete existing role assignments
          await roleTargetsRepo.delete({
            userWorkspaceId: userWorkspace.id,
            workspaceId,
          });

          // Assign new role if available
          if (newRoleId) {
            await roleTargetsRepo.save({
              userWorkspaceId: userWorkspace.id,
              workspaceId,
              roleId: newRoleId,
            });
          }

          this.logger.log(
            `Updated role for user ${userId}: ${currentRoleTarget?.roleId || 'none'} → ${newRoleId || 'none'}`,
          );
        } else {
          this.logger.log(
            `Role unchanged for user ${userId}: ${currentRoleTarget?.roleId || 'none'}`,
          );
        }
      },
    );
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

  /**
   * Xóa mềm user và xóa mềm workspace member
   */
  private async deleteUserAndWorkspaceMember(
    workspaceId: string,
    person: PersonWorkspaceEntity,
  ): Promise<void> {
    const email = person.emails?.primaryEmail;

    if (!email) {
      throw new Error('Person does not have a primary email');
    }

    this.logger.log(
      `Soft deleting user and workspace member for person: ${email} in workspace: ${workspaceId}`,
    );

    // Tìm user theo email
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      this.logger.warn(`User with email ${email} not found`);

      return;
    }

    const mainDataSource =
      await this.workspaceDataSourceService.connectToMainDataSource();

    if (!mainDataSource) {
      this.logger.error('Could not connect to main data source');
      throw new Error('Could not connect to main data source');
    }

    // Get workspace member repository
    const workspaceMemberRepo =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<WorkspaceMemberWorkspaceEntity>(
        workspaceId,
        'workspaceMember',
        { shouldBypassPermissionChecks: true },
      );

    // Tìm workspace member
    const workspaceMember = await workspaceMemberRepo.findOne({
      where: { userId: user.id },
    });

    if (workspaceMember) {
      // Xóa mềm workspace member
      await workspaceMemberRepo.softDelete(workspaceMember.id);
      this.logger.log(`Soft deleted workspace member for user: ${email}`);
    } else {
      this.logger.warn(
        `Workspace member not found for user: ${email} in workspace: ${workspaceId}`,
      );
    }

    await mainDataSource.transaction(
      async (entityManager: WorkspaceEntityManager) => {
        const userWorkspaceRepo = entityManager.getRepository(UserWorkspace);
        const roleTargetsRepo = entityManager.getRepository(RoleTargetsEntity);
        const userRepo = entityManager.getRepository(User);

        // Tìm và xóa user workspace (xóa cứng)
        const userWorkspace = await userWorkspaceRepo.findOne({
          where: { userId: user.id, workspaceId },
        });

        if (userWorkspace) {
          // Xóa role targets
          await roleTargetsRepo.delete({
            userWorkspaceId: userWorkspace.id,
            workspaceId,
          });

          // Xóa user workspace (xóa cứng)
          await userWorkspaceRepo.delete({ id: userWorkspace.id });
          this.logger.log(`Deleted user workspace for user: ${email}`);
        }

        // Kiểm tra xem user còn workspace nào khác không
        const remainingUserWorkspaces = await userWorkspaceRepo.find({
          where: { userId: user.id },
        });

        // Nếu không còn workspace nào khác, xóa mềm user
        if (remainingUserWorkspaces.length === 0) {
          await userRepo.softDelete({ id: user.id });
          this.logger.log(`Soft deleted user: ${email}`);
        } else {
          this.logger.log(
            `User ${email} still has ${remainingUserWorkspaces.length} other workspaces, not deleting user`,
          );
        }
      },
    );
  }

  /**
   * Đồng bộ xóa mềm users và workspace members từ danh sách people đã xóa trong 10 phút qua
   */
  async syncDeletedPeople(workspaceId: string): Promise<void> {
    this.logger.log(
      `Starting deleted people sync for workspace: ${workspaceId}`,
    );

    try {
      // Lấy danh sách people vừa xóa trong 10 phút qua
      const deletedPeople =
        await this.getDeletedPeopleInLast10Minutes(workspaceId);

      if (deletedPeople.length === 0) {
        this.logger.log(
          `No deleted people found in last 10 minutes for workspace: ${workspaceId}`,
        );

        return;
      }

      let successCount = 0;
      let failureCount = 0;

      // Xử lý từng person bị xóa
      for (const person of deletedPeople) {
        try {
          await this.deleteUserAndWorkspaceMember(workspaceId, person);
          successCount++;
          this.logger.log(
            `Successfully processed soft deletion for person: ${person.emails?.primaryEmail || 'unknown'}`,
          );
        } catch (error) {
          failureCount++;
          this.logger.error(
            `Failed to process soft deletion for person ${person.emails?.primaryEmail || 'unknown'}:`,
            error,
          );
        }
      }

      await this.workspaceCacheStorageService.flush(workspaceId, undefined);

      this.logger.log(
        `Deleted people sync completed for workspace ${workspaceId}: ${successCount} successful soft deletions, ${failureCount} failed`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to sync deleted people for workspace ${workspaceId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Lấy danh sách người vừa xóa trong 10 phút trước đến hiện tại theo deletedAt
   */
  async getDeletedPeopleInLast10Minutes(
    workspaceId: string,
  ): Promise<PersonWorkspaceEntity[]> {
    this.logger.log(
      `Getting deleted people in last 10 minutes for workspace: ${workspaceId}`,
    );

    try {
      const peopleRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<PersonWorkspaceEntity>(
          workspaceId,
          'person',
          { shouldBypassPermissionChecks: true },
        );

      // Lấy thời gian 10 phút trước đến hiện tại
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const now = new Date();

      // Tìm tất cả people có deletedAt trong 10 phút qua
      const deletedPeople = await peopleRepository
        .createQueryBuilder('person')
        .withDeleted() // Include soft deleted records
        .where('person.deletedAt IS NOT NULL')
        .andWhere('person.deletedAt >= :tenMinutesAgo', { tenMinutesAgo })
        .andWhere('person.deletedAt <= :now', { now })
        .andWhere('person.emailsPrimaryEmail IS NOT NULL')
        .andWhere("person.emailsPrimaryEmail != ''")
        .getMany();

      this.logger.log(
        `Found ${deletedPeople.length} people deleted in last 10 minutes in workspace: ${workspaceId}`,
      );

      return deletedPeople;
    } catch (error) {
      this.logger.error(
        `Failed to get deleted people for workspace ${workspaceId}:`,
        error,
      );
      throw error;
    }
  }

  async processAllWorkspaces(): Promise<void> {
    this.logger.log('Starting people sync for all workspaces');

    try {
      // Lấy danh sách tất cả workspaces active
      const workspaces = await this.workspaceRepository.find({
        where: {
          activationStatus: WorkspaceActivationStatus.ACTIVE, // Chỉ xử lý workspace đang active
        },
        select: ['id', 'displayName'],
      });

      this.logger.log(
        `Found ${workspaces.length} active workspaces to process`,
      );

      let successCount = 0;
      let failureCount = 0;

      // Xử lý từng workspace
      for (const workspace of workspaces) {
        try {
          this.logger.log(
            `Processing workspace: ${workspace.id} (${workspace.displayName})`,
          );

          // Sync people to users (bao gồm cả việc xóa mềm deleted people)
          await this.syncPeopleToUsers(workspace.id);

          successCount++;
          this.logger.log(`Successfully processed workspace: ${workspace.id}`);
        } catch (error) {
          failureCount++;
          this.logger.error(
            `Failed to process workspace ${workspace.id}:`,
            error,
          );
          // Tiếp tục xử lý workspace khác thay vì throw error
        }
      }

      this.logger.log(
        `People sync completed for all workspaces: ${successCount} successful, ${failureCount} failed`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to process people sync for all workspaces:',
        error,
      );
      throw error;
    }
  }

  private async findDepartmentByTeamId(teamId: string) {
    const teamRepo = await this.mktRepo.getRepository(
      MktDepartmentWorkspaceEntity,
    );
    const hiranchyRepo = await this.mktRepo.getRepository(
      MktDepartmentHierarchyWorkspaceEntity,
    );
    const team = await teamRepo.findOne({
      select: ['parentHierarchies'],
      where: { id: teamId },
      relations: ['parentHierarchies'],
    });
    const parentHierarchieId = team?.parentHierarchies?.[0]?.id;
    const hiranchy = await hiranchyRepo.findOne({
      select: ['parentDepartmentId'],
      where: { id: parentHierarchieId },
    });
    const departmentId = hiranchy?.parentDepartmentId;

    return departmentId ?? null;
  }

  private async getTeamDepartmentFromPerson(person: PersonWorkspaceEntity) {
    let departmentId = person.departmentId || null;
    const teamId = person.teamId || null;

    if (teamId && !departmentId) {
      departmentId = await this.findDepartmentByTeamId(teamId);
    }

    return { teamId, departmentId };
  }
}
