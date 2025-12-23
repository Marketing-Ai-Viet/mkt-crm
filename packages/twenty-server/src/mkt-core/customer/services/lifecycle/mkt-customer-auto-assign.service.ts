import { Injectable, Logger } from '@nestjs/common';

import { FieldActorSource } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MKT_CUSTOMER_AUTO_ASSIGN_CONFIG } from 'src/mkt-core/customer/constants/mkt-customer.constant';
import { CUSTOMER_MESSAGES } from 'src/mkt-core/customer/messages';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
import {
  AssignmentResult,
  AssignmentStrategy,
} from 'src/mkt-core/customer/types';

/**
 * MktCustomerAutoAssignService - Auto-assign customers to sales members
 *
 * FIXED: Thread-safe by accepting workspaceId as parameter
 * instead of using shared mktRepo.workspaceId
 */
@Injectable()
export class MktCustomerAutoAssignService {
  private readonly logger = new Logger(MktCustomerAutoAssignService.name);

  private roundRobinIndex = 0;

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  /**
   * Auto-assign a customer to a sales member
   * @param customer - Customer to assign
   * @param workspaceId - Workspace ID (required for thread-safety)
   * @param strategy - Assignment strategy (optional)
   */
  async assignCustomer(
    customer: MktCustomerWorkspaceEntity,
    workspaceId: string,
    strategy?: AssignmentStrategy,
  ): Promise<AssignmentResult> {
    this.logger.log(CUSTOMER_MESSAGES.LOG.AUTO_ASSIGN_START(customer.id));

    // Check if auto-assign is enabled
    if (!MKT_CUSTOMER_AUTO_ASSIGN_CONFIG.ENABLED) {
      return this.skipAssignment(customer.id, 'Auto-assign is disabled');
    }

    // Skip if customer already has an owner assigned
    if (customer.createdBy) {
      return this.skipAssignment(customer.id, 'Customer already has an owner');
    }

    // Get eligible sales members
    const salesMembers = await this.getEligibleSalesMembers(workspaceId);

    if (salesMembers.length === 0) {
      this.logger.warn(CUSTOMER_MESSAGES.WARN.NO_SALES_AVAILABLE);

      return this.skipAssignment(customer.id, 'No sales members available');
    }

    // Select sales member based on strategy
    const selectedMember = await this.selectSalesMember(
      salesMembers,
      workspaceId,
      strategy ?? MKT_CUSTOMER_AUTO_ASSIGN_CONFIG.STRATEGY,
    );

    // Update customer with assigned sales member
    const customerRepo =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        workspaceId,
        MktCustomerWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    await customerRepo.update(customer.id, {
      createdBy: {
        source: FieldActorSource.SYSTEM,
        workspaceMemberId: selectedMember.id,
        name: selectedMember.name?.firstName ?? 'Unknown',
        context: {},
      },
    } as never);

    this.logger.log(
      CUSTOMER_MESSAGES.LOG.AUTO_ASSIGN_SUCCESS(customer.id, selectedMember.id),
    );

    return {
      customerId: customer.id,
      assignedToId: selectedMember.id,
      assignedToName: selectedMember.name?.firstName ?? null,
      success: true,
    };
  }

  /**
   * Get workspace members eligible for auto-assignment
   */
  private async getEligibleSalesMembers(
    workspaceId: string,
  ): Promise<WorkspaceMemberWorkspaceEntity[]> {
    const memberRepo =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        workspaceId,
        WorkspaceMemberWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    // Get all active workspace members
    // In a full implementation, you would filter by role
    const members = await memberRepo
      .createQueryBuilder('member')
      .where('member.deletedAt IS NULL')
      .orderBy('member.createdAt', 'ASC')
      .getMany();

    return members;
  }

  /**
   * Select a sales member based on assignment strategy
   */
  private async selectSalesMember(
    members: WorkspaceMemberWorkspaceEntity[],
    workspaceId: string,
    strategy: AssignmentStrategy,
  ): Promise<WorkspaceMemberWorkspaceEntity> {
    switch (strategy) {
      case 'round_robin':
        return this.selectRoundRobin(members);

      case 'least_customers':
        return this.selectLeastCustomers(members, workspaceId);

      case 'random':
        return this.selectRandom(members);

      default:
        return this.selectRoundRobin(members);
    }
  }

  /**
   * Round-robin selection
   */
  private selectRoundRobin(
    members: WorkspaceMemberWorkspaceEntity[],
  ): WorkspaceMemberWorkspaceEntity {
    const selected = members[this.roundRobinIndex % members.length];

    this.roundRobinIndex++;

    return selected;
  }

  /**
   * Select member with least assigned customers
   */
  private async selectLeastCustomers(
    members: WorkspaceMemberWorkspaceEntity[],
    workspaceId: string,
  ): Promise<WorkspaceMemberWorkspaceEntity> {
    const customerRepo =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        workspaceId,
        MktCustomerWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    let minCount = Infinity;
    let selectedMember = members[0];

    for (const member of members) {
      const count = await customerRepo
        .createQueryBuilder('customer')
        .where("customer.createdBy->>'workspaceMemberId' = :memberId", {
          memberId: member.id,
        })
        .andWhere('customer.deletedAt IS NULL')
        .getCount();

      if (count < minCount) {
        minCount = count;
        selectedMember = member;
      }
    }

    return selectedMember;
  }

  /**
   * Random selection
   */
  private selectRandom(
    members: WorkspaceMemberWorkspaceEntity[],
  ): WorkspaceMemberWorkspaceEntity {
    const randomIndex = Math.floor(Math.random() * members.length);

    return members[randomIndex];
  }

  /**
   * Helper to create skip result
   */
  private skipAssignment(customerId: string, reason: string): AssignmentResult {
    this.logger.log(CUSTOMER_MESSAGES.LOG.AUTO_ASSIGN_SKIP(customerId, reason));

    return {
      customerId,
      assignedToId: null,
      assignedToName: null,
      success: false,
      reason,
    };
  }

  /**
   * Get assignment statistics
   */
  async getAssignmentStats(workspaceId: string): Promise<{
    totalCustomers: number;
    assignedCustomers: number;
    unassignedCustomers: number;
    byMember: Array<{ memberId: string; memberName: string; count: number }>;
  }> {
    const customerRepo =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        workspaceId,
        MktCustomerWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    const memberRepo =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        workspaceId,
        WorkspaceMemberWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    const totalCustomers = await customerRepo
      .createQueryBuilder('customer')
      .where('customer.deletedAt IS NULL')
      .getCount();

    const assignedCustomers = await customerRepo
      .createQueryBuilder('customer')
      .where('customer.createdBy IS NOT NULL')
      .andWhere('customer.deletedAt IS NULL')
      .getCount();

    const members = await memberRepo
      .createQueryBuilder('member')
      .where('member.deletedAt IS NULL')
      .getMany();

    const byMember: Array<{
      memberId: string;
      memberName: string;
      count: number;
    }> = [];

    for (const member of members) {
      const count = await customerRepo
        .createQueryBuilder('customer')
        .where("customer.createdBy->>'workspaceMemberId' = :memberId", {
          memberId: member.id,
        })
        .andWhere('customer.deletedAt IS NULL')
        .getCount();

      byMember.push({
        memberId: member.id,
        memberName: member.name?.firstName ?? 'Unknown',
        count,
      });
    }

    return {
      totalCustomers,
      assignedCustomers,
      unassignedCustomers: totalCustomers - assignedCustomers,
      byMember: byMember.sort((a, b) => b.count - a.count),
    };
  }
}
