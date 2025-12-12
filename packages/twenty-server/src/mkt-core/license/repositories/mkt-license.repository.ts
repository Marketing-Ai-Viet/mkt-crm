import { Injectable } from '@nestjs/common';

import { DateTime } from 'luxon';
import {
  Between,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  MoreThanOrEqual,
  ObjectLiteral,
} from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MKT_LICENSE_STATUS } from 'src/mkt-core/license/constants/license.constants';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { MktLicenseHistoryWorkspaceEntity } from 'src/mkt-core/license/objects/mkt-license-history.workspace-entity';
import { DateTimeUtils } from 'src/mkt-core/utils';

type LicenseRepository = WorkspaceRepository<MktLicenseWorkspaceEntity>;

type LicenseHistoryRepository =
  WorkspaceRepository<MktLicenseHistoryWorkspaceEntity>;

type DateRange = {
  start: Date | DateTime | string;
  end: Date | DateTime | string;
};

@Injectable()
export class MktLicenseRepository {
  private _workspaceId: string | null = null;

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  set workspaceId(value: string) {
    this._workspaceId = value;
  }

  private getWorkspaceId(): string {
    const contextWorkspaceId =
      this.scopedWorkspaceContextFactory.create().workspaceId;

    const workspaceId = contextWorkspaceId ?? this._workspaceId;

    if (!workspaceId) {
      throw new Error('Workspace ID is not available in the current context.');
    }

    return workspaceId;
  }

  async getRepository(): Promise<LicenseRepository> {
    const workspaceId = this.getWorkspaceId();

    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktLicenseWorkspaceEntity>(
      workspaceId,
      'mktLicense',
      { shouldBypassPermissionChecks: true },
    );
  }

  async getRepositoryByWorkspaceId(
    workspaceId: string,
  ): Promise<LicenseRepository> {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktLicenseWorkspaceEntity>(
      workspaceId,
      'mktLicense',
      { shouldBypassPermissionChecks: true },
    );
  }

  async getHistoryRepository(): Promise<LicenseHistoryRepository> {
    const workspaceId = this.getWorkspaceId();

    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktLicenseHistoryWorkspaceEntity>(
      workspaceId,
      'mktLicenseHistory',
      { shouldBypassPermissionChecks: true },
    );
  }

  async getHistoryRepositoryByWorkspaceId(
    workspaceId: string,
  ): Promise<LicenseHistoryRepository> {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktLicenseHistoryWorkspaceEntity>(
      workspaceId,
      'mktLicenseHistory',
      { shouldBypassPermissionChecks: true },
    );
  }

  // ==================== CRUD Operations ====================

  async findById(
    id: string,
    options?: FindOneOptions<MktLicenseWorkspaceEntity>,
  ): Promise<MktLicenseWorkspaceEntity | null> {
    const repository = await this.getRepository();

    return repository.findOne({
      where: { id } as FindOptionsWhere<MktLicenseWorkspaceEntity>,
      ...options,
    });
  }

  async findByIdWithRelations(
    id: string,
    relations: string[] = ['mktOrder', 'mktVariant', 'mktCustomer'],
  ): Promise<MktLicenseWorkspaceEntity | null> {
    return this.findById(id, { relations });
  }

  async findByOrderId(
    orderId: string,
  ): Promise<MktLicenseWorkspaceEntity[] | null> {
    const repository = await this.getRepository();

    return repository.find({
      where: {
        mktOrderId: orderId,
      } as FindOptionsWhere<MktLicenseWorkspaceEntity>,
    });
  }

