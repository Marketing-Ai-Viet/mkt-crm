import { Module } from '@nestjs/common';

import {
  RedisCacheService,
  RedisCircuitBreakerService,
  RedisInvalidationService,
  RedisLockService,
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
 *
 * All services support graceful degradation when Redis is unavailable.
 */
@Module({
  providers: [
    RedisCacheService,
    RedisCircuitBreakerService,
    RedisInvalidationService,
    RedisLockService,
    RedisRateLimiterService,
  ],
  exports: [
    RedisCacheService,
    RedisCircuitBreakerService,
    RedisInvalidationService,
    RedisLockService,
    RedisRateLimiterService,
  ],
})
export class RedisInfrastructureModule {}
