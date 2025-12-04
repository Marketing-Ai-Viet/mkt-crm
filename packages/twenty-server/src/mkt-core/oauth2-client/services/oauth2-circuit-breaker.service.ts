import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DateTime } from 'luxon';

import {
  CIRCUIT_BREAKER_STATE,
  CircuitBreakerStateType,
  OAUTH2_CIRCUIT_BREAKER_DEFAULTS,
  OAUTH2_LOG_CONTEXT,
} from 'src/mkt-core/oauth2-client/constants';
import {
  CircuitBreakerOpenException,
  CircuitBreakerStatus,
} from 'src/mkt-core/oauth2-client/types';

@Injectable()
export class OAuth2CircuitBreakerService {
  private readonly logger = new Logger(OAUTH2_LOG_CONTEXT);
  private readonly enabled: boolean;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenAttempts: number;

  private state: CircuitBreakerStateType = CIRCUIT_BREAKER_STATE.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: DateTime;

  constructor(private readonly configService: ConfigService) {
    this.enabled =
      this.configService.get<boolean>('oauth2Client.circuitBreaker.enabled') ??
      OAUTH2_CIRCUIT_BREAKER_DEFAULTS.ENABLED;
    this.failureThreshold =
      this.configService.get<number>(
        'oauth2Client.circuitBreaker.failureThreshold',
      ) ?? OAUTH2_CIRCUIT_BREAKER_DEFAULTS.FAILURE_THRESHOLD;
    this.resetTimeoutMs =
      this.configService.get<number>(
        'oauth2Client.circuitBreaker.resetTimeoutMs',
      ) ?? OAUTH2_CIRCUIT_BREAKER_DEFAULTS.RESET_TIMEOUT_MS;
    this.halfOpenAttempts =
      this.configService.get<number>(
        'oauth2Client.circuitBreaker.halfOpenAttempts',
      ) ?? OAUTH2_CIRCUIT_BREAKER_DEFAULTS.HALF_OPEN_ATTEMPTS;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) {
      return fn();
    }

    this.checkStateTransition();

    if (this.state === CIRCUIT_BREAKER_STATE.OPEN) {
      throw new CircuitBreakerOpenException();
    }

    try {
      const result = await fn();

      this.recordSuccess();

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  getStatus(): CircuitBreakerStatus {
    this.checkStateTransition();

    const status: CircuitBreakerStatus = {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };

    if (this.state === CIRCUIT_BREAKER_STATE.OPEN && this.lastFailureTime) {
      status.nextRetryTime = this.lastFailureTime.plus({
        milliseconds: this.resetTimeoutMs,
      });
    }

    return status;
  }

  reset(): void {
    this.state = CIRCUIT_BREAKER_STATE.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.logger.log('Circuit breaker reset to CLOSED state');
  }

  private checkStateTransition(): void {
    if (
      this.state === CIRCUIT_BREAKER_STATE.OPEN &&
      this.lastFailureTime &&
      DateTime.utc().diff(this.lastFailureTime).milliseconds >=
        this.resetTimeoutMs
    ) {
      this.state = CIRCUIT_BREAKER_STATE.HALF_OPEN;
      this.successCount = 0;
      this.logger.log('Circuit breaker transitioned to HALF_OPEN state');
    }
  }

  private recordSuccess(): void {
    if (this.state === CIRCUIT_BREAKER_STATE.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.halfOpenAttempts) {
        this.state = CIRCUIT_BREAKER_STATE.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = undefined;
        this.logger.log('Circuit breaker transitioned to CLOSED state');
      }
    } else if (this.state === CIRCUIT_BREAKER_STATE.CLOSED) {
      this.failureCount = 0;
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = DateTime.utc();

    if (this.state === CIRCUIT_BREAKER_STATE.HALF_OPEN) {
      this.state = CIRCUIT_BREAKER_STATE.OPEN;
      this.logger.warn(
        'Circuit breaker transitioned to OPEN state (from HALF_OPEN)',
      );
    } else if (
      this.state === CIRCUIT_BREAKER_STATE.CLOSED &&
      this.failureCount >= this.failureThreshold
    ) {
      this.state = CIRCUIT_BREAKER_STATE.OPEN;
      this.logger.warn(
        `Circuit breaker transitioned to OPEN state (failures: ${this.failureCount})`,
      );
    }
  }
}
