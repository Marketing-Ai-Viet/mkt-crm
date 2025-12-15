import { Module } from '@nestjs/common';

import {
  RedisCacheService,
  RedisCircuitBreakerService,
  RedisRateLimiterService,
} from './services';

/**
 * Redis Infrastructure Module
 *
 * Provides reusable Redis-based services:
 * - RedisCacheService: Two-tier caching with LRU fallback
 * - RedisCircuitBreakerService: Distributed circuit breaker
 * - RedisRateLimiterService: Distributed rate limiter
 *
 * All services support graceful degradation when Redis is unavailable.
 */
@Module({
  providers: [
    RedisCacheService,
    RedisCircuitBreakerService,
    RedisRateLimiterService,
  ],
  exports: [
    RedisCacheService,
    RedisCircuitBreakerService,
    RedisRateLimiterService,
  ],
})
export class RedisInfrastructureModule {}
