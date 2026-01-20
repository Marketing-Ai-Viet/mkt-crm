/**
 * CustomerQueryResolver - GraphQL resolver for Customer queries
 *
 * Access Control:
 * - Authenticated users with workspace access
 *
 * Provides queries for:
 * - getCustomerById: Get customer by ID
 * - getCustomerByCode: Get customer by customer code
 * - getCustomerByEmail: Get customer by email
 * - getCustomers: Get all customers with pagination
 * - getCustomersByStatus: Get customers by status
 * - getCustomersByTier: Get customers by tier
 */

import { UseGuards } from '@nestjs/common';
import { Args, Int, Query, Resolver } from '@nestjs/graphql';

import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { MktCustomerService } from 'src/mkt-core/customer/services/mkt-customer.service';
import {
  CustomerOutput,
  CustomerListOutput,
} from 'src/mkt-core/customer/dto/customer-crud.output';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';

@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class CustomerQueryResolver {
  constructor(private readonly customerService: MktCustomerService) {}

  /**
   * Get customer by ID
   */
  @Query(() => CustomerOutput, {
    description: 'Get customer by ID',
    nullable: true,
  })
  async getCustomerById(
    @Args('customerId', { type: () => String }) customerId: string,
  ): Promise<CustomerOutput | null> {
    const customer = await this.customerService.findById(customerId);

    return customer ? this.mapToOutput(customer) : null;
  }

  /**
   * Get customer by customer code
   */
  @Query(() => CustomerOutput, {
    description: 'Get customer by customer code',
    nullable: true,
  })
  async getCustomerByCode(
    @Args('customerCode', { type: () => String }) customerCode: string,
  ): Promise<CustomerOutput | null> {
    const customer = await this.customerService.findByCode(customerCode);

    return customer ? this.mapToOutput(customer) : null;
  }

  /**
   * Get customer by email
   */
  @Query(() => CustomerOutput, {
    description: 'Get customer by email',
    nullable: true,
  })
  async getCustomerByEmail(
    @Args('email', { type: () => String }) email: string,
  ): Promise<CustomerOutput | null> {
    const customer = await this.customerService.findByEmail(email);

    return customer ? this.mapToOutput(customer) : null;
  }

  /**
   * Get all customers with pagination
   */
  @Query(() => CustomerListOutput, {
    description: 'Get all customers with pagination',
  })
  async getCustomers(
    @Args('take', { type: () => Int, nullable: true, defaultValue: 50 })
    take: number,
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 })
    skip: number,
  ): Promise<CustomerListOutput> {
    const customers = await this.customerService.findAll({ take, skip });

    return {
      customers: customers.map((c) => this.mapToOutput(c)),
      totalCount: customers.length,
    };
  }

  /**
   * Get customers by status
   */
  @Query(() => CustomerListOutput, {
    description: 'Get customers by status',
  })
  async getCustomersByStatus(
    @Args('status', { type: () => String }) status: string,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 50 })
    take: number,
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 })
    skip: number,
  ): Promise<CustomerListOutput> {
    const customers = await this.customerService.findByStatus(status, {
      take,
      skip,
    });

    return {
      customers: customers.map((c) => this.mapToOutput(c)),
      totalCount: customers.length,
    };
  }

  /**
   * Get customers by tier
   */
  @Query(() => CustomerListOutput, {
    description: 'Get customers by tier',
  })
  async getCustomersByTier(
    @Args('tier', { type: () => String }) tier: string,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 50 })
    take: number,
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 })
    skip: number,
  ): Promise<CustomerListOutput> {
    const customers = await this.customerService.findByTier(tier, {
      take,
      skip,
    });

    return {
      customers: customers.map((c) => this.mapToOutput(c)),
      totalCount: customers.length,
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Map entity to output DTO
   *
   * Note: Date fields are converted to ISO 8601 strings
   * - Entity stores Date objects
   * - Output returns ISO strings for GraphQL compatibility
   */
  private mapToOutput(customer: MktCustomerWorkspaceEntity): CustomerOutput {
    return {
      id: customer.id,
      mktCustomerCode: customer.mktCustomerCode,
      name: customer.name,
      email: customer.email ?? undefined,
      phone: customer.phone ?? undefined,
      companyName: customer.companyName ?? undefined,
      taxCode: customer.taxCode ?? undefined,
      address: customer.address ?? undefined,
      status: customer.status,
      tier: customer.tier,
      lifecycleStage: customer.lifecycleStage,
      // Currency fields (Float)
      totalOrderValue: customer.totalOrderValue ?? undefined,
      customerLtv: customer.customerLtv ?? undefined,
      // Integer fields
      licensesCount: customer.licensesCount ?? undefined,
      totalOrderCount: customer.totalOrderCount ?? undefined,
      churnRiskScore: customer.churnRiskScore ?? undefined,
      engagementScore: customer.engagementScore ?? undefined,
      // Date fields - convert Date to ISO string
      registrationDate: this.dateToISOString(customer.registrationDate),
      lastPurchase: this.dateToISOString(customer.lastPurchase),
      createdAt: this.dateToISOString(customer.createdAt),
      updatedAt: this.dateToISOString(customer.updatedAt),
      // Relations
      accountOwnerId: customer.accountOwnerId ?? undefined,
      createdById: customer.createdById ?? undefined,
    };
  }

  /**
   * Safely convert Date to ISO string
   * Handles both Date objects and existing ISO strings
   */
  private dateToISOString(
    date: Date | string | null | undefined,
  ): string | undefined {
    if (!date) {
      return undefined;
    }

    // If already a string (ISO format), return as-is
    if (typeof date === 'string') {
      return date;
    }

    // If Date object, convert to ISO string
    if (date instanceof Date) {
      return date.toISOString();
    }

    return undefined;
  }
}
