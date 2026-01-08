/**
 * Service Template
 *
 * Services contain business logic and database operations.
 * Use TwentyORMGlobalManager for workspace entity access.
 *
 * TODO:
 * 1. Replace 'YourEntity' with your entity name
 * 2. Import your WorkspaceEntity
 * 3. Register this service in your module providers
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { omitBy, isUndefined } from 'lodash';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';

// TODO: Import your entity
// import { MktYourEntityWorkspaceEntity } from '../objects/mkt-your-entity.workspace-entity';
// import { CreateYourEntityDto } from '../dto/create-your-entity.dto';
// import { UpdateYourEntityDto } from '../dto/update-your-entity.dto';

// Placeholder type - replace with your entity
type MktYourEntityWorkspaceEntity = {
  id: string;
  name: string;
  status: string;
};

type CreateYourEntityDto = {
  name: string;
  status?: string;
};

type UpdateYourEntityDto = Partial<CreateYourEntityDto>;

@Injectable()
export class YourEntityService {
  private readonly logger = new Logger(YourEntityService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    // TODO: Inject other services if needed
  ) {}

  /**
   * Get repository for workspace
   */
  private async getRepository(workspaceId?: string) {
    const wsId =
      workspaceId || this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new BadRequestException('Workspace ID not found');
    }

    // TODO: Replace with your entity class
    // return this.twentyORMGlobalManager.getRepositoryForWorkspace(
    //   wsId,
    //   MktYourEntityWorkspaceEntity,
    // );

    // Placeholder - remove when implementing
    return null as never;
  }

  /**
   * Find all entities
   */
  async findAll(
    workspaceId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: string;
    },
  ): Promise<{ data: MktYourEntityWorkspaceEntity[]; total: number }> {
    const repository = await this.getRepository(workspaceId);
    const { page = 1, limit = 20, status } = options || {};

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const [data, total] = await repository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  /**
   * Find one entity by ID
   */
  async findOne(
    workspaceId: string,
    id: string,
  ): Promise<MktYourEntityWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);

    const entity = await repository.findOne({
      where: { id },
      // relations: ['relatedEntity'], // Add if needed
    });

    if (!entity) {
      throw new NotFoundException(`Entity with ID ${id} not found`);
    }

    return entity;
  }

  /**
   * Create new entity
   */
  async create(
    workspaceId: string,
    dto: CreateYourEntityDto,
  ): Promise<MktYourEntityWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);

    const entity = repository.create({
      ...dto,
      // Set defaults if needed
      // status: dto.status || 'DRAFT',
    });

    const saved = await repository.save(entity);

    this.logger.log(`Created entity: ${saved.id}`);

    return saved;
  }

  /**
   * Update entity
   */
  async update(
    workspaceId: string,
    id: string,
    dto: UpdateYourEntityDto,
  ): Promise<MktYourEntityWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);
    const entity = await this.findOne(workspaceId, id);

    // Use lodash to remove undefined fields
    const updateFields = omitBy(dto, isUndefined);
    Object.assign(entity, updateFields);

    const saved = await repository.save(entity);

    this.logger.log(`Updated entity: ${saved.id}`);

    return saved;
  }

  /**
   * Delete entity (soft delete)
   */
  async remove(workspaceId: string, id: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const entity = await this.findOne(workspaceId, id);

    await repository.softRemove(entity);

    this.logger.log(`Deleted entity: ${id}`);
  }

  /**
   * Update status
   */
  async updateStatus(
    workspaceId: string,
    id: string,
    status: string,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update(id, { status });

    this.logger.log(`Updated entity ${id} status to ${status}`);
  }

  /**
   * Custom business operation example
   */
  async process(
    workspaceId: string,
    id: string,
  ): Promise<MktYourEntityWorkspaceEntity> {
    const entity = await this.findOne(workspaceId, id);

    // Validate business rules
    if (entity.status !== 'PENDING') {
      throw new BadRequestException('Entity must be in PENDING status');
    }

    // Perform operation
    return this.update(workspaceId, id, {
      status: 'PROCESSED',
    });
  }

  /**
   * Bulk operations example
   */
  async bulkCreate(
    workspaceId: string,
    dtos: CreateYourEntityDto[],
  ): Promise<MktYourEntityWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    const entities = dtos.map((dto) => repository.create(dto));
    const saved = await repository.save(entities);

    this.logger.log(`Bulk created ${saved.length} entities`);

    return saved;
  }

  /**
   * Get statistics example
   */
  async getStatistics(
    workspaceId: string,
  ): Promise<{ total: number; byStatus: Record<string, number> }> {
    const repository = await this.getRepository(workspaceId);

    const total = await repository.count();

    const statusCounts = await repository
      .createQueryBuilder('entity')
      .select('entity.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('entity.status')
      .getRawMany();

    const byStatus: Record<string, number> = {};
    for (const item of statusCounts) {
      byStatus[item.status] = parseInt(item.count, 10);
    }

    return { total, byStatus };
  }
}
