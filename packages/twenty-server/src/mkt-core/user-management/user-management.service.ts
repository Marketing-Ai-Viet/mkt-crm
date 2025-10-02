import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hashPassword } from 'src/engine/core-modules/auth/auth.util';
import { ConflictError } from 'src/engine/core-modules/graphql/utils/graphql-errors.util';
import { UserWorkspace } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { UserWorkspaceService } from 'src/engine/core-modules/user-workspace/user-workspace.service';
import { User } from 'src/engine/core-modules/user/user.entity';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';
import { CreateUserInput } from 'src/mkt-core/user-management/dto/create-user.input';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
import { APP_LOCALES } from 'twenty-shared/translations';
import { Repository } from 'typeorm';
import { UserOutput } from './dto/user.output';

@Injectable()
export class UserManagementService {
  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    @InjectRepository(User, 'core')
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserWorkspace, 'core')
    private readonly userWorkspaceRepository: Repository<UserWorkspace>,
    private readonly userWorkspaceService: UserWorkspaceService,
    private readonly userRoleService: UserRoleService,
    private readonly workspaceDataSourceService: WorkspaceDataSourceService,
  ) {}

  // Tạo mới user trong core + tạo userWorkspace + tạo workspaceMember
  async createPersonUser(
    workspaceId: string,
    input: CreateUserInput,
  ): Promise<UserOutput> {
    // 1) Check trùng email
    const email = input.email;
    const existing = await this.userRepository.findOne({ where: { email } });

    if (existing)
      throw new ConflictError('An account already exists with this email.');
    const mainDataSource =
      await this.workspaceDataSourceService.connectToMainDataSource();
    if (!mainDataSource) {
      throw new InternalServerErrorException(
        'Could not connect to main data source',
      );
    }

    let coreUserId: string | undefined;
    let userWorkspaceId: string | undefined;

    await mainDataSource.transaction(
      async (entityManager: WorkspaceEntityManager) => {
        const userRepo = entityManager.getRepository(User);
        const userWorkspaceRepo = entityManager.getRepository(UserWorkspace);
        // 2) Tạo core.user
        const coreUser = await userRepo.save({
          email,
          firstName: input.firstName || '',
          lastName: input.lastName || '',
          passwordHash: await hashPassword(input.password || ''),
          isEmailVerified: false,
          canImpersonate: input.canImpersonate,
          canAccessFullAdminPanel: input.canAdmin || false,
          locale: input.language || 'en',
          defaultAvatarUrl: input.avatarUrl || undefined,
        });

        coreUserId = coreUser.id;
        // 3) Tạo core.userWorkspace
        const userWorkspace = await userWorkspaceRepo.save({
          userId: coreUser.id,
          workspaceId,
          locale: (input.language || 'en') as keyof typeof APP_LOCALES,
          defaultAvatarUrl: input.avatarUrl || undefined,
        });

        if (!userWorkspace) {
          throw new InternalServerErrorException(
            'Could not create user workspace',
          );
        }
        userWorkspaceId = userWorkspace.id;
      },
    );
    // 4) Tạo workspaceMember (bypass permission)

    const workspaceMemberRepo =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<WorkspaceMemberWorkspaceEntity>(
        workspaceId,
        'workspaceMember',
        { shouldBypassPermissionChecks: true },
      );

    let savedWorkspaceMember;

    try {
      savedWorkspaceMember = await workspaceMemberRepo.save({
        name: {
          firstName: input.firstName || '',
          lastName: input.lastName || '',
        },
        position: input.position != null ? Number(input.position) : 0,
        colorScheme: input.colorScheme ?? 'System',
        locale: (input.language || 'en') as keyof typeof APP_LOCALES,
        avatarUrl: input.avatarUrl ?? '',
        userId: coreUserId as string,
        userEmail: email,
        calendarStartDay: input.calendarStartDay ?? 7,
        timeZone: input.timeZone ?? 'system',
        dateFormat: input.dateFormat ?? 'SYSTEM',
        timeFormat: input.timeFormat ?? 'SYSTEM',
        departmentId: input.departmentId ?? null,
        employmentStatusId: input.employmentStatusId ?? null,
        organizationLevelId: input.organizationLevelId ?? null,
      });
    } catch (error) {
      // Compensate: rollback core creations if workspace step fails
      await mainDataSource.transaction(async (em: WorkspaceEntityManager) => {
        const uwRepo = em.getRepository(UserWorkspace);
        const uRepo = em.getRepository(User);

        if (userWorkspaceId) {
          await uwRepo.delete({ id: userWorkspaceId });
        }
        if (coreUserId) {
          await uRepo.delete({ id: coreUserId });
        }
      });
      throw new InternalServerErrorException(
        'Failed to create workspace member',
      );
    }

    if (!savedWorkspaceMember) {
      throw new InternalServerErrorException(
        'savedWorkspaceMember is undefined',
      );
    }

    return {
      email,
      firstName: savedWorkspaceMember.name?.firstName || '',
      lastName: savedWorkspaceMember.name?.lastName || '',
      canImpersonate: input.canImpersonate,
      isEmailVerified: false,
      jobTitle: input.jobTitle || '',
      city: input.city || '',
      phone: input.phone || '',
      canAdmin: input.canAdmin || false,
      language: savedWorkspaceMember.locale || input.language || 'en',
      avatarUrl: savedWorkspaceMember.avatarUrl || input.avatarUrl || undefined,
    };
  }
}
