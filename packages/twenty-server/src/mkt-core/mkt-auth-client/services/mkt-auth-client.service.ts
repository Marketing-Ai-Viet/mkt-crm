import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { firstValueFrom } from 'rxjs';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  MKT_AUTH_LOG_CONTEXT,
  MKT_AUTH_EVENTS,
  CIRCUIT_BREAKER_STATES,
  TOKEN_INVALIDATION_REASONS,
  MKT_AUTH_DEFAULTS,
} from 'src/mkt-core/mkt-auth-client/constants';
import {
  MKT_AUTH_CLIENT_CONFIG_KEY,
  MktAuthClientConfigFactoryResult,
} from 'src/mkt-core/mkt-auth-client/configs';
import {
  MktAuthTokenData,
  MktAuthTokenResponse,
  MktAuthTokenAcquiredEvent,
  MktAuthTokenInvalidatedEvent,
  MktAuthFailedEvent,
  MktAuthCircuitStateChangedEvent,
  CircuitBreakerInternalState,
} from 'src/mkt-core/mkt-auth-client/types';

import { MktAuthCacheService } from './mkt-auth-cache.service';
import { MktAuthLockService } from './mkt-auth-lock.service';

// ============================================
// TYPES
// ============================================

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

// ============================================
// SERVICE
// ============================================

/**
 * MKT Auth Client Service
 *
 * Main facade for MKT Server authentication.
 * Manages token lifecycle with circuit breaker and jitter support.
 *
 * Features:
 * - Bootstrap token on application start
 * - Proactive token refresh before expiry
 * - Reactive re-login on 401
 * - Circuit breaker for continuous failures
 * - Jitter to reduce thundering herd
 * - Distributed locking for multi-instance safety
 *
 * @example
 * ```typescript
 * // Get access token (cached or fresh)
 * const token = await authService.getAccessToken();
 *
 * // Force refresh
 * const newToken = await authService.refreshToken();
 *
 * // Invalidate on 401
 * await authService.invalidateToken('401_response');
 *
 * // Check circuit breaker state
 * const state = authService.getCircuitBreakerState();
 * ```
 */
