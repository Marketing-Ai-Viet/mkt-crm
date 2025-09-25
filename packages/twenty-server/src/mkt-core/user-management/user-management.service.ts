import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { APP_LOCALES } from 'twenty-shared/translations';
import { Repository } from 'typeorm';

import { hashPassword } from 'src/engine/core-modules/auth/auth.util';
import { UserWorkspace } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { User } from 'src/engine/core-modules/user/user.entity';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { CreateUserInput } from 'src/mkt-core/user-management/dto/create-user.input';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

import { ConflictError } from 'src/engine/core-modules/graphql/utils/graphql-errors.util';
import { UserWorkspaceService } from 'src/engine/core-modules/user-workspace/user-workspace.service';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
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
  ) {}
  // Tạo mới user trong core + tạo userWorkspace + tạo workspaceMember
  async createPersonUser(
    workspaceId: string,
    input: CreateUserInput,
  ): Promise<UserOutput> {
    // 1) Check trùng email
    const email = input.email.toLowerCase();
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing)
      throw new ConflictError('Tài khoản đã tồn tại với email này.');

    // 2) Tạo core.user
    const coreUser = await this.userRepository.save(
      this.userRepository.create({
        email,
        firstName: input.firstName || '',
        lastName: input.lastName || '',
        passwordHash: await hashPassword(input.password || ''),
        isEmailVerified: false,
        canImpersonate: input.canImpersonate,
        canAccessFullAdminPanel: input.canAdmin || false,
        locale: input.language || 'en',
        defaultAvatarUrl: input.avatarUrl || undefined,
      }),
    );

    // 3) Tạo core.userWorkspace
    const userWorkspace = await this.userWorkspaceRepository.save({
      userId: coreUser.id,
      workspaceId,
      locale: (input.language || 'en') as keyof typeof APP_LOCALES,
      defaultAvatarUrl: input.avatarUrl || undefined,
    });

    // 4) Tạo workspaceMember (bypass permission)
    const workspaceMemberRepo =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<WorkspaceMemberWorkspaceEntity>(
        workspaceId,
        'workspaceMember',
        { shouldBypassPermissionChecks: true },
      );

    const savedWorkspaceMember = await workspaceMemberRepo.save({
      name: {
        firstName: input.firstName || '',
        lastName: input.lastName || '',
      },
      position: input.position != null ? Number(input.position) : 0,
      colorScheme: input.colorScheme ?? 'System',
      locale: (input.language || 'en') as keyof typeof APP_LOCALES,
      avatarUrl: input.avatarUrl ?? '',
      userId: coreUser.id,
      userEmail: email,
      calendarStartDay: input.calendarStartDay ?? 7,
      timeZone: input.timeZone ?? 'system',
      dateFormat: input.dateFormat ?? 'SYSTEM',
      timeFormat: input.timeFormat ?? 'SYSTEM',
      departmentId: input.departmentId ?? null,
      employmentStatusId: input.employmentStatusId ?? null,
      organizationLevelId: input.organizationLevelId ?? null,
    });

    // 5) (Tùy chọn) Gán role nếu có
    const roleIdToAssign =
      input.roleId ?? (input.canAdmin ? 'ADMIN_ROLE_ID' : undefined);
    console.log(
      '🚀 ~ UserManagementService ~ createPersonUser ~ roleIdToAssign:',
      roleIdToAssign,
    );
    if (roleIdToAssign) {
      try {
        await this.userRoleService.assignRoleToUserWorkspace({
          userWorkspaceId: userWorkspace.id,
          workspaceId,
          roleId: roleIdToAssign,
        });
      } catch (e) {
        // không rollback, chỉ log để biết gán role thất bại
        console.warn(`Assign role failed`, e);
        throw e;
      }
    }

    // 6) Trả kết quả
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
