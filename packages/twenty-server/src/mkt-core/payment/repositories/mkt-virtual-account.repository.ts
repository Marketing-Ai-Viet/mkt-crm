import { Injectable, Logger } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MktVirtualAccountWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-virtual-account.workspace-entity';
import {
  CreateVAData,
  VAForMatching,
} from 'src/mkt-core/payment/domain/ports/va.repository.port';

const VA_LOG_CONTEXT = 'MktVirtualAccount';

const VA_LOG_MESSAGES = {
  FIND_BY_VA_NUMBER_START: (vaNumber: string) =>
    `Finding VA by number: ${vaNumber}`,
  FIND_BY_VA_NUMBER_SUCCESS: (vaNumber: string) =>
    `Found VA by number: ${vaNumber}`,
  FIND_BY_VA_NUMBER_NOT_FOUND: (vaNumber: string) =>
    `VA not found for number: ${vaNumber}`,
  FIND_BY_ORDER_START: (orderId: string) => `Finding VA by orderId: ${orderId}`,
  FIND_ACTIVE_BY_ORDER_START: (orderId: string) =>
    `Finding active VA by orderId: ${orderId}`,
  CREATE_START: () => `Creating new VA`,
  CREATE_SUCCESS: (id: string) => `Created VA: ${id}`,
  DEACTIVATE_START: (id: string) => `Deactivating VA: ${id}`,
  DEACTIVATE_SUCCESS: (id: string) => `Deactivated VA: ${id}`,
} as const;

/**
 * MktVirtualAccountRepository - Data access layer for Virtual Account entity
 *
 * Implements IVARepositoryPort for domain layer access.
 */
@Injectable()
export class MktVirtualAccountRepository extends BaseWorkspaceRepository<MktVirtualAccountWorkspaceEntity> {
  protected readonly logger = new Logger(`${VA_LOG_CONTEXT}:Repository`);

  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktVirtualAccountWorkspaceEntity,
      `${VA_LOG_CONTEXT}:Repository`,
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find VA by VA number
   */
  async findByVANumber(
    vaNumber: string,
    workspaceId?: string,
  ): Promise<MktVirtualAccountWorkspaceEntity | null> {
    this.logger.debug(VA_LOG_MESSAGES.FIND_BY_VA_NUMBER_START(vaNumber));

    const repository = await this.getRepository(workspaceId);

    const va = await repository.findOne({
      where: { vaNumber, isActive: true },
      relations: ['mktOrder'],
    });

    if (!va) {
      this.logger.debug(VA_LOG_MESSAGES.FIND_BY_VA_NUMBER_NOT_FOUND(vaNumber));

      return null;
    }

    this.logger.debug(VA_LOG_MESSAGES.FIND_BY_VA_NUMBER_SUCCESS(vaNumber));

    return va;
  }

  /**
   * Find VA by VA number and return for matching
   */
  async findByVANumberForMatching(
    vaNumber: string,
    workspaceId?: string,
  ): Promise<VAForMatching | null> {
    const va = await this.findByVANumber(vaNumber, workspaceId);

    if (!va) {
      return null;
    }

    return this.toVAForMatching(va);
  }

  /**
   * Find VA by order ID
   */
  async findByOrderId(
    orderId: string,
    workspaceId?: string,
  ): Promise<MktVirtualAccountWorkspaceEntity | null> {
    this.logger.debug(VA_LOG_MESSAGES.FIND_BY_ORDER_START(orderId));

    const repository = await this.getRepository(workspaceId);

    const va = await repository.findOne({
      where: { mktOrderId: orderId },
      relations: ['mktOrder'],
      order: { createdAt: 'DESC' },
    });

    return va;
  }

  /**
   * Find VA by order ID and return for matching
   */
  async findByOrderIdForMatching(
    orderId: string,
    workspaceId?: string,
  ): Promise<VAForMatching | null> {
    const va = await this.findByOrderId(orderId, workspaceId);

    if (!va) {
      return null;
    }

    return this.toVAForMatching(va);
  }

  /**
   * Find active VA by order ID
   */
  async findActiveByOrderId(
    orderId: string,
    workspaceId?: string,
  ): Promise<MktVirtualAccountWorkspaceEntity | null> {
    this.logger.debug(VA_LOG_MESSAGES.FIND_ACTIVE_BY_ORDER_START(orderId));

    const repository = await this.getRepository(workspaceId);

    const va = await repository.findOne({
      where: { mktOrderId: orderId, isActive: true },
      relations: ['mktOrder'],
      order: { createdAt: 'DESC' },
    });

    return va;
  }

