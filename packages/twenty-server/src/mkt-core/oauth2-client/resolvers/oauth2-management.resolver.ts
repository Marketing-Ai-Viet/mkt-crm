import { Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { OAuth2ClientService } from 'src/mkt-core/oauth2-client/services/oauth2-client.service';
import {
  CircuitBreakerState,
  OAuth2HealthCheckOutput,
  OAuth2HealthStatus,
  OAuth2TokenActionOutput,
  OAuth2TokenMetadataOutput,
} from 'src/mkt-core/oauth2-client/dto';
import {
  OAUTH2_SUCCESS_MESSAGES,
  OAUTH2_ERROR_MESSAGES,
  OAUTH2_GRAPHQL_DESCRIPTIONS,
} from 'src/mkt-core/oauth2-client/constants';
import {
  isOAuth2HealthStatus,
  isCircuitBreakerState,
  OAUTH2_HEALTH_STATUS,
  CIRCUIT_BREAKER_STATE,
} from 'src/mkt-core/oauth2-client/types';
import { DateTimeUtils } from 'src/mkt-core/utils';

@Resolver()
@UseGuards(UserAuthGuard)
export class OAuth2ManagementResolver {
  constructor(private readonly oauth2ClientService: OAuth2ClientService) {}

  @Query(() => OAuth2HealthCheckOutput, {
    description: OAUTH2_GRAPHQL_DESCRIPTIONS.HEALTH_CHECK_QUERY,
  })
  async oauth2HealthCheck(): Promise<OAuth2HealthCheckOutput> {
    const health = await this.oauth2ClientService.healthCheck();

    const status = isOAuth2HealthStatus(health.status)
      ? (health.status as OAuth2HealthStatus)
      : (OAUTH2_HEALTH_STATUS.UNHEALTHY as OAuth2HealthStatus);

    const circuitBreakerState = isCircuitBreakerState(
      health.circuitBreaker.state,
    )
      ? (health.circuitBreaker.state as CircuitBreakerState)
      : (CIRCUIT_BREAKER_STATE.OPEN as CircuitBreakerState);

    return {
      status,
      token: health.token,
      cache: health.cache,
      circuitBreaker: {
        state: circuitBreakerState,
        failureCount: health.circuitBreaker.failureCount,
        successCount: health.circuitBreaker.successCount,
        lastFailureTime: DateTimeUtils.toDate(
          health.circuitBreaker.lastFailureTime,
        ),
        nextRetryTime: DateTimeUtils.toDate(
          health.circuitBreaker.nextRetryTime,
        ),
      },
      rateLimit: health.rateLimit,
    };
  }

  @Query(() => OAuth2TokenMetadataOutput, {
    nullable: true,
    description: OAUTH2_GRAPHQL_DESCRIPTIONS.TOKEN_STATUS_QUERY,
  })
  async oauth2TokenStatus(): Promise<OAuth2TokenMetadataOutput | null> {
    const metadata = await this.oauth2ClientService.getTokenMetadata();

    if (!metadata) {
      return null;
    }

    return {
      valid: metadata.valid,
      expiresIn: metadata.expiresIn,
      scopes: metadata.scopes,
      issuedAt: metadata.issuedAt,
      expiresAt: metadata.expiresAt,
      lastRefreshedAt: metadata.lastRefreshedAt,
      refreshCount: metadata.refreshCount,
    };
  }

  @Mutation(() => OAuth2TokenActionOutput, {
    description: OAUTH2_GRAPHQL_DESCRIPTIONS.REFRESH_TOKEN_MUTATION,
  })
  async oauth2RefreshToken(): Promise<OAuth2TokenActionOutput> {
    await this.oauth2ClientService.invalidateToken();

    try {
      await this.oauth2ClientService.getAccessToken();

      return {
        success: true,
        message: OAUTH2_SUCCESS_MESSAGES.TOKEN_REFRESHED(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        message: OAUTH2_ERROR_MESSAGES.TOKEN_REFRESH_FAILED(errorMessage),
      };
    }
  }

  @Mutation(() => OAuth2TokenActionOutput, {
    description: OAUTH2_GRAPHQL_DESCRIPTIONS.INVALIDATE_TOKEN_MUTATION,
  })
  async oauth2InvalidateToken(): Promise<OAuth2TokenActionOutput> {
    await this.oauth2ClientService.invalidateToken();

    return {
      success: true,
      message: OAUTH2_SUCCESS_MESSAGES.TOKEN_INVALIDATED(),
    };
  }
}
