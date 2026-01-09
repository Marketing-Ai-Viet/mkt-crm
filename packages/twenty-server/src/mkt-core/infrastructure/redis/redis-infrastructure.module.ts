import { Module } from '@nestjs/common';

import { RedisClientModule } from 'src/engine/core-modules/redis-client/redis-client.module';

import {
  RedisCacheService,
  RedisCircuitBreakerService,
  RedisInvalidationService,
  RedisLockService,
  RedisPubSubService,
  RedisRateLimiterService,
} from './services';

/**
 * Redis Infrastructure Module
 *
 * Provides reusable Redis-based services:
 * - RedisCacheService: Two-tier caching with LRU fallback
 * - RedisCircuitBreakerService: Distributed circuit breaker
 * - RedisRateLimiterService: Distributed rate limiter
 * - RedisInvalidationService: Tag-based cache invalidation
 * - RedisLockService: Distributed locking
 * - RedisPubSubService: Cross-region pub/sub messaging
 *
 * All services support graceful degradation when Redis is unavailable.
 */
@Module({
  imports: [RedisClientModule],
  providers: [
    RedisCacheService,
    RedisCircuitBreakerService,
    RedisInvalidationService,
    RedisLockService,
    RedisPubSubService,
    RedisRateLimiterService,
  ],
  exports: [
    RedisCacheService,
    RedisCircuitBreakerService,
    RedisInvalidationService,
    RedisLockService,
    RedisPubSubService,
    RedisRateLimiterService,
  ],
})
export class RedisInfrastructureModule {}
