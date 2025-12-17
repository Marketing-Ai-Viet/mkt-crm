import { Module } from '@nestjs/common';

import { OAuth2ClientModule } from 'src/mkt-core/oauth2-client/oauth2-client.module';

import { MktLicenseRepository } from './repositories';
import { MktLicenseProxyService } from './services';
import { MktLicenseResolver } from './resolvers';

/**
 * MKT License Integration Module
 *
 * Architecture:
 * - Repository: Data access layer (HTTP calls to MKT Server)
 * - Services: Business logic layer (facade pattern)
 * - Resolvers: GraphQL resolvers
 *
 * Provides services for:
 * - License CRUD operations
 * - License validation
 * - Bulk operations
 * - Analytics
 *
 * Dependencies:
 * - OAuth2ClientModule: Token management and HTTP client
 *
 * NOTE: EventEmitter2 is available globally via CoreEngineModule.
 */
@Module({
  imports: [
    OAuth2ClientModule, // Token management and OAuth2 HTTP client
  ],
  providers: [
    // Repository (Data Access Layer)
    MktLicenseRepository,
    // Services (Business Logic Layer)
    MktLicenseProxyService, // Facade service - orchestrates repository
    // Resolvers
    MktLicenseResolver,
  ],
  exports: [
    // Public API
    MktLicenseProxyService,
    // Repository for direct access if needed
    MktLicenseRepository,
  ],
})
export class MktLicenseIntegrationModule {}
