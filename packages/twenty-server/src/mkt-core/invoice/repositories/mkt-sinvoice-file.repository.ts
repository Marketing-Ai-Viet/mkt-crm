import { Injectable, Logger } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MKT_INVOICE_LOG_CONTEXT } from 'src/mkt-core/invoice/messages';
import { MktSInvoiceFileWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice-file.workspace-entity';

/**
 * MktSInvoiceFileRepository - Data access layer for SInvoiceFile entity
 *
 * Responsibilities:
 * - Database operations for MktSInvoiceFile entity
 * - Query building and execution
 * - Thread-safe workspace context handling
 */
@Injectable()
export class MktSInvoiceFileRepository {
  private readonly logger = new Logger(
    `${MKT_INVOICE_LOG_CONTEXT}:SInvoiceFileRepository`,
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
  ): Promise<WorkspaceRepository<MktSInvoiceFileWorkspaceEntity>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new Error('Workspace ID not found');
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      MktSInvoiceFileWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find SInvoiceFile by ID
   */
  async findById(
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
   * Update SInvoiceFile by ID
   */
  async update(
    id: string,
    data: Partial<MktSInvoiceFileWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<void> {
    this.logger.debug(`Updating SInvoiceFile ${id}`);

    const repository = await this.getRepository(workspaceId);

    await repository.update(id, data);

    this.logger.debug(`SInvoiceFile ${id} updated successfully`);
  }

  /**
   * Update and return the updated SInvoiceFile
   */
  async updateAndReturn(
    id: string,
    data: Partial<MktSInvoiceFileWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktSInvoiceFileWorkspaceEntity | null> {
    await this.update(id, data, workspaceId);

    return this.findById(id, workspaceId);
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
