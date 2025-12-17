# Webhook, Delta Sync & Retry Queue Design

## Overview

Thiết kế tính năng nâng cao cho MKT Product Integration:
1. **Webhook Support**: Nhận realtime updates từ MKT Server
2. **Selective Sync (Delta Sync)**: Chỉ sync các products/packages đã thay đổi
3. **Retry Queue**: Queue và retry các sync items bị fail
4. **Resilience Patterns**: Circuit breaker, error classification, distributed locking
5. **Observability**: Metrics, alerting, structured logging

## Problem Statement

Hiện tại:
- Full sync tất cả products khi OAuth2 token acquired
- Không biết khi nào MKT Server có thay đổi
- Failed sync items bị bỏ qua (log warning và tiếp tục)
- Không có cơ chế retry
- Không có protection khi MKT Server down (circuit breaker)
- Không có error classification (retry permanent errors)
- Không có metrics/alerting cho monitoring

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           CRM Server                                              │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                    MktProductWebhookModule                                  │  │
│  │                                                                             │  │
│  │  ┌─────────────────────────────┐    ┌─────────────────────────────────┐    │  │
│  │  │ WebhookController           │    │ WebhookService                   │    │  │
│  │  │                             │    │                                  │    │  │
│  │  │ POST /webhook/mkt/*         │───▶│ - validateSignature()           │    │  │
│  │  │ - IpWhitelistGuard [NEW]    │    │ - processProductEvent()         │    │  │
│  │  │ - ThrottlerGuard [NEW]      │    │ - processPackageEvent()         │    │  │
│  │  │ - RequestSizeLimit [NEW]    │    │ - secretRotation [NEW]          │    │  │
│  │  └─────────────────────────────┘    └──────────────┬──────────────────┘    │  │
│  └──────────────────────────────────────────────────────│──────────────────────┘  │
│                                                         │                         │
│  ┌──────────────────────────────────────────────────────│──────────────────────┐  │
│  │                    ResilienceModule [NEW]            │                      │  │
│  │                                                      │                      │  │
│  │  ┌─────────────────────────┐  ┌─────────────────────▼───────────────────┐  │  │
│  │  │ CircuitBreakerService   │  │ ErrorClassificationService              │  │  │
│  │  │ [NEW]                   │  │ [NEW]                                   │  │  │
│  │  │                         │  │                                         │  │  │
│  │  │ - execute()             │  │ - classifyError()                       │  │  │
│  │  │ - getState()            │  │ - TRANSIENT / PERMANENT / RATE_LIMIT    │  │  │
│  │  │ - onStateChange()       │  │ - shouldRetry()                         │  │  │
│  │  └─────────────────────────┘  └─────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                    MktProductSyncModule (Enhanced)                          │  │
│  │                                                                             │  │
│  │  ┌─────────────────────────────┐    ┌─────────────────────────────────┐    │  │
│  │  │ DeltaSyncService            │    │ RetryQueueService                │    │  │
│  │  │                             │    │                                  │    │  │
│  │  │ - syncChangedOnly()         │    │ - addToQueue(priority) [NEW]     │    │  │
│  │  │ - distributedLock [NEW]     │    │ - processRetryJob()              │    │  │
│  │  │ - gapDetection [NEW]        │    │ - handleDeadLetter()             │    │  │
│  │  │ - clockSkewTolerance [NEW]  │    │ - alertOnThreshold [NEW]         │    │  │
│  │  │ - checkpointBackup [NEW]    │    │ - getQueueStats() [FIXED]        │    │  │
│  │  │ - consistencyCheck [NEW]    │    │ - dlqSizeLimit [NEW]             │    │  │
│  │  └─────────────────────────────┘    └─────────────────────────────────┘    │  │
│  │                                                                             │  │
│  │  ┌─────────────────────────────┐    ┌─────────────────────────────────┐    │  │
│  │  │ MktProductSyncService       │    │ MktProductCacheService           │    │  │
│  │  │                             │    │                                  │    │  │
│  │  │ - syncAllProductsAndPackages│    │ - stampedePrevention [NEW]       │    │  │
│  │  │ - syncChangedOnly()         │    │ - batchOperations [NEW]          │    │  │
│  │  │ - syncSingleProduct()       │    │ - getProduct() with mutex        │    │  │
│  │  │ - syncSinglePackage()       │    │ - setProducts() pipeline         │    │  │
│  │  └─────────────────────────────┘    └─────────────────────────────────┘    │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                    ObservabilityModule [NEW]                                │  │
│  │                                                                             │  │
│  │  ┌─────────────────────────┐  ┌─────────────────────────────────────────┐  │  │
│  │  │ MetricsService          │  │ AlertService                            │  │  │
│  │  │                         │  │                                         │  │  │
│  │  │ - webhookCounter        │  │ - dlqThresholdAlert                     │  │  │
│  │  │ - syncDuration          │  │ - circuitBreakerAlert                   │  │  │
│  │  │ - retryCounter          │  │ - syncFailureAlert                      │  │  │
│  │  │ - cacheHitRate          │  │ - gapDetectedAlert                      │  │  │
│  │  └─────────────────────────┘  └─────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                    MessageQueue (Existing)                                  │  │
│  │                                                                             │  │
│  │  MessageQueue.mktProductSyncQueue ──▶ MktProductSyncProcessor               │  │
│  │  MessageQueue.mktProductSyncHighPriorityQueue [NEW]                         │  │
│  │                                                                             │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Webhook Events
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           MKT Server                                              │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │ WebhookDispatcher                                                           │  │
│  │                                                                             │  │
│  │ Events:                                                                     │  │
│  │ - product.created    - product.updated    - product.deleted                 │  │
│  │ - package.created    - package.updated    - package.deleted                 │  │
│  │                                                                             │  │
│  │ Payload: { event, data, timestamp, signature }                              │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Webhook Support

### 1.1 Webhook Events from MKT Server

| Event | Description | Payload |
|-------|-------------|---------|
| `product.created` | New product created | Full product object |
| `product.updated` | Product modified | Full product object + `changedFields[]` |
| `product.deleted` | Product deleted | `{ id, code, deletedAt }` |
| `package.created` | New package created | Full package object |
| `package.updated` | Package modified | Full package object + `changedFields[]` |
| `package.deleted` | Package deleted | `{ id, productId, deletedAt }` |

### 1.2 Webhook Payload Format

```typescript
// MKT Server sẽ gửi webhook với format này
type MktWebhookPayload<T> = {
  /** Event type */
  event: MktWebhookEvent;

  /** Event data */
  data: T;

  /** Changed fields (for update events) */
  changedFields?: string[];

  /** Unix timestamp (seconds) */
  timestamp: number;

  /** HMAC-SHA256 signature */
  signature: string;

  /** Webhook delivery ID (for idempotency) */
  deliveryId: string;
};

type MktWebhookEvent =
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'package.created'
  | 'package.updated'
  | 'package.deleted';
