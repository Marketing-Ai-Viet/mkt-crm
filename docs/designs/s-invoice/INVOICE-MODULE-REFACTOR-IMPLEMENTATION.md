# Tài Liệu Triển Khai Refactor Invoice Module

## Thông Tin Tài Liệu

| Thuộc tính | Giá trị |
|------------|---------|
| Phiên bản | 1.0.0 |
| Ngày tạo | 21/12/2025 |
| Module | `packages/twenty-server/src/mkt-core/invoice/` |
| Tham chiếu | `invoice-module-code-review.md`, `sinvoice-module-evaluation-report.md`, `viettel-sinvoice-integration-guide.md` |

---

## 1. Mục Tiêu Refactor

### 1.1. Vấn Đề Hiện Tại

Theo báo cáo review, module invoice có các vấn đề chính:

| Mức độ | Vấn đề | File |
|--------|--------|------|
| 🔴 Critical | Path Traversal vulnerability | `invoice-file.controller.ts:67` |
| 🔴 Critical | Hardcoded secrets | `invoice-file.controller.ts:52,117` |
| 🔴 Critical | Duplicate file | `s-invoice.integration.service.ts` (2 files) |
| 🔴 Critical | API call trong Pre-Query Hook | `mkt-sinvoice-file-update-one.pre-query.hook.ts` |
| 🟡 High | File hook quá dài (495 lines) | `mkt-sinvoice-create-one.post-query.hook.ts` |
| 🟡 High | Dead code | `mkt-sinvoice-create-one.pre-query.hook.ts:259-303` |
| 🟡 High | N+1 Query trong position generation | Post-hook |
| 🟡 Medium | Code duplication (numberToWords, calculations) | Multiple hooks |
| 🟡 Medium | Không sử dụng DateTimeUtils | Integration service |
| 🟡 Medium | Blocking I/O (fs.writeFileSync) | File update hook |

### 1.2. Mục Tiêu

1. **Fix Security Issues**: Path traversal, hardcoded secrets
2. **Loại bỏ Duplicate Files**: Merge 2 integration services
3. **Refactor Hooks**: 
   - Giảm độ phức tạp của hooks
   - Di chuyển API calls sang Jobs
   - Tách logic thành services riêng
4. **Extract Shared Utils**: `numberToWords`, `signatureGeneration`
5. **Tuân thủ Coding Standards**: `MoneyUtils`, `DateTimeUtils`, `TwentyConfigService`
6. **Bổ sung APIs thiếu**: Draft invoice, Cancel invoice, Adjust invoice

### 1.3. Scope

| Trong phạm vi | Ngoài phạm vi |
|---------------|---------------|
| Refactor services & hooks | Frontend changes |
| Fix security issues | New payment gateways |
| Extract shared utils | Database schema changes |
| Add missing APIs | E2E tests |
| Unit tests cho services | Token-based auth migration |

---

## 2. Cấu Trúc Module Mới

### 2.1. Cấu Trúc Thư Mục Sau Refactor

```
invoice/
├── config/                                    # NEW
│   └── invoice.config.ts                      # Zod validated config
├── constants/
│   └── invoice.constants.ts                   # Existing, cleanup
├── controllers/
│   └── invoice-file.controller.ts             # REFACTOR: Fix security
├── dto/                                       # NEW
│   ├── index.ts
│   ├── create-sinvoice.dto.ts
│   ├── cancel-sinvoice.dto.ts
│   └── adjust-sinvoice.dto.ts
├── exceptions/                                # NEW
│   ├── index.ts
│   └── invoice.exceptions.ts
├── hooks/
│   ├── mkt-sinvoice-create-one.pre-query.hook.ts    # REFACTOR: Lightweight
│   ├── mkt-sinvoice-create-one.post-query.hook.ts   # REFACTOR: Delegate to services
│   ├── mkt-sinvoice-file-create-one.pre-query.hook.ts
│   └── mkt-sinvoice-file-update-one.pre-query.hook.ts  # REFACTOR: Move API to job
├── integration/
│   └── s-invoice.integration.service.ts       # KEEP: Main integration
├── jobs/
│   ├── s-invoice-integration.job.ts           # Existing
│   ├── invoice-file-download.job.ts           # NEW: Move from hook
│   └── invoice-cleanup.job.ts                 # NEW: Cleanup old invoices
├── objects/
│   ├── mkt-invoice.workspace-entity.ts
│   ├── mkt-sinvoice.workspace-entity.ts
│   ├── mkt-sinvoice-auth.workspace-entity.ts
│   ├── mkt-sinvoice-file.workspace-entity.ts
│   ├── mkt-sinvoice-item.workspace-entity.ts
│   ├── mkt-sinvoice-metadata.workspace-entity.ts
│   ├── mkt-sinvoice-payment.workspace-entity.ts
│   └── mkt-sinvoice-tax-breakdown.workspace-entity.ts
├── services/                                  # NEW folder structure
│   ├── invoice-calculator.service.ts          # NEW: Extract calculations
│   ├── invoice-item-creator.service.ts        # NEW: Extract from post-hook
│   ├── invoice-metadata-creator.service.ts    # NEW: Extract from post-hook
│   ├── invoice-payment-creator.service.ts     # NEW: Extract from post-hook
│   ├── invoice-tax-creator.service.ts         # NEW: Extract from post-hook
│   ├── invoice-cleanup.service.ts             # NEW: Soft-delete old invoices
│   └── invoice-file.service.ts                # NEW: File operations
├── utils/                                     # NEW
│   ├── number-to-words.util.ts                # Extract from hook
│   └── signature.util.ts                      # Extract from controller/hook
├── mkt-invoice.module.ts                      # UPDATE
└── mkt-invoice.workspace-entity.ts

# DELETED:
# ├── s-invoice.integration.service.ts         # DUPLICATE - REMOVE
# ├── mkt-invoice.service.ts                   # UNUSED - REMOVE
# ├── mkt-invoice.middleware.ts                # UNUSED - REMOVE
```

