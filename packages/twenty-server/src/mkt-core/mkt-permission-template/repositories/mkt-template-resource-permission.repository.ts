import { Injectable, Logger } from '@nestjs/common';

import { IsNull, QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { PERMISSION_TEMPLATE_LOG_CONTEXT } from 'src/mkt-core/mkt-permission-template/constants';
import { MktTemplateResourcePermissionWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

/**
 * Repository for MktTemplateResourcePermissionWorkspaceEntity
 * Handles database operations for template resource permissions
 */
@Injectable()
export class MktTemplateResourcePermissionRepository {
  private readonly logger = new Logger(PERMISSION_TEMPLATE_LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  private async getRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktTemplateResourcePermissionWorkspaceEntity>(
      workspaceId,
      'mktTemplateResourcePermission',
    );
  }

  /**
   * Find permission by ID
   */
  async findById(
    workspaceId: string,
    permissionId: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: {
        id: permissionId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Find all permissions for a template
   */
  async findByTemplateId(
    workspaceId: string,
    templateId: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        templateId,
        deletedAt: IsNull(),
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  /**
   * Find active permissions for a template
   */
  async findActiveByTemplateId(
    workspaceId: string,
    templateId: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        templateId,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  /**
   * Find permissions by resource
   */
  async findByResourceId(
    workspaceId: string,
    resourceId: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        resourceId,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  /**
   * Find permission by template and resource
   */
  async findByTemplateAndResource(
    workspaceId: string,
    templateId: string,
    resourceId: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: {
        templateId,
        resourceId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Find permissions by context
   */
  async findByContextId(
    workspaceId: string,
    contextId: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        contextId,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  /**
   * Create a new permission
   */
  async create(
    workspaceId: string,
    data: Partial<MktTemplateResourcePermissionWorkspaceEntity>,
    queryRunner?: QueryRunner,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);

    const permission = repository.create(data);

    let savedPermission: MktTemplateResourcePermissionWorkspaceEntity;

    if (queryRunner) {
      savedPermission = await queryRunner.manager.save(permission);
    } else {
      savedPermission = await repository.save(permission);
    }

    this.logger.log(
      `Created template resource permission for template ${savedPermission.templateId}`,
    );

    return savedPermission;
  }

  /**
   * Create multiple permissions at once
   */
  async createMany(
    workspaceId: string,
    permissionsData: Array<
      Partial<MktTemplateResourcePermissionWorkspaceEntity>
    >,
    queryRunner?: QueryRunner,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity[]> {
    if (permissionsData.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    const permissions = permissionsData.map((data) => repository.create(data));

    let savedPermissions: MktTemplateResourcePermissionWorkspaceEntity[];

    if (queryRunner) {
      savedPermissions = await queryRunner.manager.save(permissions);
    } else {
      savedPermissions = await repository.save(permissions);
    }

    this.logger.log(`Created ${savedPermissions.length} permissions in bulk`);

    return savedPermissions;
  }

  /**
   * Update permission
   */
  async update(
    workspaceId: string,
    permissionId: string,
    data: Partial<MktTemplateResourcePermissionWorkspaceEntity>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.update(
      'MktTemplateResourcePermissionWorkspaceEntity',
      { id: permissionId },
      data,
    );

    this.logger.log(`Updated template resource permission ${permissionId}`);
  }

  /**
   * Update permission status
   */
  async updateStatus(
    workspaceId: string,
    permissionId: string,
    isActive: boolean,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    await this.update(workspaceId, permissionId, { isActive }, queryRunner);
  }

  /**
   * Delete permissions by template ID
   */
  async deleteByTemplateId(
    workspaceId: string,
    templateId: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.delete('MktTemplateResourcePermissionWorkspaceEntity', {
      templateId,
    });

    this.logger.log(`Deleted all permissions for template ${templateId}`);
  }

  /**
   * Soft delete permission
   */
  async softDelete(
    workspaceId: string,
    id: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.softDelete(
      'MktTemplateResourcePermissionWorkspaceEntity',
      id,
    );

    this.logger.log(`Soft deleted template resource permission ${id}`);
  }
}
