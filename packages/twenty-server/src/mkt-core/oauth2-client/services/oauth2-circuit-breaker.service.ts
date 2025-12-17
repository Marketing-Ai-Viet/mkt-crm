import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  RedisCircuitBreakerService,
  CircuitBreakerConfig,
  CircuitBreakerStatus,
  CircuitBreakerOpenException,
} from 'src/mkt-core/infrastructure/redis';
import {
  OAUTH2_CIRCUIT_BREAKER_DEFAULTS,
  OAUTH2_LOG_CONTEXT,
} from 'src/mkt-core/oauth2-client/constants';

// Re-export for backward compatibility
export { CircuitBreakerOpenException, CircuitBreakerStatus };

const OAUTH2_CIRCUIT_BREAKER_KEY = 'oauth2-client';

/**
 * OAuth2 Circuit Breaker Service
 *
 * Wrapper around RedisCircuitBreakerService with OAuth2-specific configuration.
 * Uses distributed Redis for state sharing across instances.
 */
@Injectable()
export class OAuth2CircuitBreakerService {
  private readonly logger = new Logger(OAUTH2_LOG_CONTEXT);
  private readonly config: CircuitBreakerConfig;
  private readonly breaker: ReturnType<
    RedisCircuitBreakerService['createBreaker']
  >;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisCircuitBreaker: RedisCircuitBreakerService,
  ) {
    this.config = {
      enabled:
        this.configService.get<boolean>(
          'oauth2Client.circuitBreaker.enabled',
        ) ?? OAUTH2_CIRCUIT_BREAKER_DEFAULTS.ENABLED,
      failureThreshold:
        this.configService.get<number>(
          'oauth2Client.circuitBreaker.failureThreshold',
        ) ?? OAUTH2_CIRCUIT_BREAKER_DEFAULTS.FAILURE_THRESHOLD,
      resetTimeoutMs:
        this.configService.get<number>(
          'oauth2Client.circuitBreaker.resetTimeoutMs',
        ) ?? OAUTH2_CIRCUIT_BREAKER_DEFAULTS.RESET_TIMEOUT_MS,
      halfOpenAttempts:
        this.configService.get<number>(
          'oauth2Client.circuitBreaker.halfOpenAttempts',
        ) ?? OAUTH2_CIRCUIT_BREAKER_DEFAULTS.HALF_OPEN_ATTEMPTS,
      keyPrefix: 'oauth2:circuit-breaker:',
    };

    this.breaker = this.redisCircuitBreaker.createBreaker(
      OAUTH2_CIRCUIT_BREAKER_KEY,
      this.config,
    );
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return this.breaker.execute(fn);
  }

  async getStatus(): Promise<CircuitBreakerStatus> {
    return this.breaker.getStatus();
  }

  async reset(): Promise<void> {
    await this.breaker.reset();
    this.logger.log('Circuit breaker reset to CLOSED state');
  }
}
