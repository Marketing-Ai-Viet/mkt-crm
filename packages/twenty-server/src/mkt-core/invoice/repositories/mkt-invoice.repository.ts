import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { IsNull, QueryRunner } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import {
  INVOICE_MESSAGES,
  MKT_INVOICE_LOG_CONTEXT,
} from 'src/mkt-core/invoice/messages';
import {
  MKT_INVOICE_STATUS,
  MktInvoiceWorkspaceEntity,
} from 'src/mkt-core/invoice/objects/mkt-invoice.workspace-entity';
import {
  FindInvoiceOptions,
  FindWithPaginationOptions,
  StatusDistributionItem,
} from 'src/mkt-core/invoice/types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * MktInvoiceRepository - Data access layer for Invoice entity
 *
 * Responsibilities:
 * - Database operations for MktInvoice entity
 * - Query building and execution
 * - Thread-safe workspace context handling
 *
 * Does NOT handle:
 * - Business logic (handled by Service layer)
 * - S-Invoice integration (handled by Integration layer)
 */
@Injectable()
export class MktInvoiceRepository {
  private readonly logger = new Logger(`${MKT_INVOICE_LOG_CONTEXT}:Repository`);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  // ============================================
  // REPOSITORY ACCESS
  // ============================================

  /**
   * Get repository for specific workspace
   * Thread-safe: Uses TwentyORMGlobalManager directly
   */
  async getRepository(
    workspaceId?: string,
  ): Promise<WorkspaceRepository<MktInvoiceWorkspaceEntity>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new NotFoundException(INVOICE_MESSAGES.ERROR.WORKSPACE_NOT_FOUND);
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      MktInvoiceWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find invoice by ID
   */
  async findById(
    id: string,
    workspaceId?: string,
  ): Promise<MktInvoiceWorkspaceEntity> {
    this.logger.debug(INVOICE_MESSAGES.LOG.FIND_BY_ID_START(id));

    const repository = await this.getRepository(workspaceId);
    const invoice = await repository.findOne({ where: { id } });

    if (!invoice) {
      this.logger.debug(INVOICE_MESSAGES.LOG.FIND_BY_ID_NOT_FOUND(id));
      throw new NotFoundException(INVOICE_MESSAGES.ERROR.INVOICE_NOT_FOUND(id));
    }

    this.logger.debug(INVOICE_MESSAGES.LOG.FIND_BY_ID_SUCCESS(id));

    return invoice;
  }