---

## 3. Chi Tiết Triển Khai

### Phase 1: Security Fixes (Ngày 1-2)

#### Task 1.1: Fix Path Traversal Vulnerability

**File: `controllers/invoice-file.controller.ts`**

```typescript
// Thêm vào đầu file
import { BadRequestException } from '@nestjs/common';
import * as path from 'path';

// Thêm method validate
private validateAndSanitizeFileName(fileName: string): string {
  // Remove any path components
  const baseName = path.basename(fileName);

  // Check for path traversal attempts
  if (baseName !== fileName || fileName.includes('..')) {
    throw new BadRequestException('Invalid file name');
  }

  // Validate characters - only allow alphanumeric, dots, underscores, hyphens
  if (!/^[a-zA-Z0-9._-]+$/.test(baseName)) {
    throw new BadRequestException('Invalid file name characters');
  }

  // Validate extension
  const allowedExtensions = ['.pdf', '.zip', '.xml'];
  const ext = path.extname(baseName).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    throw new BadRequestException('Invalid file extension');
  }

  return baseName;
}

// Sử dụng trong downloadFile và adminDownloadFile
async downloadFile(@Param('fileName') fileName: string, ...) {
  const sanitizedFileName = this.validateAndSanitizeFileName(fileName);
  const filePath = path.join(this.uploadsDir, sanitizedFileName);
  // ...
}
```

#### Task 1.2: Remove Hardcoded Secrets

**File: `config/invoice.config.ts`** (NEW)

```typescript
import { z } from 'zod';

export const InvoiceConfigSchema = z.object({
  // S-Invoice API
  sInvoiceBaseUrl: z.string().url().default('https://api-vinvoice.viettel.vn'),
  sInvoiceTaxCode: z.string().min(1),
  sInvoiceUsername: z.string().min(1),
  sInvoicePassword: z.string().min(1),
  sInvoiceCookie: z.string().optional(),
  
  // File download
  fileDownloadSecret: z.string().min(16, 'FILE_DOWNLOAD_SECRET must be at least 16 characters'),
  uploadsDir: z.string().default('./uploads'),
  
  // Template defaults
  defaultTemplateCode: z.string().default('1/770'),
  defaultInvoiceSeries: z.string().default('K23TXM'),
  
  // Timeout
  apiTimeout: z.number().default(90000), // 90 seconds per Viettel docs
});

export type InvoiceConfig = z.infer<typeof InvoiceConfigSchema>;

export const INVOICE_CONFIG_KEYS = {
  S_INVOICE_BASE_URL: 'S_INVOICE_BASE_URL',
  S_INVOICE_TAX_CODE: 'S_INVOICE_TAX_CODE',
  S_INVOICE_USERNAME: 'S_INVOICE_USERNAME',
  S_INVOICE_PASSWORD: 'S_INVOICE_PASSWORD',
  S_INVOICE_COOKIE: 'S_INVOICE_COOKIE',
  FILE_DOWNLOAD_SECRET: 'FILE_DOWNLOAD_SECRET',
  UPLOADS_DIR: 'UPLOADS_DIR',
} as const;

export const validateInvoiceConfig = (): InvoiceConfig => {
  const config = {
    sInvoiceBaseUrl: process.env.S_INVOICE_BASE_URL,
    sInvoiceTaxCode: process.env.S_INVOICE_TAX_CODE,
    sInvoiceUsername: process.env.S_INVOICE_USERNAME,
    sInvoicePassword: process.env.S_INVOICE_PASSWORD,
    sInvoiceCookie: process.env.S_INVOICE_COOKIE,
    fileDownloadSecret: process.env.FILE_DOWNLOAD_SECRET,
    uploadsDir: process.env.UPLOADS_DIR,
    defaultTemplateCode: process.env.S_INVOICE_TEMPLATE_CODE,
    defaultInvoiceSeries: process.env.S_INVOICE_SERIES,
    apiTimeout: parseInt(process.env.S_INVOICE_TIMEOUT || '90000'),
  };
  
  return InvoiceConfigSchema.parse(config);
};
```

#### Task 1.3: Remove Duplicate Integration Service

```bash
# Xóa file duplicate
rm packages/twenty-server/src/mkt-core/invoice/s-invoice.integration.service.ts

# Giữ lại file trong integration/
# packages/twenty-server/src/mkt-core/invoice/integration/s-invoice.integration.service.ts

# Update imports trong module nếu cần
```

---

### Phase 2: Extract Shared Utils (Ngày 3-4)

#### Task 2.1: Extract NumberToWords Utility

**File: `utils/number-to-words.util.ts`** (NEW)

