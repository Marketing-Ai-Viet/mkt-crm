import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';

import isEmail from 'validator/lib/isEmail';
import omitBy from 'lodash.omitby';
import { DataSource, Repository } from 'typeorm';
import { APP_LOCALES } from 'twenty-shared/translations';

import { hashPassword } from 'src/engine/core-modules/auth/auth.util';
import {
  ConflictError,
  NotFoundError,
} from 'src/engine/core-modules/graphql/utils/graphql-errors.util';
import {
  SendEmailToolException,
  SendEmailToolExceptionCode,
} from 'src/engine/core-modules/tool/tools/send-email-tool/exceptions/send-email-tool.exception';
import { UserWorkspace } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { User } from 'src/engine/core-modules/user/user.entity';
import { MEMBER_ROLE_LABEL } from 'src/engine/metadata-modules/permissions/constants/member-role-label.constants';
import { RoleTargetsEntity } from 'src/engine/metadata-modules/role/role-targets.entity';
import { RoleEntity } from 'src/engine/metadata-modules/role/role.entity';
import { MktDepartmentRepository } from 'src/mkt-core/mkt-department/repositories';
import { MktOrganizationLevelRepository } from 'src/mkt-core/mkt-organization-level/repositories';
import {
  MktPermissionTemplateRepository,
  MktUserPermissionTemplateRepository,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { MktEmploymentStatusRepository } from 'src/mkt-core/user-management/repositories/mkt-employment-status.repository';
import {
  CreateUserInput,
  DepartmentBasicOutput,
  EmploymentStatusBasicOutput,
  OrganizationLevelBasicOutput,
  PermissionTemplateBasicOutput,
  SearchUserInput,
  UpdateUserInput,
  UserListOutput,
  UserOutput,
} from 'src/mkt-core/user-management/dto';
import { EmailNotificationService } from 'src/mkt-core/user-management/services/email-notification.service';
import { WorkspaceMemberService } from 'src/mkt-core/user-management/services/workspace-member.service';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

// Validation error messages
const VALIDATION_MESSAGES = {
  DEPARTMENT_NOT_FOUND: (id: string) => `Department với ID ${id} không tồn tại`,
  PERMISSION_TEMPLATE_NOT_FOUND: (id: string) =>
    `Permission template với ID ${id} không tồn tại`,
  PERMISSION_TEMPLATE_INACTIVE: (id: string) =>
    `Permission template với ID ${id} không active`,
  ORGANIZATION_LEVEL_NOT_FOUND: (id: string) =>
    `Organization level với ID ${id} không tồn tại`,
  EMPLOYMENT_STATUS_NOT_FOUND: (id: string) =>
    `Employment status với ID ${id} không tồn tại`,
  INVALID_EMAIL: 'Email không hợp lệ',
} as const;

/**
 * Type for validated entities returned from validation
 */
type ValidatedEntities = {
  department: DepartmentBasicOutput;
  permissionTemplate: PermissionTemplateBasicOutput;
  organizationLevel: OrganizationLevelBasicOutput | null;
  employmentStatus: EmploymentStatusBasicOutput | null;
};

const PASSWORD_CHARS = {
  UPPER: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  LOWER: 'abcdefghijklmnopqrstuvwxyz',
  DIGITS: '0123456789',
  SPECIAL: '@$!%*?&',
} as const;

const DEFAULT_PASSWORD_LENGTH = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 16;

// Pagination constants
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MIN_PAGE = 1;
const MIN_LIMIT = 1;

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
    @InjectRepository(RoleEntity, 'core')
    private readonly roleRepository: Repository<RoleEntity>,
    private readonly workspaceMemberService: WorkspaceMemberService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly userPermissionTemplateRepository: MktUserPermissionTemplateRepository,
    private readonly departmentRepository: MktDepartmentRepository,
    private readonly permissionTemplateRepository: MktPermissionTemplateRepository,
    private readonly organizationLevelRepository: MktOrganizationLevelRepository,
    private readonly employmentStatusRepository: MktEmploymentStatusRepository,
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
    this.logger.log(
      `[CREATE USER] Received input: ${JSON.stringify({
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        departmentId: input.departmentId,
      })}`,
    );

    // Normalize email to lowercase
    const normalizedEmail = input.email.toLowerCase().trim();

    // Validate email format
    if (!isEmail(normalizedEmail)) {
      throw new BadRequestException(VALIDATION_MESSAGES.INVALID_EMAIL);
    }

    // Create normalized input
    const normalizedInput: CreateUserInput = {
      ...input,
      email: normalizedEmail,
    };

    // Validate input and fetch all related entities
    const validatedEntities =
      await this.validateCreateUserInput(normalizedInput);

    const existing = await this.findCoreUserByEmail(normalizedEmail);

    if (existing) {
      this.logger.warn(
        `Attempt to create user with existing email: ${normalizedEmail}`,
      );
      throw new ConflictError('An account already exists with this email.');
    }

    return this.createCompleteUser(
      workspaceId,
      normalizedInput,
      validatedEntities,
    );
  }

  /**
   * Update user (workspace member)
   */
  async updateUser(
    workspaceId: string,
    input: UpdateUserInput,
  ): Promise<UserOutput> {
    const {
      memberId,
      firstName,
      lastName,
      permissionTemplateId,
      departmentId,
      ...updateData
    } = input;

    const existingMember =
      await this.workspaceMemberService.findWorkspaceMemberById(
        workspaceId,
        memberId,
      );

    if (!existingMember) {
      throw new NotFoundError(`Workspace member not found: ${memberId}`);
    }

    // Validate departmentId if provided
    if (departmentId !== undefined) {
      await this.fetchAndValidateDepartment(departmentId);
    }

    // Validate permissionTemplateId if provided
    if (permissionTemplateId !== undefined) {
      await this.fetchAndValidatePermissionTemplate(permissionTemplateId);
    }

    // Chuẩn bị dữ liệu update với lodash omitBy
    const updatePayload = omitBy(
      {
        name:
          firstName !== undefined || lastName !== undefined
            ? {
                firstName: firstName ?? existingMember.name?.firstName ?? '',
                lastName: lastName ?? existingMember.name?.lastName ?? '',
              }
            : undefined,
        departmentId,
        ...updateData,
      },
      (value) => value === undefined,
    );

    await this.workspaceMemberService.updateWorkspaceMember(
      workspaceId,
      memberId,
      updatePayload,
    );

    // Handle permission template update
    if (permissionTemplateId !== undefined) {
      const effectiveDepartmentId = departmentId ?? existingMember.departmentId;

      if (effectiveDepartmentId) {
        await this.updatePermissionTemplate(
          workspaceId,
          memberId,
          permissionTemplateId,
          effectiveDepartmentId,
        );
      }
    }

    const updatedMember =
      await this.workspaceMemberService.findWorkspaceMemberById(
        workspaceId,
        memberId,
      );

    if (!updatedMember) {
      throw new InternalServerErrorException(
        'Failed to retrieve updated member',
      );
    }

    // Get permission template info for output
    const permissionAssignments =
      await this.userPermissionTemplateRepository.findActiveByWorkspaceMemberId(
        workspaceId,
        memberId,
      );

    return this.mapWorkspaceMemberToUserOutput(
      updatedMember,
      permissionAssignments[0],
    );
  }

  /**
   * Delete user (soft delete workspace member)
   */
  async deleteUser(workspaceId: string, memberId: string): Promise<boolean> {
    const existingMember =
      await this.workspaceMemberService.findWorkspaceMemberById(
        workspaceId,
        memberId,
      );

    if (!existingMember) {
      throw new NotFoundError(`Workspace member not found: ${memberId}`);
    }

    // Soft delete permission template assignments
    await this.deletePermissionTemplateAssignments(workspaceId, memberId);

    // Soft delete workspace member
    await this.workspaceMemberService.softDeleteWorkspaceMember(
      workspaceId,
      memberId,
    );

    // Soft delete user workspace và core user nếu cần
    if (existingMember.userId) {
      await this.deleteUserWorkspace(existingMember.userId, workspaceId);
      await this.softDeleteUserIfNoWorkspaces(existingMember.userId);
    }

    this.logger.log(`Deleted user (workspace member): ${memberId}`);

    return true;
  }

  /**
   * Search users (workspace members) với pagination
   * Validation được thực hiện ở service layer để đảm bảo limit không vượt quá MAX_LIMIT
   */
  async searchUsers(
    workspaceId: string,
    input: SearchUserInput,
  ): Promise<UserListOutput> {
    // Validate và normalize pagination params
    const page = Math.max(input.page ?? DEFAULT_PAGE, MIN_PAGE);
    const limit = Math.min(
      Math.max(input.limit ?? DEFAULT_LIMIT, MIN_LIMIT),
      MAX_LIMIT,
    );

    // Tạo input đã được validate
    const validatedInput: SearchUserInput = {
      ...input,
      page,
      limit,
    };

    const { items, total } =
      await this.workspaceMemberService.searchWorkspaceMembers(
        workspaceId,
        validatedInput,
      );

    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map((member) => this.mapWorkspaceMemberToUserOutput(member)),
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(
    workspaceId: string,
    memberId: string,
  ): Promise<UserOutput | null> {
    const member = await this.workspaceMemberService.findWorkspaceMemberById(
      workspaceId,
      memberId,
    );

    if (!member) {
      return null;
    }

    // Get permission template info
    const permissionAssignments =
      await this.userPermissionTemplateRepository.findActiveByWorkspaceMemberId(
        workspaceId,
        memberId,
      );

    return this.mapWorkspaceMemberToUserOutput(
      member,
      permissionAssignments[0],
    );
  }

  async findCoreUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
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

  /**
   * Generate password for user
   * @param options - Optional configuration
   * @param options.useEmailAsPassword - If provided, use this email as the password
   * @param options.length - Password length (default: 12, only used when generating random)
   * @returns Plain text password (will be hashed later)
   */
  generatePassword(options?: {
    useEmailAsPassword?: string;
    length?: number;
  }): string {
    // If email provided, use it as password
    if (options?.useEmailAsPassword) {
      return options.useEmailAsPassword;
    }

    // Generate random password
    const length = options?.length ?? DEFAULT_PASSWORD_LENGTH;

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

  // ==================== Validation ====================

  /**
   * Validate department exists and return department data
   */
  private async fetchAndValidateDepartment(
    departmentId: string,
  ): Promise<DepartmentBasicOutput> {
    const department = await this.departmentRepository.findById(departmentId);

    if (!department) {
      throw new NotFoundError(
        VALIDATION_MESSAGES.DEPARTMENT_NOT_FOUND(departmentId),
      );
    }

    return {
      id: department.id,
      departmentCode: department.departmentCode ?? '',
      departmentName: department.departmentName ?? '',
      departmentNameEn: department.departmentNameEn ?? undefined,
    };
  }

  /**
   * Validate permission template exists and is active, returns template data
   */
  private async fetchAndValidatePermissionTemplate(
    templateId: string,
  ): Promise<PermissionTemplateBasicOutput> {
    const template =
      await this.permissionTemplateRepository.findById(templateId);

    if (!template) {
      throw new NotFoundError(
        VALIDATION_MESSAGES.PERMISSION_TEMPLATE_NOT_FOUND(templateId),
      );
    }

    if (!template.isActive) {
      throw new NotFoundError(
        VALIDATION_MESSAGES.PERMISSION_TEMPLATE_INACTIVE(templateId),
      );
    }

    return {
      id: template.id,
      templateKey: template.templateKey,
      templateName: template.templateName,
      templateNameEn: template.templateNameEn ?? undefined,
    };
  }

  /**
   * Fetch organization level by ID (optional - returns null if not found or not provided)
   */
  private async fetchOrganizationLevel(
    organizationLevelId: string | undefined | null,
  ): Promise<OrganizationLevelBasicOutput | null> {
    if (!organizationLevelId) {
      return null;
    }

    const orgLevel =
      await this.organizationLevelRepository.findById(organizationLevelId);

    if (!orgLevel) {
      throw new NotFoundError(
        VALIDATION_MESSAGES.ORGANIZATION_LEVEL_NOT_FOUND(organizationLevelId),
      );
    }

    return {
      id: orgLevel.id,
      levelCode: orgLevel.levelCode ?? '',
      levelName: orgLevel.levelName ?? '',
      levelNameEn: orgLevel.levelNameEn ?? undefined,
      hierarchyLevel: orgLevel.hierarchyLevel ?? 0,
    };
  }

  /**
   * Fetch employment status by ID (optional - returns null if not found or not provided)
   */
  private async fetchEmploymentStatus(
    employmentStatusId: string | undefined | null,
  ): Promise<EmploymentStatusBasicOutput | null> {
    if (!employmentStatusId) {
      return null;
    }

    const empStatus =
      await this.employmentStatusRepository.findById(employmentStatusId);

    if (!empStatus) {
      throw new NotFoundError(
        VALIDATION_MESSAGES.EMPLOYMENT_STATUS_NOT_FOUND(employmentStatusId),
      );
    }

    return {
      id: empStatus.id,
      statusCode: empStatus.statusCode ?? '',
      statusName: empStatus.statusName ?? '',
      statusNameEn: empStatus.statusNameEn ?? undefined,
    };
  }

  /**
   * Validate user creation input and return all fetched entities
   */
  private async validateCreateUserInput(
    input: CreateUserInput,
  ): Promise<ValidatedEntities> {
    const [
      department,
      permissionTemplate,
      organizationLevel,
      employmentStatus,
    ] = await Promise.all([
      this.fetchAndValidateDepartment(input.departmentId),
      this.fetchAndValidatePermissionTemplate(input.permissionTemplateId),
      this.fetchOrganizationLevel(input.organizationLevelId),
      this.fetchEmploymentStatus(input.employmentStatusId),
    ]);

    return {
      department,
      permissionTemplate,
      organizationLevel,
      employmentStatus,
    };
  }

  // ==================== Private Methods ====================

  // TODO : Refactor to smaller methods and transaction wrapper core data source
  private async createCompleteUser(
    workspaceId: string,
    input: CreateUserInput,
    validatedEntities: ValidatedEntities,
  ): Promise<UserOutput> {
    // Find the Member role from role table
    const memberRole = await this.roleRepository.findOne({
      where: {
        workspaceId,
        label: MEMBER_ROLE_LABEL,
      },
    });

    if (!memberRole) {
      throw new InternalServerErrorException(
        `Role "${MEMBER_ROLE_LABEL}" not found in workspace ${workspaceId}`,
      );
    }

    const { email } = input;
    // Use email as default password (will be hashed)
    const password = this.generatePassword({ useEmailAsPassword: email });

    let coreUserId: string | undefined;
    let userWorkspaceId: string | undefined;

    try {
      const coreUser = await this.createCoreUser(
        email,
        input.firstName ?? '',
        input.lastName ?? '',
        password,
        input.avatarUrl ?? undefined,
      );

      coreUserId = coreUser.id;

      const userWorkspace = await this.createUserWorkspaceRecord(
        coreUser.id,
        workspaceId,
        input.avatarUrl ?? undefined,
      );

      userWorkspaceId = userWorkspace.id;

      await this.assignRole(userWorkspace.id, workspaceId, memberRole.id);

      const savedWorkspaceMember = await this.createWorkspaceMember(
        workspaceId,
        coreUser.id,
        email,
        input,
      );

      // Assign permission template to user in department
      await this.assignPermissionTemplate(
        workspaceId,
        savedWorkspaceMember.id,
        input.permissionTemplateId,
        input.departmentId,
      );

      await this.sendWelcomeEmail(workspaceId, email, password);

      return this.buildUserOutput(
        savedWorkspaceMember,
        email,
        input,
        validatedEntities,
      );
    } catch (error) {
      this.logger.error(
        `[CREATE USER] Error creating user: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
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

  /**
   * Assign permission template to user in specific department
   */
  private async assignPermissionTemplate(
    _workspaceId: string,
    workspaceMemberId: string,
    permissionTemplateId: string,
    departmentId: string,
    assignedById?: string,
  ): Promise<void> {
    await this.userPermissionTemplateRepository.create({
      workspaceMemberId,
      templateId: permissionTemplateId,
      departmentId,
      isActive: true,
      assignedAt: DateTimeUtils.toDateRequired(DateTimeUtils.now()),
      assignedById,
      expiresAt: undefined,
      assignmentReason: 'Initial user creation',
      position: 1,
    });

    this.logger.log(
      `Assigned permission template ${permissionTemplateId} to member ${workspaceMemberId} in department ${departmentId}`,
    );
  }

  /**
   * Update permission template assignment for user
   */
  private async updatePermissionTemplate(
    workspaceId: string,
    workspaceMemberId: string,
    newTemplateId: string,
    departmentId: string,
  ): Promise<void> {
    // Find existing assignment for this member in the department
    const assignments =
      await this.userPermissionTemplateRepository.findByWorkspaceMemberId(
        workspaceId,
        workspaceMemberId,
      );

    const existingAssignment = assignments.find(
      (a) => a.departmentId === departmentId,
    );

    if (existingAssignment) {
      // Update existing assignment
      await this.userPermissionTemplateRepository.update(
        existingAssignment.id,
        {
          templateId: newTemplateId,
        },
      );

      this.logger.log(
        `Updated permission template to ${newTemplateId} for member ${workspaceMemberId} in department ${departmentId}`,
      );
    } else {
      // Create new assignment
      await this.assignPermissionTemplate(
        workspaceId,
        workspaceMemberId,
        newTemplateId,
        departmentId,
      );
    }
  }

  /**
   * Deactivate all permission template assignments for user
   */
  private async deletePermissionTemplateAssignments(
    _workspaceId: string,
    workspaceMemberId: string,
  ): Promise<void> {
    await this.userPermissionTemplateRepository.deactivateByWorkspaceMemberId(
      workspaceMemberId,
    );

    this.logger.log(
      `Deactivated permission template assignments for member ${workspaceMemberId}`,
    );
  }

  private async createWorkspaceMember(
    _workspaceId: string,
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
      locale: 'en' as keyof typeof APP_LOCALES,
      avatarUrl: input.avatarUrl ?? '',
      userId,
      userEmail: email,
      calendarStartDay: input.calendarStartDay ?? 7,
      timeZone: 'SYSTEM',
      dateFormat: 'SYSTEM',
      timeFormat: 'SYSTEM',
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      status: input.status ?? '',
      memberType: input.memberType ?? '',
      employmentStatusId: input.employmentStatusId ?? null,
      organizationLevelId: input.organizationLevelId ?? null,
      departmentId: input.departmentId,
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
    validatedEntities: ValidatedEntities,
  ): UserOutput {
    const {
      department,
      permissionTemplate,
      organizationLevel,
      employmentStatus,
    } = validatedEntities;

    return {
      id: savedWorkspaceMember.id,
      email,
      firstName: savedWorkspaceMember.name?.firstName ?? '',
      lastName: savedWorkspaceMember.name?.lastName ?? '',
      startDate: savedWorkspaceMember.startDate,
      endDate: savedWorkspaceMember.endDate ?? null,
      jobTitle: input.jobTitle ?? '',
      city: input.city ?? '',
      phone: input.phone ?? '',
      language: savedWorkspaceMember.locale ?? 'en',
      avatarUrl: savedWorkspaceMember.avatarUrl ?? input.avatarUrl ?? undefined,
      memberCode: savedWorkspaceMember.memberCode ?? '',
      memberType: savedWorkspaceMember.memberType ?? '',
      status: savedWorkspaceMember.status ?? '',
      grade: savedWorkspaceMember.grade ?? '',
      address: savedWorkspaceMember.address ?? '',
      // Nested objects (from validated entities)
      department,
      permissionTemplate,
      organizationLevel,
      employmentStatus,
      // Legacy fields (deprecated)
      departmentId: savedWorkspaceMember.departmentId ?? undefined,
      departmentName: department.departmentName,
      organizationLevelId:
        savedWorkspaceMember.organizationLevelId ?? undefined,
      employmentStatusId: savedWorkspaceMember.employmentStatusId ?? undefined,
      permissionTemplateId: permissionTemplate.id,
      permissionTemplateName: permissionTemplate.templateName,
      createdAt: new Date(savedWorkspaceMember.createdAt),
      updatedAt: new Date(savedWorkspaceMember.updatedAt),
    };
  }

  /**
   * Map WorkspaceMember entity to UserOutput
   * @param member - WorkspaceMember entity with loaded relations
   * @param permissionAssignment - Optional permission template assignment with loaded template relation
   */
  private mapWorkspaceMemberToUserOutput(
    member: WorkspaceMemberWorkspaceEntity,
    permissionAssignment?: {
      templateId: string;
      template?: {
        templateKey?: string;
        templateName?: string;
        templateNameEn?: string;
      };
    },
  ): UserOutput {
    // Build nested objects from loaded relations
    const department = this.buildDepartmentOutput(member);
    const organizationLevel = this.buildOrganizationLevelOutput(member);
    const employmentStatus = this.buildEmploymentStatusOutput(member);
    const permissionTemplate =
      this.buildPermissionTemplateOutput(permissionAssignment);

    return {
      id: member.id,
      email: member.userEmail,
      firstName: member.name?.firstName ?? '',
      lastName: member.name?.lastName ?? '',
      startDate: member.startDate,
      endDate: member.endDate ?? null,
      language: member.locale ?? 'en',
      avatarUrl: member.avatarUrl ?? undefined,
      memberCode: member.memberCode ?? '',
      memberType: member.memberType ?? '',
      status: member.status ?? '',
      grade: member.grade ?? '',
      address: member.address ?? '',
      // Nested objects
      department,
      permissionTemplate,
      organizationLevel,
      employmentStatus,
      // Legacy fields (deprecated)
      departmentId: member.departmentId ?? undefined,
      departmentName: department?.departmentName,
      organizationLevelId: member.organizationLevelId ?? undefined,
      employmentStatusId: member.employmentStatusId ?? undefined,
      permissionTemplateId: permissionAssignment?.templateId,
      permissionTemplateName: permissionAssignment?.template?.templateName,
      createdAt: new Date(member.createdAt),
      updatedAt: new Date(member.updatedAt),
    };
  }

  // ============================================
  // HELPER METHODS FOR BUILDING NESTED OUTPUTS
  // ============================================

  private buildDepartmentOutput(
    member: WorkspaceMemberWorkspaceEntity,
  ): DepartmentBasicOutput | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dept = (member as any).department;

    if (!dept || !member.departmentId) {
      return null;
    }

    return {
      id: dept.id ?? member.departmentId,
      departmentCode: dept.departmentCode ?? '',
      departmentName: dept.departmentName ?? '',
      departmentNameEn: dept.departmentNameEn ?? undefined,
    };
  }

  private buildOrganizationLevelOutput(
    member: WorkspaceMemberWorkspaceEntity,
  ): OrganizationLevelBasicOutput | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orgLevel = (member as any).organizationLevel;

    if (!orgLevel || !member.organizationLevelId) {
      return null;
    }

    return {
      id: orgLevel.id ?? member.organizationLevelId,
      levelCode: orgLevel.levelCode ?? '',
      levelName: orgLevel.levelName ?? '',
      levelNameEn: orgLevel.levelNameEn ?? undefined,
      hierarchyLevel: orgLevel.hierarchyLevel ?? 0,
    };
  }

  private buildEmploymentStatusOutput(
    member: WorkspaceMemberWorkspaceEntity,
  ): EmploymentStatusBasicOutput | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const empStatus = (member as any).employmentStatus;

    if (!empStatus || !member.employmentStatusId) {
      return null;
    }

    return {
      id: empStatus.id ?? member.employmentStatusId,
      statusCode: empStatus.statusCode ?? '',
      statusName: empStatus.statusName ?? '',
      statusNameEn: empStatus.statusNameEn ?? undefined,
    };
  }

  private buildPermissionTemplateOutput(permissionAssignment?: {
    templateId: string;
    template?: {
      templateKey?: string;
      templateName?: string;
      templateNameEn?: string;
    };
  }): PermissionTemplateBasicOutput | null {
    if (!permissionAssignment?.templateId) {
      return null;
    }

    return {
      id: permissionAssignment.templateId,
      templateKey: permissionAssignment.template?.templateKey ?? '',
      templateName: permissionAssignment.template?.templateName ?? '',
      templateNameEn:
        permissionAssignment.template?.templateNameEn ?? undefined,
    };
  }
}
