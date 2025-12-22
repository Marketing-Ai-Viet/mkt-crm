# Tài Liệu Triển Khai Refactor Payment Module

## Thông Tin Tài Liệu

| Thuộc tính | Giá trị |
|------------|---------|
| Phiên bản | 1.0.0 |
| Ngày tạo | 21/12/2025 |
| Module | `packages/twenty-server/src/mkt-core/payment/` |
| Tham chiếu | `sepay-payment-design.md`, `sepay-payment-evaluation.md` |

---

## 1. Mục Tiêu Refactor

### 1.1. Mục Tiêu Chính

1. **Loại bỏ Pre-Query Hooks**: Không sử dụng hooks để tạo và update payment, chuyển sang service-based approach
2. **Tuân thủ Coding Standards**: Áp dụng `MoneyUtils`, `DateTimeUtils`, `TwentyConfigService`
3. **Bổ sung tính năng thiếu**: Idempotency, webhook logging, amount validation
4. **Tích hợp BullMQ**: Async payment processing thay vì sync
5. **Cải thiện bảo mật**: IP whitelist, rate limiting

### 1.2. Scope

| Trong phạm vi | Ngoài phạm vi |
|---------------|---------------|
| Refactor services | Frontend changes |
| Loại bỏ hooks | Database migration |
| Thêm BullMQ jobs | Firebase integration redesign |
| Webhook improvements | New payment gateways |
| Unit tests | E2E tests |

---

## 2. Cấu Trúc Module Mới

### 2.1. Cấu Trúc Thư Mục Sau Refactor

```
payment/
├── constants/
│   ├── index.ts
│   ├── payment-status.constants.ts
│   ├── payment-method.constants.ts      # NEW: Magic strings → constants
│   └── payment-config.constants.ts      # NEW: Config keys
├── dto/
│   ├── index.ts
│   ├── sepay-webhook-payload.dto.ts     # NEW: Validated webhook DTO
│   ├── create-payment.dto.ts            # NEW: Create payment input
│   └── update-payment.dto.ts            # NEW: Update payment input
├── entities/
│   └── webhook-log.entity.ts            # NEW: Webhook logging entity
├── exceptions/
│   ├── index.ts
│   ├── payment.exceptions.ts            # NEW: Custom exceptions
│   └── webhook.exceptions.ts            # NEW: Webhook exceptions
├── guards/
│   ├── sepay-auth.guard.ts
│   └── ip-whitelist.guard.ts            # NEW: IP whitelist
├── integration/
│   └── firebase-integration.service.ts
├── jobs/                                 # NEW: BullMQ jobs
│   ├── payment-processing.job.ts
│   ├── webhook-processing.job.ts
│   └── payment-reconciliation.job.ts
├── objects/
│   ├── mkt-payment.workspace-entity.ts
│   ├── mkt-payment-history.workspace-entity.ts
│   └── mkt-webhook-log.workspace-entity.ts  # NEW
├── sepay-payment/
│   └── sepay-payment.controller.ts
├── services/
│   ├── mkt-payment.service.ts           # REFACTOR: Main service
│   ├── mkt-payment-create.service.ts    # NEW: Replace create hook
│   ├── mkt-payment-update.service.ts    # NEW: Replace update hook
│   ├── mkt-payment-listener.service.ts
│   ├── mkt-qr-generation.service.ts     # NEW: Centralized QR logic
│   ├── mkt-webhook.service.ts           # NEW: Webhook processing
│   └── mkt-webhook-log.service.ts       # NEW: Webhook logging
├── types/
│   ├── index.ts
│   ├── bidv-sepay.types.ts
│   └── payment.types.ts                 # NEW: Consolidated types
├── mkt-payment.module.ts
└── mkt-payment.workspace-entity.ts

# DELETED:
# ├── hooks/                              # REMOVED
# │   ├── mkt-payment-create-one.pre-query.hook.ts
# │   └── mkt-payment-update-one.pre-query.hook.ts
# ├── middleware/                         # REMOVED (unused)
# │   └── apikey-to-bearer.middleware.ts
```

---

## 3. Chi Tiết Triển Khai

### Phase 1: Foundation (Ngày 1-2)

#### Task 1.1: Tạo Constants và Config

**File: `constants/payment-config.constants.ts`**

```typescript
// packages/twenty-server/src/mkt-core/payment/constants/payment-config.constants.ts

export const PAYMENT_CONFIG_KEYS = {
  // SEPay
  SEPAY_ACC: 'SEPAY_ACC',
  SEPAY_BANK: 'SEPAY_BANK',
  SEPAY_VA: 'SEPAY_VA',
  SEPAY_WORKSPACE_ID: 'SEPAY_WORKSPACE_ID',
  SEPAY_WEBHOOK_API_KEY: 'SEPAY_WEBHOOK_API_KEY',
  SEPAY_AUTH_ENABLED: 'SEPAY_AUTH_ENABLED',
  
  // BIDV
  IS_BIDV_BUSINESS: 'IS_BIDV_BUSINESS',
  BIDV_SEPAY_API_URL: 'BIDV_SEPAY_API_URL',
  BIDV_SEPAY_AUTH_TOKEN: 'BIDV_SEPAY_AUTH_TOKEN',
  
  // Firebase
  FIREBASE_KEY: 'FIREBASE_KEY',
  FIREBASE_DB_URL: 'FIREBASE_DB_URL',
  FIREBASE_AUTH_URL: 'FIREBASE_AUTH_URL',
  
  // Server
  SERVER_URL: 'SERVER_URL',
  MKT_WORKSPACE_ID: 'MKT_WORKSPACE_ID',
} as const;

export type PaymentConfigKey = typeof PAYMENT_CONFIG_KEYS[keyof typeof PAYMENT_CONFIG_KEYS];
```