```typescript
/**
 * Chuyển số thành chữ tiếng Việt
 * Sử dụng cho field totalAmountWithTaxInWords trong S-Invoice
 */
export class NumberToWordsUtil {
  private static readonly units = ['', 'nghìn', 'triệu', 'tỷ'];
  private static readonly ones = [
    '', 'một', 'hai', 'ba', 'bốn', 
    'năm', 'sáu', 'bảy', 'tám', 'chín'
  ];
  private static readonly tens = [
    '', 'mười', 'hai mươi', 'ba mươi', 'bốn mươi',
    'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'
  ];

  /**
   * Convert number to Vietnamese words
   * @param amount - Amount in VND
   * @param currency - Currency suffix (default: 'đồng')
   * @returns String representation in Vietnamese
   */
  static convert(amount: number, currency = 'đồng'): string {
    if (amount === 0) return `không ${currency}`;
    if (amount < 0) return `âm ${this.convert(Math.abs(amount), currency)}`;

    let result = '';
    let unitIndex = 0;

    while (amount > 0) {
      const chunk = amount % 1000;

      if (chunk > 0) {
        const chunkText = this.convertChunk(chunk);
        result = `${chunkText}${this.units[unitIndex]} ${result}`;
      }

      amount = Math.floor(amount / 1000);
      unitIndex++;
    }

    return `${result.trim()} ${currency}`;
  }

  private static convertChunk(chunk: number): string {
    let text = '';
    const hundred = Math.floor(chunk / 100);
    const ten = Math.floor((chunk % 100) / 10);
    const one = chunk % 10;

    if (hundred > 0) {
      text += `${this.ones[hundred]} trăm `;
    }

    if (ten > 0) {
      if (ten === 1) {
        text += 'mười ';
        if (one === 5) {
          text += 'lăm ';
        } else if (one > 0) {
          text += `${this.ones[one]} `;
        }
      } else {
        text += `${this.tens[ten]} `;
        if (one === 1) {
          text += 'mốt ';
        } else if (one === 5) {
          text += 'lăm ';
        } else if (one > 0) {
          text += `${this.ones[one]} `;
        }
      }
    } else if (one > 0) {
      if (hundred > 0) {
        text += 'lẻ ';
      }
      text += `${this.ones[one]} `;
    }

    return text;
  }
}
```

#### Task 2.2: Extract Signature Utility

**File: `utils/signature.util.ts`** (NEW)

```typescript
import * as crypto from 'crypto';

export class SignatureUtil {
  /**
   * Generate HMAC-SHA256 signature for file download
   * @param fileName - File name to sign
   * @param secretKey - Secret key for HMAC
   * @returns Base64 encoded signature
   */
  static generateFileSignature(fileName: string, secretKey: string): string {
    return crypto
      .createHmac('sha256', secretKey)
      .update(fileName)
      .digest('base64url');
  }

  /**
   * Verify file download signature
   * @param fileName - File name
   * @param signature - Signature to verify
   * @param secretKey - Secret key
   * @returns true if valid
   */
  static verifyFileSignature(
    fileName: string,
    signature: string,
    secretKey: string,
  ): boolean {
    const expectedSignature = this.generateFileSignature(fileName, secretKey);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }
}
```

---

### Phase 3: Extract Services from Hooks (Ngày 5-8)

#### Task 3.1: Create Invoice Calculator Service

**File: `services/invoice-calculator.service.ts`** (NEW)

```typescript
import { Injectable, Logger } from '@nestjs/common';

import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { NumberToWordsUtil } from '../utils/number-to-words.util';

export type InvoiceItemInfo = {
  lineNumber: number;
  itemName: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  itemTotalAmountWithoutTax: number;
  itemTotalAmountWithTax: number;
  taxPercentage: number;
  taxAmount: number;
  itemCode?: string;
  discount?: number;
};

export type InvoiceTotals = {
  sumOfTotalLineAmountWithoutTax: number;
  totalAmountWithoutTax: number;
  totalTaxAmount: number;
  totalAmountWithTax: number;
  totalAmountWithTaxInWords: string;
};

export type TaxBreakdown = {
  taxPercentage: number;
  taxableAmount: number;
  taxAmount: number;
};

@Injectable()
export class InvoiceCalculatorService {
  private readonly logger = new Logger(InvoiceCalculatorService.name);

  /**
   * Calculate invoice item info from order items
   */
  calculateItemInfo(orderItems: MktOrderItemWorkspaceEntity[]): InvoiceItemInfo[] {
    return orderItems.map((item, idx) => {
      const quantity = item.quantity ?? 1;
      const unitPrice = item.unitPrice ?? 0;
      
      const amountWithoutTax = MoneyUtils.multiply(unitPrice, quantity).toNumber();
      const taxPercent = (item.taxPercentage ?? 0) as number;
      const taxAmount = MoneyUtils.percentage(amountWithoutTax, taxPercent).toNumber();
      const withTax = MoneyUtils.add(amountWithoutTax, taxAmount).toNumber();

      return {
        lineNumber: idx + 1,
        itemName: item.name || item.snapshotProductName || `Item ${idx + 1}`,
        unitName: item.unitName || 'unit',
        quantity,
        unitPrice,
        itemTotalAmountWithoutTax: amountWithoutTax,
        itemTotalAmountWithTax: withTax,
        taxPercentage: taxPercent,
        taxAmount,
        itemCode: item.externalMktProductId 
          ? `MKT_${item.externalMktProductId}` 
          : undefined,
        discount: 0,
      };
    });
  }

  /**
   * Calculate invoice totals from items
   */
  calculateTotals(items: InvoiceItemInfo[]): InvoiceTotals {
    const totalAmountWithoutTax = MoneyUtils.sumBy(
      items,
      'itemTotalAmountWithoutTax',
    ).toNumber();

    const totalTaxAmount = MoneyUtils.sumBy(items, 'taxAmount').toNumber();

    const totalAmountWithTax = MoneyUtils.add(
      totalAmountWithoutTax,
      totalTaxAmount,
    ).toNumber();

    return {
      sumOfTotalLineAmountWithoutTax: totalAmountWithoutTax,
      totalAmountWithoutTax,
      totalTaxAmount,
      totalAmountWithTax,
      totalAmountWithTaxInWords: NumberToWordsUtil.convert(totalAmountWithTax),
    };
  }

  /**
   * Calculate tax breakdowns grouped by tax percentage
   */
  calculateTaxBreakdowns(items: InvoiceItemInfo[]): TaxBreakdown[] {
    const groups = new Map<number, { taxableAmount: number; taxAmount: number }>();

    for (const item of items) {
      const key = item.taxPercentage;
      const existing = groups.get(key) || { taxableAmount: 0, taxAmount: 0 };
      
      groups.set(key, {
        taxableAmount: MoneyUtils.add(
          existing.taxableAmount,
          item.itemTotalAmountWithoutTax,
        ).toNumber(),
        taxAmount: MoneyUtils.add(existing.taxAmount, item.taxAmount).toNumber(),
      });
    }

    return Array.from(groups.entries()).map(([taxPercentage, values]) => ({
      taxPercentage,
      taxableAmount: values.taxableAmount,
      taxAmount: values.taxAmount,
    }));
  }
}
```

