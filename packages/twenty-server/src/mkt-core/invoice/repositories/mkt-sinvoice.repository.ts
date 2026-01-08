import { Injectable, Logger } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MKT_INVOICE_LOG_CONTEXT } from 'src/mkt-core/invoice/messages';
import { MktSInvoiceWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice.workspace-entity';
import { SInvoiceUpdate } from 'src/mkt-core/invoice/types';

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
 * Responsibilities:
 * - Database operations for MktSInvoice entity
 * - Query building and execution
 * - Thread-safe workspace context handling
 */
@Injectable()
export class MktSInvoiceRepository {
  private readonly logger = new Logger(
    `${MKT_INVOICE_LOG_CONTEXT}:SInvoiceRepository`,
  );

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  // ============================================
  // REPOSITORY ACCESS
  // ============================================

  /**
   * Get repository for specific workspace
   */
  async getRepository(
    workspaceId?: string,
  ): Promise<WorkspaceRepository<MktSInvoiceWorkspaceEntity>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new Error('Workspace ID not found');
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      MktSInvoiceWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find SInvoice by ID
   */
  async findById(
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
   * Update SInvoice by ID
   */
  async update(
    id: string,
    data: SInvoiceUpdate,
    workspaceId?: string,
  ): Promise<void> {
    this.logger.debug(`Updating SInvoice ${id}`);

    const repository = await this.getRepository(workspaceId);

    await repository.update(id, data as MktSInvoiceWorkspaceEntity);

    this.logger.debug(`SInvoice ${id} updated successfully`);
  }

  /**
   * Update and return the updated SInvoice
   */
  async updateAndReturn(
    id: string,
    data: SInvoiceUpdate,
    workspaceId?: string,
  ): Promise<MktSInvoiceWorkspaceEntity | null> {
    await this.update(id, data, workspaceId);

    return this.findById(id, workspaceId);
  }
}
