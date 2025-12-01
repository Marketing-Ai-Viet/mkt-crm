import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import { CacheLockModule } from 'src/engine/core-modules/cache-lock/cache-lock.module';

import { oauth2ClientConfig } from './config';
import { OAuth2ManagementResolver } from './resolvers';
import {
  OAuth2CacheService,
  OAuth2LockService,
  OAuth2RateLimiterService,
  OAuth2CircuitBreakerService,
  OAuth2ClientService,
  OAuth2HttpService,
} from './services';

@Module({
  imports: [
    ConfigModule.forFeature(oauth2ClientConfig),
    HttpModule,
    CacheLockModule,
  ],
  providers: [
    OAuth2CacheService,
    OAuth2LockService,
    OAuth2RateLimiterService,
    OAuth2CircuitBreakerService,
    OAuth2ClientService,
    OAuth2HttpService,
    OAuth2ManagementResolver,
  ],
  exports: [OAuth2ClientService, OAuth2HttpService],
})
export class OAuth2ClientModule {}
