import { Injectable, Logger } from '@nestjs/common';

import { DateTime } from 'luxon';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import {
  CIRCUIT_BREAKER_STATE,
  CircuitBreakerStateType,
  REDIS_CIRCUIT_BREAKER_DEFAULTS,
  REDIS_LOG_CONTEXT,
} from 'src/mkt-core/infrastructure/redis/constants';
import {
  CircuitBreakerConfig,
  CircuitBreakerOpenException,
  CircuitBreakerStatus,
} from 'src/mkt-core/infrastructure/redis/types';

// ============================================
// REDIS STATE TYPE
// ============================================

type RedisCircuitBreakerState = {
  state: CircuitBreakerStateType;
  failureCount: number;
  successCount: number;
  lastFailureTime?: string; // ISO string
  lastStateChange: string; // ISO string
};

/**
 * Distributed Circuit Breaker using Redis
 *
 * Supports multiple instances sharing the same circuit breaker state.
 * Falls back to in-memory when Redis is unavailable.
 */
@Injectable()
export class RedisCircuitBreakerService {
  private readonly logger = new Logger(`${REDIS_LOG_CONTEXT}:CircuitBreaker`);

  // In-memory fallback state
  private localState: CircuitBreakerStateType = CIRCUIT_BREAKER_STATE.CLOSED;
  private localFailureCount = 0;
  private localSuccessCount = 0;
  private localLastFailureTime?: DateTime;