  async findByStatus(
    status: MKT_LICENSE_STATUS,
    options?: FindManyOptions<MktLicenseWorkspaceEntity>,
  ): Promise<MktLicenseWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { status } as FindOptionsWhere<MktLicenseWorkspaceEntity>,
      ...options,
    });
  }

  async findAll(
    options?: FindManyOptions<MktLicenseWorkspaceEntity>,
  ): Promise<MktLicenseWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find(options);
  }

  async count(
    where?: FindOptionsWhere<MktLicenseWorkspaceEntity>,
  ): Promise<number> {
    const repository = await this.getRepository();

    return repository.count({ where });
  }

  async create(
    data: Partial<MktLicenseWorkspaceEntity>,
  ): Promise<MktLicenseWorkspaceEntity> {
    const repository = await this.getRepository();
    const license = repository.create(data);

    return repository.save(license);
  }

  async update(
    id: string,
    data: Partial<MktLicenseWorkspaceEntity>,
  ): Promise<void> {
    const repository = await this.getRepository();

    await repository.update(id, data as ObjectLiteral);
  }

  async save(
    license: MktLicenseWorkspaceEntity,
  ): Promise<MktLicenseWorkspaceEntity> {
    const repository = await this.getRepository();

    return repository.save(license);
  }

  // ==================== Dashboard/Stats Operations ====================

  async countByStatusAndDateRange(
    status: MKT_LICENSE_STATUS,
    dateField: 'createdAt' | 'updatedAt',
    range: DateRange,
  ): Promise<number> {
    const repository = await this.getRepository();

    return repository.count({
      where: {
        status,
        [dateField]: Between(
          DateTimeUtils.toJsDate(range.start),
          DateTimeUtils.toJsDate(range.end),
        ),
      } as FindOptionsWhere<MktLicenseWorkspaceEntity>,
    });
  }

  async countByStatusSinceDate(
    status: MKT_LICENSE_STATUS,
    dateField: 'createdAt' | 'updatedAt' | 'lastLoginAt',
    sinceDate: Date | DateTime | string,
  ): Promise<number> {
    const repository = await this.getRepository();

    return repository.count({
      where: {
        status,
        [dateField]: MoreThanOrEqual(DateTimeUtils.toJsDate(sinceDate)),
      } as FindOptionsWhere<MktLicenseWorkspaceEntity>,
    });
  }

  async countCreatedSinceDate(
    sinceDate: Date | DateTime | string,
  ): Promise<number> {
    const repository = await this.getRepository();

    return repository.count({
      where: {
        createdAt: MoreThanOrEqual(DateTimeUtils.toJsDate(sinceDate)),
      } as unknown as FindOptionsWhere<MktLicenseWorkspaceEntity>,
    });
  }

  async countCreatedInRange(range: DateRange): Promise<number> {
    const repository = await this.getRepository();

    return repository.count({
      where: {
        createdAt: Between(
          DateTimeUtils.toJsDate(range.start),
          DateTimeUtils.toJsDate(range.end),
        ),
      } as unknown as FindOptionsWhere<MktLicenseWorkspaceEntity>,
    });
  }

  async findExpiringInRange(
    range: DateRange,
    status: MKT_LICENSE_STATUS = MKT_LICENSE_STATUS.ACTIVE,
  ): Promise<MktLicenseWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: {
        status,
        expiresAt: Between(
          DateTimeUtils.toJsDate(range.start),
          DateTimeUtils.toJsDate(range.end),
        ),
      } as FindOptionsWhere<MktLicenseWorkspaceEntity>,
      relations: ['mktVariant', 'mktOrder', 'mktCustomer'],
      order: { expiresAt: 'ASC' },
    });
  }

  async countExpiringInRange(
    range: DateRange,
    status: MKT_LICENSE_STATUS = MKT_LICENSE_STATUS.ACTIVE,
  ): Promise<number> {
    const repository = await this.getRepository();

    return repository.count({
      where: {
        status,
        expiresAt: Between(
          DateTimeUtils.toJsDate(range.start),
          DateTimeUtils.toJsDate(range.end),
        ),
      } as FindOptionsWhere<MktLicenseWorkspaceEntity>,
    });
  }

  async findByStatusWithRelations(
    status: MKT_LICENSE_STATUS,
    relations: string[] = ['mktVariant', 'mktOrder', 'mktCustomer'],
  ): Promise<MktLicenseWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { status } as FindOptionsWhere<MktLicenseWorkspaceEntity>,
      relations,
      order: { updatedAt: 'DESC' },
    });
  }

  async findByStatusAndDateRange(
    status: MKT_LICENSE_STATUS,
    dateField: 'createdAt' | 'updatedAt',
    range: DateRange,
    relations?: string[],
  ): Promise<MktLicenseWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: {
        status,
        [dateField]: Between(
          DateTimeUtils.toJsDate(range.start),
          DateTimeUtils.toJsDate(range.end),
        ),
      } as FindOptionsWhere<MktLicenseWorkspaceEntity>,
      relations,
    });
  }

  async findByStatusSinceDate(
    status: MKT_LICENSE_STATUS,
    dateField: 'createdAt' | 'updatedAt',
    sinceDate: Date | DateTime | string,
    relations?: string[],
  ): Promise<MktLicenseWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: {
        status,
        [dateField]: MoreThanOrEqual(DateTimeUtils.toJsDate(sinceDate)),
      } as FindOptionsWhere<MktLicenseWorkspaceEntity>,
      relations,
    });
  }

  // ==================== License History Operations ====================

  async createHistory(
    data: Partial<MktLicenseHistoryWorkspaceEntity>,
  ): Promise<MktLicenseHistoryWorkspaceEntity> {
    const repository = await this.getHistoryRepository();
    const history = repository.create(data);

    return repository.save(history);
  }

  async findHistoryByLicenseId(
    licenseId: string,
  ): Promise<MktLicenseHistoryWorkspaceEntity[]> {
    const repository = await this.getHistoryRepository();

    return repository.find({
      where: {
        mktLicenseId: licenseId,
      } as FindOptionsWhere<MktLicenseHistoryWorkspaceEntity>,
      order: { createdAt: 'DESC' },
    });
  }

  async saveHistory(
    history: MktLicenseHistoryWorkspaceEntity,
  ): Promise<MktLicenseHistoryWorkspaceEntity> {
    const repository = await this.getHistoryRepository();

    return repository.save(history);
  }

  // ==================== Specialized Queries ====================

  async findForUpdate(
    licenseId: string,
  ): Promise<MktLicenseWorkspaceEntity | null> {
    return this.findById(licenseId, {
      relations: [
        'mktOrder',
        'mktVariant',
        'mktOrder.mktPayments',
        'mktOrder.mktCustomer',
        'mktPaymentHistories',
        'mktPaymentHistories.mktPayment.mktPaymentMethod',
      ],
    });
  }

  async findWithLicenseUuid(
    licenseId: string,
  ): Promise<MktLicenseWorkspaceEntity | null> {
    return this.findById(licenseId, {
      select: ['id', 'licenseUuid'],
    });
  }

  async updateLicenseHistory(licenseId: string, history: JSON): Promise<void> {
    await this.update(licenseId, { history });
  }

  async bulkUpdateByOrderId(
    orderId: string,
    data: Partial<MktLicenseWorkspaceEntity>,
  ): Promise<void> {
    const repository = await this.getRepository();

    await repository.update(
      { mktOrderId: orderId } as FindOptionsWhere<MktLicenseWorkspaceEntity>,
      data as ObjectLiteral,
    );
  }
}
