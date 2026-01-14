import { Injectable, NotFoundException } from '@nestjs/common';

import { IsNull } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
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
 * Extends BaseWorkspaceRepository for common CRUD operations.
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
export class MktInvoiceRepository extends BaseWorkspaceRepository<MktInvoiceWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktInvoiceWorkspaceEntity,
      `${MKT_INVOICE_LOG_CONTEXT}:Repository`,
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find invoice by ID
   * @throws NotFoundException if invoice not found
   */
  async findInvoiceById(id: string): Promise<MktInvoiceWorkspaceEntity> {
    this.logger.debug(INVOICE_MESSAGES.LOG.FIND_BY_ID_START(id));

    const invoice = await this.findById(id);

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
  async findByIdOrNull(id: string): Promise<MktInvoiceWorkspaceEntity | null> {
    return this.findById(id);
  }

  /**
   * Find invoice by invoice number
   */
  async findByInvoiceNo(
    invoiceNo: string,
  ): Promise<MktInvoiceWorkspaceEntity | null> {
    return this.findOne({ invoiceNo });
  }

  /**
   * Find invoice by S-Invoice code
   */
  async findBySInvoiceCode(
    sInvoiceCode: string,
  ): Promise<MktInvoiceWorkspaceEntity | null> {
    return this.findOne({ sInvoiceCode });
  }

  /**
   * Find invoice by transaction UUID
   */
  async findByTransactionUuid(
    transactionUuid: string,
  ): Promise<MktInvoiceWorkspaceEntity | null> {
    return this.findOne({ transactionUuid });
  }

  /**
   * Find all invoices with pagination
   */
  async findAllInvoices(
    options?: FindInvoiceOptions,
  ): Promise<MktInvoiceWorkspaceEntity[]> {
    this.logger.debug(INVOICE_MESSAGES.LOG.FIND_ALL_START('current'));

    const repository = await this.getRepository();

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
  async findAllIds(): Promise<string[]> {
    const repository = await this.getRepository();

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
    options?: FindWithPaginationOptions,
  ): Promise<MktInvoiceWorkspaceEntity[]> {
    const repository = await this.getRepository();

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
    options?: FindWithPaginationOptions,
  ): Promise<MktInvoiceWorkspaceEntity[]> {
    const repository = await this.getRepository();

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
  async createInvoice(
    data: Partial<MktInvoiceWorkspaceEntity>,
  ): Promise<MktInvoiceWorkspaceEntity> {
    const repository = await this.getRepository();

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
  async updateInvoice(
    id: string,
    data: Partial<MktInvoiceWorkspaceEntity>,
  ): Promise<void> {
    const repository = await this.getRepository();

    await repository.update(id, {
      ...data,
      updatedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    });

    this.logger.debug(INVOICE_MESSAGES.LOG.UPDATE_SUCCESS(id));
  }

  /**
   * Update and return the updated invoice
   */
  async updateInvoiceAndReturn(
    id: string,
    data: Partial<MktInvoiceWorkspaceEntity>,
  ): Promise<MktInvoiceWorkspaceEntity> {
    await this.updateInvoice(id, data);

    return this.findInvoiceById(id);
  }

  /**
   * Soft delete invoice
   */
  async softDeleteInvoice(id: string): Promise<void> {
    await this.softDelete(id);

    this.logger.log(INVOICE_MESSAGES.LOG.SOFT_DELETE_SUCCESS(id));
  }

  // ============================================
  // COUNT OPERATIONS
  // ============================================

  /**
   * Count all invoices
   */
  async countInvoices(): Promise<number> {
    return this.count({ deletedAt: IsNull() } as never);
  }

  /**
   * Count invoices by status
   */
  async countByStatus(status: string): Promise<number> {
    const repository = await this.getRepository();

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
  async getStatusDistribution(): Promise<StatusDistributionItem[]> {
    const repository = await this.getRepository();

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
  async getTotalAmountSum(): Promise<number> {
    const repository = await this.getRepository();

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
  ): Promise<MktInvoiceWorkspaceEntity[]> {
    const repository = await this.getRepository();

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
  async isInvoiceNoExists(invoiceNo: string): Promise<boolean> {
    return this.existsWhere({ invoiceNo });
  }

  /**
   * Check if S-Invoice code exists
   */
  async isSInvoiceCodeExists(sInvoiceCode: string): Promise<boolean> {
    return this.existsWhere({ sInvoiceCode });
  }
}