@Injectable()
export class MktAuthClientService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(MKT_AUTH_LOG_CONTEXT);

  // Initialization state
  private isInitialized = false;
  private initializationError: Error | null = null;

  // Circuit breaker state
  private circuitState: CircuitState = CIRCUIT_BREAKER_STATES.CLOSED;
  private consecutiveFailures = 0;
  private circuitOpenedAt: string | null = null;
  private halfOpenAttempts = 0;

  constructor(
    @Inject(MKT_AUTH_CLIENT_CONFIG_KEY)
    private readonly config: MktAuthClientConfigFactoryResult,
    private readonly httpService: HttpService,
    private readonly cacheService: MktAuthCacheService,
    private readonly lockService: MktAuthLockService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================
  // LIFECYCLE
  // ============================================

  async onApplicationBootstrap(): Promise<void> {
    // Skip if not configured
    if (!this.config.baseUrl || !this.config.credentials.email) {
      this.logger.warn(
        'MKT Auth Client disabled: Missing configuration ' +
          '(MKT_SERVER_BASE_URL, MKT_AUTH_EMAIL, MKT_AUTH_PASSWORD)',
      );

      return;
    }

    // Skip in command mode (migrations, etc.)
    if (this.isCommandMode()) {
      this.logger.log('Skipping initialization (command mode)');

      return;
    }

    try {
      await this.bootstrap();
      this.isInitialized = true;
      this.logger.log('MKT Auth Client initialized successfully');
    } catch (error) {
      this.initializationError =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to initialize MKT Auth Client', error);
    }
  }

  onModuleDestroy(): void {
    this.logger.debug('MKT Auth Client destroyed');
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Get access token (cached or fresh)
   *
   * Flow:
   * 1. Check circuit breaker
   * 2. Try cache
   * 3. If expiring soon, refresh with lock
   * 4. If no cache, fetch with lock
   */
  async getAccessToken(): Promise<string> {
    // Check circuit breaker first
    if (this.config.circuitBreaker.enabled) {
      this.checkCircuitBreaker();
    }

    // Allow retry after previous bootstrap failure
    if (this.initializationError && !this.isInitialized) {
      this.logger.warn(
        `Previous initialization failed: ${this.initializationError.message}. Attempting retry...`,
      );
      this.initializationError = null;
    }

    // Try cache
    const cached = await this.cacheService.get();

    if (cached) {
      // Check if expiring soon (with jitter)
      const threshold = this.getRefreshThresholdWithJitter();

      if (this.cacheService.isExpiringSoon(cached, threshold)) {
        this.logger.debug(
          `Token expiring soon (threshold: ${threshold}ms), refreshing...`,
        );

        return this.fetchTokenWithLock(true);
      }

      return cached.accessToken;
    }

    // No cache, fetch new
    return this.fetchTokenWithLock(false);
  }

  /**
   * Force refresh token
   */
  async refreshToken(): Promise<string> {
    await this.invalidateToken(TOKEN_INVALIDATION_REASONS.MANUAL);

    return this.fetchTokenWithLock(true);
  }

  /**
   * Invalidate current token
   */
  async invalidateToken(
    reason: (typeof TOKEN_INVALIDATION_REASONS)[keyof typeof TOKEN_INVALIDATION_REASONS],
  ): Promise<void> {
    const cached = await this.cacheService.get();
    const previousUserEmail = cached?.userEmail;

    await this.cacheService.clear();

    const event: MktAuthTokenInvalidatedEvent = {
      reason,
      previousUserEmail,
      timestamp: DateTimeUtils.toISO(DateTimeUtils.now()),
    };

    this.eventEmitter.emit(MKT_AUTH_EVENTS.TOKEN_INVALIDATED, event);
    this.logger.log(`Token invalidated (reason: ${reason})`);
  }

  /**
   * Check if client is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.cacheService.get();

    return token !== null;
  }

  /**
   * Get token metadata
   */
  async getTokenMetadata(): Promise<{
    isValid: boolean;
    expiresInMs: number;
    userEmail?: string;
    acquiredAt: string;
  } | null> {
    const token = await this.cacheService.get();

    if (!token) {
      return null;
    }

    const expiresAt = DateTimeUtils.fromISO(token.expiresAt);
    const now = DateTimeUtils.now();
    const expiresInMs =
      DateTimeUtils.toMillis(expiresAt) - DateTimeUtils.toMillis(now);

    return {
      isValid: expiresInMs > 0,
      expiresInMs: Math.max(0, expiresInMs),
      userEmail: token.userEmail,
      acquiredAt: token.acquiredAt,
    };
  }

  // ============================================
  // CIRCUIT BREAKER PUBLIC API
  // ============================================

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(): CircuitBreakerInternalState {
    return {
      state: this.circuitState,
      consecutiveFailures: this.consecutiveFailures,
      openedAt: this.circuitOpenedAt ?? undefined,
      halfOpenAttempts: this.halfOpenAttempts,
    };
  }

  /**
   * Get consecutive failures count
   */
  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get initialization error
   */
  getInitializationError(): Error | null {
    return this.initializationError;
  }

  // ============================================
  // PRIVATE METHODS - TOKEN ACQUISITION
  // ============================================

  private async bootstrap(): Promise<void> {
    this.logger.log('Bootstrapping MKT Auth Client...');
    await this.fetchTokenWithLock(false);
  }

  private async fetchTokenWithLock(isRefresh: boolean): Promise<string> {
    const result = await this.lockService.withLock(async () => {
      // Double-check cache after acquiring lock
      const cached = await this.cacheService.get();

      if (
        cached &&
        !this.cacheService.isExpiringSoon(cached, this.config.token.bufferMs)
      ) {
        return cached.accessToken;
      }

      return this.fetchToken(isRefresh);
    });

    // Lock not acquired
    if (result === null) {
      // Wait and retry from cache
      await this.delay(this.config.lock.retryIntervalMs * 5);
      const cached = await this.cacheService.get();

      if (cached) {
        return cached.accessToken;
      }

      // Last resort: fetch without lock
      return this.fetchToken(isRefresh);
    }

    return result;
  }

  private async fetchToken(isRefresh: boolean, attempt = 0): Promise<string> {
    if (attempt >= this.config.retry.maxAttempts) {
      const error = new Error(
        `Sign-in to MKT Server failed after ${this.config.retry.maxAttempts} attempts`,
      );

      this.onAuthFailure(error);
      throw error;
    }

    this.logger.debug(
      isRefresh
        ? 'Refreshing authentication token...'
        : 'Signing in to MKT Server...',
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post<MktAuthTokenResponse>(
          `${this.config.baseUrl}/api/auth/sign-in/email`,
          {
            email: this.config.credentials.email,
            password: this.config.credentials.password,
          },
          {
            timeout: MKT_AUTH_DEFAULTS.RETRY.MAX_DELAY_MS,
          },
        ),
      );

      // Get token from response
      const accessToken = response.headers['set-auth-token'] as
        | string
        | undefined;

      if (!accessToken && !response.data.token) {
        throw new Error(
          'No token in response (missing set-auth-token header and data.token)',
        );
      }

      const token = accessToken || response.data.token;

      // Build token data
      const now = DateTimeUtils.now();
      const redisTtlMs = this.cacheService.getRedisTtlMs();
      const expiresAt = DateTimeUtils.add(now, { milliseconds: redisTtlMs });

      const tokenData: MktAuthTokenData = {
        accessToken: token,
        acquiredAt: DateTimeUtils.toISO(now),
        expiresAt: DateTimeUtils.toISO(expiresAt),
        refreshAt: DateTimeUtils.toISO(
          DateTimeUtils.add(expiresAt, {
            milliseconds: -this.config.token.bufferMs,
          }),
        ),
        userEmail: response.data.user?.email,
        source: isRefresh ? 'refresh' : 'bootstrap',
      };

      // Cache token
      await this.cacheService.set(tokenData);

      // Success - reset circuit breaker
      this.onAuthSuccess(isRefresh);
      this.isInitialized = true;
      this.initializationError = null;

      // Emit event
      const event: MktAuthTokenAcquiredEvent = {
        userEmail: tokenData.userEmail,
        source: tokenData.source,
        expiresAt: tokenData.expiresAt,
        timestamp: DateTimeUtils.toISO(now),
      };

      this.eventEmitter.emit(
        isRefresh
          ? MKT_AUTH_EVENTS.TOKEN_REFRESHED
          : MKT_AUTH_EVENTS.TOKEN_ACQUIRED,
        event,
      );

      this.logger.log(
        `Token ${isRefresh ? 'refreshed' : 'acquired'} successfully ` +
          `(expires in ${Math.floor(redisTtlMs / 1000 / 60)} minutes)`,
      );

      return token;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.warn(
        `Token fetch failed (attempt ${attempt + 1}/${this.config.retry.maxAttempts}): ${errorMessage}`,
      );

      // Emit failure event
      const failedEvent: MktAuthFailedEvent = {
        reason: errorMessage,
        attemptNumber: attempt + 1,
        willRetry: attempt + 1 < this.config.retry.maxAttempts,
        timestamp: DateTimeUtils.toISO(DateTimeUtils.now()),
      };

      this.eventEmitter.emit(MKT_AUTH_EVENTS.AUTH_FAILED, failedEvent);

      // Retry with exponential backoff
      if (attempt + 1 < this.config.retry.maxAttempts) {
        const delay = this.calculateBackoff(attempt);

        this.logger.debug(`Retrying in ${delay}ms...`);
        await this.delay(delay);

        return this.fetchToken(isRefresh, attempt + 1);
      }

      this.onAuthFailure(
        error instanceof Error ? error : new Error(errorMessage),
      );
      throw error;
    }
  }

  // ============================================
  // PRIVATE METHODS - CIRCUIT BREAKER
  // ============================================

  private checkCircuitBreaker(): void {
    if (this.circuitState === CIRCUIT_BREAKER_STATES.CLOSED) {
      return;
    }

    if (this.circuitState === CIRCUIT_BREAKER_STATES.OPEN) {
      if (!this.circuitOpenedAt) {
        // Safety check - should not happen
        this.transitionCircuitState(CIRCUIT_BREAKER_STATES.CLOSED);

        return;
      }

      const openedAt = DateTimeUtils.fromISO(this.circuitOpenedAt);
      const now = DateTimeUtils.now();
      const elapsedMs =
        DateTimeUtils.toMillis(now) - DateTimeUtils.toMillis(openedAt);

      if (elapsedMs < this.config.circuitBreaker.resetTimeoutMs) {
        // Circuit still open - fast fail
        const remainingMs =
          this.config.circuitBreaker.resetTimeoutMs - elapsedMs;

        throw new Error(
          `Circuit breaker OPEN - authentication temporarily disabled. ` +
            `Will retry in ${Math.ceil(remainingMs / 1000)}s. ` +
            `Check MKT_AUTH_EMAIL and MKT_AUTH_PASSWORD.`,
        );
      }

      // Transition to half-open
      this.transitionCircuitState(CIRCUIT_BREAKER_STATES.HALF_OPEN);
      this.halfOpenAttempts = 0;
    }

    // Enforce halfOpenMaxAttempts
    if (this.circuitState === CIRCUIT_BREAKER_STATES.HALF_OPEN) {
      if (
        this.halfOpenAttempts >= this.config.circuitBreaker.halfOpenMaxAttempts
      ) {
        // Too many attempts in half-open, revert to OPEN
        this.transitionCircuitState(CIRCUIT_BREAKER_STATES.OPEN);
        this.circuitOpenedAt = DateTimeUtils.toISO(DateTimeUtils.now());

        throw new Error(
          `Circuit breaker OPEN - max half-open attempts ` +
            `(${this.config.circuitBreaker.halfOpenMaxAttempts}) exceeded.`,
        );
      }

      this.halfOpenAttempts++;
    }
  }

  private onAuthSuccess(_isRefresh: boolean): void {
    const previousState = this.circuitState;

    if (previousState !== CIRCUIT_BREAKER_STATES.CLOSED) {
      this.transitionCircuitState(CIRCUIT_BREAKER_STATES.CLOSED);
    }

    this.consecutiveFailures = 0;
    this.circuitOpenedAt = null;
    this.halfOpenAttempts = 0;
  }

  private onAuthFailure(error: Error): void {
    this.consecutiveFailures++;

    if (!this.config.circuitBreaker.enabled) {
      return;
    }

    // Check if should open circuit
    if (
      this.consecutiveFailures >= this.config.circuitBreaker.failureThreshold
    ) {
      this.transitionCircuitState(CIRCUIT_BREAKER_STATES.OPEN);
      this.circuitOpenedAt = DateTimeUtils.toISO(DateTimeUtils.now());

      this.logger.error(
        `Circuit breaker OPEN after ${this.consecutiveFailures} consecutive failures. ` +
          `Last error: ${error.message}`,
      );
    }
  }

  private transitionCircuitState(newState: CircuitState): void {
    const previousState = this.circuitState;

    if (previousState === newState) {
      return;
    }

    this.circuitState = newState;
    this.logger.warn(`Circuit breaker: ${previousState} → ${newState}`);

    const event: MktAuthCircuitStateChangedEvent = {
      previousState,
      newState,
      consecutiveFailures: this.consecutiveFailures,
      timestamp: DateTimeUtils.toISO(DateTimeUtils.now()),
    };

    this.eventEmitter.emit(MKT_AUTH_EVENTS.CIRCUIT_STATE_CHANGED, event);
  }

  // ============================================
  // PRIVATE METHODS - JITTER & BACKOFF
  // ============================================

  private getRefreshThresholdWithJitter(): number {
    if (!this.config.jitter.enabled) {
      return this.config.token.bufferMs;
    }

    const jitterRange = this.config.jitter.maxMs - this.config.jitter.minMs;
    const jitter = Math.random() * jitterRange + this.config.jitter.minMs;

    // Randomly add or subtract jitter
    const sign = Math.random() > 0.5 ? 1 : -1;

    return this.config.token.bufferMs + sign * jitter;
  }

  private calculateBackoff(attempt: number): number {
    const delay =
      this.config.retry.initialDelayMs *
      Math.pow(this.config.retry.backoffMultiplier, attempt);

    return Math.min(delay, this.config.retry.maxDelayMs);
  }

  // ============================================
  // PRIVATE METHODS - UTILITIES
  // ============================================

  private isCommandMode(): boolean {
    const args = process.argv.join(' ');

    return (
      args.includes('typeorm') ||
      args.includes('command') ||
      args.includes('migration') ||
      args.includes('seed')
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
