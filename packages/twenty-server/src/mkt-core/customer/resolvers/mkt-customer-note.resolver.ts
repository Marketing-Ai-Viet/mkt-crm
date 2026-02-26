import { Logger, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { MKT_CUSTOMER_NOTE_LOG_CONTEXT } from 'src/mkt-core/customer/constants/mkt-customer-note.constants';
import {
  CreateCustomerNoteInput,
  CustomerNoteListOutput,
  CustomerNoteOutput,
  CustomerNoteStatisticsOutput,
  DeleteCustomerNoteOutput,
  GetCustomerNotesInput,
  UpdateCustomerNoteInput,
} from 'src/mkt-core/customer/dto/customer-note.dto';
import { MktCustomerNoteWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer-note.workspace-entity';
import { MktCustomerNoteService } from 'src/mkt-core/customer/services/note/mkt-customer-note.service';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { CUSTOMER_DATA_SCOPE } from 'src/mkt-core/customer/constants';
import { DataScope } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators';

/**
 * MktCustomerNoteResolver - GraphQL resolver for customer note CRUD operations
 *
 * Queries:
 * - customerNoteList: Get paginated notes for a customer
 * - customerNoteById: Get a single note by ID
 * - customerNoteLatest: Get latest note for a customer
 * - customerNoteStats: Get note statistics for a customer
 *
 * Mutations:
 * - customerNoteCreate: Create a new note
 * - customerNoteUpdate: Update an existing note
 * - customerNoteDelete: Delete a note
 */
@Resolver()
export class MktCustomerNoteResolver {
  private readonly logger = new Logger(
    `${MKT_CUSTOMER_NOTE_LOG_CONTEXT}:Resolver`,
  );

  constructor(private readonly customerNoteService: MktCustomerNoteService) {}

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Convert entity to GraphQL output format
   */
  private mapToOutput(
    entity: MktCustomerNoteWorkspaceEntity,
  ): CustomerNoteOutput {
    const createdAtDateTime = DateTimeUtils.parse(entity.createdAt);
    const updatedAtDateTime = DateTimeUtils.parse(entity.updatedAt);

    return {
      id: entity.id,
      content: entity.content,
      noteType: entity.noteType ?? 'GENERAL',
      customerId: entity.customerId,
      createdAt: DateTimeUtils.toISO(createdAtDateTime),
      updatedAt: DateTimeUtils.toISO(updatedAtDateTime),
    };
  }

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Get paginated notes for a customer
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @DataScope(CUSTOMER_DATA_SCOPE.QUERY_LIST)
  @Query(() => CustomerNoteListOutput, {
    name: 'customerNoteList',
    description: 'Get paginated notes for a customer',
  })
  async getCustomerNotes(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: GetCustomerNotesInput,
  ): Promise<CustomerNoteListOutput> {
    this.logger.log(
      `Getting notes for customer ${input.customerId} in workspace ${workspace.id}`,
    );

    const [notes, totalCount] = await Promise.all([
      this.customerNoteService.getCustomerNotes(
        workspace.id,
        input.customerId,
        {
          limit: input.limit,
          offset: input.offset,
          noteType: input.noteType,
        },
      ),
      this.customerNoteService.countCustomerNotes(
        workspace.id,
        input.customerId,
      ),
    ]);

    return {
      items: notes.map((note) => this.mapToOutput(note)),
      totalCount,
    };
  }

  /**
   * Get a single note by ID
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @DataScope(CUSTOMER_DATA_SCOPE.QUERY_SINGLE)
  @Query(() => CustomerNoteOutput, {
    name: 'customerNoteById',
    nullable: true,
    description: 'Get a single customer note by ID',
  })
  async getCustomerNote(
    @AuthWorkspace() workspace: Workspace,
    @Args('noteId', { type: () => String }) noteId: string,
  ): Promise<CustomerNoteOutput | null> {
    this.logger.log(`Getting note ${noteId} in workspace ${workspace.id}`);

    try {
      const note = await this.customerNoteService.getNoteById(
        workspace.id,
        noteId,
      );

      return this.mapToOutput(note);
    } catch {
      return null;
    }
  }

  /**
   * Get latest note for a customer
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @DataScope(CUSTOMER_DATA_SCOPE.QUERY_SINGLE)
  @Query(() => CustomerNoteOutput, {
    name: 'customerNoteLatest',
    nullable: true,
    description: 'Get the latest note for a customer',
  })
  async getLatestNote(
    @AuthWorkspace() workspace: Workspace,
    @Args('customerId', { type: () => String }) customerId: string,
  ): Promise<CustomerNoteOutput | null> {
    this.logger.log(
      `Getting latest note for customer ${customerId} in workspace ${workspace.id}`,
    );

    const note = await this.customerNoteService.getLatestNote(
      workspace.id,
      customerId,
    );

    if (!note) {
      return null;
    }

    return this.mapToOutput(note);
  }

  /**
   * Get note statistics for a customer
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @DataScope(CUSTOMER_DATA_SCOPE.QUERY_AGGREGATION)
  @Query(() => CustomerNoteStatisticsOutput, {
    name: 'customerNoteStats',
    description: 'Get note statistics for a customer',
  })
  async getCustomerNoteStatistics(
    @AuthWorkspace() workspace: Workspace,
    @Args('customerId', { type: () => String }) customerId: string,
  ): Promise<CustomerNoteStatisticsOutput> {
    this.logger.log(
      `Getting note statistics for customer ${customerId} in workspace ${workspace.id}`,
    );

    const stats = await this.customerNoteService.getCustomerNoteStatistics(
      workspace.id,
      customerId,
    );

    return {
      totalNotes: stats.totalNotes,
      countByType: stats.countByType.map((item) => ({
        noteType: item.noteType,
        count: item.count,
      })),
    };
  }

  // ============================================
  // MUTATIONS
  // ============================================

  /**
   * Create a new customer note
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @DataScope(CUSTOMER_DATA_SCOPE.MUTATION_CREATE)
  @Mutation(() => CustomerNoteOutput, {
    name: 'customerNoteCreate',
    description: 'Create a new customer note',
  })
  async createCustomerNote(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: CreateCustomerNoteInput,
  ): Promise<CustomerNoteOutput> {
    this.logger.log(
      `Creating note for customer ${input.customerId} in workspace ${workspace.id}`,
    );

    const note = await this.customerNoteService.createNote(workspace.id, {
      customerId: input.customerId,
      content: input.content,
      noteType: input.noteType,
    });

    return this.mapToOutput(note);
  }

  /**
   * Update an existing customer note
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @DataScope(CUSTOMER_DATA_SCOPE.MUTATION_UPDATE)
  @Mutation(() => CustomerNoteOutput, {
    name: 'customerNoteUpdate',
    description: 'Update an existing customer note',
  })
  async updateCustomerNote(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: UpdateCustomerNoteInput,
  ): Promise<CustomerNoteOutput> {
    this.logger.log(
      `Updating note ${input.noteId} in workspace ${workspace.id}`,
    );

    const updateData: Record<string, unknown> = {};

    if (input.content !== undefined) {
      updateData.content = input.content;
    }

    if (input.noteType !== undefined) {
      updateData.noteType = input.noteType;
    }

    const note = await this.customerNoteService.updateNote(
      workspace.id,
      input.noteId,
      updateData,
    );

    return this.mapToOutput(note);
  }

  /**
   * Delete a customer note
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @DataScope(CUSTOMER_DATA_SCOPE.MUTATION_DELETE)
  @Mutation(() => DeleteCustomerNoteOutput, {
    name: 'customerNoteDelete',
    description: 'Delete a customer note',
  })
  async deleteCustomerNote(
    @AuthWorkspace() workspace: Workspace,
    @Args('noteId', { type: () => String }) noteId: string,
  ): Promise<DeleteCustomerNoteOutput> {
    this.logger.log(`Deleting note ${noteId} in workspace ${workspace.id}`);

    try {
      const success = await this.customerNoteService.deleteNote(
        workspace.id,
        noteId,
      );

      return {
        success,
        message: success
          ? 'Note deleted successfully'
          : 'Failed to delete note',
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to delete note',
      };
    }
  }
}
