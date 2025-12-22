import { Module } from '@nestjs/common';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { MktProductIntegrationModule } from 'src/mkt-core/mkt-product-integration';

// Generic Combo imports
import { MktGenericComboRepository } from './repositories/mkt-generic-combo.repository';
import { MktGenericComboItemRepository } from './repositories/mkt-generic-combo-item.repository';
import { GenericComboService } from './services/generic-combo.service';
import { GenericComboCalculationService } from './services/generic-combo-calculation.service';
import { GenericComboValidationService } from './services/generic-combo-validation.service';
import { GenericComboSnapshotService } from './services/generic-combo-snapshot.service';
import { GenericComboCacheService } from './services/generic-combo-cache.service';
import { GenericComboResolver } from './resolvers/generic-combo.resolver';

/**
 * MktComboModule
 *
 * Module quản lý Combo cho sản phẩm.
 *
 * Hỗ trợ nhiều loại item:
 * - DIGITAL_EXTERNAL: Sản phẩm từ MKT Server
 * - INTERNAL_PRODUCT: Sản phẩm nội bộ CRM
 * - INTERNAL_VARIANT: Variant nội bộ CRM
 * - SERVICE: Dịch vụ
 * - CUSTOM: Item tùy chỉnh
 *
 * Architecture:
 * - Repositories: Data access layer (database operations)
 * - Services: Business logic layer (facade pattern)
 * - Resolvers: GraphQL resolvers
 *
 * Provides services for:
 * - Combo CRUD operations
 * - Price calculation with discount strategies
 * - Validation for orders
 * - Immutable snapshots for order history
 * - Redis caching
 *
 * Dependencies:
 * - TwentyORMModule: Database access
 * - MktProductIntegrationModule: Product data from MKT Server
 */
@Module({
  imports: [
    TokenModule,
    TwentyORMModule,
    WorkspaceCacheStorageModule,
    MktProductIntegrationModule,
  ],
  providers: [
    // Repositories (Data Access Layer)
    MktGenericComboRepository,
    MktGenericComboItemRepository,

    // Services (Business Logic Layer)
    GenericComboService, // Facade service - orchestrates other services
    GenericComboCalculationService,
    GenericComboValidationService,
    GenericComboSnapshotService,
    GenericComboCacheService,

    // Resolvers (GraphQL Layer)
    GenericComboResolver,
  ],
  exports: [
    // Public API - Services
    GenericComboService,
    GenericComboCalculationService,
    GenericComboValidationService,
    GenericComboSnapshotService,

    // Repositories for direct access if needed
    MktGenericComboRepository,
    MktGenericComboItemRepository,
  ],
})
export class MktComboModule {}