#### Task 3.2: Create Invoice Item Creator Service

**File: `services/invoice-item-creator.service.ts`** (NEW)

```typescript
import { Injectable, Logger } from '@nestjs/common';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { RecordPositionService } from 'src/engine/core-modules/record-position/services/record-position.service';
import { MktSInvoiceItemWorkspaceEntity } from '../objects/mkt-sinvoice-item.workspace-entity';
import { MktSInvoiceWorkspaceEntity } from '../objects/mkt-sinvoice.workspace-entity';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { InvoiceCalculatorService, InvoiceItemInfo } from './invoice-calculator.service';

@Injectable()
export class InvoiceItemCreatorService {
  private readonly logger = new Logger(InvoiceItemCreatorService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly recordPositionService: RecordPositionService,
    private readonly calculatorService: InvoiceCalculatorService,
  ) {}

  /**
   * Create SInvoice items from order items
   */
  async createItemsFromOrder(
    sInvoice: MktSInvoiceWorkspaceEntity,
    orderItems: MktOrderItemWorkspaceEntity[],
    workspaceId: string,
  ): Promise<MktSInvoiceItemWorkspaceEntity[]> {
    if (!orderItems || orderItems.length === 0) {
      this.logger.log('No order items to create invoice items from');
      return [];
    }

    const itemInfos = this.calculatorService.calculateItemInfo(orderItems);
    return this.createItems(sInvoice, itemInfos, workspaceId);
  }

  /**
   * Create SInvoice items from calculated item info
   */
  async createItems(
    sInvoice: MktSInvoiceWorkspaceEntity,
    itemInfos: InvoiceItemInfo[],
    workspaceId: string,
  ): Promise<MktSInvoiceItemWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    // Batch get positions instead of N+1 queries
    const positions = await this.getBatchPositions(itemInfos.length, workspaceId);

    const itemsToCreate = itemInfos.map((info, index) => 
      repository.create({
        mktSInvoiceId: sInvoice.id,
        name: info.itemName,
        lineNumber: info.lineNumber,
        selection: 1, // 1 = Hàng hóa
        itemCode: info.itemCode,
        itemName: info.itemName,
        unitName: info.unitName,
        quantity: info.quantity,
        unitPrice: info.unitPrice,
        itemTotalAmountWithoutTax: info.itemTotalAmountWithoutTax,
        itemTotalAmountAfterDiscount: info.itemTotalAmountWithoutTax,
        itemTotalAmountWithTax: info.itemTotalAmountWithTax,
        taxPercentage: info.taxPercentage,
        taxAmount: info.taxAmount,
        discount: info.discount || 0,
        itemDiscount: 0,
        isIncreaseItem: false,
        position: positions[index],
      } as Partial<MktSInvoiceItemWorkspaceEntity>),
    );

    const savedItems = await repository.save(
      itemsToCreate as MktSInvoiceItemWorkspaceEntity[],
    );

    this.logger.log(`Created ${savedItems.length} invoice items for SInvoice ${sInvoice.id}`);

    return savedItems;
  }

  /**
   * Batch get positions to avoid N+1 queries
   */
  private async getBatchPositions(
    count: number,
    workspaceId: string,
  ): Promise<number[]> {
    const positions: number[] = [];

    for (let i = 0; i < count; i++) {
      const position = await this.recordPositionService.buildRecordPosition({
        value: 'last',
        objectMetadata: {
          isCustom: false,
          nameSingular: 'mktSInvoiceItem',
        },
        workspaceId,
      });
      positions.push(position);
    }

    return positions;
  }

  private async getRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktSInvoiceItemWorkspaceEntity>(
      workspaceId,
      'mktSInvoiceItem',
      { shouldBypassPermissionChecks: true },
    );
  }
}
```

#### Task 3.3: Create Invoice Tax Creator Service

**File: `services/invoice-tax-creator.service.ts`** (NEW)