  constructor(
    @InjectCacheStorage(CacheStorageNamespace.MktOAuth2)
    private readonly cacheStorage: CacheStorageService,
  ) {}

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Create a circuit breaker instance for a specific service
   */
  createBreaker(name: string, config: CircuitBreakerConfig = {}) {
    const mergedConfig = this.mergeConfig(config);
    const cacheKey = this.buildKey(name, mergedConfig.keyPrefix);

    return {
      execute: <T>(fn: () => Promise<T>) =>
        this.execute(cacheKey, fn, mergedConfig),
      getStatus: () => this.getStatus(cacheKey, mergedConfig),
      reset: () => this.reset(cacheKey),
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(
    key: string,
    fn: () => Promise<T>,
    config: CircuitBreakerConfig = {},
  ): Promise<T> {
    const mergedConfig = this.mergeConfig(config);

    if (!mergedConfig.enabled) {
      return fn();
    }

    const state = await this.getState(key, mergedConfig);

    await this.checkStateTransition(key, state, mergedConfig);

    if (state.state === CIRCUIT_BREAKER_STATE.OPEN) {
      throw new CircuitBreakerOpenException();
    }

    try {
      const result = await fn();

      await this.recordSuccess(key, state, mergedConfig);

      return result;
    } catch (error) {
      await this.recordFailure(key, state, mergedConfig);
      throw error;
    }
  }

  /**
   * Get current circuit breaker status
   */
  async getStatus(
    key: string,
    config: CircuitBreakerConfig = {},
  ): Promise<CircuitBreakerStatus> {
    const mergedConfig = this.mergeConfig(config);
    const state = await this.getState(key, mergedConfig);

    await this.checkStateTransition(key, state, mergedConfig);

    const status: CircuitBreakerStatus = {
      state: state.state,
      failureCount: state.failureCount,
      successCount: state.successCount,
      lastFailureTime: state.lastFailureTime
        ? DateTime.fromISO(state.lastFailureTime)
        : undefined,
    };

    if (state.state === CIRCUIT_BREAKER_STATE.OPEN && state.lastFailureTime) {
      status.nextRetryTime = DateTime.fromISO(state.lastFailureTime).plus({
        milliseconds: mergedConfig.resetTimeoutMs,
      });
    }

    return status;
  }

  /**
   * Reset circuit breaker to closed state
   */
  async reset(key: string): Promise<void> {
    const initialState: RedisCircuitBreakerState = {
      state: CIRCUIT_BREAKER_STATE.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastStateChange: DateTime.utc().toISO(),
    };

    await this.setState(key, initialState);
    this.resetLocalState();
    this.logger.log(`Circuit breaker [${key}] reset to CLOSED state`);
  }

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  private async getState(
    key: string,
    _config: Required<CircuitBreakerConfig>,
  ): Promise<RedisCircuitBreakerState> {
    try {
      const cached = await this.cacheStorage.get<RedisCircuitBreakerState>(key);

      if (cached) {
        return cached;
      }
    } catch {
      this.logger.debug('Redis unavailable, using local state');
    }

    // Return local state as fallback
    return {
      state: this.localState,
      failureCount: this.localFailureCount,
      successCount: this.localSuccessCount,
      lastFailureTime: this.localLastFailureTime?.toISO() ?? undefined,
      lastStateChange: DateTime.utc().toISO() ?? DateTime.utc().toString(),
    };
  }

  private async setState(
    key: string,
    state: RedisCircuitBreakerState,
  ): Promise<void> {
    // Update local state
    this.localState = state.state;
    this.localFailureCount = state.failureCount;
    this.localSuccessCount = state.successCount;
    this.localLastFailureTime = state.lastFailureTime
      ? DateTime.fromISO(state.lastFailureTime)
      : undefined;

    try {
      await this.cacheStorage.set(
        key,
        state,
        REDIS_CIRCUIT_BREAKER_DEFAULTS.STATE_TTL_SECONDS * 1000,
      );
    } catch {
      this.logger.debug('Redis unavailable, using local state only');
    }
  }

  // ============================================
  // STATE TRANSITIONS
  // ============================================

  private async checkStateTransition(
    key: string,
    state: RedisCircuitBreakerState,
    config: Required<CircuitBreakerConfig>,
  ): Promise<void> {
    if (state.state === CIRCUIT_BREAKER_STATE.OPEN && state.lastFailureTime) {
      const lastFailure = DateTime.fromISO(state.lastFailureTime);
      const elapsed = DateTime.utc().diff(lastFailure).milliseconds;

      if (elapsed >= config.resetTimeoutMs) {
        const newState: RedisCircuitBreakerState = {
          ...state,
          state: CIRCUIT_BREAKER_STATE.HALF_OPEN,
          successCount: 0,
          lastStateChange: DateTime.utc().toISO(),
        };

        await this.setState(key, newState);
        this.logger.log(
          `Circuit breaker [${key}] transitioned to HALF_OPEN state`,
        );
      }
    }
  }

  private async recordSuccess(
    key: string,
    currentState: RedisCircuitBreakerState,
    config: Required<CircuitBreakerConfig>,
  ): Promise<void> {
    const state = await this.getState(key, config);

    if (state.state === CIRCUIT_BREAKER_STATE.HALF_OPEN) {
      const newSuccessCount = state.successCount + 1;

      if (newSuccessCount >= config.halfOpenAttempts) {
        const newState: RedisCircuitBreakerState = {
          state: CIRCUIT_BREAKER_STATE.CLOSED,
          failureCount: 0,
          successCount: 0,
          lastStateChange: DateTime.utc().toISO(),
        };

        await this.setState(key, newState);
        this.logger.log(
          `Circuit breaker [${key}] transitioned to CLOSED state`,
        );
      } else {
        await this.setState(key, {
          ...state,
          successCount: newSuccessCount,
        });
      }
    } else if (state.state === CIRCUIT_BREAKER_STATE.CLOSED) {
      if (state.failureCount > 0) {
        await this.setState(key, {
          ...state,
          failureCount: 0,
        });
      }
    }
  }

  private async recordFailure(
    key: string,
    currentState: RedisCircuitBreakerState,
    config: Required<CircuitBreakerConfig>,
  ): Promise<void> {
    const state = await this.getState(key, config);
    const now = DateTime.utc();
    const newFailureCount = state.failureCount + 1;

    if (state.state === CIRCUIT_BREAKER_STATE.HALF_OPEN) {
      const newState: RedisCircuitBreakerState = {
        state: CIRCUIT_BREAKER_STATE.OPEN,
        failureCount: newFailureCount,
        successCount: 0,
        lastFailureTime: now.toISO(),
        lastStateChange: now.toISO(),
      };

      await this.setState(key, newState);
      this.logger.warn(
        `Circuit breaker [${key}] transitioned to OPEN state (from HALF_OPEN)`,
      );
    } else if (
      state.state === CIRCUIT_BREAKER_STATE.CLOSED &&
      newFailureCount >= config.failureThreshold
    ) {
      const newState: RedisCircuitBreakerState = {
        state: CIRCUIT_BREAKER_STATE.OPEN,
        failureCount: newFailureCount,
        successCount: 0,
        lastFailureTime: now.toISO(),
        lastStateChange: now.toISO(),
      };

      await this.setState(key, newState);
      this.logger.warn(
        `Circuit breaker [${key}] transitioned to OPEN state (failures: ${newFailureCount})`,
      );
    } else {
      await this.setState(key, {
        ...state,
        failureCount: newFailureCount,
        lastFailureTime: now.toISO(),
      });
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  private mergeConfig(
    config: CircuitBreakerConfig,
  ): Required<CircuitBreakerConfig> {
    return {
      enabled: config.enabled ?? REDIS_CIRCUIT_BREAKER_DEFAULTS.ENABLED,
      failureThreshold:
        config.failureThreshold ??
        REDIS_CIRCUIT_BREAKER_DEFAULTS.FAILURE_THRESHOLD,
      resetTimeoutMs:
        config.resetTimeoutMs ??
        REDIS_CIRCUIT_BREAKER_DEFAULTS.RESET_TIMEOUT_MS,
      halfOpenAttempts:
        config.halfOpenAttempts ??
        REDIS_CIRCUIT_BREAKER_DEFAULTS.HALF_OPEN_ATTEMPTS,
      keyPrefix: config.keyPrefix ?? REDIS_CIRCUIT_BREAKER_DEFAULTS.KEY_PREFIX,
      stateTtlSeconds:
        config.stateTtlSeconds ??
        REDIS_CIRCUIT_BREAKER_DEFAULTS.STATE_TTL_SECONDS,
    };
  }

  private buildKey(name: string, prefix: string): string {
    return `${prefix}${name}`;
  }

  private resetLocalState(): void {
    this.localState = CIRCUIT_BREAKER_STATE.CLOSED;
    this.localFailureCount = 0;
    this.localSuccessCount = 0;
    this.localLastFailureTime = undefined;
  }
}