**File: `constants/payment-method.constants.ts`**

```typescript
// packages/twenty-server/src/mkt-core/payment/constants/payment-method.constants.ts

export const PAYMENT_METHOD_NAMES = {
  SEPAY_QR: 'SEPay QR',
  BIDV_TRANSFER: 'BIDV Transfer',
  BANK_TRANSFER: 'Bank Transfer',
  CASH: 'Cash',
} as const;

export type PaymentMethodName = typeof PAYMENT_METHOD_NAMES[keyof typeof PAYMENT_METHOD_NAMES];
```

---

#### Task 1.2: Tạo DTO với Validation

**File: `dto/sepay-webhook-payload.dto.ts`**

```typescript
// packages/twenty-server/src/mkt-core/payment/dto/sepay-webhook-payload.dto.ts

import { IsString, IsNumber, IsOptional, Min, IsNotEmpty } from 'class-validator';

export class SepayWebhookPayloadDto {
  @IsNumber()
  id: number;

  @IsString()
  @IsNotEmpty()
  gateway: string;

  @IsString()
  @IsNotEmpty()
  transactionDate: string;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsString()
  @IsOptional()
  subAccount: string | null;

  @IsString()
  @IsOptional()
  code: string | null;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  transferType: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsNumber()
  @Min(0)
  transferAmount: number;

  @IsString()
  @IsOptional()
  referenceCode: string;

  @IsNumber()
  accumulated: number;
}
```

**File: `dto/create-payment.dto.ts`**

```typescript
// packages/twenty-server/src/mkt-core/payment/dto/create-payment.dto.ts

import { IsString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsUUID()
  mktOrderId: string;

  @IsUUID()
  @IsOptional()
  mktPaymentMethodId?: string;

  @IsNumber()
  @IsOptional()
  duration?: number;
}
```

---

#### Task 1.3: Tạo Custom Exceptions

**File: `exceptions/payment.exceptions.ts`**

```typescript
// packages/twenty-server/src/mkt-core/payment/exceptions/payment.exceptions.ts

import { HttpException, HttpStatus } from '@nestjs/common';

export class PaymentNotFoundException extends HttpException {
  constructor(paymentId: string) {
    super(
      {
        code: 'PAY001',
        message: `Payment with ID ${paymentId} not found`,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class PaymentAmountMismatchException extends HttpException {
  constructor(expected: number, received: number) {
    super(
      {
        code: 'PAY004',
        message: `Amount mismatch: expected ${expected}, received ${received}`,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class DuplicateTransactionException extends HttpException {
  constructor(transactionId: number) {
    super(
      {
        code: 'PAY002',
        message: `Transaction ${transactionId} already processed`,
      },
      HttpStatus.OK, // Return 200 for idempotency
    );
  }
}

export class OrderNotFoundException extends HttpException {
  constructor(orderCode: string) {
    super(
      {
        code: 'PAY003',
        message: `Order with code ${orderCode} not found`,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class QrGenerationException extends HttpException {
  constructor(message: string) {
    super(
      {
        code: 'PAY007',
        message: `QR generation failed: ${message}`,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
```

---

### Phase 2: Services Refactor (Ngày 3-5)

#### Task 2.1: Tạo QR Generation Service (Thay thế logic trong hooks)

**File: `services/mkt-qr-generation.service.ts`**

