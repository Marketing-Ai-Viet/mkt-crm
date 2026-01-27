import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import {
  CUSTOMER_NOTES_DEFAULT_LIMIT,
  MKT_CUSTOMER_NOTE_LOG_CONTEXT,
  MktCustomerNoteType,
} from 'src/mkt-core/customer/constants/mkt-customer-note.constants';
import { MktCustomerNoteWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer-note.workspace-entity';
import { MktCustomerNoteRepository } from 'src/mkt-core/customer/repositories/mkt-customer-note.repository';
import {
  CreateCustomerNoteData,
  CustomerNoteQueryOptions,
} from 'src/mkt-core/customer/types';

/**
 * Statistics for customer notes
 */
export type CustomerNoteStatistics = {
  totalNotes: number;
  countByType: Array<{ noteType: MktCustomerNoteType; count: number }>;
};

/**
 * MktCustomerNoteService - Business logic for Customer Note CRUD operations
 *
 * Responsibilities:
 * - Create, update, delete customer notes
 * - Query notes with filtering and pagination
 * - Aggregate statistics
 */
@Injectable()
export class MktCustomerNoteService {
  private readonly logger = new Logger(
    `${MKT_CUSTOMER_NOTE_LOG_CONTEXT}:Service`,
  );

  constructor(
    private readonly customerNoteRepository: MktCustomerNoteRepository,
  ) {}

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create a new customer note
   */
  async createNote(
    workspaceId: string,
    data: CreateCustomerNoteData,
  ): Promise<MktCustomerNoteWorkspaceEntity> {
    this.logger.log(
      `Creating note for customer ${data.customerId} in workspace ${workspaceId}`,
    );

    const note = await this.customerNoteRepository.createNote(data);

    this.logger.debug(
      `Created note ${note.id} for customer ${data.customerId}`,
    );

    return note;
  }

  // ============================================
  // READ OPERATIONS
  // ============================================

  /**
   * Get a single note by ID
   */
  async getNoteById(
    workspaceId: string,
    noteId: string,
  ): Promise<MktCustomerNoteWorkspaceEntity> {
    this.logger.debug(`Getting note ${noteId} in workspace ${workspaceId}`);

    const note = await this.customerNoteRepository.findNoteById(noteId);

    if (!note) {
      throw new NotFoundException(`Note not found: ${noteId}`);
    }

    return note;
  }

  /**
   * Get notes for a customer with optional filtering
   */
  async getCustomerNotes(
    workspaceId: string,
    customerId: string,
    options?: CustomerNoteQueryOptions,
  ): Promise<MktCustomerNoteWorkspaceEntity[]> {
    this.logger.debug(
      `Getting notes for customer ${customerId} in workspace ${workspaceId}`,
    );

    return this.customerNoteRepository.findByCustomerId(customerId, {
      limit: options?.limit ?? CUSTOMER_NOTES_DEFAULT_LIMIT,
      offset: options?.offset ?? 0,
      noteType: options?.noteType,
    });
  }

  /**
   * Get latest note for a customer
   */
  async getLatestNote(
    workspaceId: string,
    customerId: string,
  ): Promise<MktCustomerNoteWorkspaceEntity | null> {
    this.logger.debug(
      `Getting latest note for customer ${customerId} in workspace ${workspaceId}`,
    );

    return this.customerNoteRepository.findLatestByCustomerId(customerId);
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update a customer note
   */
  async updateNote(
    workspaceId: string,
    noteId: string,
    data: Partial<Pick<MktCustomerNoteWorkspaceEntity, 'content' | 'noteType'>>,
  ): Promise<MktCustomerNoteWorkspaceEntity> {
    this.logger.log(`Updating note ${noteId} in workspace ${workspaceId}`);

    // Verify note exists
    const existingNote = await this.customerNoteRepository.findNoteById(noteId);

    if (!existingNote) {
      throw new NotFoundException(`Note not found: ${noteId}`);
    }

    const updatedNote = await this.customerNoteRepository.updateNote(
      noteId,
      data,
    );

    if (!updatedNote) {
      throw new NotFoundException(`Failed to update note: ${noteId}`);
    }

    this.logger.debug(`Updated note ${noteId}`);

    return updatedNote;
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Delete a note by ID
   */
  async deleteNote(workspaceId: string, noteId: string): Promise<boolean> {
    this.logger.log(`Deleting note ${noteId} in workspace ${workspaceId}`);

    // Verify note exists
    const existingNote = await this.customerNoteRepository.findNoteById(noteId);

    if (!existingNote) {
      throw new NotFoundException(`Note not found: ${noteId}`);
    }

    const deleted = await this.customerNoteRepository.deleteNote(noteId);

    if (deleted) {
      this.logger.debug(`Deleted note ${noteId}`);
    }

    return deleted;
  }

  /**
   * Delete all notes for a customer
   */
  async deleteAllCustomerNotes(
    workspaceId: string,
    customerId: string,
  ): Promise<number> {
    this.logger.log(
      `Deleting all notes for customer ${customerId} in workspace ${workspaceId}`,
    );

    const count =
      await this.customerNoteRepository.deleteByCustomerId(customerId);

    this.logger.debug(`Deleted ${count} notes for customer ${customerId}`);

    return count;
  }

  // ============================================
  // COUNT & STATISTICS
  // ============================================

  /**
   * Count notes for a customer
   */
  async countCustomerNotes(
    workspaceId: string,
    customerId: string,
  ): Promise<number> {
    return this.customerNoteRepository.countByCustomerId(customerId);
  }

  /**
   * Get note statistics for a customer
   */
  async getCustomerNoteStatistics(
    workspaceId: string,
    customerId: string,
  ): Promise<CustomerNoteStatistics> {
    this.logger.debug(
      `Getting note statistics for customer ${customerId} in workspace ${workspaceId}`,
    );

    const totalNotes =
      await this.customerNoteRepository.countByCustomerId(customerId);

    // Count by each note type
    const noteTypes: MktCustomerNoteType[] = [
      'GENERAL',
      'CALL',
      'MEETING',
      'ISSUE',
      'FOLLOWUP',
      'OTHER',
    ];

    const countByTypePromises = noteTypes.map(async (noteType) => {
      const count = await this.customerNoteRepository.countByCustomerIdAndType(
        customerId,
        noteType,
      );

      return { noteType, count };
    });

    const countByType = await Promise.all(countByTypePromises);

    // Filter out zero counts
    const nonZeroCounts = countByType.filter((item) => item.count > 0);

    return {
      totalNotes,
      countByType: nonZeroCounts,
    };
  }
}
