import { Module } from '@nestjs/common';

import { MktContractRepository } from 'src/mkt-core/contract/repositories';
import { MktContractService } from 'src/mkt-core/contract/services/mkt-contract.service';
import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { MktOrderRepository } from 'src/mkt-core/order/repositories/mkt-order.repository';

/**
 * MktContractModule - Contract Management Module
 *
 * Provides:
 * - Contract creation and management
 * - Contract number generation
 * - Contract-order linking
 *
 * Dependencies:
 * - MktCustomerRepository: Customer lookup
 * - MktOrderRepository: Order linking
 */
@Module({
  imports: [],
  providers: [
    // Repositories
    MktContractRepository,
    MktCustomerRepository,
    MktOrderRepository,

    // Services
    MktContractService,
  ],
  exports: [
    // Repositories
    MktContractRepository,

    // Services
    MktContractService,
  ],
})
export class MktContractModule {}