```typescript
// packages/twenty-server/src/mkt-core/payment/services/mkt-qr-generation.service.ts

import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/mkt-payment-method.workspace-entity';
import { PAYMENT_CONFIG_KEYS } from '../constants/payment-config.constants';
import { PAYMENT_METHOD_NAMES } from '../constants/payment-method.constants';
import { BidvSepayApiResponse, BidvSepayOrderRequest } from '../types/bidv-sepay.types';
import { QrGenerationException } from '../exceptions/payment.exceptions';

export type QrGenerationResult = {
  qrCodeUrl: string;
  expiredAt: string | null;
};

export type QrGenerationParams = {
  paymentMethod: MktPaymentMethodWorkspaceEntity;
  amount: number;
  orderCode: string;
};

@Injectable()
export class MktQrGenerationService {
  private readonly logger = new Logger(MktQrGenerationService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: TwentyConfigService,
  ) {}

  /**
   * Tạo QR code thanh toán dựa trên payment method
   */
  async generateQrCode(params: QrGenerationParams): Promise<QrGenerationResult> {
    const { paymentMethod, amount, orderCode } = params;

    // Validate amount với MoneyUtils
    const validAmount = MoneyUtils.fromSafe(amount);
    if (validAmount.lte(0)) {
      this.logger.warn('Invalid amount for QR code generation');
      return { qrCodeUrl: '', expiredAt: null };
    }

    // Check payment method type
    if (paymentMethod?.name !== PAYMENT_METHOD_NAMES.SEPAY_QR) {
      return { qrCodeUrl: '', expiredAt: null };
    }

    // Check if BIDV business mode
    const isBidvBusiness = this.configService.get(PAYMENT_CONFIG_KEYS.IS_BIDV_BUSINESS) === 'true';

    if (isBidvBusiness) {
      return this.generateBidvQr(validAmount.toNumber(), orderCode);
    }

    return this.generateSepayQr(validAmount.toNumber(), orderCode);
  }

  /**
   * Tạo SEPay QR code URL
   */
  private async generateSepayQr(amount: number, orderCode: string): Promise<QrGenerationResult> {
    const result: QrGenerationResult = { qrCodeUrl: '', expiredAt: null };

    try {
      const sepayAcc = this.configService.get(PAYMENT_CONFIG_KEYS.SEPAY_ACC);
      const sepayBank = this.configService.get(PAYMENT_CONFIG_KEYS.SEPAY_BANK);
      const sepayVa = this.configService.get(PAYMENT_CONFIG_KEYS.SEPAY_VA) || '';

      if (!sepayAcc || !sepayBank) {
        this.logger.warn('SEPAY_ACC or SEPAY_BANK not configured');
        return result;
      }

      if (!orderCode) {
        this.logger.warn('No order code provided');
        return result;
      }

      // Sử dụng MoneyUtils để đảm bảo amount là số nguyên
      const roundedAmount = MoneyUtils.round(amount, 0).toNumber();

      const qrCodeUrl = `https://qr.sepay.vn/img?acc=${sepayAcc}&bank=${sepayBank}&amount=${roundedAmount}&des=${sepayVa}${orderCode}&template=qronly&download=false`;

      this.logger.log(`Generated SEPay QR for order ${orderCode} with amount ${roundedAmount}`);

      return { qrCodeUrl, expiredAt: null };
    } catch (error) {
      this.logger.error('Error generating SEPay QR:', error);
      return result;
    }
  }

  /**
   * Tạo BIDV Virtual Account QR code
   */
  private async generateBidvQr(amount: number, orderCode: string): Promise<QrGenerationResult> {
    const result: QrGenerationResult = { qrCodeUrl: '', expiredAt: null };

    try {
      const bidvApiUrl = this.configService.get(PAYMENT_CONFIG_KEYS.BIDV_SEPAY_API_URL);
      const bidvAuthToken = this.configService.get(PAYMENT_CONFIG_KEYS.BIDV_SEPAY_AUTH_TOKEN);

      if (!bidvApiUrl || !bidvAuthToken) {
        this.logger.warn('BIDV SEPay API not configured');
        return result;
      }

      if (!orderCode) {
        this.logger.warn('No order code for BIDV payment');
        return result;
      }

      const roundedAmount = MoneyUtils.round(amount, 0).toNumber();

      const requestData: BidvSepayOrderRequest = {
        amount: roundedAmount,
        order_code: orderCode,
        duration: 300, // 5 phút
        with_qrcode: true,
      };

      const response = await firstValueFrom(
        this.httpService.post<BidvSepayApiResponse>(bidvApiUrl, requestData, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${bidvAuthToken}`,
          },
          timeout: 10000, // 10 second timeout
        }),
      );

      if (response.data.status === 'success' && response.data.data) {
        const { qr_code_url, qr_code, expired_at } = response.data.data;

        this.logger.log(`Generated BIDV QR for order ${orderCode}`);

        return {
          qrCodeUrl: qr_code_url || qr_code || '',
          expiredAt: expired_at || null,
        };
      }

      this.logger.error(`BIDV API error: ${response.data.message}`);
      return result;
    } catch (error) {
      this.logger.error('Error calling BIDV API:', error);
      return result;
    }
  }
}
```

---

#### Task 2.2: Tạo Payment Create Service (Thay thế Pre-Query Hook)

**File: `services/mkt-payment-create.service.ts`**

```typescript
// packages/twenty-server/src/mkt-core/payment/services/mkt-payment-create.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { omitBy, isUndefined } from 'lodash';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktPaymentWorkspaceEntity } from '../mkt-payment.workspace-entity';
import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/mkt-payment-method.workspace-entity';
import { MktQrGenerationService } from './mkt-qr-generation.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';

export type CreatePaymentResult = {
  payment: MktPaymentWorkspaceEntity;
  qrCodeUrl: string | null;
};

@Injectable()
export class MktPaymentCreateService {
  private readonly logger = new Logger(MktPaymentCreateService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly qrGenerationService: MktQrGenerationService,
  ) {}

  /**
   * Tạo payment với auto-fill từ order và generate QR code
   * Thay thế logic trong mkt-payment-create-one.pre-query.hook.ts
   */
  async createPayment(
    workspaceId: string,
    dto: CreatePaymentDto,
    createdBy?: {
      source: string | null;
      workspaceMemberId: string | null;
      name: string | null;
    },
  ): Promise<CreatePaymentResult> {
    const paymentRepo = await this.getPaymentRepository(workspaceId);
    const orderRepo = await this.getOrderRepository(workspaceId);
    const paymentMethodRepo = await this.getPaymentMethodRepository(workspaceId);

    // Lấy order để auto-fill data
    const order = await orderRepo.findOne({
      where: { id: dto.mktOrderId },
    });

    if (!order) {
      this.logger.warn(`Order not found: ${dto.mktOrderId}`);
      throw new Error(`Order not found: ${dto.mktOrderId}`);
    }

    // Auto-fill từ order nếu không có trong DTO
    const amount = MoneyUtils.fromSafe(dto.amount ?? order.totalAmount).toNumber();
    const currency = dto.currency || order.currency || 'VND';
    const name = dto.name || this.generatePaymentName(order);

    // Lấy payment method để generate QR
    let qrCodeUrl: string | null = null;
    let expiredAt: string | null = null;

    if (dto.mktPaymentMethodId) {
      const paymentMethod = await paymentMethodRepo.findOne({
        where: { id: dto.mktPaymentMethodId },
      });

      if (paymentMethod && order.orderCode) {
        const qrResult = await this.qrGenerationService.generateQrCode({
          paymentMethod,
          amount,
          orderCode: order.orderCode,
        });
        qrCodeUrl = qrResult.qrCodeUrl || null;
        expiredAt = qrResult.expiredAt;
      }
    }

    // Tạo payment entity
    const paymentData = omitBy(
      {
        name,
        amount,
        currency,
        mktOrderId: dto.mktOrderId,
        mktPaymentMethodId: dto.mktPaymentMethodId,
        duration: dto.duration,
        qrCodeUrl,
        expiredAt,
        createdBy,
      },
      isUndefined,
    );

    const payment = paymentRepo.create(paymentData as Partial<MktPaymentWorkspaceEntity>);
    const savedPayment = await paymentRepo.save(payment);

    this.logger.log(`Created payment ${savedPayment.id} for order ${dto.mktOrderId}`);

    return {
      payment: savedPayment,
      qrCodeUrl,
    };
  }

  /**
   * Tạo payment name từ order
   */
  private generatePaymentName(order: MktOrderWorkspaceEntity): string {
    const orderCode = order.orderCode || '';
    const orderName = order.name || '';

    if (orderCode && orderName) {
      return `${orderCode}-${orderName}`;
    }

    return orderCode || orderName || 'Payment';
  }

  private async getPaymentRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPaymentWorkspaceEntity>(
      workspaceId,
      'mktPayment',
      { shouldBypassPermissionChecks: true },
    );
  }

  private async getOrderRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrderWorkspaceEntity>(
      workspaceId,
      'mktOrder',
      { shouldBypassPermissionChecks: true },
    );
  }

  private async getPaymentMethodRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPaymentMethodWorkspaceEntity>(
      workspaceId,
      'mktPaymentMethod',
      { shouldBypassPermissionChecks: true },
    );
  }
}
```

---

#### Task 2.3: Tạo Payment Update Service (Thay thế Pre-Query Hook)

**File: `services/mkt-payment-update.service.ts`**

```typescript
// packages/twenty-server/src/mkt-core/payment/services/mkt-payment-update.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { omitBy, isUndefined } from 'lodash';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import { MktPaymentWorkspaceEntity } from '../mkt-payment.workspace-entity';
import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/mkt-payment-method.workspace-entity';
import { MktQrGenerationService } from './mkt-qr-generation.service';
import { PAYMENT_METHOD_NAMES } from '../constants/payment-method.constants';
import { UpdatePaymentDto } from '../dto/update-payment.dto';
import { PaymentNotFoundException } from '../exceptions/payment.exceptions';

@Injectable()
export class MktPaymentUpdateService {
  private readonly logger = new Logger(MktPaymentUpdateService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly qrGenerationService: MktQrGenerationService,
  ) {}

  /**
   * Update payment với QR code regeneration khi cần
   * Thay thế logic trong mkt-payment-update-one.pre-query.hook.ts
   */
  async updatePayment(
    workspaceId: string,
    paymentId: string,
    dto: UpdatePaymentDto,
  ): Promise<MktPaymentWorkspaceEntity> {
    const paymentRepo = await this.getPaymentRepository(workspaceId);
    const paymentMethodRepo = await this.getPaymentMethodRepository(workspaceId);

    // Lấy current payment với relations
    const currentPayment = await paymentRepo.findOne({
      where: { id: paymentId },
      relations: ['mktPaymentMethod', 'mktOrder'],
    });

    if (!currentPayment) {
      throw new PaymentNotFoundException(paymentId);
    }

    // Chuẩn bị update data
    const updateData: Partial<MktPaymentWorkspaceEntity> = omitBy(dto, isUndefined);

    // Xử lý QR code regeneration
    await this.handleQrCodeUpdate(
      currentPayment,
      updateData,
      paymentMethodRepo,
    );

    // Update payment
    await paymentRepo.update(paymentId, updateData);

    const updatedPayment = await paymentRepo.findOne({
      where: { id: paymentId },
    });

    this.logger.log(`Updated payment ${paymentId}`);

    return updatedPayment!;
  }

  /**
   * Xử lý regenerate QR code khi payment method hoặc amount thay đổi
   */
  private async handleQrCodeUpdate(
    currentPayment: MktPaymentWorkspaceEntity,
    updateData: Partial<MktPaymentWorkspaceEntity>,
    paymentMethodRepo: any,
  ): Promise<void> {
    const newPaymentMethodId = updateData.mktPaymentMethodId;
    const currentPaymentMethodId = currentPayment.mktPaymentMethodId;

    // Case 1: Payment method thay đổi
    if (newPaymentMethodId && newPaymentMethodId !== currentPaymentMethodId) {
      const newPaymentMethod = await paymentMethodRepo.findOne({
        where: { id: newPaymentMethodId },
      });

      if (newPaymentMethod) {
        if (newPaymentMethod.name === PAYMENT_METHOD_NAMES.SEPAY_QR) {
          // Generate new QR
          const orderCode = currentPayment.mktOrder?.orderCode;
          const amount = MoneyUtils.fromSafe(
            updateData.amount ?? currentPayment.amount,
          ).toNumber();

          if (orderCode && amount > 0) {
            const qrResult = await this.qrGenerationService.generateQrCode({
              paymentMethod: newPaymentMethod,
              amount,
              orderCode,
            });
            updateData.qrCodeUrl = qrResult.qrCodeUrl || undefined;
          }
        } else {
          // Clear QR for non-SEPay methods
          updateData.qrCodeUrl = undefined;
        }
      }
      return;
    }

    // Case 2: Amount thay đổi với SEPay payment method
    const isCurrentMethodSepay =
      currentPayment.mktPaymentMethod?.name === PAYMENT_METHOD_NAMES.SEPAY_QR;
    const isAmountChanged =
      updateData.amount !== undefined && updateData.amount !== currentPayment.amount;

    if (isCurrentMethodSepay && isAmountChanged) {
      const orderCode = currentPayment.mktOrder?.orderCode;
      const newAmount = MoneyUtils.fromSafe(updateData.amount).toNumber();

      if (orderCode && newAmount > 0) {
        const qrResult = await this.qrGenerationService.generateQrCode({
          paymentMethod: currentPayment.mktPaymentMethod,
          amount: newAmount,
          orderCode,
        });
        updateData.qrCodeUrl = qrResult.qrCodeUrl || undefined;
        this.logger.log(`Regenerated QR for amount change: ${newAmount}`);
      }
    }
  }

  private async getPaymentRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPaymentWorkspaceEntity>(
      workspaceId,
      'mktPayment',
      { shouldBypassPermissionChecks: true },
    );
  }

  private async getPaymentMethodRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPaymentMethodWorkspaceEntity>(
      workspaceId,
      'mktPaymentMethod',
      { shouldBypassPermissionChecks: true },
    );
  }
}
```

---

### Phase 3: Webhook & BullMQ (Ngày 6-8)

#### Task 3.1: Tạo Webhook Log Entity

**File: `objects/mkt-webhook-log.workspace-entity.ts`**

```typescript
// packages/twenty-server/src/mkt-core/payment/objects/mkt-webhook-log.workspace-entity.ts

import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceFieldIndex } from 'src/engine/twenty-orm/decorators/workspace-field-index.decorator';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MKT_WEBHOOK_LOG_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktWebhookLog,
  namePlural: 'mktWebhookLogs',
  labelSingular: msg`Webhook Log`,
  labelPlural: msg`Webhook Logs`,
  description: msg`Logs for payment webhook requests`,
  icon: 'IconWebhook',
})
export class MktWebhookLogWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_WEBHOOK_LOG_FIELD_IDS.sepayTransactionId,
    type: FieldMetadataType.NUMBER,
    label: msg`SEPay Transaction ID`,
    description: msg`Transaction ID from SEPay`,
    icon: 'IconHash',
  })
  @WorkspaceFieldIndex()
  sepayTransactionId: number;

  @WorkspaceField({
    standardId: MKT_WEBHOOK_LOG_FIELD_IDS.gateway,
    type: FieldMetadataType.TEXT,
    label: msg`Gateway`,
    description: msg`Payment gateway name`,
    icon: 'IconBuildingBank',
  })
  @WorkspaceIsNullable()
  gateway: string;

  @WorkspaceField({
    standardId: MKT_WEBHOOK_LOG_FIELD_IDS.orderCode,
    type: FieldMetadataType.TEXT,
    label: msg`Order Code`,
    description: msg`Matched order code`,
    icon: 'IconReceipt',
  })
  @WorkspaceIsNullable()
  @WorkspaceFieldIndex()
  orderCode: string;

  @WorkspaceField({
    standardId: MKT_WEBHOOK_LOG_FIELD_IDS.amount,
    type: FieldMetadataType.NUMBER,
    label: msg`Amount`,
    description: msg`Transaction amount`,
    icon: 'IconCash',
  })
  @WorkspaceIsNullable()
  amount: number;

  @WorkspaceField({
    standardId: MKT_WEBHOOK_LOG_FIELD_IDS.status,
    type: FieldMetadataType.SELECT,
    label: msg`Status`,
    description: msg`Processing status`,
    icon: 'IconStatusChange',
    options: [
      { value: 'RECEIVED', label: 'Received', color: 'blue', position: 0 },
      { value: 'PROCESSING', label: 'Processing', color: 'yellow', position: 1 },
      { value: 'MATCHED', label: 'Matched', color: 'green', position: 2 },
      { value: 'UNMATCHED', label: 'Unmatched', color: 'orange', position: 3 },
      { value: 'AMOUNT_MISMATCH', label: 'Amount Mismatch', color: 'red', position: 4 },
      { value: 'FAILED', label: 'Failed', color: 'red', position: 5 },
      { value: 'DUPLICATE', label: 'Duplicate', color: 'gray', position: 6 },
    ],
    defaultValue: "'RECEIVED'",
  })
  status: string;

  @WorkspaceField({
    standardId: MKT_WEBHOOK_LOG_FIELD_IDS.requestBody,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Request Body`,
    description: msg`Raw webhook request body`,
    icon: 'IconCode',
  })
  @WorkspaceIsNullable()
  requestBody: JSON;

  @WorkspaceField({
    standardId: MKT_WEBHOOK_LOG_FIELD_IDS.responseBody,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Response Body`,
    description: msg`Response sent back`,
    icon: 'IconCode',
  })
  @WorkspaceIsNullable()
  responseBody: JSON;

  @WorkspaceField({
    standardId: MKT_WEBHOOK_LOG_FIELD_IDS.processingTimeMs,
    type: FieldMetadataType.NUMBER,
    label: msg`Processing Time (ms)`,
    description: msg`Time taken to process webhook`,
    icon: 'IconClock',
  })
  @WorkspaceIsNullable()
  processingTimeMs: number;

  @WorkspaceField({
    standardId: MKT_WEBHOOK_LOG_FIELD_IDS.ipAddress,
    type: FieldMetadataType.TEXT,
    label: msg`IP Address`,
    description: msg`Source IP address`,
    icon: 'IconNetwork',
  })
  @WorkspaceIsNullable()
  ipAddress: string;

  @WorkspaceField({
    standardId: MKT_WEBHOOK_LOG_FIELD_IDS.errorMessage,
    type: FieldMetadataType.TEXT,
    label: msg`Error Message`,
    description: msg`Error message if failed`,
    icon: 'IconAlertCircle',
  })
  @WorkspaceIsNullable()
  errorMessage: string;
}
```

---

#### Task 3.2: Tạo Webhook Processing Job (BullMQ)

**File: `jobs/webhook-processing.job.ts`**

```typescript
// packages/twenty-server/src/mkt-core/payment/jobs/webhook-processing.job.ts

import { Logger } from '@nestjs/common';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonStringify } from 'src/mkt-core/utils/json.util';
import { MKT_PAYMENT_STATUS } from 'src/mkt-core/seeder/constants/mkt-payment-data-seeds.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktPaymentWorkspaceEntity } from '../mkt-payment.workspace-entity';
import { MktWebhookLogWorkspaceEntity } from '../objects/mkt-webhook-log.workspace-entity';
import { FireBaseIntegrationService } from '../integration/firebase-integration.service';
import { SepayWebhookPayloadDto } from '../dto/sepay-webhook-payload.dto';

export type WebhookProcessingJobData = {
  workspaceId: string;
  payload: SepayWebhookPayloadDto;
  webhookLogId: string;
  startTime: number;
};

@Processor(MessageQueue.webhookQueue)
export class WebhookProcessingJob {
  private readonly logger = new Logger(WebhookProcessingJob.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly firebaseService: FireBaseIntegrationService,
  ) {}

  @Process(WebhookProcessingJob.name)
  async handle(data: WebhookProcessingJobData): Promise<void> {
    const { workspaceId, payload, webhookLogId, startTime } = data;

    this.logger.log(`Processing webhook for transaction ${payload.id}`);

    const webhookLogRepo = await this.getWebhookLogRepository(workspaceId);
    const orderRepo = await this.getOrderRepository(workspaceId);
    const paymentRepo = await this.getPaymentRepository(workspaceId);

    try {
      // Update status to PROCESSING
      await webhookLogRepo.update(webhookLogId, { status: 'PROCESSING' });

      // Tìm order theo code
      const orderCode = payload.code || this.extractOrderCode(payload.content);
      if (!orderCode) {
        await this.updateWebhookLogFailed(
          webhookLogRepo,
          webhookLogId,
          'UNMATCHED',
          'Could not extract order code',
          startTime,
        );
        return;
      }

      const order = await orderRepo.findOne({
        where: { orderCode },
      });

      if (!order) {
        await this.updateWebhookLogFailed(
          webhookLogRepo,
          webhookLogId,
          'UNMATCHED',
          `Order ${orderCode} not found`,
          startTime,
        );
        return;
      }

      // Validate amount
      const webhookAmount = MoneyUtils.fromSafe(payload.transferAmount);
      const orderAmount = MoneyUtils.fromSafe(order.totalAmount);

      if (!webhookAmount.eq(orderAmount)) {
        await this.updateWebhookLogFailed(
          webhookLogRepo,
          webhookLogId,
          'AMOUNT_MISMATCH',
          `Expected ${orderAmount.toNumber()}, received ${webhookAmount.toNumber()}`,
          startTime,
        );
        // Vẫn tiếp tục xử lý, chỉ log warning
        this.logger.warn(`Amount mismatch for order ${orderCode}`);
      }

      // Tìm payments của order
      const payments = await paymentRepo.find({
        where: { mktOrderId: order.id },
      });

      // Update payment đầu tiên
      if (payments.length > 0) {
        const payment = payments[0];
        await paymentRepo.update(payment.id, {
          status: MKT_PAYMENT_STATUS.COMPLETED,
          paymentDate: payload.transactionDate,
          amount: webhookAmount.toNumber(),
          description: payload.content || payload.description,
        });

        this.logger.log(`Updated payment ${payment.id} to COMPLETED`);

        // Notify Firebase
        try {
          await this.firebaseService.completedOrderToFirebase(order);
        } catch (fbError) {
          this.logger.warn('Firebase notification failed:', fbError);
        }
      }

      // Update webhook log to MATCHED
      const processingTimeMs = DateTimeUtils.toMillis(DateTimeUtils.now()) - startTime;
      await webhookLogRepo.update(webhookLogId, {
        status: 'MATCHED',
        orderCode,
        processingTimeMs,
        responseBody: safeJsonStringify({ success: true, orderCode }) as unknown as JSON,
      });

      this.logger.log(`Webhook processed successfully for order ${orderCode}`);
    } catch (error) {
      this.logger.error(`Failed to process webhook: ${error.message}`, error.stack);

      await this.updateWebhookLogFailed(
        webhookLogRepo,
        webhookLogId,
        'FAILED',
        error.message,
        startTime,
      );

      throw error; // Re-throw for retry
    }
  }

  private extractOrderCode(content: string): string | null {
    // Pattern: ORD + 8-14 digits hoặc MKT prefix
    const patterns = [
      /ORD\d{8,14}/i,
      /MKT\d{8,14}/i,
      /DH\d{8,14}/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return null;
  }

  private async updateWebhookLogFailed(
    repo: any,
    id: string,
    status: string,
    errorMessage: string,
    startTime: number,
  ): Promise<void> {
    const processingTimeMs = DateTimeUtils.toMillis(DateTimeUtils.now()) - startTime;
    await repo.update(id, {
      status,
      errorMessage,
      processingTimeMs,
    });
  }

  private async getWebhookLogRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktWebhookLogWorkspaceEntity>(
      workspaceId,
      'mktWebhookLog',
      { shouldBypassPermissionChecks: true },
    );
  }

  private async getOrderRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrderWorkspaceEntity>(
      workspaceId,
      'mktOrder',
      { shouldBypassPermissionChecks: true },
    );
  }

  private async getPaymentRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPaymentWorkspaceEntity>(
      workspaceId,
      'mktPayment',
      { shouldBypassPermissionChecks: true },
    );
  }
}
```

---

#### Task 3.3: Tạo Webhook Service

**File: `services/mkt-webhook.service.ts`**

```typescript
// packages/twenty-server/src/mkt-core/payment/services/mkt-webhook.service.ts

import { Injectable, Logger } from '@nestjs/common';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonStringify } from 'src/mkt-core/utils/json.util';
import { SepayWebhookPayloadDto } from '../dto/sepay-webhook-payload.dto';
import { MktWebhookLogWorkspaceEntity } from '../objects/mkt-webhook-log.workspace-entity';
import { WebhookProcessingJob, WebhookProcessingJobData } from '../jobs/webhook-processing.job';
import { DuplicateTransactionException } from '../exceptions/payment.exceptions';

export type WebhookResult = {
  success: boolean;
  message: string;
  transactionId: number;
  status: string;
};

@Injectable()
export class MktWebhookService {
  private readonly logger = new Logger(MktWebhookService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    @InjectMessageQueue(MessageQueue.webhookQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {}

  /**
   * Xử lý webhook từ SEPay
   * - Log webhook vào DB
   * - Check idempotency
   * - Dispatch job to BullMQ
   */
  async processWebhook(
    workspaceId: string,
    payload: SepayWebhookPayloadDto,
    ipAddress: string,
  ): Promise<WebhookResult> {
    const startTime = DateTimeUtils.toMillis(DateTimeUtils.now());

    this.logger.log(`Received webhook for transaction ${payload.id}`);

    const webhookLogRepo = await this.getWebhookLogRepository(workspaceId);

    // Check idempotency
    const existingLog = await webhookLogRepo.findOne({
      where: { sepayTransactionId: payload.id },
    });

    if (existingLog) {
      this.logger.warn(`Duplicate webhook for transaction ${payload.id}`);
      return {
        success: true,
        message: 'Already processed',
        transactionId: payload.id,
        status: 'DUPLICATE',
      };
    }

    // Log webhook
    const webhookLog = webhookLogRepo.create({
      sepayTransactionId: payload.id,
      gateway: payload.gateway,
      amount: payload.transferAmount,
      status: 'RECEIVED',
      requestBody: safeJsonStringify(payload) as unknown as JSON,
      ipAddress,
    });

    const savedLog = await webhookLogRepo.save(webhookLog);

    // Dispatch to BullMQ for async processing
    const jobData: WebhookProcessingJobData = {
      workspaceId,
      payload,
      webhookLogId: savedLog.id,
      startTime,
    };

    await this.messageQueueService.add<WebhookProcessingJobData>(
      WebhookProcessingJob.name,
      jobData,
      { retryLimit: 3 },
    );

    this.logger.log(`Dispatched webhook job for transaction ${payload.id}`);

    return {
      success: true,
      message: 'Webhook received and queued for processing',
      transactionId: payload.id,
      status: 'RECEIVED',
    };
  }

  private async getWebhookLogRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktWebhookLogWorkspaceEntity>(
      workspaceId,
      'mktWebhookLog',
      { shouldBypassPermissionChecks: true },
    );
  }
}
```

---

### Phase 4: Module Update (Ngày 9-10)

#### Task 4.1: Update Payment Module

**File: `mkt-payment.module.ts`**

```typescript
// packages/twenty-server/src/mkt-core/payment/mkt-payment.module.ts

import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { AuthModule } from 'src/engine/core-modules/auth/auth.module';
import { JwtModule } from 'src/engine/core-modules/jwt/jwt.module';
import { RecordPositionModule } from 'src/engine/core-modules/record-position/record-position.module';
import { TwentyConfigModule } from 'src/engine/core-modules/twenty-config/twenty-config.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';

// Controllers
import { SepayPaymentController } from './sepay-payment/sepay-payment.controller';

// Services
import { MktPaymentService } from './services/mkt-payment.service';
import { MktPaymentCreateService } from './services/mkt-payment-create.service';
import { MktPaymentUpdateService } from './services/mkt-payment-update.service';
import { MktPaymentListenerService } from './services/mkt-payment-listener.service';
import { MktQrGenerationService } from './services/mkt-qr-generation.service';
import { MktWebhookService } from './services/mkt-webhook.service';
import { FireBaseIntegrationService } from './integration/firebase-integration.service';

// Jobs
import { WebhookProcessingJob } from './jobs/webhook-processing.job';

// Guards
import { SepayAuthGuard } from './guards/sepay-auth.guard';

// REMOVED: Pre-Query Hooks
// - MktPaymentCreateOnePreQueryHook
// - MktPaymentUpdateOnePreQueryHook

@Module({
  controllers: [SepayPaymentController],
  imports: [
    HttpModule,
    RecordPositionModule,
    MktCommonModule,
    JwtModule,
    AuthModule,
    WorkspaceCacheStorageModule,
    TwentyConfigModule,
  ],
  providers: [
    // Core Services
    MktPaymentService,
    MktPaymentCreateService,
    MktPaymentUpdateService,
    MktPaymentListenerService,
    MktQrGenerationService,
    MktWebhookService,

    // Integration Services
    FireBaseIntegrationService,

    // Jobs
    WebhookProcessingJob,

    // Guards
    SepayAuthGuard,
  ],
  exports: [
    MktPaymentService,
    MktPaymentCreateService,
    MktPaymentUpdateService,
    MktQrGenerationService,
    FireBaseIntegrationService,
  ],
})
export class MktPaymentModule {}
```

---

## 4. Migration Guide

### 4.1. Cập Nhật Constants

Thêm vào `mkt-object-ids.ts`:

```typescript
export const MKT_OBJECT_IDS = {
  // ... existing
  mktWebhookLog: '20251221-mkt-webhook-log-standard-id',
};
```

Thêm vào `mkt-field-ids.ts`:

```typescript
export const MKT_WEBHOOK_LOG_FIELD_IDS = {
  sepayTransactionId: '20251221-webhook-log-sepay-transaction-id',
  gateway: '20251221-webhook-log-gateway',
  orderCode: '20251221-webhook-log-order-code',
  amount: '20251221-webhook-log-amount',
  status: '20251221-webhook-log-status',
  requestBody: '20251221-webhook-log-request-body',
  responseBody: '20251221-webhook-log-response-body',
  processingTimeMs: '20251221-webhook-log-processing-time-ms',
  ipAddress: '20251221-webhook-log-ip-address',
  errorMessage: '20251221-webhook-log-error-message',
};
```

### 4.2. Xóa Files

```bash
# Xóa hooks (không sử dụng nữa)
rm packages/twenty-server/src/mkt-core/payment/hooks/mkt-payment-create-one.pre-query.hook.ts
rm packages/twenty-server/src/mkt-core/payment/hooks/mkt-payment-update-one.pre-query.hook.ts
rmdir packages/twenty-server/src/mkt-core/payment/hooks

# Xóa middleware không sử dụng
rm packages/twenty-server/src/mkt-core/payment/middleware/apikey-to-bearer.middleware.ts
rmdir packages/twenty-server/src/mkt-core/payment/middleware

# Xóa duplicate type files
rm packages/twenty-server/src/mkt-core/payment/types/payment-status.types.ts
```

### 4.3. Cập Nhật Imports

Tìm và thay thế các imports từ hooks sang services:

```typescript
// OLD
import { MktPaymentCreateOnePreQueryHook } from './hooks/mkt-payment-create-one.pre-query.hook';

// NEW
import { MktPaymentCreateService } from './services/mkt-payment-create.service';
```

---

## 5. Testing Checklist

### 5.1. Unit Tests

- [ ] `MktQrGenerationService.generateQrCode()` - SEPay QR
- [ ] `MktQrGenerationService.generateQrCode()` - BIDV QR
- [ ] `MktPaymentCreateService.createPayment()` - Happy path
- [ ] `MktPaymentCreateService.createPayment()` - Order not found
- [ ] `MktPaymentUpdateService.updatePayment()` - QR regeneration
- [ ] `MktWebhookService.processWebhook()` - Idempotency check
- [ ] `MktWebhookService.processWebhook()` - Queue dispatch
- [ ] `WebhookProcessingJob.handle()` - Amount validation
- [ ] `WebhookProcessingJob.handle()` - Order matching

### 5.2. Integration Tests

- [ ] Webhook end-to-end flow
- [ ] Payment creation with QR generation
- [ ] BullMQ job processing

### 5.3. Manual Tests

- [ ] SEPay webhook simulation
- [ ] QR code generation trên UI
- [ ] Payment status update

---

## 6. Rollback Plan

Nếu cần rollback:

1. Restore hooks từ git:
   ```bash
   git checkout HEAD~1 -- packages/twenty-server/src/mkt-core/payment/hooks/
   ```

2. Revert module registration

3. Remove new services

---

## 7. Timeline

| Phase | Tasks | Effort | Owner |
|-------|-------|--------|-------|
| Phase 1 | Foundation (Constants, DTOs, Exceptions) | 2 days | - |
| Phase 2 | Services Refactor | 3 days | - |
| Phase 3 | Webhook & BullMQ | 3 days | - |
| Phase 4 | Module Update & Cleanup | 2 days | - |
| Testing | Unit + Integration Tests | 2 days | - |
| **Total** | | **12 days** | |

---

## 8. Appendix

### A. Command Cheatsheet

```bash
# Sync metadata sau khi thêm entity mới
npx nx run twenty-server:command workspace:sync-metadata -f

# Run tests
npx nx test twenty-server --testPathPattern=payment

# Lint
npx nx lint twenty-server --files=packages/twenty-server/src/mkt-core/payment/**/*.ts
```

### B. Related Documents

- [PAYMENT-MODULE-REVIEW.md](./PAYMENT-MODULE-REVIEW.md)
- [sepay-payment-design.md](./sepay-payment-design.md)
- [sepay-payment-evaluation.md](./sepay-payment-evaluation.md)
- [CLAUDE.md](/CLAUDE.md)

---

*Document Version: 1.0.0 | Created: 21/12/2025*
