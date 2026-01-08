import { Injectable, Logger } from '@nestjs/common';

import { IsNull, QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { PERMISSION_TEMPLATE_LOG_CONTEXT } from 'src/mkt-core/mkt-permission-template/constants';
import { MktPermissionResourceWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

/**
 * Repository for MktPermissionResourceWorkspaceEntity
 * Handles database operations for permission resources
 */
@Injectable()
export class MktPermissionResourceRepository {
  private readonly logger = new Logger(PERMISSION_TEMPLATE_LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  private async getRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPermissionResourceWorkspaceEntity>(
      workspaceId,
      'mktPermissionResource',
    );
  }

  /**
   * Find resource by ID
   */
  async findById(
    workspaceId: string,
    resourceId: string,
  ): Promise<MktPermissionResourceWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: {
        id: resourceId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Find resource by key
   */
  async findByKey(
    workspaceId: string,
    resourceKey: string,
  ): Promise<MktPermissionResourceWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: {
        resourceKey,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Find all active resources
   */
  async findActive(
    workspaceId: string,
  ): Promise<MktPermissionResourceWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        isActive: true,
        deletedAt: IsNull(),
      },
      order: {
        displayOrder: 'ASC',
        resourceName: 'ASC',
      },
    });
  }

  /**
   * Find resources by category
   */
  async findByCategory(
    workspaceId: string,
    resourceCategory: string,
  ): Promise<MktPermissionResourceWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        resourceCategory,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: {
        displayOrder: 'ASC',
      },
    });
  }

  /**
   * Find system resources
   */
  async findSystemResources(
    workspaceId: string,
  ): Promise<MktPermissionResourceWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        isSystemResource: true,
        deletedAt: IsNull(),
      },
      order: {
        displayOrder: 'ASC',
      },
    });
  }

  /**
   * Check if resource key exists
   */
  async keyExists(
    workspaceId: string,
    resourceKey: string,
    excludeId?: string,
  ): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const query = repository
      .createQueryBuilder('resource')
      .where('resource.resourceKey = :resourceKey', { resourceKey })
      .andWhere('resource.deletedAt IS NULL');

    if (excludeId) {
      query.andWhere('resource.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();

    return count > 0;
  }

  /**
   * Create a new resource
   */
  async create(
    workspaceId: string,
    data: Partial<MktPermissionResourceWorkspaceEntity>,
    queryRunner?: QueryRunner,
  ): Promise<MktPermissionResourceWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);

    const resource = repository.create(data);

    let savedResource: MktPermissionResourceWorkspaceEntity;

    if (queryRunner) {
      savedResource = await queryRunner.manager.save(resource);
    } else {
      savedResource = await repository.save(resource);
    }

    this.logger.log(`Created resource ${savedResource.resourceKey}`);

    return savedResource;
  }

  /**
   * Update resource
   */
  async update(
    workspaceId: string,
    resourceId: string,
    data: Partial<MktPermissionResourceWorkspaceEntity>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.update(
      'MktPermissionResourceWorkspaceEntity',
      { id: resourceId },
      data,
    );

    this.logger.log(`Updated resource ${resourceId}`);
  }

  /**
   * Update resource status
   */
  async updateStatus(
    workspaceId: string,
    resourceId: string,
    isActive: boolean,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    await this.update(workspaceId, resourceId, { isActive }, queryRunner);
  }

  /**
   * Soft delete resource
   */
  async softDelete(
    workspaceId: string,
    id: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.softDelete('MktPermissionResourceWorkspaceEntity', id);

    this.logger.log(`Soft deleted resource ${id}`);
  }
}
