import { Injectable, Logger } from '@nestjs/common';

import { FieldActorSource } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { MKT_CUSTOMER_AUTO_ASSIGN_CONFIG } from 'src/mkt-core/customer/constants/mkt-customer.constant';
import { CUSTOMER_MESSAGES } from 'src/mkt-core/customer/messages';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktCustomerRepository } from 'src/mkt-core/customer/repositories';
import {
  AssignmentResult,
  AssignmentStrategy,
} from 'src/mkt-core/customer/types';
import { MktWorkspaceMemberRepository } from 'src/mkt-core/workspace-member/repositories/mkt-workspace-member.repository';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

/**
 * MktCustomerAutoAssignService - Auto-assign customers to sales members
 *
 * Uses MktCustomerRepository and MktWorkspaceMemberRepository for thread-safe access
 */
@Injectable()
export class MktCustomerAutoAssignService {
  private readonly logger = new Logger(MktCustomerAutoAssignService.name);

  private roundRobinIndex = 0;

  constructor(
    private readonly customerRepository: MktCustomerRepository,
    private readonly workspaceMemberRepository: MktWorkspaceMemberRepository,
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
    await this.customerRepository.update(
      customer.id,
      {
        createdBy: {
          source: FieldActorSource.SYSTEM,
          workspaceMemberId: selectedMember.id,
          name: selectedMember.name?.firstName ?? 'Unknown',
          context: {},
        },
      } as Partial<MktCustomerWorkspaceEntity>,
      workspaceId,
    );

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
    // Get all active workspace members
    // In a full implementation, you would filter by role
    return this.workspaceMemberRepository.findAllActive(workspaceId);
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
   * Uses batch query to avoid N+1 problem
   */
  private async selectLeastCustomers(
    members: WorkspaceMemberWorkspaceEntity[],
    workspaceId: string,
  ): Promise<WorkspaceMemberWorkspaceEntity> {
    const memberIds = members.map((m) => m.id);

    // Batch query to get all counts at once (prevents N+1)
    const countMap = await this.customerRepository.countByCreatedByMemberIds(
      memberIds,
      workspaceId,
    );

    let minCount = Infinity;
    let selectedMember = members[0];

    for (const member of members) {
      const count = countMap.get(member.id) ?? 0;

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
   * Uses batch query to avoid N+1 problem
   */
  async getAssignmentStats(workspaceId: string): Promise<{
    totalCustomers: number;
    assignedCustomers: number;
    unassignedCustomers: number;
    byMember: Array<{ memberId: string; memberName: string; count: number }>;
  }> {
    const totalCustomers = await this.customerRepository.count(workspaceId);
    const assignedCustomers =
      await this.customerRepository.countAssigned(workspaceId);
    const members =
      await this.workspaceMemberRepository.findAllActive(workspaceId);

    // Batch query to get all counts at once (prevents N+1)
    const memberIds = members.map((m) => m.id);
    const countMap = await this.customerRepository.countByCreatedByMemberIds(
      memberIds,
      workspaceId,
    );

    const byMember = members.map((member) => ({
      memberId: member.id,
      memberName: member.name?.firstName ?? 'Unknown',
      count: countMap.get(member.id) ?? 0,
    }));

    return {
      totalCustomers,
      assignedCustomers,
      unassignedCustomers: totalCustomers - assignedCustomers,
      byMember: byMember.sort((a, b) => b.count - a.count),
    };
  }
}