```

### 1.3 Webhook Controller

**File:** `mkt-product-integration/webhook/mkt-product-webhook.controller.ts`

```typescript
import {
  Controller,
  Post,
  Headers,
  Body,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';

import { MktWebhookService } from './mkt-webhook.service';
import { WebhookIpWhitelistGuard } from './guards/webhook-ip-whitelist.guard';
import { MktWebhookPayload } from '../types';
import { MKT_WEBHOOK_CONFIG } from '../constants';

@Controller('webhook/mkt')
@UseGuards(PublicEndpointGuard, WebhookIpWhitelistGuard, ThrottlerGuard)
export class MktProductWebhookController {
  private readonly logger = new Logger(MktProductWebhookController.name);

  constructor(private readonly webhookService: MktWebhookService) {}

  @Post('products')
  @HttpCode(HttpStatus.OK)
  async handleProductWebhook(
    @Headers('x-mkt-signature') signature: string,
    @Headers('x-mkt-timestamp') timestamp: string,
    @Headers('x-mkt-delivery-id') deliveryId: string,
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: MktWebhookPayload<unknown>,
  ): Promise<{ received: boolean }> {
    // 0. Validate payload size (prevent DoS)
    const payloadSize = req.rawBody?.length ?? 0;

    if (payloadSize > MKT_WEBHOOK_CONFIG.MAX_PAYLOAD_SIZE_BYTES) {
      this.logger.warn('Webhook payload too large', { deliveryId, payloadSize });
      throw new PayloadTooLargeException(
        `Payload size ${payloadSize} exceeds maximum ${MKT_WEBHOOK_CONFIG.MAX_PAYLOAD_SIZE_BYTES}`,
      );
    }

    // 1. Validate signature (with secret rotation support)
    const isValid = this.webhookService.verifySignature(
      req.rawBody?.toString() ?? '',
      signature,
      timestamp,
    );

    if (!isValid) {
      this.logger.warn('Invalid webhook signature', { deliveryId });
      throw new MktWebhookException(
        'Invalid signature',
        MktWebhookExceptionCode.INVALID_SIGNATURE,
      );
    }

    // 2. Check idempotency (prevent duplicate processing)
    const isProcessed = await this.webhookService.isAlreadyProcessed(deliveryId);

    if (isProcessed) {
      this.logger.debug('Webhook already processed', { deliveryId });
      return { received: true };
    }

    // 3. Process webhook (async - return immediately)
    this.webhookService.processWebhook(payload, deliveryId).catch((error) => {
      this.logger.error('Webhook processing failed', { deliveryId, error });
    });

    return { received: true };
  }
}
```

### 1.3.1 IP Whitelist Guard [NEW]

**File:** `mkt-product-integration/webhook/guards/webhook-ip-whitelist.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class WebhookIpWhitelistGuard implements CanActivate {
  private readonly logger = new Logger(WebhookIpWhitelistGuard.name);
  private readonly allowedIps: string[];
  private readonly enabled: boolean;

  constructor(configService: ConfigService) {
    const ipsConfig = configService.get<string>('MKT_WEBHOOK_ALLOWED_IPS');
    this.allowedIps = ipsConfig?.split(',').map((ip) => ip.trim()) ?? [];
    this.enabled = this.allowedIps.length > 0;
  }

  canActivate(context: ExecutionContext): boolean {
    // If no IPs configured, allow all (disabled)
    if (!this.enabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.getClientIp(request);

    const isAllowed = this.allowedIps.some(
      (allowedIp) => clientIp === allowedIp || clientIp.startsWith(allowedIp),
    );

    if (!isAllowed) {
      this.logger.warn('Webhook request from non-whitelisted IP', {
        clientIp,
        allowedIps: this.allowedIps,
      });
    }

    return isAllowed;
  }

  private getClientIp(request: Request): string {
    // Check X-Forwarded-For header (for proxies)
    const forwardedFor = request.headers['x-forwarded-for'];

    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }

    // Fallback to direct connection IP
    return request.ip ?? request.socket.remoteAddress ?? '';
  }
}
```

### 1.4 Webhook Service

**File:** `mkt-product-integration/webhook/mkt-webhook.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

import * as crypto from 'crypto';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';

import { MktProductSyncService } from '../services/mkt-product-sync.service';
import { MktProductCacheService } from '../services/mkt-product-cache.service';
import {
  MktWebhookPayload,
  MktWebhookEvent,
  MktProduct,
  MktProductPackage,
} from '../types';
import {
  MKT_WEBHOOK_CONFIG,
  MKT_WEBHOOK_EVENTS,
} from '../constants';

@Injectable()
export class MktWebhookService {
  private readonly logger = new Logger(MktWebhookService.name);
  private readonly currentSecret: string;
  private readonly oldSecrets: string[];

  constructor(
    @InjectCacheStorage(CacheStorageNamespace.MktOAuth2)
    private readonly cacheStorage: CacheStorageService,
    private readonly syncService: MktProductSyncService,
    private readonly cacheService: MktProductCacheService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // Support secret rotation - current secret + old secrets
    this.currentSecret = this.configService.get<string>('MKT_WEBHOOK_SECRET') ?? '';
    this.oldSecrets = this.configService
      .get<string>('MKT_WEBHOOK_SECRETS_OLD')
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  }

  // ============================================
  // SIGNATURE VERIFICATION (with Secret Rotation)
  // ============================================

  /**
   * Verify webhook signature using HMAC-SHA256
   * Supports secret rotation with grace period
   * Signature = HMAC-SHA256(timestamp + '.' + rawBody, secret)
   */
  verifySignature(
    rawBody: string,
    signature: string,
    timestamp: string,
  ): boolean {
    if (!this.currentSecret) {
      this.logger.warn('Webhook secret not configured');
      return false;
    }

    // Check timestamp freshness (prevent replay attacks)
    const timestampMs = parseInt(timestamp, 10) * 1000;
    const now = Date.now();

    if (Math.abs(now - timestampMs) > MKT_WEBHOOK_CONFIG.TIMESTAMP_TOLERANCE_MS) {
      this.logger.warn('Webhook timestamp too old or in future');
      return false;
    }

    // Try current secret first
    if (this.verifyWithSecret(rawBody, signature, timestamp, this.currentSecret)) {
      return true;
    }

    // Try old secrets for rotation grace period
    for (const oldSecret of this.oldSecrets) {
      if (this.verifyWithSecret(rawBody, signature, timestamp, oldSecret)) {
        this.logger.warn('Webhook verified with old secret - please update MKT Server');
        return true;
      }
    }

    return false;
  }

  private verifyWithSecret(
    rawBody: string,
    signature: string,
    timestamp: string,
    secret: string,
  ): boolean {
    const signedPayload = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch {
      return false;
    }
  }

  // ============================================
  // IDEMPOTENCY
  // ============================================

  /**
   * Check if webhook was already processed
   */
  async isAlreadyProcessed(deliveryId: string): Promise<boolean> {
    const key = `webhook:processed:${deliveryId}`;

    try {
      const exists = await this.cacheStorage.get<string>(key);
      return exists !== null;
    } catch {
      return false;
    }
  }

  /**
   * Mark webhook as processed
   */
  private async markAsProcessed(deliveryId: string): Promise<void> {
    const key = `webhook:processed:${deliveryId}`;

    try {
      await this.cacheStorage.set(
        key,
        'processed',
        MKT_WEBHOOK_CONFIG.IDEMPOTENCY_TTL_MS,
      );
    } catch {
      this.logger.warn('Failed to mark webhook as processed', { deliveryId });
    }
  }

  // ============================================
  // WEBHOOK PROCESSING
  // ============================================

  /**
   * Process webhook payload
   */
  async processWebhook(
    payload: MktWebhookPayload<unknown>,
    deliveryId: string,
  ): Promise<void> {
    this.logger.log('Processing webhook', { event: payload.event, deliveryId });

    try {
      switch (payload.event) {
        // Product events
        case MKT_WEBHOOK_EVENTS.PRODUCT_CREATED:
        case MKT_WEBHOOK_EVENTS.PRODUCT_UPDATED:
          await this.handleProductCreateOrUpdate(payload.data as MktProduct);
          break;

        case MKT_WEBHOOK_EVENTS.PRODUCT_DELETED:
          await this.handleProductDeleted(payload.data as { id: string });
          break;

        // Package events
        case MKT_WEBHOOK_EVENTS.PACKAGE_CREATED:
        case MKT_WEBHOOK_EVENTS.PACKAGE_UPDATED:
          await this.handlePackageCreateOrUpdate(payload.data as MktProductPackage);
          break;

        case MKT_WEBHOOK_EVENTS.PACKAGE_DELETED:
          await this.handlePackageDeleted(
            payload.data as { id: string; productId: string },
          );
          break;

        default:
          this.logger.warn('Unknown webhook event', { event: payload.event });
      }

      // Mark as processed after successful handling
      await this.markAsProcessed(deliveryId);

      this.logger.log('Webhook processed successfully', { deliveryId });
    } catch (error) {
      this.logger.error('Webhook processing error', { deliveryId, error });
      throw error;
    }
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  private async handleProductCreateOrUpdate(product: MktProduct): Promise<void> {
    this.logger.debug('Updating product cache', { productId: product.id });

    await this.cacheService.setProduct(product.id, product);

    // Update code mapping if exists
    if (product.code) {
      await this.cacheService.setProductCodeMapping(product.code, product.id);
    }
  }

  private async handleProductDeleted(data: { id: string }): Promise<void> {
    this.logger.debug('Invalidating product cache', { productId: data.id });

    await this.cacheService.invalidateProduct(data.id);
  }

  private async handlePackageCreateOrUpdate(pkg: MktProductPackage): Promise<void> {
    this.logger.debug('Updating package cache', { packageId: pkg.id });

    await this.cacheService.setPackage(pkg.id, pkg);
  }

  private async handlePackageDeleted(data: { id: string; productId: string }): Promise<void> {
    this.logger.debug('Invalidating package cache', { packageId: data.id });

    await this.cacheService.invalidatePackage(data.id);

    // Also invalidate product's packages cache
    await this.cacheService.invalidatePackagesByProductId(data.productId);
  }
}
```

### 1.5 Webhook Types

**File:** `mkt-product-integration/types/mkt-webhook.types.ts`

```typescript
// ============================================
// WEBHOOK EVENT TYPES
// ============================================

export type MktWebhookEvent =
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'package.created'
  | 'package.updated'
  | 'package.deleted';

// ============================================
// WEBHOOK PAYLOAD
// ============================================

export type MktWebhookPayload<T> = {
  event: MktWebhookEvent;
  data: T;
  changedFields?: string[];
  timestamp: number;
  signature: string;
  deliveryId: string;
};

// ============================================
// DELETE EVENT DATA
// ============================================

export type MktProductDeletedData = {
  id: string;
  code: string;
  deletedAt: string;
};

export type MktPackageDeletedData = {
  id: string;
  productId: string;
  packageCode: string;
  deletedAt: string;
};
```

### 1.6 Webhook Constants

**File:** `mkt-product-integration/constants/mkt-webhook.config.ts`

```typescript
// ============================================
// WEBHOOK CONFIGURATION
// ============================================

const DEFAULT_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_MAX_PAYLOAD_SIZE_BYTES = 1024 * 1024; // 1MB
const DEFAULT_RATE_LIMIT_TTL_MS = 60 * 1000; // 1 minute
const DEFAULT_RATE_LIMIT_MAX = 100; // 100 requests per minute

export const MKT_WEBHOOK_CONFIG = {
  /** Timestamp tolerance for replay attack prevention */
  TIMESTAMP_TOLERANCE_MS: process.env.MKT_WEBHOOK_TIMESTAMP_TOLERANCE_MS
    ? parseInt(process.env.MKT_WEBHOOK_TIMESTAMP_TOLERANCE_MS, 10)
    : DEFAULT_TIMESTAMP_TOLERANCE_MS,

  /** TTL for idempotency keys */
  IDEMPOTENCY_TTL_MS: process.env.MKT_WEBHOOK_IDEMPOTENCY_TTL_MS
    ? parseInt(process.env.MKT_WEBHOOK_IDEMPOTENCY_TTL_MS, 10)
    : DEFAULT_IDEMPOTENCY_TTL_MS,

  /** Enable webhook processing */
  ENABLED: process.env.MKT_WEBHOOK_ENABLED !== 'false',

  /** Maximum payload size in bytes (default: 1MB) - [NEW] */
  MAX_PAYLOAD_SIZE_BYTES: process.env.MKT_WEBHOOK_MAX_PAYLOAD_SIZE_BYTES
    ? parseInt(process.env.MKT_WEBHOOK_MAX_PAYLOAD_SIZE_BYTES, 10)
    : DEFAULT_MAX_PAYLOAD_SIZE_BYTES,

  /** Rate limit TTL in milliseconds - [NEW] */
  RATE_LIMIT_TTL_MS: process.env.MKT_WEBHOOK_RATE_LIMIT_TTL_MS
    ? parseInt(process.env.MKT_WEBHOOK_RATE_LIMIT_TTL_MS, 10)
    : DEFAULT_RATE_LIMIT_TTL_MS,

  /** Maximum requests per rate limit window - [NEW] */
  RATE_LIMIT_MAX: process.env.MKT_WEBHOOK_RATE_LIMIT_MAX
    ? parseInt(process.env.MKT_WEBHOOK_RATE_LIMIT_MAX, 10)
    : DEFAULT_RATE_LIMIT_MAX,
} as const;

// ============================================
// WEBHOOK EVENTS
// ============================================

export const MKT_WEBHOOK_EVENTS = {
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_DELETED: 'product.deleted',
  PACKAGE_CREATED: 'package.created',
  PACKAGE_UPDATED: 'package.updated',
  PACKAGE_DELETED: 'package.deleted',
} as const;

export type MktWebhookEventType = typeof MKT_WEBHOOK_EVENTS[keyof typeof MKT_WEBHOOK_EVENTS];
```

### 1.7 Circuit Breaker Service [NEW - Priority 1]

**File:** `mkt-product-integration/resilience/circuit-breaker.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// ============================================
// CIRCUIT BREAKER STATES
// ============================================

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

// ============================================
// CONFIGURATION
// ============================================

export type CircuitBreakerOptions = {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms before attempting recovery (OPEN → HALF_OPEN) */
  resetTimeout: number;
  /** Request timeout in ms */
  timeout: number;
  /** Number of successful requests in HALF_OPEN to close circuit */
  successThreshold: number;
};

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeout: 60_000, // 1 minute
  timeout: 10_000, // 10 seconds
  successThreshold: 2,
};

// ============================================
// SERVICE
// ============================================

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<string, CircuitBreaker>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    circuitName: string,
    fn: () => Promise<T>,
    options: Partial<CircuitBreakerOptions> = {},
  ): Promise<T> {
    const circuit = this.getOrCreateCircuit(circuitName, options);

    return circuit.execute(fn);
  }

  /**
   * Get current state of a circuit
   */
  getState(circuitName: string): CircuitState | null {
    return this.circuits.get(circuitName)?.state ?? null;
  }

  /**
   * Manually reset a circuit
   */
  reset(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (circuit) {
      circuit.reset();
      this.logger.log('Circuit manually reset', { circuitName });
    }
  }

  private getOrCreateCircuit(
    name: string,
    options: Partial<CircuitBreakerOptions>,
  ): CircuitBreaker {
    if (!this.circuits.has(name)) {
      const circuit = new CircuitBreaker(
        name,
        { ...DEFAULT_OPTIONS, ...options },
        this.eventEmitter,
        this.logger,
      );
      this.circuits.set(name, circuit);
    }
    return this.circuits.get(name)!;
  }
}

