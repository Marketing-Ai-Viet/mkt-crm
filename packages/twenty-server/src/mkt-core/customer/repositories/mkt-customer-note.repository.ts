import { Injectable } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import {
  CUSTOMER_NOTES_DEFAULT_LIMIT,
  MKT_CUSTOMER_NOTE_LOG_CONTEXT,
  MktCustomerNoteType,
} from 'src/mkt-core/customer/constants/mkt-customer-note.constants';
import { MktCustomerNoteWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer-note.workspace-entity';
import {
  CreateCustomerNoteData,
  CustomerNoteQueryOptions,
} from 'src/mkt-core/customer/types';

/**
 * MktCustomerNoteRepository - Data access layer for Customer Note entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 *
 * Responsibilities:
 * - Database operations for MktCustomerNote entity
 * - Query building and execution
 * - Thread-safe workspace context handling
 */
@Injectable()
export class MktCustomerNoteRepository extends BaseWorkspaceRepository<MktCustomerNoteWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktCustomerNoteWorkspaceEntity,
      `${MKT_CUSTOMER_NOTE_LOG_CONTEXT}:Repository`,
    );
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create customer note
   */
  async createNote(
    data: CreateCustomerNoteData,
  ): Promise<MktCustomerNoteWorkspaceEntity> {
    const repository = await this.getRepository();

    const noteRecord = repository.create({
      customerId: data.customerId,
      content: data.content,
      noteType: data.noteType ?? 'GENERAL',
    });

    const saved = await repository.save(noteRecord);

    this.logger.debug(
      `Created note for customer ${data.customerId}: type=${data.noteType ?? 'GENERAL'}`,
    );

    return saved;
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Get notes for a customer
   */
  async findByCustomerId(
    customerId: string,
    options?: CustomerNoteQueryOptions,
  ): Promise<MktCustomerNoteWorkspaceEntity[]> {
    const repository = await this.getRepository();

    const whereClause: Record<string, unknown> = { customerId };

    if (options?.noteType) {
      whereClause.noteType = options.noteType;
    }

    return repository.find({
      where: whereClause,
      take: options?.limit ?? CUSTOMER_NOTES_DEFAULT_LIMIT,
      skip: options?.offset ?? 0,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get note by ID
   */
  async findNoteById(
    noteId: string,
  ): Promise<MktCustomerNoteWorkspaceEntity | null> {
    const repository = await this.getRepository();

    return repository.findOne({
      where: { id: noteId },
    });
  }

  /**
   * Get latest note for a customer
   */
  async findLatestByCustomerId(
    customerId: string,
  ): Promise<MktCustomerNoteWorkspaceEntity | null> {
    const repository = await this.getRepository();

    return repository.findOne({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update note content
   */
  async updateNote(
    noteId: string,
    data: Partial<Pick<MktCustomerNoteWorkspaceEntity, 'content' | 'noteType'>>,
  ): Promise<MktCustomerNoteWorkspaceEntity | null> {
    const repository = await this.getRepository();

    await repository.update(noteId, data);

    return this.findNoteById(noteId);
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Delete note by ID
   */
  async deleteNote(noteId: string): Promise<boolean> {
    const repository = await this.getRepository();

    const result = await repository.delete(noteId);

    return (result.affected ?? 0) > 0;
  }

  /**
   * Delete all notes for a customer
   */
  async deleteByCustomerId(customerId: string): Promise<number> {
    const repository = await this.getRepository();

    const result = await repository.delete({ customerId });

    return result.affected ?? 0;
  }

  // ============================================
  // COUNT OPERATIONS
  // ============================================

  /**
   * Count notes for a customer
   */
  async countByCustomerId(customerId: string): Promise<number> {
    const repository = await this.getRepository();

    return repository.count({ where: { customerId } });
  }

  /**
   * Count notes by type for a customer
   */
  async countByCustomerIdAndType(
    customerId: string,
    noteType: MktCustomerNoteType,
  ): Promise<number> {
    const repository = await this.getRepository();

    return repository.count({ where: { customerId, noteType } });
  }
}