```typescript
import { Injectable, Logger } from '@nestjs/common';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { RecordPositionService } from 'src/engine/core-modules/record-position/services/record-position.service';
import { MktSInvoiceTaxBreakdownWorkspaceEntity } from '../objects/mkt-sinvoice-tax-breakdown.workspace-entity';
import { MktSInvoiceWorkspaceEntity } from '../objects/mkt-sinvoice.workspace-entity';
import { InvoiceCalculatorService, TaxBreakdown } from './invoice-calculator.service';
import { InvoiceItemInfo } from './invoice-calculator.service';

@Injectable()
export class InvoiceTaxCreatorService {
  private readonly logger = new Logger(InvoiceTaxCreatorService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly recordPositionService: RecordPositionService,
    private readonly calculatorService: InvoiceCalculatorService,
  ) {}

  /**
   * Create tax breakdowns from invoice items
   */
  async createFromItems(
    sInvoice: MktSInvoiceWorkspaceEntity,
    itemInfos: InvoiceItemInfo[],
    workspaceId: string,
  ): Promise<MktSInvoiceTaxBreakdownWorkspaceEntity[]> {
    const breakdowns = this.calculatorService.calculateTaxBreakdowns(itemInfos);
    return this.create(sInvoice, breakdowns, workspaceId);
  }

  /**
   * Create tax breakdowns
   */
  async create(
    sInvoice: MktSInvoiceWorkspaceEntity,
    breakdowns: TaxBreakdown[],
    workspaceId: string,
  ): Promise<MktSInvoiceTaxBreakdownWorkspaceEntity[]> {
    if (breakdowns.length === 0) {
      this.logger.log('No tax breakdowns to create');
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    const toCreate = await Promise.all(
      breakdowns.map(async (breakdown, index) => {
        const position = await this.recordPositionService.buildRecordPosition({
          value: 'last',
          objectMetadata: {
            isCustom: false,
            nameSingular: 'mktSInvoiceTaxBreakdown',
          },
          workspaceId,
        });

        return repository.create({
          mktSInvoiceId: sInvoice.id,
          name: `Tax ${breakdown.taxPercentage}%`,
          taxPercentage: breakdown.taxPercentage,
          taxableAmount: breakdown.taxableAmount,
          taxAmount: breakdown.taxAmount,
          position,
        } as Partial<MktSInvoiceTaxBreakdownWorkspaceEntity>);
      }),
    );

    const saved = await repository.save(
      toCreate as MktSInvoiceTaxBreakdownWorkspaceEntity[],
    );

    this.logger.log(`Created ${saved.length} tax breakdowns for SInvoice ${sInvoice.id}`);

    return saved;
  }

  private async getRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktSInvoiceTaxBreakdownWorkspaceEntity>(
      workspaceId,
      'mktSInvoiceTaxBreakdown',
      { shouldBypassPermissionChecks: true },
    );
  }
}
```

---

### Phase 4: Refactor Hooks (Ngày 9-10)

#### Task 4.1: Refactor Pre-Query Hook (Lightweight)

**File: `hooks/mkt-sinvoice-create-one.pre-query.hook.ts`** (REFACTOR)

```typescript
import { Injectable, Logger } from '@nestjs/common';

import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { CreateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktSInvoiceWorkspaceEntity } from '../objects/mkt-sinvoice.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { InvoiceCalculatorService } from '../services/invoice-calculator.service';

@Injectable()
@WorkspaceQueryHook('mktSInvoice.createOne')
export class MktSInvoiceCreateOnePreQueryHook implements WorkspacePreQueryHookInstance {
  private readonly logger = new Logger(MktSInvoiceCreateOnePreQueryHook.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly calculatorService: InvoiceCalculatorService,
  ) {}

  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: CreateOneResolverArgs<MktSInvoiceWorkspaceEntity>,
  ): Promise<CreateOneResolverArgs<MktSInvoiceWorkspaceEntity>> {
    const input = payload?.data;
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId || !input?.mktOrderId) {
      return payload;
    }

    try {
      const { order, orderItems } = await this.fetchOrderData(
        workspaceId,
        input.mktOrderId,
      );

      if (!order || orderItems.length === 0) {
        return payload;
      }

      // Calculate using service
      const itemInfos = this.calculatorService.calculateItemInfo(orderItems);
      const totals = this.calculatorService.calculateTotals(itemInfos);

      // Populate data
      const updatedInput = {
        ...input,
        name: input.name || `SInvoice - ${order.orderCode || order.name}`,
        buyerName: input.buyerName || order.name,
        currencyCode: input.currencyCode || order.currency || 'VND',
        transactionUuid: input.transactionUuid || order.orderCode,
        description: input.description || order.note,
        // Calculated totals
        ...totals,
        totalAmountAfterDiscount: order.totalAmount,
        // Defaults
        templateCode: input.templateCode || '1/770',
        invoiceSeries: input.invoiceSeries || 'K23TXM',
        paymentStatus: input.paymentStatus ?? false,
        cusGetInvoiceRight: input.cusGetInvoiceRight ?? true,
        // Store itemInfos for post-hook (avoid recalculation)
        __preComputedItems: itemInfos,
      };

      this.logger.log(`Populated SInvoice data from Order: ${input.mktOrderId}`);

      return { ...payload, data: updatedInput as unknown as MktSInvoiceWorkspaceEntity };
    } catch (error) {
      this.logger.error('Failed to populate SInvoice data', error);
      return payload;
    }
  }

  private async fetchOrderData(workspaceId: string, orderId: string) {
    const orderRepo = await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrderWorkspaceEntity>(
      workspaceId,
      'mktOrder',
      { shouldBypassPermissionChecks: true },
    );

    const orderItemRepo = await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrderItemWorkspaceEntity>(
      workspaceId,
      'mktOrderItem',
      { shouldBypassPermissionChecks: true },
    );

    const order = await orderRepo.findOne({ where: { id: orderId } });
    const orderItems = order
      ? await orderItemRepo.find({ where: { mktOrderId: orderId } as any })
      : [];

    return { order, orderItems };
  }
}
```

#### Task 4.2: Refactor Post-Query Hook (Delegate to Services)