// ============================================
// CIRCUIT BREAKER IMPLEMENTATION
// ============================================

class CircuitBreaker {
  public state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailureTime: number | null = null;

  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: Logger,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN && this.shouldAttemptReset()) {
      this.transitionTo(CircuitState.HALF_OPEN);
    }

    // Reject if circuit is OPEN
    if (this.state === CircuitState.OPEN) {
      throw new CircuitOpenError(
        `Circuit ${this.name} is OPEN - request rejected`,
      );
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Circuit breaker timeout')),
          this.options.timeout,
        ),
      ),
    ]);
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
        this.failures = 0;
        this.successes = 0;
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.OPEN);
      this.successes = 0;
    } else if (this.failures >= this.options.failureThreshold) {
      this.transitionTo(CircuitState.OPEN);
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime >= this.options.resetTimeout;
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    this.logger.log('Circuit state changed', {
      circuit: this.name,
      from: oldState,
      to: newState,
    });

    // Emit event for alerting
    this.eventEmitter.emit('mkt.circuit.state.changed', {
      circuitName: this.name,
      fromState: oldState,
      toState: newState,
      timestamp: new Date(),
    });
  }
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}
```

### 1.8 Error Classification Service [NEW - Priority 1]

**File:** `mkt-product-integration/resilience/error-classification.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { HttpException } from '@nestjs/common';

// ============================================
// ERROR TYPES
// ============================================

export enum SyncErrorType {
  /** Network errors, timeouts - should retry */
  TRANSIENT = 'TRANSIENT',
  /** 404, 400, invalid data - don't retry */
  PERMANENT = 'PERMANENT',
  /** 429 - retry with longer delay */
  RATE_LIMIT = 'RATE_LIMIT',
  /** 401, 403 - need token refresh, then retry */
  AUTHENTICATION = 'AUTHENTICATION',
}

// ============================================
// ERROR CLASSIFICATION RESULT
// ============================================

export type ErrorClassificationResult = {
  type: SyncErrorType;
  shouldRetry: boolean;
  delayMultiplier: number;
  message: string;
};

// ============================================
// SERVICE
// ============================================

@Injectable()
export class ErrorClassificationService {
  /**
   * Classify an error to determine retry strategy
   */
  classifyError(error: unknown): ErrorClassificationResult {
    // HTTP exceptions
    if (error instanceof HttpException) {
      return this.classifyHttpError(error);
    }

    // Standard Error objects
    if (error instanceof Error) {
      return this.classifyStandardError(error);
    }

    // Unknown errors - treat as transient (retry)
    return {
      type: SyncErrorType.TRANSIENT,
      shouldRetry: true,
      delayMultiplier: 1,
      message: 'Unknown error - treating as transient',
    };
  }

  /**
   * Check if error should be retried
   */
  shouldRetry(error: unknown): boolean {
    return this.classifyError(error).shouldRetry;
  }

  /**
   * Get delay multiplier for retry backoff
   */
  getDelayMultiplier(error: unknown): number {
    return this.classifyError(error).delayMultiplier;
  }

  private classifyHttpError(error: HttpException): ErrorClassificationResult {
    const status = error.getStatus();

    // 4xx client errors
    if (status === 400 || status === 404 || status === 422) {
      return {
        type: SyncErrorType.PERMANENT,
        shouldRetry: false,
        delayMultiplier: 0,
        message: `Permanent error (${status}): ${error.message}`,
      };
    }

    // Rate limiting
    if (status === 429) {
      return {
        type: SyncErrorType.RATE_LIMIT,
        shouldRetry: true,
        delayMultiplier: 10, // 10x delay for rate limits
        message: 'Rate limited - will retry with longer delay',
      };
    }

    // Authentication errors
    if (status === 401 || status === 403) {
      return {
        type: SyncErrorType.AUTHENTICATION,
        shouldRetry: true,
        delayMultiplier: 0, // Retry immediately after token refresh
        message: 'Authentication error - will refresh token and retry',
      };
    }

    // 5xx server errors - transient
    if (status >= 500) {
      return {
        type: SyncErrorType.TRANSIENT,
        shouldRetry: true,
        delayMultiplier: 1,
        message: `Server error (${status}): ${error.message}`,
      };
    }

    // Other 4xx errors - don't retry
    return {
      type: SyncErrorType.PERMANENT,
      shouldRetry: false,
      delayMultiplier: 0,
      message: `Client error (${status}): ${error.message}`,
    };
  }

  private classifyStandardError(error: Error): ErrorClassificationResult {
    const message = error.message.toLowerCase();

    // Timeout errors - transient
    if (message.includes('timeout') || message.includes('etimedout')) {
      return {
        type: SyncErrorType.TRANSIENT,
        shouldRetry: true,
        delayMultiplier: 1,
        message: 'Timeout error - will retry',
      };
    }

    // Connection errors - transient
    if (
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('enotfound') ||
      message.includes('network')
    ) {
      return {
        type: SyncErrorType.TRANSIENT,
        shouldRetry: true,
        delayMultiplier: 2,
        message: 'Connection error - will retry with delay',
      };
    }

    // Circuit breaker errors - don't retry immediately
    if (message.includes('circuit') && message.includes('open')) {
      return {
        type: SyncErrorType.TRANSIENT,
        shouldRetry: true,
        delayMultiplier: 5, // Longer delay for circuit breaker
        message: 'Circuit open - will retry after delay',
      };
    }

    // Default to transient
    return {
      type: SyncErrorType.TRANSIENT,
      shouldRetry: true,
      delayMultiplier: 1,
      message: `Error: ${error.message}`,
    };
  }
}
```

---

## Part 2: Selective Sync (Delta Sync)

### 2.1 Delta Sync Strategy

Thay vì sync toàn bộ products/packages, chỉ sync những items đã thay đổi kể từ lần sync cuối.

#### Approach: Checkpoint-based Delta Sync

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Delta Sync Flow                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Load last sync checkpoint (stored in Redis)                          │
│     └─▶ lastSyncAt: "2024-01-15T10:00:00Z"                               │
│                                                                          │
│  2. Query MKT Server for changes since checkpoint                        │
│     └─▶ GET /api/oauth/products?updatedAfter=2024-01-15T10:00:00Z        │
│     └─▶ GET /api/oauth/product-packages?updatedAfter=2024-01-15T10:00:00Z│
│                                                                          │
│  3. Process only changed items                                           │
│     └─▶ Update cache for changed products                                │
│     └─▶ Update cache for changed packages                                │
│                                                                          │
│  4. Update checkpoint to current time                                    │
│     └─▶ lastSyncAt: "2024-01-15T11:00:00Z"                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 MKT Server API Extension (Required)

MKT Server cần hỗ trợ query params cho delta sync:

| Param | Type | Description |
|-------|------|-------------|
| `updatedAfter` | ISO8601 string | Chỉ trả về items updated sau timestamp này |
| `includeDeleted` | boolean | Include soft-deleted items (với `deletedAt`) |

### 2.3 Delta Sync Service

**File:** `mkt-product-integration/services/mkt-delta-sync.service.ts`

```typescript
import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { DateTime } from 'luxon';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';

import { MktProductProxyService } from './mkt-product-proxy.service';
import { MktProductCacheService } from './mkt-product-cache.service';
import { RedisLockService } from '../resilience/redis-lock.service';
import {
  MktProduct,
  MktProductPackage,
} from '../types';
import {
  MKT_DELTA_SYNC_CONFIG,
  MKT_PRODUCT_LOG_CONTEXT,
} from '../constants';

// ============================================
// TYPES
// ============================================

type DeltaSyncResult = {
  productsUpdated: number;
  productsDeleted: number;
  packagesUpdated: number;
  packagesDeleted: number;
  checkpoint: string;
  duration: number;
};

type SyncCheckpoint = {
  lastSyncAt: string;
  lastProcessedEventId?: string;
  syncSequence: number;
  productsVersion?: string;
  packagesVersion?: string;
};

type GapDetectionResult = {
  hasGaps: boolean;
  missingRange?: [string, string];
  gapMinutes?: number;
};

type ConsistencyCheckResult = {
  consistent: boolean;
  missingProducts: string[];
  staleProducts: string[];
  checkedCount: number;
};

// ============================================
// SERVICE
// ============================================

@Injectable()
export class MktDeltaSyncService {
  private readonly logger = new Logger(`${MKT_PRODUCT_LOG_CONTEXT}:DeltaSync`);