  /**
   * Find active VA by order ID and return for matching
   */
  async findActiveByOrderIdForMatching(
    orderId: string,
    workspaceId?: string,
  ): Promise<VAForMatching | null> {
    const va = await this.findActiveByOrderId(orderId, workspaceId);

    if (!va) {
      return null;
    }

    return this.toVAForMatching(va);
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create new VA
   */
  async createVA(
    data: CreateVAData,
    workspaceId?: string,
  ): Promise<MktVirtualAccountWorkspaceEntity> {
    this.logger.debug(VA_LOG_MESSAGES.CREATE_START());

    const repository = await this.getRepository(workspaceId);

    const va = repository.create({
      name: `VA-${data.vaNumber}`,
      vaNumber: data.vaNumber,
      bankCode: data.bankCode,
      bankName: data.bankName,
      accountName: data.accountName,
      amount: data.amount,
      qrCodeUrl: data.qrCodeUrl,
      expiresAt: data.expiresAt,
      isActive: true,
      provider: data.provider.toUpperCase() as 'SEPAY' | 'BIDV',
      providerResponse: data.providerResponse as JSON,
      mktOrderId: data.orderId,
    });

    const savedVA = await repository.save(va);

    this.logger.debug(VA_LOG_MESSAGES.CREATE_SUCCESS(savedVA.id));

    return savedVA;
  }

  /**
   * Save VA and return for matching
   */
  async saveForMatching(
    data: CreateVAData,
    workspaceId?: string,
  ): Promise<VAForMatching> {
    const va = await this.createVA(data, workspaceId);

    return this.toVAForMatching(va);
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Deactivate VA by ID
   */
  async deactivate(id: string, workspaceId?: string): Promise<void> {
    this.logger.debug(VA_LOG_MESSAGES.DEACTIVATE_START(id));

    const repository = await this.getRepository(workspaceId);

    await repository.update(id, { isActive: false });

    this.logger.debug(VA_LOG_MESSAGES.DEACTIVATE_SUCCESS(id));
  }

  /**
   * Deactivate all VAs for an order
   */
  async deactivateByOrderId(
    orderId: string,
    workspaceId?: string,
  ): Promise<void> {
    this.logger.debug(`Deactivating all VAs for order: ${orderId}`);

    const repository = await this.getRepository(workspaceId);

    await repository.update({ mktOrderId: orderId }, { isActive: false });

    this.logger.debug(`Deactivated all VAs for order: ${orderId}`);
  }

  // ============================================
  // EXPIRATION QUERIES
  // ============================================

  /**
   * Find all active VAs that have expired
   * Used by VA expiration scan job
   */
  async findExpiredActiveVAs(
    workspaceId?: string,
  ): Promise<MktVirtualAccountWorkspaceEntity[]> {
    this.logger.debug('Finding expired active VAs');

    const repository = await this.getRepository(workspaceId);

    const now = new Date().toISOString();

    const expiredVAs = await repository
      .createQueryBuilder('va')
      .where('va.isActive = :isActive', { isActive: true })
      .andWhere('va.expiresAt IS NOT NULL')
      .andWhere('va.expiresAt < :now', { now })
      .andWhere('va.deletedAt IS NULL')
      .leftJoinAndSelect('va.mktOrder', 'mktOrder')
      .getMany();

    this.logger.debug(`Found ${expiredVAs.length} expired active VAs`);

    return expiredVAs;
  }

  /**
   * Bulk deactivate VAs by IDs
   */
  async bulkDeactivate(ids: string[], workspaceId?: string): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    this.logger.debug(`Bulk deactivating ${ids.length} VAs`);

    const repository = await this.getRepository(workspaceId);

    const result = await repository
      .createQueryBuilder()
      .update()
      .set({ isActive: false })
      .whereInIds(ids)
      .execute();

    this.logger.debug(`Deactivated ${result.affected ?? 0} VAs`);

    return result.affected ?? 0;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Convert entity to VAForMatching DTO
   */
  private toVAForMatching(va: MktVirtualAccountWorkspaceEntity): VAForMatching {
    return {
      id: va.id,
      vaNumber: va.vaNumber,
      orderId: va.mktOrderId,
      orderCode: va.mktOrder?.orderCode ?? '',
      amount: va.amount,
      isActive: va.isActive,
      expiresAt: va.expiresAt ?? '',
    };
  }
}
