import { Injectable } from '@nestjs/common';

import { DeepPartial } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MKT_INVOICE_LOG_CONTEXT } from 'src/mkt-core/invoice/messages';
import { MktSInvoiceWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice.workspace-entity';

// Relations for SInvoice entity
const SINVOICE_FULL_RELATIONS = [
  'mktSInvoicePayments',
  'mktSInvoiceItems',
  'mktSInvoiceTaxBreakdowns',
  'mktSInvoiceMetadata',
] as const;

/**
 * MktSInvoiceRepository - Data access layer for SInvoice entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 *
 * Responsibilities:
 * - Database operations for MktSInvoice entity
 * - Query building and execution
 * - Thread-safe workspace context handling
 */
@Injectable()
export class MktSInvoiceRepository extends BaseWorkspaceRepository<MktSInvoiceWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktSInvoiceWorkspaceEntity,
      `${MKT_INVOICE_LOG_CONTEXT}:SInvoiceRepository`,
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find SInvoice by ID with optional workspace context
   */
  async findByIdWithContext(
    id: string,
    workspaceId?: string,
  ): Promise<MktSInvoiceWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id } });
  }

  /**
   * Find SInvoice by ID with full relations
   */
  async findByIdWithRelations(
    id: string,
    workspaceId?: string,
  ): Promise<MktSInvoiceWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id },
      relations: [...SINVOICE_FULL_RELATIONS],
    });
  }

  /**
   * Find SInvoice by Order ID
   */
  async findByOrderId(
    orderId: string,
    workspaceId?: string,
  ): Promise<MktSInvoiceWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { mktOrderId: orderId },
    });
  }

  /**
   * Find SInvoice by Order ID with full relations
   */
  async findByOrderIdWithRelations(
    orderId: string,
    workspaceId?: string,
  ): Promise<MktSInvoiceWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { mktOrderId: orderId },
      relations: [...SINVOICE_FULL_RELATIONS],
    });
  }

  /**
   * Find SInvoice by invoice number
   */
  async findByInvoiceNo(
    invoiceNo: string,
    workspaceId?: string,
  ): Promise<MktSInvoiceWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { invoiceNo } });
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update SInvoice by ID with optional workspace context
   */
  async updateWithContext(
    id: string,
    data: DeepPartial<MktSInvoiceWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<void> {
    this.logger.debug(`Updating SInvoice ${id}`);

    const repository = await this.getRepository(workspaceId);

    await repository.update(id, data as never);

    this.logger.debug(`SInvoice ${id} updated successfully`);
  }

  /**
   * Update and return the updated SInvoice
   */
  async updateAndReturnWithContext(
    id: string,
    data: DeepPartial<MktSInvoiceWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktSInvoiceWorkspaceEntity | null> {
    await this.updateWithContext(id, data, workspaceId);

    return this.findByIdWithContext(id, workspaceId);
  }
}