  constructor(
    @InjectCacheStorage(CacheStorageNamespace.MktOAuth2)
    private readonly cacheStorage: CacheStorageService,
    private readonly productProxy: MktProductProxyService,
    private readonly cacheService: MktProductCacheService,
    private readonly lockService: RedisLockService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================
  // DELTA SYNC METHODS (with Distributed Lock)
  // ============================================

  /**
   * Perform delta sync - only sync changed items since last checkpoint
   * Uses distributed lock to prevent concurrent delta syncs [Priority 1]
   */
  async syncChangedOnly(): Promise<DeltaSyncResult> {
    const lockKey = MKT_DELTA_SYNC_CONFIG.LOCK_KEY;
    const lockTtl = MKT_DELTA_SYNC_CONFIG.LOCK_TTL_MS;

    // Acquire distributed lock to prevent race conditions [Priority 1]
    const lock = await this.lockService.acquire(lockKey, lockTtl);

    if (!lock) {
      this.logger.warn('Delta sync already in progress - skipping');
      throw new ConflictException('Delta sync already in progress');
    }

    const startTime = DateTime.utc();

    try {
      // 1. Load checkpoint
      const checkpoint = await this.loadCheckpoint();
      const updatedAfter = checkpoint?.lastSyncAt;

      this.logger.log('Starting delta sync', { updatedAfter });

      // 2. If no checkpoint exists, fallback to full sync
      if (!updatedAfter) {
        this.logger.log('No checkpoint found, delta sync not available');
        return {
          productsUpdated: 0,
          productsDeleted: 0,
          packagesUpdated: 0,
          packagesDeleted: 0,
          checkpoint: '',
          duration: 0,
        };
      }

      // 3. Check for gaps before syncing [Priority 2]
      const gapResult = await this.detectGaps(checkpoint);

      if (gapResult.hasGaps) {
        this.logger.warn('Gap detected in sync history', gapResult);
        this.eventEmitter.emit('mkt.sync.gap.detected', {
          ...gapResult,
          checkpoint,
          timestamp: new Date(),
        });

        // If gap is too large (> 1 hour), recommend full sync
        if (gapResult.gapMinutes && gapResult.gapMinutes > 60) {
          this.logger.warn('Gap too large, full sync recommended');
        }
      }

      let productsUpdated = 0;
      let productsDeleted = 0;
      let packagesUpdated = 0;
      let packagesDeleted = 0;

      // 4. Apply clock skew tolerance [Priority 2]
      const adjustedUpdatedAfter = this.applyClockSkewTolerance(updatedAfter);

      // 5. Fetch changed products
      const changedProducts = await this.fetchChangedProducts(adjustedUpdatedAfter);

      for (const product of changedProducts) {
        if (product.deletedAt) {
          await this.cacheService.invalidateProduct(product.id);
          productsDeleted++;
        } else {
          await this.cacheService.setProduct(product.id, product);
          productsUpdated++;
        }
      }

      // 6. Fetch changed packages
      const changedPackages = await this.fetchChangedPackages(adjustedUpdatedAfter);

      for (const pkg of changedPackages) {
        if (pkg.deletedAt) {
          await this.cacheService.invalidatePackage(pkg.id);
          packagesDeleted++;
        } else {
          await this.cacheService.setPackage(pkg.id, pkg);
          packagesUpdated++;
        }
      }

      // 7. Update checkpoint with backup [Priority 2]
      const newCheckpoint: SyncCheckpoint = {
        lastSyncAt: DateTime.utc().toISO()!,
        syncSequence: (checkpoint?.syncSequence ?? 0) + 1,
      };
      await this.saveCheckpointWithBackup(newCheckpoint);

      const duration = DateTime.utc().diff(startTime).as('milliseconds');

      this.logger.log('Delta sync completed', {
        productsUpdated,
        productsDeleted,
        packagesUpdated,
        packagesDeleted,
        duration,
      });

      return {
        productsUpdated,
        productsDeleted,
        packagesUpdated,
        packagesDeleted,
        checkpoint: newCheckpoint.lastSyncAt,
        duration,
      };
    } catch (error) {
      this.logger.error('Delta sync failed', error);
      throw error;
    } finally {
      // Always release lock
      await this.lockService.release(lockKey, lock);
    }
  }

  // ============================================
  // GAP DETECTION [Priority 2]
  // ============================================

  /**
   * Detect gaps in sync history to identify missed webhook events
   */
  async detectGaps(checkpoint: SyncCheckpoint | null): Promise<GapDetectionResult> {
    if (!checkpoint) {
      return { hasGaps: false };
    }

    try {
      // Query MKT Server for latest product update time
      const latestProducts = await this.productProxy.getProducts({
        page: 1,
        limit: 1,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });

      if (!latestProducts.data || latestProducts.data.length === 0) {
        return { hasGaps: false };
      }

      const latestUpdate = latestProducts.data[0].updatedAt;

      if (!latestUpdate) {
        return { hasGaps: false };
      }

      const checkpointDate = DateTime.fromISO(checkpoint.lastSyncAt);
      const latestDate = DateTime.fromISO(latestUpdate);

      // Calculate gap in minutes
      const gapMinutes = latestDate.diff(checkpointDate, 'minutes').minutes;

      // If gap > configured threshold, consider it a gap
      if (gapMinutes > MKT_DELTA_SYNC_CONFIG.GAP_THRESHOLD_MINUTES) {
        return {
          hasGaps: true,
          missingRange: [checkpoint.lastSyncAt, latestUpdate],
          gapMinutes,
        };
      }

      return { hasGaps: false };
    } catch (error) {
      this.logger.warn('Gap detection failed', error);
      return { hasGaps: false };
    }
  }

  // ============================================
  // CONSISTENCY CHECK [Priority 2]
  // ============================================

  /**
   * Verify cache consistency with source data
   * Sample random products and verify cache matches
   */
  async verifyConsistency(sampleSize = 100): Promise<ConsistencyCheckResult> {
    const missingProducts: string[] = [];
    const staleProducts: string[] = [];

    try {
      // Get random sample of products from MKT Server
      const products = await this.productProxy.getProducts({
        page: 1,
        limit: sampleSize,
      });

      if (!products.data) {
        return {
          consistent: true,
          missingProducts: [],
          staleProducts: [],
          checkedCount: 0,
        };
      }

      for (const product of products.data) {
        const cached = await this.cacheService.getProduct(product.id);

        if (!cached) {
          missingProducts.push(product.id);
        } else if (cached.updatedAt !== product.updatedAt) {
          staleProducts.push(product.id);
        }
      }

      const consistent = missingProducts.length === 0 && staleProducts.length === 0;

      if (!consistent) {
        this.logger.warn('Consistency check failed', {
          missingProducts: missingProducts.length,
          staleProducts: staleProducts.length,
        });

        this.eventEmitter.emit('mkt.sync.consistency.failed', {
          missingProducts,
          staleProducts,
          checkedCount: products.data.length,
          timestamp: new Date(),
        });
      }

      return {
        consistent,
        missingProducts,
        staleProducts,
        checkedCount: products.data.length,
      };
    } catch (error) {
      this.logger.error('Consistency check error', error);
      return {
        consistent: false,
        missingProducts: [],
        staleProducts: [],
        checkedCount: 0,
      };
    }
  }

  // ============================================
  // CLOCK SKEW TOLERANCE [Priority 2]
  // ============================================

  /**
   * Apply clock skew tolerance to updatedAfter timestamp
   * Subtract tolerance buffer to avoid missing updates due to clock drift
   */
  private applyClockSkewTolerance(updatedAfter: string): string {
    if (!MKT_DELTA_SYNC_CONFIG.USE_CLOCK_SKEW_BUFFER) {
      return updatedAfter;
    }

    const date = DateTime.fromISO(updatedAfter);
    const adjusted = date.minus({
      milliseconds: MKT_DELTA_SYNC_CONFIG.CLOCK_SKEW_TOLERANCE_MS,
    });

    return adjusted.toISO()!;
  }

  // ============================================
  // CHECKPOINT MANAGEMENT (with Backup) [Priority 2]
  // ============================================

  private async loadCheckpoint(): Promise<SyncCheckpoint | null> {
    try {
      const checkpoint = await this.cacheStorage.get<SyncCheckpoint>(
        MKT_DELTA_SYNC_CONFIG.CHECKPOINT_KEY,
      );

      if (checkpoint) {
        return checkpoint;
      }

      // Try to restore from backup
      return this.restoreFromBackup();
    } catch {
      return this.restoreFromBackup();
    }
  }

  private async saveCheckpointWithBackup(checkpoint: SyncCheckpoint): Promise<void> {
    try {
      // Save primary checkpoint
      await this.cacheStorage.set(
        MKT_DELTA_SYNC_CONFIG.CHECKPOINT_KEY,
        checkpoint,
        MKT_DELTA_SYNC_CONFIG.CHECKPOINT_TTL_MS,
      );

      // Save to backup (keep last 3 checkpoints)
      await this.addToCheckpointBackup(checkpoint);
    } catch (error) {
      this.logger.warn('Failed to save checkpoint', error);
    }
  }

  private async addToCheckpointBackup(checkpoint: SyncCheckpoint): Promise<void> {
    const backupKey = `${MKT_DELTA_SYNC_CONFIG.CHECKPOINT_KEY}:backup`;

    try {
      const backups = await this.cacheStorage.get<SyncCheckpoint[]>(backupKey) ?? [];

      // Add new checkpoint at the beginning
      backups.unshift(checkpoint);

      // Keep only last 3 backups
      if (backups.length > 3) {
        backups.pop();
      }

      await this.cacheStorage.set(
        backupKey,
        backups,
        MKT_DELTA_SYNC_CONFIG.CHECKPOINT_TTL_MS,
      );
    } catch {
      // Ignore backup failures
    }
  }

  private async restoreFromBackup(): Promise<SyncCheckpoint | null> {
    const backupKey = `${MKT_DELTA_SYNC_CONFIG.CHECKPOINT_KEY}:backup`;

    try {
      const backups = await this.cacheStorage.get<SyncCheckpoint[]>(backupKey);

      if (backups && backups.length > 0) {
        this.logger.log('Restored checkpoint from backup');
        return backups[0];
      }
    } catch {
      // Ignore
    }

    return null;
  }

  /**
   * Initialize checkpoint after full sync
   */
  async initializeCheckpoint(): Promise<void> {
    const checkpoint: SyncCheckpoint = {
      lastSyncAt: DateTime.utc().toISO()!,
      syncSequence: 1,
    };

    await this.saveCheckpointWithBackup(checkpoint);
    this.logger.log('Checkpoint initialized', checkpoint);
  }

  /**
   * Reset checkpoint (force full sync on next run)
   */
  async resetCheckpoint(): Promise<void> {
    try {
      await this.cacheStorage.del(MKT_DELTA_SYNC_CONFIG.CHECKPOINT_KEY);
      await this.cacheStorage.del(`${MKT_DELTA_SYNC_CONFIG.CHECKPOINT_KEY}:backup`);
      this.logger.log('Checkpoint reset');
    } catch {
      this.logger.warn('Failed to reset checkpoint');
    }
  }

  // ============================================
  // FETCH CHANGED ITEMS
  // ============================================

  private async fetchChangedProducts(
    updatedAfter: string,
  ): Promise<(MktProduct & { deletedAt?: string })[]> {
    const allChangedProducts: (MktProduct & { deletedAt?: string })[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await this.productProxy.getProducts({
        page,
        limit: MKT_DELTA_SYNC_CONFIG.BATCH_SIZE,
        updatedAfter,
        includeDeleted: true,
      });

      if (result.data && result.data.length > 0) {
        allChangedProducts.push(...result.data);
        hasMore = result.data.length >= MKT_DELTA_SYNC_CONFIG.BATCH_SIZE;
        page++;
      } else {
        hasMore = false;
      }
    }

    return allChangedProducts;
  }

  private async fetchChangedPackages(
    updatedAfter: string,
  ): Promise<(MktProductPackage & { deletedAt?: string })[]> {
    const allChangedPackages: (MktProductPackage & { deletedAt?: string })[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await this.productProxy.getPackages({
        page,
        limit: MKT_DELTA_SYNC_CONFIG.BATCH_SIZE,
        updatedAfter,
        includeDeleted: true,
      });

      if (result.data && result.data.length > 0) {
        allChangedPackages.push(...result.data);
        hasMore = result.data.length >= MKT_DELTA_SYNC_CONFIG.BATCH_SIZE;
        page++;
      } else {
        hasMore = false;
      }
    }

    return allChangedPackages;
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Check if delta sync is available (checkpoint exists)
   */
  async isDeltaSyncAvailable(): Promise<boolean> {
    const checkpoint = await this.loadCheckpoint();
    return checkpoint !== null;
  }
}
```

### 2.3.1 Redis Lock Service [NEW - Priority 1]

**File:** `mkt-product-integration/resilience/redis-lock.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

import { InjectRedis } from 'src/engine/core-modules/redis/decorators/inject-redis.decorator';

@Injectable()
export class RedisLockService {
  private readonly logger = new Logger(RedisLockService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Acquire a distributed lock
   * Returns lock value if acquired, null if failed
   */
  async acquire(key: string, ttlMs: number): Promise<string | null> {
    const lockValue = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      // SET NX with expiration
      const result = await this.redis.set(
        key,
        lockValue,
        'PX',
        ttlMs,
        'NX',
      );

      if (result === 'OK') {
        this.logger.debug('Lock acquired', { key, ttlMs });
        return lockValue;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to acquire lock', { key, error });
      return null;
    }
  }

  /**
   * Release a distributed lock
   * Only releases if the lock value matches (prevents releasing others' locks)
   */
  async release(key: string, lockValue: string): Promise<boolean> {
    // Lua script to atomically check and delete
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = await this.redis.eval(script, 1, key, lockValue);
      const released = result === 1;

      if (released) {
        this.logger.debug('Lock released', { key });
      }

      return released;
    } catch (error) {
      this.logger.error('Failed to release lock', { key, error });
      return false;
    }
  }

  /**
   * Extend lock TTL
   */
  async extend(key: string, lockValue: string, ttlMs: number): Promise<boolean> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;

    try {
      const result = await this.redis.eval(script, 1, key, lockValue, ttlMs.toString());
      return result === 1;
    } catch (error) {
      this.logger.error('Failed to extend lock', { key, error });
      return false;
    }
  }
}
```

### 2.4 Delta Sync Configuration

**File:** `mkt-product-integration/constants/mkt-delta-sync.config.ts`

```typescript
// ============================================
// DELTA SYNC CONFIGURATION
// ============================================

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_CHECKPOINT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const DEFAULT_LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_CLOCK_SKEW_TOLERANCE_MS = 60 * 1000; // 1 minute
const DEFAULT_GAP_THRESHOLD_MINUTES = 30; // 30 minutes

export const MKT_DELTA_SYNC_CONFIG = {
  /** Enable delta sync */
  ENABLED: process.env.MKT_DELTA_SYNC_ENABLED !== 'false',

  /** Batch size for fetching changed items */
  BATCH_SIZE: process.env.MKT_DELTA_SYNC_BATCH_SIZE
    ? parseInt(process.env.MKT_DELTA_SYNC_BATCH_SIZE, 10)
    : DEFAULT_BATCH_SIZE,

  /** Cache key for checkpoint */
  CHECKPOINT_KEY: 'mkt:product:sync:checkpoint',

  /** TTL for checkpoint (30 days) */
  CHECKPOINT_TTL_MS: process.env.MKT_DELTA_SYNC_CHECKPOINT_TTL_MS
    ? parseInt(process.env.MKT_DELTA_SYNC_CHECKPOINT_TTL_MS, 10)
    : DEFAULT_CHECKPOINT_TTL_MS,

  /** Minimum interval between delta syncs */
  MIN_INTERVAL_MS: process.env.MKT_DELTA_SYNC_MIN_INTERVAL_MS
    ? parseInt(process.env.MKT_DELTA_SYNC_MIN_INTERVAL_MS, 10)
    : 60 * 1000, // 1 minute

  // ============================================
  // NEW CONFIGURATIONS [Priority 1 & 2]
  // ============================================

  /** Distributed lock key for delta sync - [NEW Priority 1] */
  LOCK_KEY: 'mkt:delta-sync:lock',

  /** Distributed lock TTL in ms - [NEW Priority 1] */
  LOCK_TTL_MS: process.env.MKT_DELTA_SYNC_LOCK_TTL_MS
    ? parseInt(process.env.MKT_DELTA_SYNC_LOCK_TTL_MS, 10)
    : DEFAULT_LOCK_TTL_MS,

  /** Clock skew tolerance in ms (default: 1 minute) - [NEW Priority 2] */
  CLOCK_SKEW_TOLERANCE_MS: process.env.MKT_DELTA_SYNC_CLOCK_SKEW_MS
    ? parseInt(process.env.MKT_DELTA_SYNC_CLOCK_SKEW_MS, 10)
    : DEFAULT_CLOCK_SKEW_TOLERANCE_MS,

  /** Enable clock skew buffer - [NEW Priority 2] */
  USE_CLOCK_SKEW_BUFFER: process.env.MKT_DELTA_SYNC_USE_CLOCK_SKEW !== 'false',

  /** Gap threshold in minutes for alerting - [NEW Priority 2] */
  GAP_THRESHOLD_MINUTES: process.env.MKT_DELTA_SYNC_GAP_THRESHOLD_MINUTES
    ? parseInt(process.env.MKT_DELTA_SYNC_GAP_THRESHOLD_MINUTES, 10)
    : DEFAULT_GAP_THRESHOLD_MINUTES,
} as const;
```

### 2.5 Updated Sync Service

**File:** Update `mkt-product-sync.service.ts`

```typescript
// Add new method to MktProductSyncService

/**
 * Sync with delta strategy if available, otherwise full sync
 */
async syncWithDelta(): Promise<SyncResult> {
  const isDeltaAvailable = await this.deltaSyncService.isDeltaSyncAvailable();

  if (isDeltaAvailable && MKT_DELTA_SYNC_CONFIG.ENABLED) {
    this.logger.log('Using delta sync strategy');
    const deltaResult = await this.deltaSyncService.syncChangedOnly();

    return {
      productsCount: deltaResult.productsUpdated + deltaResult.productsDeleted,
      packagesCount: deltaResult.packagesUpdated + deltaResult.packagesDeleted,
      errors: [],
      duration: deltaResult.duration,
    };
  }

  this.logger.log('Using full sync strategy');
  const result = await this.syncAllProductsAndPackages();

  // Initialize checkpoint after full sync
  await this.deltaSyncService.initializeCheckpoint();

  return result;
}
```

---

## Part 3: Retry Queue

### 3.1 Retry Strategy

Failed sync items được queue để retry với exponential backoff:

| Attempt | Delay | Total Time |
|---------|-------|------------|
| 1 | Immediate | 0s |
| 2 | 30s | 30s |
| 3 | 2m | 2m 30s |
| 4 | 8m | 10m 30s |
| 5 | 30m | 40m 30s |
| Dead Letter | - | Move to DLQ |

### 3.2 Message Queue Integration

**File:** Update `message-queue.constants.ts`

```typescript
export enum MessageQueue {
  // ... existing queues
  mktProductSyncQueue = 'mkt-product-sync-queue',
}
```

### 3.3 Retry Job Types

**File:** `mkt-product-integration/jobs/mkt-sync-retry.job.ts`

```typescript
import { MessageQueueJob } from 'src/engine/core-modules/message-queue/interfaces/message-queue-job.interface';

// ============================================
// JOB DATA TYPES (Updated with Priority) [Priority 2]
// ============================================

export type RetryPriority = 'high' | 'normal' | 'low';

export type MktSyncRetryJobData = {
  type: 'product' | 'package';
  itemId: string;
  attempt: number;
  originalError: string;
  createdAt: string;
  priority: RetryPriority; // [NEW Priority 2]
  errorType?: string; // [NEW Priority 1] - for error classification
};

export type MktSyncRetryJobName = 'mkt-sync-retry';

// ============================================
// JOB CONSTANTS
// ============================================

export const MKT_SYNC_RETRY_JOB = 'mkt-sync-retry' as const;

export const MKT_SYNC_RETRY_CONFIG = {
  /** Max retry attempts before moving to DLQ */
  MAX_ATTEMPTS: 5,

  /** Base delay in milliseconds */
  BASE_DELAY_MS: 30_000, // 30 seconds

  /** Exponential backoff multiplier */
  BACKOFF_MULTIPLIER: 4,

  /** Maximum delay */
  MAX_DELAY_MS: 30 * 60 * 1000, // 30 minutes

  // ============================================
  // NEW CONFIGURATIONS [Priority 1 & 2]
  // ============================================

  /** DLQ threshold for alerting - [NEW Priority 2] */
  DLQ_ALERT_THRESHOLD: process.env.MKT_SYNC_DLQ_ALERT_THRESHOLD
    ? parseInt(process.env.MKT_SYNC_DLQ_ALERT_THRESHOLD, 10)
    : 10,

  /** Maximum DLQ size - [NEW Priority 2] */
  DLQ_MAX_SIZE: process.env.MKT_SYNC_DLQ_MAX_SIZE
    ? parseInt(process.env.MKT_SYNC_DLQ_MAX_SIZE, 10)
    : 1000,

  /** DLQ item TTL in ms (7 days) - [NEW] */
  DLQ_ITEM_TTL_MS: 7 * 24 * 60 * 60 * 1000,

  /** Priority values for job queue - [NEW Priority 2] */
  PRIORITY_VALUES: {
    high: 1,
    normal: 2,
    low: 3,
  } as const,
} as const;
```

### 3.4 Retry Queue Service

**File:** `mkt-product-integration/services/mkt-sync-retry.service.ts`

```typescript
import { Injectable, Logger, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';

import { MktProductProxyService } from './mkt-product-proxy.service';
import { MktProductCacheService } from './mkt-product-cache.service';
import {
  ErrorClassificationService,
  SyncErrorType,
} from '../resilience/error-classification.service';
import {
  MktSyncRetryJobData,
  RetryPriority,
  MKT_SYNC_RETRY_JOB,
  MKT_SYNC_RETRY_CONFIG,
} from '../jobs/mkt-sync-retry.job';
import { MKT_PRODUCT_LOG_CONTEXT } from '../constants';

// ============================================
// TYPES
// ============================================

type RetryQueueStats = {
  pending: number;
  processing: number;
  failed: number;
  deadLetter: number;
};

// ============================================
// SERVICE
// ============================================

@Injectable()
export class MktSyncRetryService {
  private readonly logger = new Logger(`${MKT_PRODUCT_LOG_CONTEXT}:Retry`);

  constructor(
    @InjectMessageQueue(MessageQueue.mktProductSyncQueue)
    private readonly messageQueue: MessageQueueService,
    @InjectCacheStorage(CacheStorageNamespace.MktOAuth2)
    private readonly cacheStorage: CacheStorageService,
    private readonly productProxy: MktProductProxyService,
    private readonly cacheService: MktProductCacheService,
    private readonly errorClassifier: ErrorClassificationService, // [NEW Priority 1]
    private readonly eventEmitter: EventEmitter2, // [NEW Priority 2]
  ) {}

  // ============================================
  // ADD TO RETRY QUEUE (with Priority) [Priority 2]
  // ============================================

  /**
   * Add failed product sync to retry queue
   */
  async addProductToRetry(
    productId: string,
    error: string,
    priority: RetryPriority = 'normal',
  ): Promise<void> {
    await this.addToQueue('product', productId, error, priority);
  }

  /**
   * Add failed package sync to retry queue
   */
  async addPackageToRetry(
    packageId: string,
    error: string,
    priority: RetryPriority = 'normal',
  ): Promise<void> {
    await this.addToQueue('package', packageId, error, priority);
  }

  private async addToQueue(
    type: 'product' | 'package',
    itemId: string,
    error: string,
    priority: RetryPriority = 'normal',
  ): Promise<void> {
    const jobData: MktSyncRetryJobData = {
      type,
      itemId,
      attempt: 1,
      originalError: error,
      createdAt: new Date().toISOString(),
      priority, // [NEW Priority 2]
    };

    // Get priority value for queue [NEW Priority 2]
    const priorityValue = MKT_SYNC_RETRY_CONFIG.PRIORITY_VALUES[priority];

    await this.messageQueue.add(MKT_SYNC_RETRY_JOB, jobData, {
      id: `${type}:${itemId}`, // Prevent duplicate jobs
      retryLimit: 0, // We handle retries manually
      priority: priorityValue, // [NEW Priority 2]
    });

    this.logger.debug('Added to retry queue', { type, itemId, priority });
  }

  // ============================================
  // PROCESS RETRY (with Error Classification) [Priority 1]
  // ============================================

  /**
   * Process retry job
   * Called by MktSyncRetryProcessor
   */
  async processRetry(jobData: MktSyncRetryJobData): Promise<void> {
    const { type, itemId, attempt } = jobData;

    this.logger.log('Processing retry', { type, itemId, attempt });

    try {
      if (type === 'product') {
        await this.retryProduct(itemId);
      } else {
        await this.retryPackage(itemId);
      }

      this.logger.log('Retry successful', { type, itemId, attempt });
    } catch (error) {
      await this.handleRetryFailure(jobData, error);
    }
  }

  private async retryProduct(productId: string): Promise<void> {
    // Force fetch from API (bypass cache)
    const product = await this.productProxy.getProduct(productId);

    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    await this.cacheService.setProduct(productId, product);
  }

  private async retryPackage(packageId: string): Promise<void> {
    const pkg = await this.productProxy.getPackage(packageId);

    if (!pkg) {
      throw new Error(`Package not found: ${packageId}`);
    }

    await this.cacheService.setPackage(packageId, pkg);
  }

  // ============================================
  // HANDLE RETRY FAILURE (with Error Classification) [Priority 1]
  // ============================================

  private async handleRetryFailure(
    jobData: MktSyncRetryJobData,
    error: unknown,
  ): Promise<void> {
    const { type, itemId, attempt, priority } = jobData;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Classify error [Priority 1]
    const classification = this.errorClassifier.classifyError(error);

    // Don't retry permanent errors [Priority 1]
    if (!classification.shouldRetry) {
      this.logger.warn('Permanent error - moving to DLQ without retry', {
        type,
        itemId,
        errorType: classification.type,
        error: errorMessage,
      });
      await this.moveToDeadLetter(jobData, errorMessage, 'permanent_error');
      return;
    }

    // Handle authentication errors - refresh token first [Priority 1]
    if (classification.type === SyncErrorType.AUTHENTICATION) {
      this.logger.warn('Authentication error - emitting token refresh event', {
        type,
        itemId,
      });
      this.eventEmitter.emit('mkt.oauth2.token.refresh.needed', {
        reason: 'retry_auth_error',
        itemType: type,
        itemId,
      });
      // Schedule retry with minimal delay
      await this.scheduleRetry(jobData, 5000, 'high');
      return;
    }

    const nextAttempt = attempt + 1;

    if (nextAttempt > MKT_SYNC_RETRY_CONFIG.MAX_ATTEMPTS) {
      await this.moveToDeadLetter(jobData, errorMessage, 'max_attempts_exceeded');
      return;
    }

    // Calculate delay with exponential backoff and error-specific multiplier [Priority 1]
    const baseDelay = MKT_SYNC_RETRY_CONFIG.BASE_DELAY_MS * classification.delayMultiplier;
    const delay = Math.min(
      baseDelay * Math.pow(MKT_SYNC_RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt - 1),
      MKT_SYNC_RETRY_CONFIG.MAX_DELAY_MS,
    );

    // Adjust priority based on error type [Priority 2]
    const adjustedPriority =
      classification.type === SyncErrorType.RATE_LIMIT ? 'low' : priority;

    await this.scheduleRetry(
      { ...jobData, attempt: nextAttempt, errorType: classification.type },
      delay,
      adjustedPriority,
    );

    this.logger.warn('Retry failed, scheduling next attempt', {
      type,
      itemId,
      nextAttempt,
      delayMs: delay,
      errorType: classification.type,
      priority: adjustedPriority,
      error: errorMessage,
    });
  }

  private async scheduleRetry(
    jobData: MktSyncRetryJobData,
    delay: number,
    priority: RetryPriority,
  ): Promise<void> {
    const { type, itemId, attempt } = jobData;
    const priorityValue = MKT_SYNC_RETRY_CONFIG.PRIORITY_VALUES[priority];

    const retryData: MktSyncRetryJobData = {
      ...jobData,
      priority,
    };

    await this.messageQueue.add(MKT_SYNC_RETRY_JOB, retryData, {
      id: `${type}:${itemId}:${attempt}`,
      retryLimit: 0,
      priority: priorityValue,
      delay, // Schedule with delay
    });
  }

  // ============================================
  // DEAD LETTER QUEUE (with Alert & Size Limit) [Priority 2]
  // ============================================

  private async moveToDeadLetter(
    jobData: MktSyncRetryJobData,
    finalError: string,
    reason?: string,
  ): Promise<void> {
    const { type, itemId, originalError, createdAt } = jobData;

    const dlqKey = `mkt:sync:dlq:${type}:${itemId}`;
    const dlqEntry = {
      type,
      itemId,
      originalError,
      finalError,
      createdAt,
      movedToDlqAt: new Date().toISOString(),
      attempts: MKT_SYNC_RETRY_CONFIG.MAX_ATTEMPTS,
      reason, // [NEW Priority 2]
    };

    try {
      // Store in Redis for manual inspection
      await this.cacheStorage.set(
        dlqKey,
        dlqEntry,
        MKT_SYNC_RETRY_CONFIG.DLQ_ITEM_TTL_MS,
      );

      // Track in DLQ list (with size limit) [Priority 2]
      await this.addToDlqList(type, itemId);

      this.logger.error('Moved to dead letter queue', dlqEntry);

      // Emit event for alerting [Priority 2]
      this.eventEmitter.emit('mkt.sync.dlq.added', {
        type,
        itemId,
        error: finalError,
        reason,
        timestamp: new Date(),
      });

      // Check if DLQ threshold exceeded [Priority 2]
      await this.checkDlqThreshold();
    } catch (error) {
      this.logger.error('Failed to move to DLQ', { jobData, error });
    }
  }

  // [NEW Priority 2] - DLQ size limit management
  private async addToDlqList(type: string, itemId: string): Promise<void> {
    const listKey = 'mkt:sync:dlq:list';
    const entry = `${type}:${itemId}`;
    const maxSize = MKT_SYNC_RETRY_CONFIG.DLQ_MAX_SIZE;

    try {
      const existing = await this.cacheStorage.get<string[]>(listKey);
      const list = existing ?? [];

      if (!list.includes(entry)) {
        // Remove oldest entry if at capacity [Priority 2]
        if (list.length >= maxSize) {
          const removed = list.shift();
          this.logger.warn('DLQ at capacity, removed oldest entry', { removed });

          // Also remove the actual DLQ entry
          if (removed) {
            const [oldType, oldId] = removed.split(':');
            await this.cacheStorage.del(`mkt:sync:dlq:${oldType}:${oldId}`);
          }
        }

        list.push(entry);
        await this.cacheStorage.set(
          listKey,
          list,
          MKT_SYNC_RETRY_CONFIG.DLQ_ITEM_TTL_MS,
        );
      }
    } catch {
      // Ignore
    }
  }

  // [NEW Priority 2] - Alert when DLQ threshold exceeded
  private async checkDlqThreshold(): Promise<void> {
    try {
      const stats = await this.getQueueStats();

      if (stats.deadLetter >= MKT_SYNC_RETRY_CONFIG.DLQ_ALERT_THRESHOLD) {
        this.eventEmitter.emit('mkt.sync.dlq.threshold.exceeded', {
          count: stats.deadLetter,
          threshold: MKT_SYNC_RETRY_CONFIG.DLQ_ALERT_THRESHOLD,
          timestamp: new Date(),
        });

        this.logger.error('DLQ threshold exceeded', {
          count: stats.deadLetter,
          threshold: MKT_SYNC_RETRY_CONFIG.DLQ_ALERT_THRESHOLD,
        });
      }
    } catch {
      // Ignore
    }
  }

  // ============================================
  // STATS & MONITORING (Fixed) [Priority 1]
  // ============================================

  /**
   * Get retry queue statistics
   * Now properly retrieves stats from BullMQ [Priority 1]
   */
  async getQueueStats(): Promise<RetryQueueStats> {
    try {
      // Get actual queue stats from BullMQ [Priority 1 - FIXED]
      const queueInfo = await this.messageQueue.getQueueInfo();

      const dlqList = await this.cacheStorage.get<string[]>('mkt:sync:dlq:list');

      return {
        pending: queueInfo.waiting + queueInfo.delayed,
        processing: queueInfo.active,
        failed: queueInfo.failed,
        deadLetter: dlqList?.length ?? 0,
      };
    } catch (error) {
      this.logger.warn('Failed to get queue stats', error);
      return { pending: 0, processing: 0, failed: 0, deadLetter: 0 };
    }
  }

  /**
   * Get all items in dead letter queue
   */
  async getDeadLetterItems(): Promise<Array<{
    type: string;
    itemId: string;
    originalError: string;
    finalError: string;
    movedToDlqAt: string;
    reason?: string;
  }>> {
    try {
      const dlqList = await this.cacheStorage.get<string[]>('mkt:sync:dlq:list');

      if (!dlqList) return [];

      const items: Array<{
        type: string;
        itemId: string;
        originalError: string;
        finalError: string;
        movedToDlqAt: string;
        reason?: string;
      }> = [];

      for (const entry of dlqList) {
        const [type, itemId] = entry.split(':');
        const dlqKey = `mkt:sync:dlq:${type}:${itemId}`;
        const dlqEntry = await this.cacheStorage.get<{
          type: string;
          itemId: string;
          originalError: string;
          finalError: string;
          movedToDlqAt: string;
          reason?: string;
        }>(dlqKey);

        if (dlqEntry) {
          items.push(dlqEntry);
        }
      }

      return items;
    } catch {
      return [];
    }
  }

  /**
   * Retry all items in dead letter queue
   */
  async retryAllDeadLetter(): Promise<number> {
    const items = await this.getDeadLetterItems();
    let retried = 0;

    for (const item of items) {
      try {
        // Use high priority for DLQ retries [Priority 2]
        await this.addToQueue(
          item.type as 'product' | 'package',
          item.itemId,
          'Manual retry from DLQ',
          'high',
        );

        // Remove from DLQ
        await this.cacheStorage.del(`mkt:sync:dlq:${item.type}:${item.itemId}`);
        retried++;
      } catch {
        // Continue with next item
      }
    }

    // Update DLQ list
    if (retried > 0) {
      await this.cacheStorage.del('mkt:sync:dlq:list');
    }

    this.logger.log(`Retried ${retried} items from DLQ`);
    return retried;
  }
}
```

### 3.5 Retry Job Processor

**File:** `mkt-product-integration/jobs/mkt-sync-retry.processor.ts`

```typescript
import { Logger } from '@nestjs/common';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueJob } from 'src/engine/core-modules/message-queue/interfaces/message-queue-job.interface';

import { MktSyncRetryService } from '../services/mkt-sync-retry.service';
import {
  MktSyncRetryJobData,
  MKT_SYNC_RETRY_JOB,
} from './mkt-sync-retry.job';

@Processor(MessageQueue.mktProductSyncQueue)
export class MktSyncRetryProcessor {
  private readonly logger = new Logger(MktSyncRetryProcessor.name);

