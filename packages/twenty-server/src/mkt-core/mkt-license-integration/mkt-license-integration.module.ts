import { Module } from '@nestjs/common';

import { MktCustomerRepository } from 'src/mkt-core/customer/repositories';
import { MktOrderItemRepository } from 'src/mkt-core/order/repositories/mkt-order-item.repository';
import { MktOrderRepository } from 'src/mkt-core/order/repositories/mkt-order.repository';
import { OAuth2ClientModule } from 'src/mkt-core/oauth2-client/oauth2-client.module';

import {
  LicenseActivationJob,
  LicenseCreationJob,
  LicenseRevocationJob,
  LicenseUpgradeJob,
} from './jobs';
import { MktLicenseRepository } from './repositories';
import { MktLicenseResolver } from './resolvers';
import {
  MktLicenseProxyService,
  MktLicenseQueueService,
  MktLicenseStatusService,
} from './services';

/**
 * MKT License Integration Module
 *
 * Unified module for license management combining:
 * - API Integration: HTTP calls to MKT Server
 * - Queue Processing: Async license jobs via BullMQ
 *
 * Architecture:
 * - Repository: Data access layer (HTTP calls to MKT Server)
 * - Services: Business logic layer (facade pattern)
 * - Jobs: BullMQ job processors for async operations
 * - Resolvers: GraphQL resolvers
 *
 * API Integration Features:
 * - License CRUD operations
 * - License validation
 * - Bulk operations
 * - Analytics
 *
 * Queue Processing Features:
 * - License creation jobs (trial/official)
 * - License upgrade jobs (trial → official)
 * - License activation jobs (per-license)
 * - License revocation jobs (best effort)
 * - Order status management based on license status
 *
 * Dependencies:
 * - OAuth2ClientModule: Token management and HTTP client
 * - MktOrderRepository: Order status updates
 * - MktOrderItemRepository: Order item license status
 *
 * NOTE: EventEmitter2 is available globally via CoreEngineModule.
 */
@Module({
  imports: [
    OAuth2ClientModule, // Token management and OAuth2 HTTP client
  ],
  providers: [
    // Repositories (Data Access Layer)
    MktLicenseRepository,
    MktOrderRepository,
    MktOrderItemRepository,
    MktCustomerRepository,

    // Services (Business Logic Layer)
    MktLicenseProxyService, // Facade service - orchestrates repository
    MktLicenseQueueService, // Queue service - enqueue license jobs
    MktLicenseStatusService, // Status service - track order license status

    // Job Processors (Queue Processing)
    LicenseCreationJob,
    LicenseUpgradeJob,
    LicenseActivationJob,
    LicenseRevocationJob,

    // Resolvers (GraphQL)
    MktLicenseResolver,
  ],
  exports: [
    // API Integration
    MktLicenseProxyService,
    MktLicenseRepository,

    // Queue Processing
    MktLicenseQueueService,
    MktLicenseStatusService,
  ],
})
export class MktLicenseIntegrationModule {}
