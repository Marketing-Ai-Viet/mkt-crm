/**
 * ContractQueryResolver - GraphQL resolver for Contract queries
 *
 * Access Control (enforced by @RequireContractAccess):
 * - Finance/Accounting Department: Full access with hierarchical filtering
 * - Executive (levels 1-3): Full access to all contracts
 * - Other roles: 403 Forbidden
 *
 * Row-Level Security (enforced by @DataScope):
 * - Staff (level 8-11): Only see own contracts (createdById = self)
 * - Manager (level 7): See contracts from direct subordinates
 * - Upper Management (level 4-6): See contracts in reporting chain
 * - Executive (level 1-3): See all contracts
 *
 * Architecture: Thin resolver - delegates business logic to MktContractService
 */

import { UseGuards } from '@nestjs/common';
import { Args, Context, Query, Resolver } from '@nestjs/graphql';

import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  MKT_CONTRACT_STATUS,
  MKT_CONTRACT_TYPE,
  CONTRACT_DATA_SCOPE,
} from 'src/mkt-core/contract/constants';
import { CONTRACT_QUERY_DESCRIPTIONS } from 'src/mkt-core/contract/messages';
import { RequireContractReadAccess } from 'src/mkt-core/contract/decorators';
import {
  ContractOutput,
  ContractListOutput,
  ContractStatusDistributionOutput,
  CustomerContractStatsOutput,
  ExpiringContractsOutput,
} from 'src/mkt-core/contract/dto';
import { MktContractService } from 'src/mkt-core/contract/services/mkt-contract.service';
import { ContractQueryOptions } from 'src/mkt-core/contract/types';
import { MktContractWorkspaceEntity } from 'src/mkt-core/contract/workspace-entity/mkt-contract.workspace-entity';
import { DataScope } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators';
import { DataScopeContext } from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/types';
import { filterToWhere } from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/utils';

// ============================================
// TYPES
// ============================================

type GraphQLContext = {
  req: {
    dataScope?: DataScopeContext;
  };
};

/**
 * ContractQueryResolver - GraphQL resolver for Contract queries with RBAC
 *
 * Access rules:
 * - Only Finance/Accounting and Executive (levels 1-3) can access
 * - Row-level security based on hierarchy level
 */