  constructor(private readonly retryService: MktSyncRetryService) {}

  @Process(MKT_SYNC_RETRY_JOB)
  async handleRetry(job: MessageQueueJob<MktSyncRetryJobData>): Promise<void> {
    this.logger.debug('Processing retry job', { id: job.id, data: job.data });

    await this.retryService.processRetry(job.data);
  }
}
```

### 3.6 Integration with Sync Service

Update `mkt-product-sync.service.ts` to use retry queue:

```typescript
// In syncProductsWithStreaming method
private async syncProductsWithStreaming(): Promise<SyncItemResult> {
  let count = 0;
  const errors: string[] = [];

  try {
    for await (const productBatch of this.streamProducts()) {
      const results = await Promise.allSettled(
        productBatch.map((product) =>
          this.cacheService.setProduct(product.id, product),
        ),
      );

      for (let i = 0; i < results.length; i++) {
        const result = results[i];

        if (result.status === 'fulfilled') {
          count++;
        } else {
          const productId = productBatch[i]?.id ?? 'unknown';
          const errorMsg = result.reason?.message ?? 'Unknown error';

          errors.push(`Product ${productId}: ${errorMsg}`);

          // Add to retry queue instead of just logging
          await this.retryService.addProductToRetry(productId, errorMsg);
        }
      }
    }

    this.logger.log(`Synced ${count} products`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Products sync failed: ${message}`);
    this.logger.error('Products sync failed', error);
  }

  return { count, errors };
}
```

---

## Part 4: Module Structure

### 4.1 Updated Module

**File:** `mkt-product-integration/mkt-product-integration.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

import { OAuth2ClientModule } from 'src/mkt-core/oauth2-client/oauth2-client.module';
import { RedisInfrastructureModule } from 'src/mkt-core/infrastructure/redis';

import {
  MktSnapshotService,
  MktProductCacheService,
  MktProductProxyService,
  MktProductSyncService,
  MktDeltaSyncService,
  MktSyncRetryService,
} from './services';
import { MktWebhookService } from './webhook/mkt-webhook.service';
import { MktProductWebhookController } from './webhook/mkt-product-webhook.controller';
import { MktSyncRetryProcessor } from './jobs/mkt-sync-retry.processor';

@Module({
  imports: [
    OAuth2ClientModule,
    RedisInfrastructureModule,
    CacheModule.register(),
  ],
  controllers: [
    MktProductWebhookController,
  ],
  providers: [
    // Core services
    MktSnapshotService,
    MktProductCacheService,
    MktProductProxyService,
    MktProductSyncService,

    // New services
    MktDeltaSyncService,
    MktSyncRetryService,
    MktWebhookService,

    // Job processors
    MktSyncRetryProcessor,
  ],
  exports: [
    MktProductProxyService,
    MktSnapshotService,
    MktProductSyncService,
    MktDeltaSyncService,
    MktSyncRetryService,
  ],
})
export class MktProductIntegrationModule {}
```

### 4.2 Directory Structure

```
mkt-product-integration/
├── constants/
│   ├── index.ts
│   ├── mkt-product.constants.ts
│   ├── mkt-sync.config.ts
│   ├── mkt-webhook.config.ts          # NEW
│   └── mkt-delta-sync.config.ts       # NEW
├── services/
│   ├── index.ts
│   ├── mkt-snapshot.service.ts
│   ├── mkt-product-cache.service.ts
│   ├── mkt-product-proxy.service.ts
│   ├── mkt-product-sync.service.ts
│   ├── mkt-delta-sync.service.ts      # NEW
│   └── mkt-sync-retry.service.ts      # NEW
├── webhook/                            # NEW
│   ├── mkt-product-webhook.controller.ts
│   ├── mkt-webhook.service.ts
│   └── mkt-webhook.exception.ts
├── jobs/                               # NEW
│   ├── mkt-sync-retry.job.ts
│   └── mkt-sync-retry.processor.ts
├── types/
│   ├── index.ts
│   ├── mkt-product-proxy.types.ts
│   └── mkt-webhook.types.ts           # NEW
├── mkt-product-integration.module.ts
├── OAUTH-PRODUCT-SYNC-DESIGN.md
└── WEBHOOK-DELTA-SYNC-DESIGN.md       # THIS FILE
```

---

## Part 5: Environment Variables

```bash
# .env

# ============================================
# WEBHOOK CONFIGURATION
# ============================================
MKT_WEBHOOK_SECRET=your-webhook-secret-here
MKT_WEBHOOK_ENABLED=true
MKT_WEBHOOK_TIMESTAMP_TOLERANCE_MS=300000
MKT_WEBHOOK_IDEMPOTENCY_TTL_MS=86400000

# ============================================
# DELTA SYNC CONFIGURATION
# ============================================
MKT_DELTA_SYNC_ENABLED=true
MKT_DELTA_SYNC_BATCH_SIZE=100
MKT_DELTA_SYNC_CHECKPOINT_TTL_MS=2592000000
MKT_DELTA_SYNC_MIN_INTERVAL_MS=60000

# ============================================
# RETRY QUEUE CONFIGURATION
# ============================================
MKT_SYNC_RETRY_MAX_ATTEMPTS=5
MKT_SYNC_RETRY_BASE_DELAY_MS=30000
MKT_SYNC_RETRY_BACKOFF_MULTIPLIER=4
MKT_SYNC_RETRY_MAX_DELAY_MS=1800000
```

---

## Part 6: Implementation Checklist

### Webhook Support
- [ ] **6.1**: Create `MktProductWebhookController`
- [ ] **6.2**: Create `MktWebhookService` với signature verification
- [ ] **6.3**: Implement idempotency check
- [ ] **6.4**: Create webhook types and constants
- [ ] **6.5**: Add webhook exception handling
- [ ] **6.6**: Configure MKT_WEBHOOK_SECRET in env

### Delta Sync
- [ ] **6.7**: Create `MktDeltaSyncService`
- [ ] **6.8**: Implement checkpoint management
- [ ] **6.9**: Add `updatedAfter` param support in proxy service
- [ ] **6.10**: Update `MktProductSyncService.syncWithDelta()`
- [ ] **6.11**: Create delta sync configuration

### Retry Queue
- [ ] **6.12**: Add `mktProductSyncQueue` to MessageQueue enum
- [ ] **6.13**: Create `MktSyncRetryService`
- [ ] **6.14**: Create `MktSyncRetryProcessor`
- [ ] **6.15**: Implement dead letter queue handling
- [ ] **6.16**: Update sync service to use retry queue
- [ ] **6.17**: Add retry queue stats endpoint

### Module Integration
- [ ] **6.18**: Update `MktProductIntegrationModule`
- [ ] **6.19**: Export new services
- [ ] **6.20**: Add webhook controller

### MKT Server Requirements
- [ ] **6.21**: MKT Server implements webhook dispatcher
- [ ] **6.22**: MKT Server supports `updatedAfter` query param
- [ ] **6.23**: MKT Server supports `includeDeleted` query param
- [ ] **6.24**: Configure webhook endpoint URL in MKT Server

---

### [NEW] Priority 1 - Critical Improvements

#### Circuit Breaker & Resilience
- [ ] **P1.1**: Create `CircuitBreakerService` với states (CLOSED, OPEN, HALF_OPEN)
- [ ] **P1.2**: Integrate circuit breaker vào MKT Server calls
- [ ] **P1.3**: Add circuit state change events for alerting
- [ ] **P1.4**: Configure circuit breaker options (failureThreshold, resetTimeout)

#### Error Classification
- [ ] **P1.5**: Create `ErrorClassificationService`
- [ ] **P1.6**: Implement TRANSIENT / PERMANENT / RATE_LIMIT / AUTHENTICATION classification
- [ ] **P1.7**: Integrate error classification vào retry logic
- [ ] **P1.8**: Don't retry permanent errors (400, 404, 422)

#### Distributed Lock for Delta Sync
- [ ] **P1.9**: Create `RedisLockService` với acquire/release/extend
- [ ] **P1.10**: Add distributed lock to `syncChangedOnly()`
- [ ] **P1.11**: Configure lock TTL in environment variables
- [ ] **P1.12**: Prevent concurrent delta sync conflicts

#### Fixed Queue Stats
- [ ] **P1.13**: Update `getQueueStats()` to use BullMQ `getQueueInfo()`
- [ ] **P1.14**: Return actual pending/processing/failed counts

#### IP Whitelisting
- [ ] **P1.15**: Create `WebhookIpWhitelistGuard`
- [ ] **P1.16**: Add `MKT_WEBHOOK_ALLOWED_IPS` env variable
- [ ] **P1.17**: Support CIDR notation for IP ranges
- [ ] **P1.18**: Add IP validation logging

---

### [NEW] Priority 2 - High Importance Improvements

#### Gap Detection
- [ ] **P2.1**: Implement `detectGaps()` method in `MktDeltaSyncService`
- [ ] **P2.2**: Emit `mkt.sync.gap.detected` event when gaps found
- [ ] **P2.3**: Configure `GAP_THRESHOLD_MINUTES` in env
- [ ] **P2.4**: Log recommendations for full sync when gap > 1 hour

#### Alert Mechanism
- [ ] **P2.5**: Emit `mkt.sync.dlq.threshold.exceeded` event
- [ ] **P2.6**: Emit `mkt.circuit.state.changed` event
- [ ] **P2.7**: Emit `mkt.sync.consistency.failed` event
- [ ] **P2.8**: Configure `DLQ_ALERT_THRESHOLD` in env

#### Clock Skew Tolerance
- [ ] **P2.9**: Implement `applyClockSkewTolerance()` method
- [ ] **P2.10**: Configure `CLOCK_SKEW_TOLERANCE_MS` (default: 1 minute)
- [ ] **P2.11**: Enable/disable via `USE_CLOCK_SKEW_BUFFER` env

#### Checkpoint Backup
- [ ] **P2.12**: Implement `saveCheckpointWithBackup()`
- [ ] **P2.13**: Keep last 3 checkpoint backups
- [ ] **P2.14**: Implement `restoreFromBackup()` fallback
- [ ] **P2.15**: Add backup cleanup on checkpoint reset

#### Retry Priority
- [ ] **P2.16**: Add `priority` field to `MktSyncRetryJobData`
- [ ] **P2.17**: Configure `PRIORITY_VALUES` (high: 1, normal: 2, low: 3)
- [ ] **P2.18**: Adjust priority based on error type (RATE_LIMIT → low)
- [ ] **P2.19**: Use high priority for DLQ retries

#### DLQ Size Limit
- [ ] **P2.20**: Configure `DLQ_MAX_SIZE` (default: 1000)
- [ ] **P2.21**: Remove oldest entries when at capacity
- [ ] **P2.22**: Log warning when DLQ reaches capacity
- [ ] **P2.23**: Configure `DLQ_ITEM_TTL_MS` (default: 7 days)

#### Secret Rotation
- [ ] **P2.24**: Support `MKT_WEBHOOK_SECRETS_OLD` for grace period
- [ ] **P2.25**: Try current secret first, then old secrets
- [ ] **P2.26**: Log warning when verified with old secret
- [ ] **P2.27**: Document secret rotation procedure

#### Consistency Check
- [ ] **P2.28**: Implement `verifyConsistency()` method
- [ ] **P2.29**: Sample random products and compare with cache
- [ ] **P2.30**: Emit `mkt.sync.consistency.failed` event
- [ ] **P2.31**: Add consistency check to scheduled job (optional)

#### Request Size Limit
- [ ] **P2.32**: Add `MAX_PAYLOAD_SIZE_BYTES` config (default: 1MB)
- [ ] **P2.33**: Check payload size before processing
- [ ] **P2.34**: Return `PayloadTooLargeException` for oversized payloads

#### Rate Limiting
- [ ] **P2.35**: Add `ThrottlerGuard` to webhook controller
- [ ] **P2.36**: Configure `RATE_LIMIT_TTL_MS` và `RATE_LIMIT_MAX`
- [ ] **P2.37**: Return 429 for rate-limited requests

---

## Part 7: Security Considerations

| Concern | Solution | Priority |
|---------|----------|----------|
| Webhook signature spoofing | HMAC-SHA256 với shared secret | Existing |
| Replay attacks | Timestamp validation (5 min tolerance) | Existing |
| Duplicate processing | Idempotency key với 24h TTL | Existing |
| Unauthorized access | PublicEndpointGuard + signature | Existing |
| Secret exposure | Environment variable, không hardcode | Existing |
| DLQ data exposure | Redis TTL (7 days), access control | Existing |
| **IP Whitelisting** | WebhookIpWhitelistGuard - chỉ accept webhook từ allowed IPs | **[NEW - P1]** |
| **Payload Size Limit** | MAX_PAYLOAD_SIZE_BYTES (1MB default) - prevent DoS | **[NEW - P1]** |
| **Rate Limiting** | ThrottlerGuard - 100 requests/minute default | **[NEW - P2]** |
| **Secret Rotation** | Support multiple secrets với grace period | **[NEW - P2]** |
| **Request Validation** | Validate all incoming webhook fields trước khi process | **[NEW - P2]** |
| **Circuit Breaker** | Prevent cascade failures khi MKT Server down | **[NEW - P1]** |

### 7.1 New Environment Variables

```bash
# Security Configuration - [NEW]
MKT_WEBHOOK_ALLOWED_IPS=192.168.1.100,10.0.0.0/24  # Comma-separated IPs/CIDRs
MKT_WEBHOOK_SECRET=current_secret_here
MKT_WEBHOOK_SECRETS_OLD=old_secret1,old_secret2    # For rotation grace period
MKT_WEBHOOK_MAX_PAYLOAD_SIZE_BYTES=1048576         # 1MB default
MKT_WEBHOOK_RATE_LIMIT_TTL_MS=60000                # 1 minute
MKT_WEBHOOK_RATE_LIMIT_MAX=100                     # 100 requests/minute
```

### 7.2 Secret Rotation Procedure

```
1. Generate new secret in MKT Server
2. Add old secret to MKT_WEBHOOK_SECRETS_OLD in CRM
3. Update MKT_WEBHOOK_SECRET with new secret
4. Deploy CRM changes
5. Update MKT Server to use new secret
6. After grace period (24-48h), remove old secret from MKT_WEBHOOK_SECRETS_OLD
```

---

## Part 8: Monitoring & Observability

### Logs

```
[MktProductIntegration:Webhook] Webhook received { event: 'product.updated', deliveryId: 'xxx' }
[MktProductIntegration:Webhook] Webhook processed successfully { deliveryId: 'xxx' }
[MktProductIntegration:DeltaSync] Starting delta sync { updatedAfter: '2024-01-15T10:00:00Z' }
[MktProductIntegration:DeltaSync] Delta sync completed { productsUpdated: 5, packagesUpdated: 2 }
[MktProductIntegration:Retry] Added to retry queue { type: 'product', itemId: 'xxx' }
[MktProductIntegration:Retry] Retry successful { type: 'product', itemId: 'xxx', attempt: 2 }
[MktProductIntegration:Retry] Moved to dead letter queue { type: 'product', itemId: 'xxx' }

# [NEW] Additional Logs from Priority 1 & 2 improvements
[MktProductIntegration:CircuitBreaker] Circuit state changed { circuit: 'mkt-api', from: 'CLOSED', to: 'OPEN' }
[MktProductIntegration:DeltaSync] Gap detected in sync history { gapMinutes: 45, missingRange: [...] }
[MktProductIntegration:DeltaSync] Restored checkpoint from backup
[MktProductIntegration:Retry] Permanent error - moving to DLQ without retry { errorType: 'PERMANENT' }
[MktProductIntegration:Retry] DLQ threshold exceeded { count: 15, threshold: 10 }
[MktProductIntegration:Retry] DLQ at capacity, removed oldest entry
[MktProductIntegration:Webhook] Webhook verified with old secret - please update MKT Server
[MktProductIntegration:Webhook] Webhook payload too large { deliveryId: 'xxx', payloadSize: 2097152 }
[WebhookIpWhitelistGuard] Webhook request from non-whitelisted IP { clientIp: '1.2.3.4' }
```

### [NEW] Event Emitter Events

| Event | Description | Payload |
|-------|-------------|---------|
| `mkt.circuit.state.changed` | Circuit breaker state changed | `{ circuitName, fromState, toState, timestamp }` |
| `mkt.sync.gap.detected` | Gap detected in sync history | `{ hasGaps, missingRange, gapMinutes, checkpoint }` |
| `mkt.sync.consistency.failed` | Cache consistency check failed | `{ missingProducts, staleProducts, checkedCount }` |
| `mkt.sync.dlq.added` | Item added to DLQ | `{ type, itemId, error, reason, timestamp }` |
| `mkt.sync.dlq.threshold.exceeded` | DLQ count exceeded threshold | `{ count, threshold, timestamp }` |
| `mkt.oauth2.token.refresh.needed` | Token refresh needed due to auth error | `{ reason, itemType, itemId }` |

### Health Check Response

```json
{
  "status": "healthy",
  "webhook": {
    "enabled": true,
    "lastReceived": "2024-01-15T11:30:00Z",
    "processedCount": 150
  },
  "deltaSync": {
    "enabled": true,
    "lastCheckpoint": "2024-01-15T10:00:00Z",
    "lastSyncDuration": 1234,
    "lastSyncSequence": 42
  },
  "retryQueue": {
    "pending": 5,
    "processing": 1,
    "failed": 0,
    "deadLetter": 2
  },
  "circuitBreaker": {
    "mkt-api": "CLOSED"
  }
}
```

---

## Part 9: Dependencies

### Required Packages (Already Installed)
- `@nestjs/event-emitter`
- `luxon`
- `crypto` (Node.js built-in)

### Module Dependencies
```
MktProductIntegrationModule
├── OAuth2ClientModule
├── RedisInfrastructureModule
├── MessageQueueModule (for retry queue)
└── CacheModule
```

---

## Part 10: Future Enhancements

1. **Batch Webhook**: Support batch events trong single webhook call
2. **Webhook Replay**: API để replay failed webhooks
3. **Metrics**: Prometheus metrics cho webhook, sync, và retry
4. **Circuit Breaker**: Circuit breaker cho MKT Server API
5. **Priority Queue**: Priority levels cho retry queue
6. **Scheduled Delta Sync**: Cron job cho periodic delta sync