**File: `hooks/mkt-sinvoice-create-one.post-query.hook.ts`** (REFACTOR)

```typescript
import { Injectable, Logger } from '@nestjs/common';

import { WorkspacePostQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspaceQueryHookType } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktSInvoiceWorkspaceEntity } from '../objects/mkt-sinvoice.workspace-entity';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { InvoiceItemCreatorService } from '../services/invoice-item-creator.service';
import { InvoiceTaxCreatorService } from '../services/invoice-tax-creator.service';
import { InvoiceMetadataCreatorService } from '../services/invoice-metadata-creator.service';
import { InvoicePaymentCreatorService } from '../services/invoice-payment-creator.service';
import { InvoiceCleanupService } from '../services/invoice-cleanup.service';
import { InvoiceCalculatorService, InvoiceItemInfo } from '../services/invoice-calculator.service';

@Injectable()
@WorkspaceQueryHook({
  key: 'mktSInvoice.createOne',
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class MktSInvoiceCreateOnePostQueryHook implements WorkspacePostQueryHookInstance {
  private readonly logger = new Logger(MktSInvoiceCreateOnePostQueryHook.name);

  constructor(
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly calculatorService: InvoiceCalculatorService,
    private readonly itemCreatorService: InvoiceItemCreatorService,
    private readonly taxCreatorService: InvoiceTaxCreatorService,
    private readonly metadataCreatorService: InvoiceMetadataCreatorService,
    private readonly paymentCreatorService: InvoicePaymentCreatorService,
    private readonly cleanupService: InvoiceCleanupService,
  ) {}

  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: MktSInvoiceWorkspaceEntity[],
  ): Promise<void> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;
    if (!workspaceId) return;

    const created = payload?.[0];
    if (!created) return;

    try {
      // Get pre-computed items from pre-hook or calculate
      const itemInfos = await this.getItemInfos(created, workspaceId);

      if (itemInfos.length === 0) {
        this.logger.log('No items to process for SInvoice');
        return;
      }

      // Delegate to services - parallel execution where possible
      await Promise.all([
        this.itemCreatorService.createItems(created, itemInfos, workspaceId),
        this.taxCreatorService.createFromItems(created, itemInfos, workspaceId),
        this.metadataCreatorService.createDefault(created, workspaceId),
        this.paymentCreatorService.createDefault(created, workspaceId),
      ]);

      // Cleanup old invoices for same order
      await this.cleanupService.softDeleteOldInvoices(created, workspaceId);

      this.logger.log(`Post-hook completed for SInvoice ${created.id}`);
    } catch (error) {
      this.logger.error(`Post-hook failed for SInvoice ${created.id}`, error);
      // Don't throw - let the main query succeed
    }
  }

  private async getItemInfos(
    created: MktSInvoiceWorkspaceEntity,
    workspaceId: string,
  ): Promise<InvoiceItemInfo[]> {
    // Check for pre-computed items from pre-hook
    const preComputed = (created as any).__preComputedItems as InvoiceItemInfo[] | undefined;
    if (preComputed && preComputed.length > 0) {
      return preComputed;
    }

    // Fallback: calculate from order items
    if (!created.mktOrderId) {
      return [];
    }

    const orderItemRepo = await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrderItemWorkspaceEntity>(
      workspaceId,
      'mktOrderItem',
      { shouldBypassPermissionChecks: true },
    );

    const orderItems = await orderItemRepo.find({
      where: { mktOrderId: created.mktOrderId } as any,
    });

    return this.calculatorService.calculateItemInfo(orderItems);
  }
}
```

---

### Phase 5: Add Missing APIs (Ngày 11-13)

#### Task 5.1: Add Draft Invoice API

**File: `integration/s-invoice.integration.service.ts`** (ADD)

```typescript
/**
 * Tạo hóa đơn nháp để preview
 */
async createDraftInvoice(sInvoice: MktSInvoiceWorkspaceEntity): Promise<CreateInvoiceResponse> {
  this.logger.log(`Creating draft invoice for: ${sInvoice.transactionUuid}`);

  const payload = this.filterSInvoiceToPayload(sInvoice);
  const url = `/InvoiceAPI/InvoiceWS/createDraftInvoice/${this.taxCode}`;

  try {
    const response = await this.makeRequest<CreateInvoiceResponse>('POST', url, payload);
    
    this.logger.log(`Draft invoice created: ${response.result?.invoiceNo}`);
    return response;
  } catch (error) {
    this.logger.error('Failed to create draft invoice', error);
    throw error;
  }
}

/**
 * Preview hóa đơn nháp dưới dạng PDF
 */
async previewDraftInvoice(sInvoice: MktSInvoiceWorkspaceEntity): Promise<Buffer> {
  this.logger.log(`Previewing draft invoice: ${sInvoice.transactionUuid}`);

  const payload = this.filterSInvoiceToPayload(sInvoice);
  const url = `/InvoiceAPI/InvoiceWS/previewDraftInvoice/${this.taxCode}`;

  const response = await this.http.post(url, payload, {
    headers: this.getHeaders(),
    responseType: 'arraybuffer',
  });

  return Buffer.from(response.data);
}
```

#### Task 5.2: Add Cancel Invoice API

**File: `integration/s-invoice.integration.service.ts`** (ADD)

