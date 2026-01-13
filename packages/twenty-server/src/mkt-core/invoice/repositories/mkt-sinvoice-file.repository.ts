import { Injectable } from '@nestjs/common';

import { DeepPartial } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MKT_INVOICE_LOG_CONTEXT } from 'src/mkt-core/invoice/messages';
import { MktSInvoiceFileWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice-file.workspace-entity';

/**
 * MktSInvoiceFileRepository - Data access layer for SInvoiceFile entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 *
 * Responsibilities:
 * - Database operations for MktSInvoiceFile entity
 * - Query building and execution
 * - Thread-safe workspace context handling
 */
@Injectable()
export class MktSInvoiceFileRepository extends BaseWorkspaceRepository<MktSInvoiceFileWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktSInvoiceFileWorkspaceEntity,
      `${MKT_INVOICE_LOG_CONTEXT}:SInvoiceFileRepository`,
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find SInvoiceFile by ID with optional workspace context
   */
  async findByIdWithContext(
    id: string,
    workspaceId?: string,
  ): Promise<MktSInvoiceFileWorkspaceEntity | null> {
    this.logger.debug(`Finding SInvoiceFile by ID: ${id}`);

    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id } });
  }

  /**
   * Find SInvoiceFiles by SInvoice ID
   */
  async findBySInvoiceId(
    sInvoiceId: string,
    workspaceId?: string,
  ): Promise<MktSInvoiceFileWorkspaceEntity[]> {
    this.logger.debug(`Finding SInvoiceFiles by SInvoice ID: ${sInvoiceId}`);

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { mktSInvoiceId: sInvoiceId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find SInvoiceFile by invoice number
   */
  async findByInvoiceNo(
    invoiceNo: string,
    workspaceId?: string,
  ): Promise<MktSInvoiceFileWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { invoiceNo } });
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update SInvoiceFile by ID with optional workspace context
   */
  async updateWithContext(
    id: string,
    data: DeepPartial<MktSInvoiceFileWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<void> {
    this.logger.debug(`Updating SInvoiceFile ${id}`);

    const repository = await this.getRepository(workspaceId);

    await repository.update(id, data as never);

    this.logger.debug(`SInvoiceFile ${id} updated successfully`);
  }

  /**
   * Update and return the updated SInvoiceFile
   */
  async updateAndReturnWithContext(
    id: string,
    data: DeepPartial<MktSInvoiceFileWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktSInvoiceFileWorkspaceEntity | null> {
    await this.updateWithContext(id, data, workspaceId);

    return this.findByIdWithContext(id, workspaceId);
  }

  // ============================================
  // COUNT OPERATIONS
  // ============================================

  /**
   * Count files by SInvoice ID
   */
  async countBySInvoiceId(
    sInvoiceId: string,
    workspaceId?: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({
      where: { mktSInvoiceId: sInvoiceId },
    });
  }
}
