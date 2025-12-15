import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

import { OAuth2ClientModule } from 'src/mkt-core/oauth2-client/oauth2-client.module';

import {
  MktSnapshotService,
  MktProductCacheService,
  MktProductProxyService,
} from './services';

@Module({
  imports: [
    OAuth2ClientModule, // Reuse existing OAuth2 infrastructure
    CacheModule.register(), // For product-specific caching
  ],
  providers: [
    MktSnapshotService,
    MktProductCacheService,
    MktProductProxyService,
  ],
  exports: [MktProductProxyService, MktSnapshotService],
})
export class MktProductIntegrationModule {}
