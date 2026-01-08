import { Module } from '@nestjs/common';

import { OAuth2ClientModule } from 'src/mkt-core/oauth2-client/oauth2-client.module';

import { MktUserRepository } from './repositories';
import { MktUserProxyService } from './services';
import { MktUserResolver } from './resolvers';

/**
 * MKT User Integration Module
 *
 * Architecture:
 * - Repositories: Data access layer (HTTP calls to MKT Server)
 * - Services: Business logic layer
 * - Resolvers: GraphQL resolvers
 *
 * Provides services for:
 * - User proxy (API calls without caching - real-time data)
 * - User CRUD operations via GraphQL
 * - User login history queries
 *
 * Dependencies:
 * - OAuth2ClientModule: Token management and HTTP client
 *
 * NOTE: No caching is used for user data to ensure real-time accuracy.
 * User data changes frequently (status, login info, etc.) and requires
 * immediate reflection.
 */
@Module({
  imports: [
    OAuth2ClientModule, // Token management and OAuth2 HTTP client
  ],
  providers: [
    // Repositories (Data Access Layer)
    MktUserRepository,
    // Services (Business Logic Layer)
    MktUserProxyService,
    // Resolvers
    MktUserResolver,
  ],
  exports: [
    // Public API
    MktUserProxyService,
    // Repository for direct access if needed
    MktUserRepository,
  ],
})
export class MktUserIntegrationModule {}
