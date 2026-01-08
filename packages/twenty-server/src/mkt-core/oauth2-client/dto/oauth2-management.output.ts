import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

// Enums
export enum OAuth2HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

registerEnumType(OAuth2HealthStatus, {
  name: 'OAuth2HealthStatus',
  description: 'OAuth2 health check status',
});

registerEnumType(CircuitBreakerState, {
  name: 'CircuitBreakerState',
  description: 'Circuit breaker state',
});

// Nested Types
@ObjectType()
export class OAuth2LruCacheStats {
  @Field(() => Int)
  size: number;

  @Field(() => Int)
  maxSize: number;
}

@ObjectType()
export class OAuth2RedisCacheStats {
  @Field()
  connected: boolean;

  @Field(() => Date, { nullable: true })
  lastErrorAt?: Date;

  @Field(() => Date, { nullable: true })
  lastHealthCheckAt?: Date;

  @Field(() => Int, { nullable: true })
  latencyMs?: number;

  @Field(() => Int)
  fallbackCount: number;

  @Field(() => Int)
  consecutiveFailures: number;
}

@ObjectType()
export class OAuth2CacheStatsOutput {
  @Field(() => OAuth2LruCacheStats)
  lru: OAuth2LruCacheStats;

  @Field(() => OAuth2RedisCacheStats)
  redis: OAuth2RedisCacheStats;
}

@ObjectType()
export class CircuitBreakerStatusOutput {
  @Field(() => CircuitBreakerState)
  state: CircuitBreakerState;

  @Field(() => Int)
  failureCount: number;

  @Field(() => Int)
  successCount: number;

  @Field(() => Date, { nullable: true })
  lastFailureTime?: Date;

  @Field(() => Date, { nullable: true })
  nextRetryTime?: Date;
}

@ObjectType()
export class RateLimitStatusOutput {
  @Field()
  enabled: boolean;

  @Field(() => Int)
  currentAttempts: number;

  @Field(() => Int)
  maxAttempts: number;

  @Field(() => Int)
  windowMs: number;

  @Field()
  isLimited: boolean;

  @Field(() => Int, { nullable: true })
  retryAfterMs?: number;
}

@ObjectType()
export class OAuth2TokenInfoOutput {
  @Field()
  valid: boolean;

  @Field(() => Int, { nullable: true })
  expiresIn?: number;

  @Field(() => [String], { nullable: true })
  scopes?: string[];
}

// Main Output Types
@ObjectType()
export class OAuth2HealthCheckOutput {
  @Field(() => OAuth2HealthStatus)
  status: OAuth2HealthStatus;

  @Field(() => OAuth2TokenInfoOutput)
  token: OAuth2TokenInfoOutput;

  @Field(() => OAuth2CacheStatsOutput)
  cache: OAuth2CacheStatsOutput;

  @Field(() => CircuitBreakerStatusOutput)
  circuitBreaker: CircuitBreakerStatusOutput;

  @Field(() => RateLimitStatusOutput)
  rateLimit: RateLimitStatusOutput;
}

@ObjectType()
export class OAuth2TokenMetadataOutput {
  @Field()
  valid: boolean;

  @Field(() => Int)
  expiresIn: number;

  @Field(() => [String])
  scopes: string[];

  @Field(() => Date)
  issuedAt: Date;

  @Field(() => Date)
  expiresAt: Date;

  @Field(() => Date)
  lastRefreshedAt: Date;

  @Field(() => Int)
  refreshCount: number;
}

@ObjectType()
export class OAuth2TokenActionOutput {
  @Field()
  success: boolean;

  @Field()
  message: string;
}
