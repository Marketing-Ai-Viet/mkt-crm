# SEPay IPN Improvements Roadmap

> **Tài liệu triển khai các cải tiến cho module Payment IPN**
> Phiên bản: 1.0.0 | Ngày tạo: 22/01/2026

---

## Mục Lục

1. [Tổng Quan](#1-tổng-quan)
2. [Improvement 1: Parse Order Code từ Content](#2-improvement-1-parse-order-code-từ-content)
3. [Improvement 2: Partial Payment Support](#3-improvement-2-partial-payment-support)
4. [Improvement 3: IP Whitelist](#4-improvement-3-ip-whitelist)
5. [Improvement 4: Transaction Support](#5-improvement-4-transaction-support)
6. [Improvement 5: Event Emission](#6-improvement-5-event-emission)
7. [Implementation Priority](#7-implementation-priority)
8. [Testing Strategy](#8-testing-strategy)

---

## 1. Tổng Quan

### 1.1. Mục đích

Tài liệu này mô tả chi tiết kế hoạch triển khai các cải tiến cho module SEPay IPN webhook nhằm:
- Tăng độ tin cậy khi matching order
- Hỗ trợ các use case thanh toán phức tạp hơn
- Cải thiện bảo mật webhook endpoint
- Đảm bảo data consistency với transaction support
- Mở rộng khả năng tích hợp với các module khác

### 1.2. Current State Analysis

| Component | File | Status |
|-----------|------|--------|
| Controller | `sepay-payment.controller.ts` | ✅ Working |
| Webhook Service | `mkt-payment-webhook.service.ts` | ✅ Working |
| Webhook Handler | `sepay-webhook.handler.ts` | ✅ Working |
| DTO | `sepay-webhook.dto.ts` | ✅ Working |
| Repository | `mkt-payment.repository.ts` | ✅ Working |

### 1.3. Identified Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| No content parsing when `code` is null | Orders may not be matched | High |
| No partial payment support | Cannot handle underpayment/overpayment | Medium |
| No IP whitelist | Security vulnerability | High |
| No transaction support in service | Data inconsistency risk | High |
| No event emission | Cannot trigger notifications | Medium |

---

## 2. Improvement 1: Parse Order Code từ Content

### 2.1. Problem Statement

Khi `code` field trong webhook payload là `null`, hệ thống không thể match được order, dù order code có thể nằm trong `content` field.

**Example Payload:**
```json
{
  "id": 92704,
  "code": null,
  "content": "NGUYEN VAN A chuyen tien ORD20251221001 thanh toan",
  "transferAmount": 100000
}
```

### 2.2. Proposed Solution

Implement `OrderCodeExtractor` utility class với các regex patterns để parse order code từ content.

### 2.3. Technical Design

#### 2.3.1. File Structure
```
payment/
├── utils/
│   └── order-code-extractor.ts  # NEW
└── services/
    └── mkt-payment-webhook.service.ts  # MODIFIED
```

#### 2.3.2. OrderCodeExtractor Implementation

```typescript
// packages/twenty-server/src/mkt-core/payment/utils/order-code-extractor.ts

/**
 * Order Code Extractor Utility
 *
 * Extracts order codes from transaction content using configurable patterns.
 */

export type OrderCodePattern = {
  name: string;
  regex: RegExp;
  priority: number;
};

// Default patterns - có thể cấu hình qua environment
const DEFAULT_PATTERNS: OrderCodePattern[] = [
  {
    name: 'ORD_PATTERN',
    regex: /ORD\d{8,14}/i,
    priority: 1,
  },
  {
    name: 'DH_PATTERN',
    regex: /DH\d{6,14}/i,
    priority: 2,
  },
  {
    name: 'MKT_PATTERN',
    regex: /MKT\d{6,14}/i,
    priority: 3,
  },
  {
    name: 'INVOICE_PATTERN',
    regex: /INV\d{6,14}/i,
    priority: 4,
  },
];

export class OrderCodeExtractor {
  private patterns: OrderCodePattern[];

  constructor(customPatterns?: OrderCodePattern[]) {
    this.patterns = customPatterns ?? DEFAULT_PATTERNS;
    // Sort by priority
    this.patterns.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Extract order code from content string
   * @param content - Transaction content/description
   * @returns Extracted order code or null
   */
  extract(content: string): string | null {
    if (!content || typeof content !== 'string') {
      return null;
    }

    // Normalize content: uppercase, remove extra spaces
    const normalizedContent = content.toUpperCase().replace(/\s+/g, ' ').trim();

    for (const pattern of this.patterns) {
      const match = normalizedContent.match(pattern.regex);
      if (match) {
        return match[0];
      }
    }

    return null;
  }

  /**
   * Extract all matching codes from content
   * @param content - Transaction content/description
   * @returns Array of extracted codes with pattern info
   */
  extractAll(content: string): Array<{ code: string; pattern: string }> {
    if (!content || typeof content !== 'string') {
      return [];
    }

    const normalizedContent = content.toUpperCase().replace(/\s+/g, ' ').trim();
    const results: Array<{ code: string; pattern: string }> = [];

    for (const pattern of this.patterns) {
      const matches = normalizedContent.matchAll(new RegExp(pattern.regex, 'gi'));
      for (const match of matches) {
        results.push({
          code: match[0],
          pattern: pattern.name,
        });
      }
    }

    return results;
  }

  /**
   * Validate if a string is a valid order code
   * @param code - Code to validate
   * @returns boolean
   */
  isValidOrderCode(code: string): boolean {
    if (!code) return false;
    return this.patterns.some((pattern) => pattern.regex.test(code));
  }
}

// Singleton instance for common use
export const orderCodeExtractor = new OrderCodeExtractor();
```

#### 2.3.3. Service Integration

```typescript
// Modification to mkt-payment-webhook.service.ts

import { orderCodeExtractor } from '../utils/order-code-extractor';

// In processWebhookPayment method:

// Step 3: Get order code - prioritize `code` field, fallback to content parsing
let orderCode = payload.code;

if (!orderCode) {
  this.logger.log('Code field is null, attempting to extract from content');
  orderCode = orderCodeExtractor.extract(payload.content);

  if (orderCode) {
    this.logger.log(`Extracted order code from content: ${orderCode}`);
  } else {
    this.logger.warn('Could not extract order code from content');
  }
}

if (!orderCode) {
  // ... handle unmatched case
}
```

### 2.4. Configuration

```typescript
// packages/twenty-server/src/mkt-core/payment/config/order-code.config.ts

import { registerAs } from '@nestjs/config';

export const orderCodeConfig = registerAs('orderCode', () => ({
  patterns: [
    {
      name: 'ORD_PATTERN',
      regex: process.env.ORDER_CODE_PATTERN_ORD || 'ORD\\d{8,14}',
      priority: 1,
    },
    {
      name: 'CUSTOM_PATTERN',
      regex: process.env.ORDER_CODE_PATTERN_CUSTOM,
      priority: 5,
    },
  ].filter((p) => p.regex),
  enableContentParsing: process.env.ENABLE_ORDER_CODE_PARSING !== 'false',
}));
```

### 2.5. Test Cases

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| TC1 | `"NGUYEN VAN A chuyen tien ORD20251221001"` | `"ORD20251221001"` |
| TC2 | `"Thanh toan don hang DH123456789"` | `"DH123456789"` |
| TC3 | `"Transfer for MKT2024010001"` | `"MKT2024010001"` |
| TC4 | `"Random content without code"` | `null` |
| TC5 | `"ORD123 va ORD456"` (multiple) | `"ORD123"` (first match) |
| TC6 | `null` | `null` |
| TC7 | `""` (empty string) | `null` |

---

## 3. Improvement 2: Partial Payment Support

### 3.1. Problem Statement

Hiện tại hệ thống chỉ xử lý full payment. Các trường hợp sau chưa được handle:
- **Underpayment**: Khách chuyển thiếu tiền
- **Overpayment**: Khách chuyển thừa tiền
- **Multiple Payments**: Khách chuyển nhiều lần cho 1 order

### 3.2. Proposed Solution

Implement payment amount validation với các status mới và logic xử lý partial payment.

### 3.3. Technical Design

#### 3.3.1. New Payment Statuses

```typescript
// Update to payment-status.types.ts

export const MKT_PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',      // Full payment received
  PARTIAL: 'PARTIAL',          // Partial payment received (NEW)
  OVERPAID: 'OVERPAID',        // More than expected (NEW)
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
  EXPIRED: 'EXPIRED',
} as const;
```

#### 3.3.2. Order Payment Status

```typescript
// Update to order constants

export const ORDER_PAYMENT_STATUS = {
  UNPAID: 'UNPAID',
  PARTIAL_PAID: 'PARTIAL_PAID',    // NEW
  FULLY_PAID: 'FULLY_PAID',
  OVERPAID: 'OVERPAID',            // NEW
  REFUNDED: 'REFUNDED',
} as const;
```

#### 3.3.3. Payment Amount Analyzer

```typescript
// packages/twenty-server/src/mkt-core/payment/utils/payment-amount-analyzer.ts

import { MoneyUtils } from 'src/mkt-core/utils/money.utils';

export type PaymentAmountResult = {
  status: 'EXACT' | 'UNDERPAID' | 'OVERPAID';
  expectedAmount: number;
  receivedAmount: number;
  totalPaidAmount: number;
  remainingAmount: number;
  overpaidAmount: number;
  percentagePaid: number;
};

export class PaymentAmountAnalyzer {
  /**
   * Analyze payment amount against expected amount
   */
  analyze(
    expectedAmount: number,
    receivedAmount: number,
    previouslyPaidAmount: number = 0,
  ): PaymentAmountResult {
    const totalPaid = MoneyUtils.add(previouslyPaidAmount, receivedAmount).toNumber();
    const remaining = MoneyUtils.subtract(expectedAmount, totalPaid).toNumber();
    const overpaid = remaining < 0 ? Math.abs(remaining) : 0;
    const percentagePaid = MoneyUtils.divideSafe(totalPaid, expectedAmount)
      .multipliedBy(100)
      .toNumber();

    let status: PaymentAmountResult['status'];

    if (MoneyUtils.equals(totalPaid, expectedAmount)) {
      status = 'EXACT';
    } else if (totalPaid < expectedAmount) {
      status = 'UNDERPAID';
    } else {
      status = 'OVERPAID';
    }

    return {
      status,
      expectedAmount,
      receivedAmount,
      totalPaidAmount: totalPaid,
      remainingAmount: Math.max(0, remaining),
      overpaidAmount: overpaid,
      percentagePaid: Math.min(100, percentagePaid),
    };
  }

  /**
   * Determine appropriate payment status based on analysis
   */
  determinePaymentStatus(result: PaymentAmountResult): string {
    switch (result.status) {
      case 'EXACT':
        return 'COMPLETED';
      case 'UNDERPAID':
        return 'PARTIAL';
      case 'OVERPAID':
        return 'OVERPAID';
      default:
        return 'PENDING';
    }
  }

  /**
   * Determine appropriate order status based on payment analysis
   */
  determineOrderStatus(result: PaymentAmountResult): string {
    switch (result.status) {
      case 'EXACT':
        return 'CONFIRMED';
      case 'UNDERPAID':
        return 'PENDING'; // Keep pending until full payment
      case 'OVERPAID':
        return 'CONFIRMED'; // Confirm but flag for refund
      default:
        return 'PENDING';
    }
  }
}

export const paymentAmountAnalyzer = new PaymentAmountAnalyzer();
```

#### 3.3.4. Service Integration

```typescript
// Update to mkt-payment-webhook.service.ts

import { paymentAmountAnalyzer } from '../utils/payment-amount-analyzer';

// In processWebhookPayment:

// Step 5: Analyze payment amount
const previousPayments = await this.findPaymentsByOrderId(order.id);
const previouslyPaidAmount = previousPayments
  .filter((p) => p.status === 'COMPLETED' || p.status === 'PARTIAL')
  .reduce((sum, p) => MoneyUtils.add(sum, p.amount ?? 0).toNumber(), 0);

const amountAnalysis = paymentAmountAnalyzer.analyze(
  order.totalAmount ?? 0,
  payload.transferAmount,
  previouslyPaidAmount,
);

this.logger.log(`Payment analysis: ${JSON.stringify(amountAnalysis)}`);

// Step 6: Update payment with appropriate status
const paymentStatus = paymentAmountAnalyzer.determinePaymentStatus(amountAnalysis);
const orderStatus = paymentAmountAnalyzer.determineOrderStatus(amountAnalysis);

await this.updatePayment(primaryPayment.id, {
  status: paymentStatus,
  paymentDate: payload.transactionDate,
  amount: payload.transferAmount,
  // ... other fields
});

// Step 7: Update order status based on payment analysis
if (amountAnalysis.status === 'EXACT' || amountAnalysis.status === 'OVERPAID') {
  await this.updateOrderStatusAfterPayment(order.id);
} else {
  // Partial payment - update paidAmount but keep order pending
  await this.updateOrderPartialPayment(order.id, amountAnalysis.totalPaidAmount);
}

// Step 8: Handle overpayment notification
if (amountAnalysis.status === 'OVERPAID') {
  this.logger.warn(
    `Overpayment detected for order ${order.orderCode}: ` +
    `expected ${amountAnalysis.expectedAmount}, received ${amountAnalysis.totalPaidAmount}`
  );
  // TODO: Emit event for refund processing
}
```

#### 3.3.5. Database Changes

```sql
-- Migration: Add paidAmount column to mktOrder table
ALTER TABLE "mktOrder"
ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(20,2) DEFAULT 0;

-- Add index for payment status queries
CREATE INDEX IF NOT EXISTS "idx_mktPayment_status"
ON "mktPayment" ("status");
```

### 3.4. Webhook Response Enhancement

```typescript
// Enhanced response for partial payment
{
  "success": true,
  "message": "Partial payment received",
  "data": {
    "transactionId": 92704,
    "matchedOrder": "ORD20251221001",
    "status": "PARTIAL",
    "paymentDetails": {
      "expectedAmount": 1000000,
      "receivedAmount": 500000,
      "totalPaid": 500000,
      "remainingAmount": 500000,
      "percentagePaid": 50
    }
  }
}
```

### 3.5. Configuration

```typescript
// Environment variables
PARTIAL_PAYMENT_ENABLED=true
PARTIAL_PAYMENT_THRESHOLD=0.95  // Auto-confirm if >= 95% paid
OVERPAYMENT_AUTO_REFUND=false   // Manual review required
```

---

## 4. Improvement 3: IP Whitelist

### 4.1. Problem Statement

Hiện tại webhook endpoint chấp nhận request từ bất kỳ IP nào, chỉ validate bằng API key. Điều này có thể bị exploit nếu API key bị leak.

### 4.2. Proposed Solution

Implement IP whitelist guard để chỉ chấp nhận webhook từ IP của SEPay.

### 4.3. Technical Design

#### 4.3.1. File Structure

```
payment/
├── guards/
│   └── ip-whitelist.guard.ts  # NEW
├── config/
│   └── security.config.ts     # NEW
└── sepay-payment/
    └── sepay-payment.controller.ts  # MODIFIED
```

#### 4.3.2. IP Whitelist Guard

```typescript
// packages/twenty-server/src/mkt-core/payment/guards/ip-whitelist.guard.ts

import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Request } from 'express';

import { securityConfig } from '../config/security.config';

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  private readonly logger = new Logger(IpWhitelistGuard.name);

  constructor(
    @Inject(securityConfig.KEY)
    private readonly config: ConfigType<typeof securityConfig>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip if IP whitelist is disabled
    if (!this.config.ipWhitelist.enabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.extractClientIp(request);

    this.logger.debug(`Checking IP whitelist for: ${clientIp}`);

    const isWhitelisted = this.isIpWhitelisted(clientIp);

    if (!isWhitelisted) {
      this.logger.warn(`Blocked request from non-whitelisted IP: ${clientIp}`);
      throw new UnauthorizedException(
        `IP address ${clientIp} is not whitelisted`,
      );
    }

    this.logger.debug(`IP ${clientIp} is whitelisted`);
    return true;
  }

  private extractClientIp(request: Request): string {
    // Check X-Forwarded-For header (for proxied requests)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }

    // Check X-Real-IP header
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fallback to socket remote address
    return request.socket.remoteAddress || 'unknown';
  }

  private isIpWhitelisted(clientIp: string): boolean {
    const whitelist = this.config.ipWhitelist.addresses;

    // Check exact match
    if (whitelist.includes(clientIp)) {
      return true;
    }

    // Check CIDR ranges
    for (const entry of whitelist) {
      if (entry.includes('/') && this.isIpInCidr(clientIp, entry)) {
        return true;
      }
    }

    return false;
  }

  private isIpInCidr(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split('/');
    const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1);

    const ipNum = this.ipToNumber(ip);
    const rangeNum = this.ipToNumber(range);

    return (ipNum & mask) === (rangeNum & mask);
  }

  private ipToNumber(ip: string): number {
    return ip
      .split('.')
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
  }
}
```

#### 4.3.3. Security Configuration

```typescript
// packages/twenty-server/src/mkt-core/payment/config/security.config.ts

import { registerAs } from '@nestjs/config';

// SEPay known IP ranges (example - verify with SEPay support)
const SEPAY_IP_WHITELIST = [
  // Production IPs
  '103.146.20.0/24',
  '103.146.21.0/24',
  // Add more IPs as provided by SEPay
];

export const securityConfig = registerAs('paymentSecurity', () => ({
  ipWhitelist: {
    enabled: process.env.SEPAY_IP_WHITELIST_ENABLED === 'true',
    addresses: process.env.SEPAY_IP_WHITELIST
      ? process.env.SEPAY_IP_WHITELIST.split(',').map((ip) => ip.trim())
      : SEPAY_IP_WHITELIST,
  },
  rateLimit: {
    enabled: process.env.SEPAY_RATE_LIMIT_ENABLED !== 'false',
    maxRequests: parseInt(process.env.SEPAY_RATE_LIMIT_MAX || '100', 10),
    windowMs: parseInt(process.env.SEPAY_RATE_LIMIT_WINDOW_MS || '60000', 10),
  },
}));
```

#### 4.3.4. Controller Integration

```typescript
// Update to sepay-payment.controller.ts

import { IpWhitelistGuard } from '../guards/ip-whitelist.guard';

@Injectable()
@Controller()
export class SepayPaymentController {
  // ...

  @UseGuards(PublicEndpointGuard, IpWhitelistGuard)  // Add IpWhitelistGuard
  @Post('hooks/sepay-payment')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleSepayPayment(
    @Body() payload: SepayWebhookDto,
    @Req() request: SepayWebhookRequest,
    @Headers('authorization') authorization?: string,
  ): Promise<SepayWebhookResponse> {
    // ... existing implementation
  }
}
```

### 4.4. Environment Variables

```bash
# Enable IP whitelist (default: false for development)
SEPAY_IP_WHITELIST_ENABLED=true

# Comma-separated list of allowed IPs/CIDRs
SEPAY_IP_WHITELIST=103.146.20.0/24,103.146.21.0/24,1.2.3.4

# Rate limiting
SEPAY_RATE_LIMIT_ENABLED=true
SEPAY_RATE_LIMIT_MAX=100
SEPAY_RATE_LIMIT_WINDOW_MS=60000
```

### 4.5. Logging & Monitoring

```typescript
// Log format for blocked requests
{
  "timestamp": "2026-01-22T10:30:00.000Z",
  "level": "warn",
  "service": "IpWhitelistGuard",
  "event": "ip_blocked",
  "data": {
    "clientIp": "192.168.1.100",
    "endpoint": "/hooks/sepay-payment",
    "reason": "IP not whitelisted"
  }
}
```

---

## 5. Improvement 4: Transaction Support

### 5.1. Problem Statement

Hiện tại `MktPaymentWebhookService` không sử dụng database transaction, có thể dẫn đến data inconsistency khi:
- Payment được update nhưng Order update fail
- Webhook log không được update khi có lỗi

### 5.2. Proposed Solution

Implement transaction support sử dụng TypeORM QueryRunner pattern.

### 5.3. Technical Design

#### 5.3.1. Transaction Manager Service

```typescript
// packages/twenty-server/src/mkt-core/payment/services/payment-transaction.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';

export type TransactionCallback<T> = (queryRunner: QueryRunner) => Promise<T>;

@Injectable()
export class PaymentTransactionService {
  private readonly logger = new Logger(PaymentTransactionService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  /**
   * Execute operations within a database transaction
   */
  async executeInTransaction<T>(
    workspaceId: string,
    callback: TransactionCallback<T>,
  ): Promise<T> {
    const dataSource =
      await this.twentyORMGlobalManager.getDataSourceForWorkspace({
        workspaceId,
      });

    const queryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await callback(queryRunner);
      await queryRunner.commitTransaction();
      this.logger.debug('Transaction committed successfully');
      return result;
    } catch (error) {
      this.logger.error('Transaction failed, rolling back:', error);
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Execute operations with savepoint for nested transactions
   */
  async executeWithSavepoint<T>(
    queryRunner: QueryRunner,
    savepointName: string,
    callback: () => Promise<T>,
  ): Promise<T> {
    await queryRunner.query(`SAVEPOINT ${savepointName}`);

    try {
      const result = await callback();
      await queryRunner.query(`RELEASE SAVEPOINT ${savepointName}`);
      return result;
    } catch (error) {
      await queryRunner.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
      throw error;
    }
  }
}
```

#### 5.3.2. Updated Webhook Service

```typescript
// packages/twenty-server/src/mkt-core/payment/services/mkt-payment-webhook.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { QueryRunner } from 'typeorm';

import { PaymentTransactionService } from './payment-transaction.service';
import { MktPaymentWorkspaceEntity } from '../objects/mkt-payment.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktWebhookLogWorkspaceEntity } from '../objects/mkt-webhook-log.workspace-entity';

@Injectable()
export class MktPaymentWebhookService {
  private readonly logger = new Logger(MktPaymentWebhookService.name);

  constructor(
    private readonly transactionService: PaymentTransactionService,
    // ... other dependencies
  ) {}

  async processWebhookPayment(
    payload: SepayWebhookPayload,
    authContext: RequestSepayJWT,
    ipAddress?: string,
  ): Promise<SepayWebhookResponse> {
    const startTime = DateTimeUtils.now();
    const workspaceId = this.config.sepay.workspaceId;

    return this.transactionService.executeInTransaction(
      workspaceId,
      async (queryRunner: QueryRunner) => {
        // Step 1: Create webhook log (inside transaction)
        const webhookLog = await this.createWebhookLogWithRunner(
          queryRunner,
          payload,
          ipAddress,
        );

        try {
          // Step 2: Idempotency check
          const existingPayment = await this.findBySepayTransactionIdWithRunner(
            queryRunner,
            payload.id,
          );

          if (existingPayment) {
            await this.updateWebhookLogWithRunner(queryRunner, webhookLog.id, {
              status: 'SUCCESS',
              responseStatus: 200,
              responseBody: { status: 'ALREADY_PROCESSED' },
            });

            return {
              success: true,
              message: 'Already processed',
              data: { transactionId: payload.id, status: 'ALREADY_PROCESSED' },
            };
          }

          // Step 3-4: Find order
          const order = await this.findOrderByCodeWithRunner(
            queryRunner,
            payload.code,
          );

          if (!order) {
            await this.updateWebhookLogWithRunner(queryRunner, webhookLog.id, {
              status: 'SUCCESS',
              responseStatus: 200,
              responseBody: { status: 'UNMATCHED' },
            });

            return {
              success: true,
              message: 'Order not found',
              data: { transactionId: payload.id, status: 'UNMATCHED' },
            };
          }

          // Step 5-6: Find and update payment
          const payments = await this.findPaymentsByOrderIdWithRunner(
            queryRunner,
            order.id,
          );

          if (payments.length === 0) {
            await this.updateWebhookLogWithRunner(queryRunner, webhookLog.id, {
              status: 'SUCCESS',
              responseStatus: 200,
              responseBody: { status: 'NO_PAYMENT' },
              matchedOrderCode: order.orderCode,
            });

            return {
              success: true,
              message: 'No payment record',
              data: { transactionId: payload.id, status: 'NO_PAYMENT' },
            };
          }

          // Step 7: Update payment with transaction
          const [primaryPayment] = payments;
          await this.updatePaymentWithRunner(queryRunner, primaryPayment.id, {
            status: 'COMPLETED',
            paymentDate: payload.transactionDate,
            amount: payload.transferAmount,
            sepayTransactionId: String(payload.id),
          });

          // Step 8: Update order status
          await this.updateOrderStatusWithRunner(queryRunner, order.id, {
            status: ORDER_STATUS.CONFIRMED,
            accountingConfirmed: true,
          });

          // Step 9: Update webhook log
          const processingTimeMs = DateTimeUtils.diffInMillis(
            startTime,
            DateTimeUtils.now(),
          );

          await this.updateWebhookLogWithRunner(queryRunner, webhookLog.id, {
            status: 'SUCCESS',
            responseStatus: 200,
            responseBody: { status: 'MATCHED' },
            matchedOrderCode: order.orderCode,
            processingTimeMs,
          });

          this.logger.log(
            `Payment completed for order ${order.orderCode} in ${processingTimeMs}ms`,
          );

          return {
            success: true,
            message: 'Payment processed successfully',
            data: {
              transactionId: payload.id,
              matchedOrder: order.orderCode,
              status: 'MATCHED',
            },
          };
        } catch (error) {
          // Update webhook log to failed (will be rolled back if transaction fails)
          await this.updateWebhookLogWithRunner(queryRunner, webhookLog.id, {
            status: 'FAILED',
            responseStatus: 500,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });

          throw error;
        }
      },
    );
  }

  // Helper methods using QueryRunner
  private async createWebhookLogWithRunner(
    queryRunner: QueryRunner,
    payload: SepayWebhookPayload,
    ipAddress?: string,
  ): Promise<MktWebhookLogWorkspaceEntity> {
    const webhookLog = queryRunner.manager.create(MktWebhookLogWorkspaceEntity, {
      sepayTransactionId: payload.id,
      gateway: payload.gateway,
      requestBody: payload as unknown as object,
      ipAddress,
      status: 'PROCESSING',
    });

    return queryRunner.manager.save(webhookLog);
  }

  private async updatePaymentWithRunner(
    queryRunner: QueryRunner,
    paymentId: string,
    data: Partial<MktPaymentWorkspaceEntity>,
  ): Promise<void> {
    await queryRunner.manager.update(
      MktPaymentWorkspaceEntity,
      { id: paymentId },
      data,
    );
  }

  private async updateOrderStatusWithRunner(
    queryRunner: QueryRunner,
    orderId: string,
    data: Partial<MktOrderWorkspaceEntity>,
  ): Promise<void> {
    await queryRunner.manager.update(
      MktOrderWorkspaceEntity,
      { id: orderId },
      data,
    );
  }

  private async updateWebhookLogWithRunner(
    queryRunner: QueryRunner,
    webhookLogId: string,
    data: Partial<MktWebhookLogWorkspaceEntity>,
  ): Promise<void> {
    await queryRunner.manager.update(
      MktWebhookLogWorkspaceEntity,
      { id: webhookLogId },
      data,
    );
  }

  private async findBySepayTransactionIdWithRunner(
    queryRunner: QueryRunner,
    transactionId: number,
  ): Promise<MktPaymentWorkspaceEntity | null> {
    return queryRunner.manager.findOne(MktPaymentWorkspaceEntity, {
      where: { sepayTransactionId: String(transactionId) },
    });
  }

  private async findOrderByCodeWithRunner(
    queryRunner: QueryRunner,
    orderCode: string | null,
  ): Promise<MktOrderWorkspaceEntity | null> {
    if (!orderCode) return null;
    return queryRunner.manager.findOne(MktOrderWorkspaceEntity, {
      where: { orderCode },
    });
  }

  private async findPaymentsByOrderIdWithRunner(
    queryRunner: QueryRunner,
    orderId: string,
  ): Promise<MktPaymentWorkspaceEntity[]> {
    return queryRunner.manager.find(MktPaymentWorkspaceEntity, {
      where: { mktOrderId: orderId },
    });
  }
}
```

### 5.4. Benefits

| Aspect | Before | After |
|--------|--------|-------|
| Data Consistency | Partial updates possible | All-or-nothing |
| Error Recovery | Manual cleanup needed | Automatic rollback |
| Audit Trail | Inconsistent logs | Reliable logs |
| Debugging | Hard to trace failures | Clear transaction boundaries |

---

## 6. Improvement 5: Event Emission

### 6.1. Problem Statement

Hiện tại sau khi payment được xử lý thành công, không có cơ chế để notify các module khác (notifications, email, license activation, etc.).

### 6.2. Proposed Solution

Implement event-driven architecture sử dụng NestJS EventEmitter.

### 6.3. Technical Design

#### 6.3.1. Event Definitions

```typescript
// packages/twenty-server/src/mkt-core/payment/events/payment.events.ts

export const PAYMENT_EVENTS = {
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_PARTIAL: 'payment.partial',
  PAYMENT_OVERPAID: 'payment.overpaid',
  PAYMENT_FAILED: 'payment.failed',
  ORDER_CONFIRMED: 'order.confirmed',
} as const;

export type PaymentReceivedEvent = {
  paymentId: string;
  orderId: string;
  orderCode: string;
  amount: number;
  transactionId: string;
  gateway: string;
  transactionDate: string;
  workspaceId: string;
};

export type PaymentCompletedEvent = PaymentReceivedEvent & {
  totalPaidAmount: number;
  customerId?: string;
};

export type PaymentPartialEvent = PaymentReceivedEvent & {
  expectedAmount: number;
  totalPaidAmount: number;
  remainingAmount: number;
  percentagePaid: number;
};

export type PaymentOverpaidEvent = PaymentReceivedEvent & {
  expectedAmount: number;
  totalPaidAmount: number;
  overpaidAmount: number;
};

export type OrderConfirmedEvent = {
  orderId: string;
  orderCode: string;
  customerId?: string;
  totalAmount: number;
  workspaceId: string;
  confirmedAt: string;
};
```

#### 6.3.2. Event Emitter Service

```typescript
// packages/twenty-server/src/mkt-core/payment/services/payment-event.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  PAYMENT_EVENTS,
  PaymentCompletedEvent,
  PaymentPartialEvent,
  PaymentOverpaidEvent,
  OrderConfirmedEvent,
} from '../events/payment.events';

@Injectable()
export class PaymentEventService {
  private readonly logger = new Logger(PaymentEventService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  emitPaymentCompleted(event: PaymentCompletedEvent): void {
    this.logger.log(
      `Emitting ${PAYMENT_EVENTS.PAYMENT_COMPLETED} for order ${event.orderCode}`,
    );
    this.eventEmitter.emit(PAYMENT_EVENTS.PAYMENT_COMPLETED, event);
  }

  emitPaymentPartial(event: PaymentPartialEvent): void {
    this.logger.log(
      `Emitting ${PAYMENT_EVENTS.PAYMENT_PARTIAL} for order ${event.orderCode}`,
    );
    this.eventEmitter.emit(PAYMENT_EVENTS.PAYMENT_PARTIAL, event);
  }

  emitPaymentOverpaid(event: PaymentOverpaidEvent): void {
    this.logger.log(
      `Emitting ${PAYMENT_EVENTS.PAYMENT_OVERPAID} for order ${event.orderCode}`,
    );
    this.eventEmitter.emit(PAYMENT_EVENTS.PAYMENT_OVERPAID, event);
  }

  emitOrderConfirmed(event: OrderConfirmedEvent): void {
    this.logger.log(
      `Emitting ${PAYMENT_EVENTS.ORDER_CONFIRMED} for order ${event.orderCode}`,
    );
    this.eventEmitter.emit(PAYMENT_EVENTS.ORDER_CONFIRMED, event);
  }
}
```

#### 6.3.3. Event Listeners

```typescript
// packages/twenty-server/src/mkt-core/payment/listeners/payment-notification.listener.ts

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  PAYMENT_EVENTS,
  PaymentCompletedEvent,
  PaymentPartialEvent,
  PaymentOverpaidEvent,
} from '../events/payment.events';

@Injectable()
export class PaymentNotificationListener {
  private readonly logger = new Logger(PaymentNotificationListener.name);

  @OnEvent(PAYMENT_EVENTS.PAYMENT_COMPLETED)
  async handlePaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
    this.logger.log(`Processing notification for completed payment: ${event.orderCode}`);

    // TODO: Send email notification
    // TODO: Send push notification
    // TODO: Update CRM activity
  }

  @OnEvent(PAYMENT_EVENTS.PAYMENT_PARTIAL)
  async handlePaymentPartial(event: PaymentPartialEvent): Promise<void> {
    this.logger.log(`Processing notification for partial payment: ${event.orderCode}`);

    // TODO: Send reminder email for remaining amount
    // TODO: Create follow-up task
  }

  @OnEvent(PAYMENT_EVENTS.PAYMENT_OVERPAID)
  async handlePaymentOverpaid(event: PaymentOverpaidEvent): Promise<void> {
    this.logger.log(`Processing notification for overpayment: ${event.orderCode}`);

    // TODO: Create refund ticket
    // TODO: Notify finance team
  }
}
```

```typescript
// packages/twenty-server/src/mkt-core/license/listeners/license-activation.listener.ts

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { PAYMENT_EVENTS, OrderConfirmedEvent } from 'src/mkt-core/payment/events/payment.events';
import { MktLicenseService } from '../services/mkt-license.service';

@Injectable()
export class LicenseActivationListener {
  private readonly logger = new Logger(LicenseActivationListener.name);

  constructor(private readonly licenseService: MktLicenseService) {}

  @OnEvent(PAYMENT_EVENTS.ORDER_CONFIRMED)
  async handleOrderConfirmed(event: OrderConfirmedEvent): Promise<void> {
    this.logger.log(`Processing license activation for order: ${event.orderCode}`);

    try {
      // Activate licenses associated with the order
      await this.licenseService.activateLicensesForOrder(
        event.orderId,
        event.workspaceId,
      );

      this.logger.log(`Licenses activated for order ${event.orderCode}`);
    } catch (error) {
      this.logger.error(
        `Failed to activate licenses for order ${event.orderCode}:`,
        error,
      );
      // TODO: Add to retry queue
    }
  }
}
```

#### 6.3.4. Service Integration

```typescript
// Update to mkt-payment-webhook.service.ts

constructor(
  // ... existing dependencies
  private readonly paymentEventService: PaymentEventService,
) {}

// After successful payment processing:

// Emit events after transaction commit
if (amountAnalysis.status === 'EXACT') {
  this.paymentEventService.emitPaymentCompleted({
    paymentId: primaryPayment.id,
    orderId: order.id,
    orderCode: order.orderCode,
    amount: payload.transferAmount,
    transactionId: String(payload.id),
    gateway: payload.gateway,
    transactionDate: payload.transactionDate,
    workspaceId,
    totalPaidAmount: amountAnalysis.totalPaidAmount,
    customerId: order.mktCustomerId,
  });

  this.paymentEventService.emitOrderConfirmed({
    orderId: order.id,
    orderCode: order.orderCode,
    customerId: order.mktCustomerId,
    totalAmount: order.totalAmount ?? 0,
    workspaceId,
    confirmedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
  });
} else if (amountAnalysis.status === 'UNDERPAID') {
  this.paymentEventService.emitPaymentPartial({
    paymentId: primaryPayment.id,
    orderId: order.id,
    orderCode: order.orderCode,
    amount: payload.transferAmount,
    transactionId: String(payload.id),
    gateway: payload.gateway,
    transactionDate: payload.transactionDate,
    workspaceId,
    expectedAmount: amountAnalysis.expectedAmount,
    totalPaidAmount: amountAnalysis.totalPaidAmount,
    remainingAmount: amountAnalysis.remainingAmount,
    percentagePaid: amountAnalysis.percentagePaid,
  });
} else if (amountAnalysis.status === 'OVERPAID') {
  this.paymentEventService.emitPaymentOverpaid({
    paymentId: primaryPayment.id,
    orderId: order.id,
    orderCode: order.orderCode,
    amount: payload.transferAmount,
    transactionId: String(payload.id),
    gateway: payload.gateway,
    transactionDate: payload.transactionDate,
    workspaceId,
    expectedAmount: amountAnalysis.expectedAmount,
    totalPaidAmount: amountAnalysis.totalPaidAmount,
    overpaidAmount: amountAnalysis.overpaidAmount,
  });
}
```

#### 6.3.5. Module Configuration

```typescript
// packages/twenty-server/src/mkt-core/payment/mkt-payment.module.ts

import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    // ... other imports
  ],
  providers: [
    PaymentEventService,
    PaymentNotificationListener,
    // ... other providers
  ],
})
export class MktPaymentModule {}
```

---

## 7. Implementation Priority

### 7.1. Priority Matrix

| Improvement | Priority | Effort | Impact | Dependencies |
|-------------|----------|--------|--------|--------------|
| IP Whitelist | P0 - Critical | Low | High (Security) | None |
| Transaction Support | P0 - Critical | Medium | High (Data Integrity) | None |
| Order Code Parsing | P1 - High | Low | High (Order Matching) | None |
| Event Emission | P1 - High | Medium | High (Integration) | Transaction Support |
| Partial Payment | P2 - Medium | High | Medium | Transaction Support |

### 7.2. Implementation Phases

#### Phase 1: Security & Stability (Week 1-2)
- [ ] Implement IP Whitelist Guard
- [ ] Implement Transaction Support
- [ ] Add comprehensive logging
- [ ] Write unit tests

#### Phase 2: Order Matching (Week 2-3)
- [ ] Implement OrderCodeExtractor
- [ ] Add configuration for custom patterns
- [ ] Write unit tests
- [ ] Integration testing

#### Phase 3: Event System (Week 3-4)
- [ ] Define all event types
- [ ] Implement PaymentEventService
- [ ] Implement listeners for notifications
- [ ] Implement listeners for license activation
- [ ] Integration testing

#### Phase 4: Partial Payment (Week 4-5)
- [ ] Implement PaymentAmountAnalyzer
- [ ] Add new payment/order statuses
- [ ] Database migration
- [ ] Update webhook service
- [ ] End-to-end testing

### 7.3. Rollout Strategy

```yaml
Phase 1 - Development:
  - Feature flags: FEATURE_IP_WHITELIST=false
  - Test in sandbox environment
  - Code review and security audit

Phase 2 - Staging:
  - Enable features on staging
  - Load testing
  - Performance benchmarking

Phase 3 - Production (Gradual):
  - Enable IP Whitelist (P0)
  - Enable Transaction Support (P0)
  - Monitor for 1 week

Phase 4 - Production (Full):
  - Enable Order Code Parsing
  - Enable Event Emission
  - Enable Partial Payment (if needed)
```

---

## 8. Testing Strategy

### 8.1. Unit Tests

```typescript
// packages/twenty-server/src/mkt-core/payment/__tests__/order-code-extractor.spec.ts

describe('OrderCodeExtractor', () => {
  let extractor: OrderCodeExtractor;

  beforeEach(() => {
    extractor = new OrderCodeExtractor();
  });

  describe('extract', () => {
    it('should extract ORD pattern from content', () => {
      const result = extractor.extract('NGUYEN VAN A chuyen tien ORD20251221001');
      expect(result).toBe('ORD20251221001');
    });

    it('should extract DH pattern from content', () => {
      const result = extractor.extract('Thanh toan don hang DH123456789');
      expect(result).toBe('DH123456789');
    });

    it('should return null for content without order code', () => {
      const result = extractor.extract('Random transfer content');
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = extractor.extract(null as any);
      expect(result).toBeNull();
    });

    it('should handle case insensitivity', () => {
      const result = extractor.extract('payment for ord20251221001');
      expect(result).toBe('ORD20251221001');
    });
  });
});
```

```typescript
// packages/twenty-server/src/mkt-core/payment/__tests__/payment-amount-analyzer.spec.ts

describe('PaymentAmountAnalyzer', () => {
  let analyzer: PaymentAmountAnalyzer;

  beforeEach(() => {
    analyzer = new PaymentAmountAnalyzer();
  });

  describe('analyze', () => {
    it('should identify exact payment', () => {
      const result = analyzer.analyze(100000, 100000, 0);
      expect(result.status).toBe('EXACT');
      expect(result.remainingAmount).toBe(0);
    });

    it('should identify underpayment', () => {
      const result = analyzer.analyze(100000, 50000, 0);
      expect(result.status).toBe('UNDERPAID');
      expect(result.remainingAmount).toBe(50000);
      expect(result.percentagePaid).toBe(50);
    });

    it('should identify overpayment', () => {
      const result = analyzer.analyze(100000, 150000, 0);
      expect(result.status).toBe('OVERPAID');
      expect(result.overpaidAmount).toBe(50000);
    });

    it('should accumulate multiple payments', () => {
      const result = analyzer.analyze(100000, 50000, 50000);
      expect(result.status).toBe('EXACT');
      expect(result.totalPaidAmount).toBe(100000);
    });
  });
});
```

### 8.2. Integration Tests

```typescript
// packages/twenty-server/src/mkt-core/payment/__tests__/webhook-integration.spec.ts

describe('Webhook Integration', () => {
  let app: INestApplication;
  let webhookService: MktPaymentWebhookService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MktPaymentModule],
    }).compile();

    app = moduleRef.createNestApplication();
    webhookService = moduleRef.get(MktPaymentWebhookService);
    await app.init();
  });

  describe('processWebhookPayment', () => {
    it('should process valid webhook and update order', async () => {
      // Setup test data
      const order = await createTestOrder({ totalAmount: 100000 });
      const payment = await createTestPayment({ orderId: order.id });

      // Process webhook
      const result = await webhookService.processWebhookPayment(
        createWebhookPayload({
          id: 12345,
          code: order.orderCode,
          transferAmount: 100000,
        }),
        createAuthContext(),
      );

      // Verify
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('MATCHED');

      const updatedOrder = await findOrder(order.id);
      expect(updatedOrder.status).toBe('CONFIRMED');
    });

    it('should handle duplicate webhook (idempotency)', async () => {
      const order = await createTestOrder();
      const payment = await createTestPayment({
        orderId: order.id,
        sepayTransactionId: '99999',
      });

      const result = await webhookService.processWebhookPayment(
        createWebhookPayload({ id: 99999, code: order.orderCode }),
        createAuthContext(),
      );

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('ALREADY_PROCESSED');
    });

    it('should rollback on error', async () => {
      // Test that partial failures are rolled back
      // ...
    });
  });
});
```

### 8.3. E2E Tests

```bash
# Test webhook endpoint with valid payload
curl -X POST http://localhost:3000/hooks/sepay-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Apikey test-api-key" \
  -d '{
    "id": 12345,
    "gateway": "MBBank",
    "transactionDate": "2026-01-22 10:30:00",
    "accountNumber": "0903252427",
    "code": "ORD20260122001",
    "content": "Thanh toan ORD20260122001",
    "transferType": "in",
    "transferAmount": 100000,
    "accumulated": 1000000,
    "referenceCode": "MBVCB.123456"
  }'

# Expected response
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "transactionId": 12345,
    "matchedOrder": "ORD20260122001",
    "status": "MATCHED"
  }
}
```

---

## Appendix

### A. Environment Variables Summary

```bash
# Order Code Parsing
ENABLE_ORDER_CODE_PARSING=true
ORDER_CODE_PATTERN_ORD=ORD\\d{8,14}
ORDER_CODE_PATTERN_CUSTOM=

# Partial Payment
PARTIAL_PAYMENT_ENABLED=true
PARTIAL_PAYMENT_THRESHOLD=0.95

# IP Whitelist
SEPAY_IP_WHITELIST_ENABLED=true
SEPAY_IP_WHITELIST=103.146.20.0/24,103.146.21.0/24

# Rate Limiting
SEPAY_RATE_LIMIT_ENABLED=true
SEPAY_RATE_LIMIT_MAX=100
SEPAY_RATE_LIMIT_WINDOW_MS=60000
```

### B. Database Migrations

```sql
-- Migration 001: Add paidAmount to mktOrder
ALTER TABLE "mktOrder"
ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(20,2) DEFAULT 0;

-- Migration 002: Add indexes for performance
CREATE INDEX IF NOT EXISTS "idx_mktPayment_status" ON "mktPayment" ("status");
CREATE INDEX IF NOT EXISTS "idx_mktPayment_mktOrderId" ON "mktPayment" ("mktOrderId");
CREATE INDEX IF NOT EXISTS "idx_mktWebhookLog_sepayTransactionId" ON "mktWebhookLog" ("sepayTransactionId");
```

### C. Monitoring Alerts

```yaml
alerts:
  - name: HighWebhookFailureRate
    expr: rate(payment_webhook_failed_total[5m]) > 0.1
    severity: critical

  - name: SlowWebhookProcessing
    expr: payment_webhook_duration_seconds > 5
    severity: warning

  - name: IpBlockedSpike
    expr: increase(payment_ip_blocked_total[10m]) > 50
    severity: warning
```

---

*Document Version: 1.0.0 | Last Updated: 22/01/2026*