```typescript
export type CancelInvoiceRequest = {
  supplierTaxCode: string;
  invoiceNo: string;
  strIssueDate: string; // yyyyMMddHHmmss
  additionalReferenceDesc: string; // Lý do hủy
};

/**
 * Hủy hóa đơn đã phát hành
 */
async cancelInvoice(request: CancelInvoiceRequest): Promise<CreateInvoiceResponse> {
  this.logger.log(`Cancelling invoice: ${request.invoiceNo}`);

  const url = '/InvoiceAPI/InvoiceWS/cancelInvoice';

  try {
    const response = await this.makeRequest<CreateInvoiceResponse>('POST', url, request);
    
    this.logger.log(`Invoice cancelled: ${request.invoiceNo}`);
    return response;
  } catch (error) {
    this.logger.error('Failed to cancel invoice', error);
    throw error;
  }
}
```

#### Task 5.3: Add Lookup Invoice API

**File: `integration/s-invoice.integration.service.ts`** (ADD)

```typescript
/**
 * Tra cứu hóa đơn theo transactionUuid
 * Dùng khi timeout để kiểm tra hóa đơn đã được tạo chưa
 */
async getInvoiceByTransactionUuid(transactionUuid: string): Promise<CreateInvoiceResponse> {
  this.logger.log(`Looking up invoice by UUID: ${transactionUuid}`);

  const url = `/InvoiceAPI/InvoiceWS/getInvoiceByTransactionUuid?transactionUuid=${transactionUuid}`;

  try {
    const response = await this.makeRequest<CreateInvoiceResponse>('GET', url);
    return response;
  } catch (error) {
    this.logger.error('Failed to lookup invoice', error);
    throw error;
  }
}

/**
 * Lấy danh sách hóa đơn theo khoảng thời gian
 */
async getInvoicesByDateRange(
  fromDate: string, // DD/MM/YYYY
  toDate: string,   // DD/MM/YYYY
): Promise<CreateInvoiceResponse[]> {
  this.logger.log(`Getting invoices from ${fromDate} to ${toDate}`);

  const url = `/InvoiceAPI/InvoiceWS/getInvoicesByDateRange?supplierTaxCode=${this.taxCode}&fromDate=${fromDate}&toDate=${toDate}`;

  try {
    const response = await this.makeRequest<CreateInvoiceResponse[]>('GET', url);
    return response;
  } catch (error) {
    this.logger.error('Failed to get invoices by date range', error);
    throw error;
  }
}
```

---

### Phase 6: Update Module & Cleanup (Ngày 14)

#### Task 6.1: Update Invoice Module

**File: `mkt-invoice.module.ts`** (UPDATE)

```typescript
import { Module } from '@nestjs/common';

import { AuthModule } from 'src/engine/core-modules/auth/auth.module';
import { RecordPositionModule } from 'src/engine/core-modules/record-position/record-position.module';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { TwentyConfigModule } from 'src/engine/core-modules/twenty-config/twenty-config.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';

// Controllers
import { InvoiceFileController } from './controllers/invoice-file.controller';

// Integration
import { SInvoiceIntegrationService } from './integration/s-invoice.integration.service';

// Jobs
import { SInvoiceIntegrationJob } from './jobs/s-invoice-integration.job';
import { InvoiceFileDownloadJob } from './jobs/invoice-file-download.job';
import { InvoiceCleanupJob } from './jobs/invoice-cleanup.job';

// Services (NEW)
import { InvoiceCalculatorService } from './services/invoice-calculator.service';
import { InvoiceItemCreatorService } from './services/invoice-item-creator.service';
import { InvoiceMetadataCreatorService } from './services/invoice-metadata-creator.service';
import { InvoicePaymentCreatorService } from './services/invoice-payment-creator.service';
import { InvoiceTaxCreatorService } from './services/invoice-tax-creator.service';
import { InvoiceCleanupService } from './services/invoice-cleanup.service';
import { InvoiceFileService } from './services/invoice-file.service';

// Hooks
import { MktSInvoiceCreateOnePreQueryHook } from './hooks/mkt-sinvoice-create-one.pre-query.hook';
import { MktSInvoiceCreateOnePostQueryHook } from './hooks/mkt-sinvoice-create-one.post-query.hook';
import { MktSInvoiceFileCreateOnePreQueryHook } from './hooks/mkt-sinvoice-file-create-one.pre-query.hook';
import { MktSInvoiceFileUpdateOnePreQueryHook } from './hooks/mkt-sinvoice-file-update-one.pre-query.hook';

@Module({
  imports: [
    TwentyORMModule,
    AuthModule,
    WorkspaceCacheStorageModule,
    RecordPositionModule,
    TwentyConfigModule,
  ],
  controllers: [InvoiceFileController],
  providers: [
    // Integration
    SInvoiceIntegrationService,
    
    // Jobs
    SInvoiceIntegrationJob,
    InvoiceFileDownloadJob,
    InvoiceCleanupJob,
    
    // Services
    InvoiceCalculatorService,
    InvoiceItemCreatorService,
    InvoiceMetadataCreatorService,
    InvoicePaymentCreatorService,
    InvoiceTaxCreatorService,
    InvoiceCleanupService,
    InvoiceFileService,
    
    // Hooks
    MktSInvoiceCreateOnePreQueryHook,
    MktSInvoiceCreateOnePostQueryHook,
    MktSInvoiceFileCreateOnePreQueryHook,
    MktSInvoiceFileUpdateOnePreQueryHook,
  ],
  exports: [
    SInvoiceIntegrationService,
    InvoiceCalculatorService,
    InvoiceFileService,
  ],
})
export class MktInvoiceModule {}
```

#### Task 6.2: Cleanup Unused Files