  /**
   * Find invoice by ID (returns null if not found)
   */
  async findByIdOrNull(
    id: string,
    workspaceId?: string,
  ): Promise<MktInvoiceWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id } });
  }

  /**
   * Find invoice by invoice number
   */
  async findByInvoiceNo(
    invoiceNo: string,
    workspaceId?: string,
  ): Promise<MktInvoiceWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { invoiceNo } });
  }

  /**
   * Find invoice by S-Invoice code
   */
  async findBySInvoiceCode(
    sInvoiceCode: string,
    workspaceId?: string,
  ): Promise<MktInvoiceWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { sInvoiceCode } });
  }

  /**
   * Find invoice by transaction UUID
   */
  async findByTransactionUuid(
    transactionUuid: string,
    workspaceId?: string,
  ): Promise<MktInvoiceWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { transactionUuid } });
  }

  /**
   * Find all invoices with pagination
   */
  async findAll(
    workspaceId?: string,
    options?: FindInvoiceOptions,
  ): Promise<MktInvoiceWorkspaceEntity[]> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    this.logger.debug(INVOICE_MESSAGES.LOG.FIND_ALL_START(wsId ?? 'unknown'));

    const repository = await this.getRepository(workspaceId);

    const invoices = await repository.find({
      where: { deletedAt: IsNull() },
      take: options?.take,
      skip: options?.skip,
      order: options?.order ?? { createdAt: 'DESC' },
    });

    this.logger.debug(INVOICE_MESSAGES.LOG.FIND_ALL_SUCCESS(invoices.length));

    return invoices;
  }

  /**
   * Find all invoice IDs (lightweight operation)
   */
  async findAllIds(workspaceId?: string): Promise<string[]> {
    const repository = await this.getRepository(workspaceId);

    const results = await repository
      .createQueryBuilder('invoice')
      .select('invoice.id', 'id')
      .where('invoice.deletedAt IS NULL')
      .getRawMany<{ id: string }>();

    return results.map((r) => r.id);
  }

  /**
   * Find invoices by status
   */
  async findByStatus(
    status: string,
    workspaceId?: string,
    options?: FindWithPaginationOptions,
  ): Promise<MktInvoiceWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    const queryBuilder = repository
      .createQueryBuilder('invoice')
      .where('invoice.status = :status', { status })
      .andWhere('invoice.deletedAt IS NULL')
      .orderBy('invoice.createdAt', 'DESC');

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    return queryBuilder.getMany();
  }

  /**
   * Find invoices by supplier tax code
   */
  async findBySupplierTaxCode(
    supplierTaxCode: string,
    workspaceId?: string,
    options?: FindWithPaginationOptions,
  ): Promise<MktInvoiceWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    const queryBuilder = repository
      .createQueryBuilder('invoice')
      .where('invoice.supplierTaxCode = :supplierTaxCode', { supplierTaxCode })
      .andWhere('invoice.deletedAt IS NULL')
      .orderBy('invoice.createdAt', 'DESC');

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    return queryBuilder.getMany();
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create a new invoice
   */
  async create(
    data: Partial<MktInvoiceWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktInvoiceWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);

    const invoice = repository.create(data);
    const savedInvoice = await repository.save(invoice);

    this.logger.debug(INVOICE_MESSAGES.LOG.CREATE_SUCCESS(savedInvoice.id));

    return savedInvoice;
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update invoice by ID
   */
  async update(
    id: string,
    data: Partial<MktInvoiceWorkspaceEntity>,
    workspaceId?: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.update(
      'MktInvoiceWorkspaceEntity',
      { id },
      {
        ...data,
        updatedAt: DateTimeUtils.now().toJSDate(),
      },
    );

    this.logger.debug(INVOICE_MESSAGES.LOG.UPDATE_SUCCESS(id));
  }

  /**
   * Update and return the updated invoice
   */
  async updateAndReturn(
    id: string,
    data: Partial<MktInvoiceWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktInvoiceWorkspaceEntity> {
    await this.update(id, data, workspaceId);

    return this.findById(id, workspaceId);
  }

  /**
   * Soft delete invoice
   */
  async softDelete(
    id: string,
    workspaceId?: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.softDelete('MktInvoiceWorkspaceEntity', id);

    this.logger.log(INVOICE_MESSAGES.LOG.SOFT_DELETE_SUCCESS(id));
  }

  // ============================================
  // COUNT OPERATIONS
  // ============================================

  /**
   * Count all invoices
   */
  async count(workspaceId?: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({ where: { deletedAt: IsNull() } });
  }

  /**
   * Count invoices by status
   */
  async countByStatus(status: string, workspaceId?: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({
      where: { status: status as MKT_INVOICE_STATUS, deletedAt: IsNull() },
    });
  }

  // ============================================
  // AGGREGATION OPERATIONS
  // ============================================

  /**
   * Get status distribution statistics
   */
  async getStatusDistribution(
    workspaceId?: string,
  ): Promise<StatusDistributionItem[]> {
    const repository = await this.getRepository(workspaceId);

    const results = await repository
      .createQueryBuilder('invoice')
      .select('invoice.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('invoice.deletedAt IS NULL')
      .groupBy('invoice.status')
      .getRawMany();

    return results.map((r) => ({
      status: r.status ?? 'UNKNOWN',
      count: parseInt(r.count, 10) || 0,
    }));
  }

  /**
   * Get total amount sum for all invoices
   */
  async getTotalAmountSum(workspaceId?: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    const result = await repository
      .createQueryBuilder('invoice')
      .select('COALESCE(SUM(invoice.totalAmount), 0)', 'total')
      .where('invoice.deletedAt IS NULL')
      .getRawOne<{ total: string }>();

    return parseFloat(result?.total ?? '0') || 0;
  }

  /**
   * Find invoices issued within a date range
   */
  async findByIssueDateRange(
    startDate: string,
    endDate: string,
    workspaceId?: string,
  ): Promise<MktInvoiceWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository
      .createQueryBuilder('invoice')
      .where('invoice.issueDate >= :startDate', { startDate })
      .andWhere('invoice.issueDate <= :endDate', { endDate })
      .andWhere('invoice.deletedAt IS NULL')
      .orderBy('invoice.issueDate', 'DESC')
      .getMany();
  }

  // ============================================
  // INVOICE NUMBER HELPERS
  // ============================================

  /**
   * Check if invoice number exists
   */
  async isInvoiceNoExists(
    invoiceNo: string,
    workspaceId?: string,
  ): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const count = await repository
      .createQueryBuilder('invoice')
      .where('invoice.invoiceNo = :invoiceNo', { invoiceNo })
      .getCount();

    return count > 0;
  }

  /**
   * Check if S-Invoice code exists
   */
  async isSInvoiceCodeExists(
    sInvoiceCode: string,
    workspaceId?: string,
  ): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const count = await repository
      .createQueryBuilder('invoice')
      .where('invoice.sInvoiceCode = :sInvoiceCode', { sInvoiceCode })
      .getCount();

    return count > 0;
  }
}
