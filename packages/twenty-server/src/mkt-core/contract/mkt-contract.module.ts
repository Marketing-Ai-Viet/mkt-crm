import { Module } from '@nestjs/common';

import { MktContractRepository } from 'src/mkt-core/contract/repositories';
import {
  ContractQueryResolver,
  ContractMutationResolver,
} from 'src/mkt-core/contract/resolvers';
import { MktContractService } from 'src/mkt-core/contract/services/mkt-contract.service';
import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { MktOrderRepository } from 'src/mkt-core/order/repositories/mkt-order.repository';
import { MktRbacEnterpriseGradeModule } from 'src/mkt-core/mkt-rbac-enterprise-grade/mkt-rbac-enterprise-grade.module';

import { CONTRACT_BLOCK_HOOKS } from './hooks';

/**
 * MktContractModule - Contract Management Module
 *
 * Access Control (enforced by Resolvers with @RequireContractAccess decorator):
 * - Finance/Accounting Department: Full access with hierarchical filtering
 * - Executive (CEO, VP, Director - levels 1-3): Full access to all contracts
 * - Other roles: 403 Forbidden on ALL operations
 *
 * GraphQL Queries (ContractQueryResolver):
 * - getContractById: Get contract by ID
 * - getContractByNumber: Get contract by contract number
 * - getContractsByCustomer: Get contracts by customer ID
 * - getContractsByStatus: Get contracts by status
 * - getContracts: Get all contracts with pagination
 * - getContractStatusDistribution: Get status distribution statistics
 * - getCustomerContractStats: Get customer contract statistics
 * - getExpiringContracts: Get contracts expiring within date range
 *
 * GraphQL Mutations (ContractMutationResolver):
 * - createContract: Create a new contract
 * - updateContract: Update an existing contract
 * - updateContractStatus: Update contract status
 * - deleteContract: Soft delete a contract
 * - restoreContract: Restore a soft deleted contract
 *
 * Dependencies:
 * - MktRbacEnterpriseGradeModule: RBAC context and hierarchical access
 * - MktCustomerRepository: Customer lookup
 * - MktOrderRepository: Order linking
 */
@Module({
  imports: [MktRbacEnterpriseGradeModule],
  providers: [
    // Repositories
    MktContractRepository,
    MktCustomerRepository,
    MktOrderRepository,

    // Services
    MktContractService,

    // Resolvers - RBAC protected GraphQL operations
    ContractQueryResolver,
    ContractMutationResolver,

    // Hooks - Block all 13 auto-generated GraphQL operations
    ...CONTRACT_BLOCK_HOOKS,
  ],
  exports: [
    // Repositories
    MktContractRepository,

    // Services
    MktContractService,
  ],
})
export class MktContractModule {}