@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class ContractQueryResolver {
  constructor(private readonly contractService: MktContractService) {}

  /**
   * Get contract by ID with hierarchical access filtering
   */
  @Query(() => ContractOutput, {
    description: CONTRACT_QUERY_DESCRIPTIONS.GET_CONTRACT_BY_ID,
    nullable: true,
  })
  @RequireContractReadAccess()
  @DataScope(CONTRACT_DATA_SCOPE.QUERY_SINGLE)
  async getContractById(
    @Args('contractId', { type: () => String }) contractId: string,
    @Context() ctx: GraphQLContext,
  ): Promise<ContractOutput | null> {
    const options = this.extractQueryOptions(ctx);
    const contract = await this.contractService.findByIdWithFilter(
      contractId,
      options,
    );

    return contract ? this.mapToOutput(contract) : null;
  }

  /**
   * Get contract by contract number with hierarchical access filtering
   */
  @Query(() => ContractOutput, {
    description: CONTRACT_QUERY_DESCRIPTIONS.GET_CONTRACT_BY_NUMBER,
    nullable: true,
  })
  @RequireContractReadAccess()
  @DataScope(CONTRACT_DATA_SCOPE.QUERY_SINGLE)
  async getContractByNumber(
    @Args('contractNumber', { type: () => String }) contractNumber: string,
    @Context() ctx: GraphQLContext,
  ): Promise<ContractOutput | null> {
    const options = this.extractQueryOptions(ctx);
    const contract = await this.contractService.findByNumberWithFilter(
      contractNumber,
      options,
    );

    return contract ? this.mapToOutput(contract) : null;
  }

  /**
   * Get contracts by customer ID with hierarchical access filtering
   */
  @Query(() => ContractListOutput, {
    description: CONTRACT_QUERY_DESCRIPTIONS.GET_CONTRACTS_BY_CUSTOMER,
  })
  @RequireContractReadAccess()
  @DataScope(CONTRACT_DATA_SCOPE.QUERY_LIST)
  async getContractsByCustomer(
    @Args('customerId', { type: () => String }) customerId: string,
    @Context() ctx: GraphQLContext,
  ): Promise<ContractListOutput> {
    const options = this.extractQueryOptions(ctx);
    const contracts = await this.contractService.findByCustomerWithFilter(
      customerId,
      options,
    );

    return {
      contracts: contracts.map((c) => this.mapToOutput(c)),
      totalCount: contracts.length,
    };
  }

  /**
   * Get contracts by status with hierarchical access filtering
   */
  @Query(() => ContractListOutput, {
    description: CONTRACT_QUERY_DESCRIPTIONS.GET_CONTRACTS_BY_STATUS,
  })
  @RequireContractReadAccess()
  @DataScope(CONTRACT_DATA_SCOPE.QUERY_LIST)
  async getContractsByStatus(
    @Args('status', { type: () => MKT_CONTRACT_STATUS })
    status: MKT_CONTRACT_STATUS,
    @Context() ctx: GraphQLContext,
  ): Promise<ContractListOutput> {
    const options = this.extractQueryOptions(ctx);
    const contracts = await this.contractService.findByStatusWithFilter(
      status,
      options,
    );

    return {
      contracts: contracts.map((c) => this.mapToOutput(c)),
      totalCount: contracts.length,
    };
  }

  /**
   * Get all contracts with pagination and hierarchical access filtering
   */
  @Query(() => ContractListOutput, {
    description: CONTRACT_QUERY_DESCRIPTIONS.GET_ALL_CONTRACTS,
  })
  @RequireContractReadAccess()
  @DataScope(CONTRACT_DATA_SCOPE.QUERY_LIST)
  async getContracts(
    @Args('take', { type: () => Number, nullable: true, defaultValue: 50 })
    take: number,
    @Args('skip', { type: () => Number, nullable: true, defaultValue: 0 })
    skip: number,
    @Context() ctx: GraphQLContext,
  ): Promise<ContractListOutput> {
    const options = this.extractQueryOptions(ctx, { take, skip });
    const contracts = await this.contractService.findAllWithFilter(options);

    return {
      contracts: contracts.map((c) => this.mapToOutput(c)),
      totalCount: contracts.length,
    };
  }

  /**
   * Get contract status distribution statistics
   */
  @Query(() => ContractStatusDistributionOutput, {
    description: CONTRACT_QUERY_DESCRIPTIONS.GET_CONTRACT_STATUS_DISTRIBUTION,
  })
  @RequireContractReadAccess()
  @DataScope(CONTRACT_DATA_SCOPE.QUERY_AGGREGATION)
  async getContractStatusDistribution(): Promise<ContractStatusDistributionOutput> {
    return this.contractService.getStatusDistribution();
  }

  /**
   * Get contract statistics for a customer
   */
  @Query(() => CustomerContractStatsOutput, {
    description: CONTRACT_QUERY_DESCRIPTIONS.GET_CUSTOMER_CONTRACT_STATS,
  })
  @RequireContractReadAccess()
  @DataScope(CONTRACT_DATA_SCOPE.QUERY_AGGREGATION)
  async getCustomerContractStats(
    @Args('customerId', { type: () => String }) customerId: string,
  ): Promise<CustomerContractStatsOutput> {
    return this.contractService.getCustomerStats(customerId);
  }

  /**
   * Get contracts expiring within a date range
   */
  @Query(() => ExpiringContractsOutput, {
    description: CONTRACT_QUERY_DESCRIPTIONS.GET_EXPIRING_CONTRACTS,
  })
  @RequireContractReadAccess()
  @DataScope(CONTRACT_DATA_SCOPE.QUERY_SINGLE)
  async getExpiringContracts(
    @Args('startDate', { type: () => String }) startDate: string,
    @Args('endDate', { type: () => String }) endDate: string,
  ): Promise<ExpiringContractsOutput> {
    const contracts = await this.contractService.findExpiringInRange(
      startDate,
      endDate,
    );

    return {
      contracts: contracts.map((c) => this.mapToOutput(c)),
      totalCount: contracts.length,
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Extract query options from GraphQL context
   */
  private extractQueryOptions(
    ctx: GraphQLContext,
    pagination?: { take?: number; skip?: number },
  ): ContractQueryOptions {
    const dataScope = ctx.req?.dataScope;

    return {
      take: pagination?.take,
      skip: pagination?.skip,
      filter: dataScope?.filter ? filterToWhere(dataScope.filter) : undefined,
      hasFullAccess: dataScope?.hasFullAccess ?? false,
    };
  }

  /**
   * Map contract entity to output DTO
   */
  private mapToOutput(contract: MktContractWorkspaceEntity): ContractOutput {
    return {
      id: contract.id,
      name: contract.name,
      contractNumber: contract.contractNumber,
      status: this.toEnumOrUndefined<MKT_CONTRACT_STATUS>(
        contract.status,
        MKT_CONTRACT_STATUS,
      ),
      contractType: this.toEnumOrUndefined<MKT_CONTRACT_TYPE>(
        contract.contractType,
        MKT_CONTRACT_TYPE,
      ),
      startDate: contract.startDate?.toString(),
      endDate: contract.endDate?.toString(),
      signedDate: contract.signedDate?.toString(),
      filePath: contract.filePath ?? undefined,
      fileName: contract.fileName ?? undefined,
      description: contract.description ?? undefined,
      position: contract.position,
      customerId: contract.customerId ?? undefined,
      accountOwnerId: contract.accountOwnerId ?? undefined,
      createdById: contract.createdById ?? undefined,
      createdAt: contract.createdAt?.toString(),
      updatedAt: contract.updatedAt?.toString(),
    };
  }

  /**
   * Safely cast a string value to an enum, returning undefined if invalid or empty
   */
  private toEnumOrUndefined<T>(
    value: string | null | undefined,
    enumObj: Record<string, string>,
  ): T | undefined {
    if (!value) {
      return undefined;
    }

    const validValues = Object.values(enumObj);

    if (validValues.includes(value)) {
      return value as T;
    }

    return undefined;
  }
}