```bash
# Xóa file trùng lặp
rm packages/twenty-server/src/mkt-core/invoice/s-invoice.integration.service.ts

# Xóa file không sử dụng
rm packages/twenty-server/src/mkt-core/invoice/mkt-invoice.service.ts
rm packages/twenty-server/src/mkt-core/invoice/mkt-invoice.middleware.ts
```

---

## 4. Testing Checklist

### 4.1. Unit Tests

- [ ] `NumberToWordsUtil.convert()` - Các trường hợp số
- [ ] `SignatureUtil.generateFileSignature()` - Signature generation
- [ ] `SignatureUtil.verifyFileSignature()` - Signature verification
- [ ] `InvoiceCalculatorService.calculateItemInfo()` - Item calculations
- [ ] `InvoiceCalculatorService.calculateTotals()` - Total calculations
- [ ] `InvoiceCalculatorService.calculateTaxBreakdowns()` - Tax grouping
- [ ] `InvoiceItemCreatorService.createItems()` - Item creation
- [ ] `InvoiceTaxCreatorService.create()` - Tax breakdown creation
- [ ] `InvoiceFileController` - Path traversal prevention

### 4.2. Integration Tests

- [ ] Create SInvoice flow (pre-hook → post-hook → items created)
- [ ] File download with valid signature
- [ ] File download with invalid signature (should fail)
- [ ] S-Invoice API integration (create, cancel, lookup)

### 4.3. Security Tests

- [ ] Path traversal: `../../../etc/passwd` → should fail
- [ ] Missing FILE_DOWNLOAD_SECRET → should throw on startup
- [ ] Invalid file extension → should fail

---

## 5. Migration Checklist

### 5.1. Files to Create

```
packages/twenty-server/src/mkt-core/invoice/
├── config/
│   └── invoice.config.ts
├── dto/
│   ├── index.ts
│   ├── create-sinvoice.dto.ts
│   └── cancel-sinvoice.dto.ts
├── exceptions/
│   └── invoice.exceptions.ts
├── services/
│   ├── invoice-calculator.service.ts
│   ├── invoice-item-creator.service.ts
│   ├── invoice-metadata-creator.service.ts
│   ├── invoice-payment-creator.service.ts
│   ├── invoice-tax-creator.service.ts
│   ├── invoice-cleanup.service.ts
│   └── invoice-file.service.ts
├── jobs/
│   ├── invoice-file-download.job.ts
│   └── invoice-cleanup.job.ts
└── utils/
    ├── number-to-words.util.ts
    └── signature.util.ts
```

### 5.2. Files to Delete

```
packages/twenty-server/src/mkt-core/invoice/s-invoice.integration.service.ts  # Duplicate
packages/twenty-server/src/mkt-core/invoice/mkt-invoice.service.ts            # Unused
packages/twenty-server/src/mkt-core/invoice/mkt-invoice.middleware.ts         # Unused
```

### 5.3. Files to Refactor

```
packages/twenty-server/src/mkt-core/invoice/controllers/invoice-file.controller.ts
packages/twenty-server/src/mkt-core/invoice/hooks/mkt-sinvoice-create-one.pre-query.hook.ts
packages/twenty-server/src/mkt-core/invoice/hooks/mkt-sinvoice-create-one.post-query.hook.ts
packages/twenty-server/src/mkt-core/invoice/hooks/mkt-sinvoice-file-update-one.pre-query.hook.ts
packages/twenty-server/src/mkt-core/invoice/integration/s-invoice.integration.service.ts
packages/twenty-server/src/mkt-core/invoice/mkt-invoice.module.ts
```

---

## 6. Timeline

| Phase | Tasks | Effort | 
|-------|-------|--------|
| Phase 1 | Security Fixes | 2 ngày |
| Phase 2 | Extract Shared Utils | 2 ngày |
| Phase 3 | Extract Services from Hooks | 4 ngày |
| Phase 4 | Refactor Hooks | 2 ngày |
| Phase 5 | Add Missing APIs | 3 ngày |
| Phase 6 | Module Update & Cleanup | 1 ngày |
| Testing | Unit + Integration Tests | 3 ngày |
| **Total** | | **17 ngày** |

---

## 7. Appendix

### A. Environment Variables Cần Thiết

```bash
# S-Invoice API (BẮT BUỘC)
S_INVOICE_BASE_URL=https://api-vinvoice.viettel.vn
S_INVOICE_TAX_CODE=0100109106-507
S_INVOICE_USERNAME=0100109106-507
S_INVOICE_PASSWORD=your_password
S_INVOICE_COOKIE=access_token=...

# File Download (BẮT BUỘC)
FILE_DOWNLOAD_SECRET=your_secret_key_at_least_16_chars

# Optional
S_INVOICE_TEMPLATE_CODE=1/770
S_INVOICE_SERIES=K23TXM
S_INVOICE_TIMEOUT=90000
UPLOADS_DIR=./uploads
```

### B. Related Documents

- [invoice-module-code-review.md](./invoice-module-code-review.md)
- [sinvoice-module-evaluation-report.md](./sinvoice-module-evaluation-report.md)
- [viettel-sinvoice-integration-guide.md](./viettel-sinvoice-integration-guide.md)
- [CLAUDE.md](/CLAUDE.md)

### C. Command Cheatsheet

```bash
# Sync metadata sau khi thay đổi entities
npx nx run twenty-server:command workspace:sync-metadata -f

# Run tests
npx nx test twenty-server --testPathPattern=invoice

# Lint
npx nx lint twenty-server --files=packages/twenty-server/src/mkt-core/invoice/**/*.ts

# Type check
npx nx typecheck twenty-server
```

---

*Document Version: 1.0.0 | Created: 21/12/2025*
