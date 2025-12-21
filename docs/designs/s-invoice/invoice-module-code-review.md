# Code Review: mkt-core/invoice Module

**Ngày review:** 2025-12-21
**Reviewer:** Claude Code
**Module:** `packages/twenty-server/src/mkt-core/invoice`

---

## Mục Lục

1. [Tổng Quan Module](#1-tổng-quan-module)
2. [Phân Tích Chi Tiết Từng File](#2-phân-tích-chi-tiết-từng-file)
3. [Vấn Đề Về Code Quality](#3-vấn-đề-về-code-quality)
4. [Vấn Đề Về Security](#4-vấn-đề-về-security)
5. [Vấn Đề Về Performance](#5-vấn-đề-về-performance)
6. [Vấn Đề Về Architecture](#6-vấn-đề-về-architecture)
7. [Đề Xuất Cải Thiện](#7-đề-xuất-cải-thiện)
8. [Refactoring Roadmap](#8-refactoring-roadmap)

---

## 1. Tổng Quan Module

### 1.1 Cấu Trúc Hiện Tại

```
mkt-core/invoice/
├── controllers/
│   └── invoice-file.controller.ts     ⚠️ Cần cải thiện
├── hooks/
│   ├── mkt-sinvoice-create-one.pre-query.hook.ts   ⚠️ Code trùng lặp
│   ├── mkt-sinvoice-create-one.post-query.hook.ts  ⚠️ Quá dài (495 lines)
│   ├── mkt-sinvoice-file-create-one.pre-query.hook.ts
│   └── mkt-sinvoice-file-update-one.pre-query.hook.ts  ⚠️ Có API call trong hook
├── integration/
│   └── s-invoice.integration.service.ts  ✅ Tốt
├── jobs/
│   └── s-invoice-integration.job.ts   ✅ Tốt
├── objects/
│   └── [8 workspace entities]          ✅ Tốt
├── invoice.constants.ts                ✅ Tốt
├── mkt-invoice.middleware.ts           ⚠️ Cần xem xét
├── mkt-invoice.module.ts               ✅ Tốt
├── mkt-invoice.service.ts              ⚠️ Code không được sử dụng
└── s-invoice.integration.service.ts    ❌ Trùng lặp file
```

### 1.2 Điểm Số Tổng Quan

| Tiêu chí | Điểm | Ghi chú |
|----------|------|---------|
| Code Quality | 6/10 | Code trùng lặp, file quá dài |
| Security | 5/10 | Thiếu validation, hardcoded secrets |
| Performance | 6/10 | N+1 queries, thiếu caching |
| Architecture | 7/10 | Tốt nhưng có duplicate |
| Maintainability | 5/10 | Hook quá phức tạp |
| Testability | 4/10 | Khó test do coupling cao |

---

## 2. Phân Tích Chi Tiết Từng File

### 2.1 invoice-file.controller.ts

**Vị trí:** `controllers/invoice-file.controller.ts`

#### Vấn đề phát hiện:

**[CRITICAL] Path Traversal Vulnerability (Line 67)**
```typescript
// NGUY HIỂM: fileName được truyền trực tiếp vào path.join
const filePath = path.join(uploadsDir, fileName);
```
Attacker có thể sử dụng `../../etc/passwd` để đọc file hệ thống.

**[HIGH] Hardcoded Secret Key (Line 52, 117)**
```typescript
const secretKey = process.env.FILE_DOWNLOAD_SECRET || 'default-secret-key';
```
Nếu env không set, sử dụng key mặc định → dễ bị tấn công.

**[MEDIUM] Error Swallowing (Line 89-91)**
```typescript
} catch (error) {
  throw new NotFoundException('File not found'); // Mất thông tin error gốc
}
```

**[LOW] Code Duplication**
- `generateSignature` xuất hiện 2 lần (controller và hook)
- Logic đọc file lặp lại trong `downloadFile` và `adminDownloadFile`

#### Đề xuất sửa:

```typescript
// 1. Validate fileName để ngăn path traversal
private validateFileName(fileName: string): void {
  if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    throw new UnauthorizedException('Invalid file name');
  }
}

// 2. Extract common file serving logic
private async serveFile(fileName: string, res: Response): Promise<void> {
  this.validateFileName(fileName);
  const filePath = path.join(this.uploadsDir, path.basename(fileName));
  // ... rest of logic
}
```

---

### 2.2 mkt-sinvoice-create-one.pre-query.hook.ts

**Vị trí:** `hooks/mkt-sinvoice-create-one.pre-query.hook.ts`

#### Vấn đề phát hiện:

**[MEDIUM] Dead Code (Line 259-303)**
```typescript
private async createSInvoiceItemsFromOrderItems(...) {
  // Hàm này không được gọi ở bất kỳ đâu
}
```

**[MEDIUM] Hardcoded Values (Line 153-154)**
```typescript
templateCode: input.templateCode || '1/770',
invoiceSeries: input.invoiceSeries || 'K23TXM',
```
Nên dùng constants hoặc config.

**[LOW] numberToWords có thể extract ra utils**
```typescript
// Hàm này có thể tái sử dụng ở nhiều nơi
private numberToWords(amount: number): string {
  // 68 lines of code
}
```

---

### 2.3 mkt-sinvoice-create-one.post-query.hook.ts

**Vị trí:** `hooks/mkt-sinvoice-create-one.post-query.hook.ts`

#### Vấn đề phát hiện:

**[HIGH] File quá dài (495 lines)**
Hook này làm quá nhiều việc trong một method:
- Tạo SInvoice Items
- Tạo Metadata
- Tạo Payments
- Tạo Tax Breakdowns
- Soft-delete SInvoices cũ

**[MEDIUM] N+1 Query Problem (Line 160-179)**
```typescript
const itemsToCreate = await Promise.all(
  itemsPayload.map(async (item) => {
    // Mỗi item gọi recordPositionService.buildRecordPosition
    const position = await this.recordPositionService.buildRecordPosition({...});
    return sInvoiceItemRepository.create({...});
  }),
);
```
Nếu có 100 items → 100 queries cho position.

**[MEDIUM] Code Duplication**
Logic tính toán `itemInfo` giống nhau giữa pre-hook và post-hook.

**[LOW] Magic Property Access (Line 70-73)**
```typescript
const meta = (created as unknown as Record<string, unknown>)
  .__preComputedItems as Array<...> | undefined;
```
Sử dụng type assertion phức tạp, khó maintain.

#### Đề xuất refactor:

```typescript
// Tách thành các method riêng biệt
private async createSInvoiceItems(created: MktSInvoiceWorkspaceEntity): Promise<void>
private async createSInvoiceMetadata(created: MktSInvoiceWorkspaceEntity): Promise<void>
private async createSInvoicePayments(created: MktSInvoiceWorkspaceEntity): Promise<void>
private async createTaxBreakdowns(created: MktSInvoiceWorkspaceEntity): Promise<void>
private async cleanupOldInvoices(created: MktSInvoiceWorkspaceEntity): Promise<void>
```

---

### 2.4 mkt-sinvoice-file-update-one.pre-query.hook.ts

**Vị trí:** `hooks/mkt-sinvoice-file-update-one.pre-query.hook.ts`

#### Vấn đề phát hiện:

**[CRITICAL] API Call trong Pre-Query Hook (Line 101-107)**
```typescript
// KHÔNG NÊN: Hook query không nên có side-effect như API call
const apiResponse = await this.callViettelInvoiceAPI({...});
```
Hook được thiết kế để biến đổi data trước khi lưu, không phải thực hiện external API calls.

**[HIGH] Blocking I/O trong Hook (Line 268)**
```typescript
fs.writeFileSync(filePath, fileBuffer); // BLOCKING!
```
Nên sử dụng `fs.promises.writeFile` để không block event loop.

**[MEDIUM] Duplicate Code**
- `generateSignature` trùng với controller
- `callViettelInvoiceAPI` trùng với integration service

**[LOW] Unused Variable (Line 259)**
```typescript
const _timestamp = new Date().toISOString().replace(/[:.]/g, '-');
```

---

### 2.5 s-invoice.integration.service.ts (integration/)

**Vị trí:** `integration/s-invoice.integration.service.ts`

#### Điểm tốt ✅

- Sử dụng `MoneyUtils` cho tính toán tài chính
- Xử lý error tốt với logging chi tiết
- Code có cấu trúc rõ ràng

#### Vấn đề phát hiện:

**[MEDIUM] Không sử dụng DateTimeUtils (Line 86-88)**
```typescript
// Nên dùng DateTimeUtils thay vì new Date()
const invoiceIssuedDate = sInvoice.invoiceIssuedDate
  ? new Date(sInvoice.invoiceIssuedDate).getTime()
  : null;
```

**[LOW] Hardcoded Default Values (Line 92-94)**
```typescript
invoiceType: sInvoice.invoiceType || '1',
templateCode: sInvoice.templateCode || '1/770',
invoiceSeries: sInvoice.invoiceSeries || 'K24GAM',
```

---

### 2.6 s-invoice.integration.service.ts (root - DUPLICATE)

**Vị trí:** `s-invoice.integration.service.ts`

#### Vấn đề phát hiện:

**[CRITICAL] Duplicate File**
File này có code gần giống với `integration/s-invoice.integration.service.ts`:
- Cùng tên class: `SInvoiceIntegrationService`
- Chức năng tương tự: `createInvoiceForOrder`

**Cần xóa 1 trong 2 file và merge logic.**

---

### 2.7 mkt-invoice.service.ts

**Vị trí:** `mkt-invoice.service.ts`

#### Vấn đề phát hiện:

**[HIGH] Unused Code / Dead Code**
```typescript
// Method được gọi từ middleware nhưng không rõ có ai dùng middleware này không
async customizeGraphQLRequest(operationName, variables): Promise<void> {
  if (operationName === 'CreateOneMktInvoice') {
    // Nhưng không có mutation nào tên này trong schema hiện tại
  }
}
```

**[MEDIUM] Circular Dependency Risk**
```typescript
constructor(
  private readonly sInvoiceIntegrationService: SInvoiceIntegrationService,
) {}
// Inject service từ file khác có thể gây circular dependency
```

---

### 2.8 mkt-invoice.middleware.ts

**Vị trí:** `mkt-invoice.middleware.ts`

#### Vấn đề phát hiện:

**[MEDIUM] Regex trong Production Code (Line 39-43)**
```typescript
if (!operationName && body.query) {
  const queryMatch = body.query.match(/mutation\s+(\w+)/);
  if (queryMatch) {
    detectedOperationName = queryMatch[1];
  }
}
```
Regex parsing GraphQL query không tin cậy, có thể fail với nested queries.

**[LOW] Silent Fail (Line 17-22)**
```typescript
} catch (error) {
  this.logger.error('Error in GraphQL request customization middleware:', error as Error);
}
// Middleware fail nhưng vẫn tiếp tục → có thể gây behavior không mong muốn
```

---

## 3. Vấn Đề Về Code Quality

### 3.1 Code Duplication

| Code Block | Xuất hiện tại | Giải pháp |
|------------|---------------|-----------|
| `generateSignature()` | Controller, Hook | Extract to shared util |
| `callViettelInvoiceAPI()` | Hook, Integration Service | Sử dụng Integration Service |
| Item calculation logic | Pre-hook, Post-hook, s-invoice.service | Extract to calculator service |
| MoneyUtils calculations | Multiple hooks | OK - đang dùng đúng |

### 3.2 Dead Code

```
- mkt-sinvoice-create-one.pre-query.hook.ts:259-303 (createSInvoiceItemsFromOrderItems)
- mkt-sinvoice-file-update-one.pre-query.hook.ts:259 (_timestamp)
- mkt-invoice.service.ts (có thể toàn bộ file không được sử dụng)
- mkt-invoice.middleware.ts (cần verify có được register không)
```

### 3.3 Type Safety Issues

```typescript
// Line 74 in post-hook - không an toàn
where: { mktOrderId: input.mktOrderId } as unknown as { mktOrderId: string }

// Nên define proper type hoặc use type guard
interface OrderFilter {
  mktOrderId: string;
}
```

---

## 4. Vấn Đề Về Security

### 4.1 Critical Issues

| ID | Vấn đề | File:Line | Mức độ |
|----|--------|-----------|--------|
| SEC-001 | Path Traversal | invoice-file.controller.ts:67 | 🔴 Critical |
| SEC-002 | Hardcoded Secrets | invoice-file.controller.ts:52,117 | 🔴 Critical |
| SEC-003 | Credentials in Code | s-invoice.integration.service.ts:27-29 | 🟡 High |

### 4.2 Recommendations

```typescript
// SEC-001 Fix: Validate và sanitize fileName
private sanitizeFileName(fileName: string): string {
  const sanitized = path.basename(fileName);
  if (sanitized !== fileName || sanitized.includes('..')) {
    throw new BadRequestException('Invalid file name');
  }
  return sanitized;
}

// SEC-002 Fix: Require env variable, throw if missing
private getSecretKey(): string {
  const key = process.env.FILE_DOWNLOAD_SECRET;
  if (!key) {
    throw new InternalServerErrorException('FILE_DOWNLOAD_SECRET not configured');
  }
  return key;
}

// SEC-003 Fix: Use config service với validation
constructor(
  @Inject(SINVOICE_CONFIG) private readonly config: SInvoiceConfig
) {}
```

---

## 5. Vấn Đề Về Performance

### 5.1 N+1 Query Problems

**Vị trí:** `mkt-sinvoice-create-one.post-query.hook.ts`

```typescript
// Hiện tại: N queries cho positions
const itemsToCreate = await Promise.all(
  itemsPayload.map(async (item) => {
    const position = await this.recordPositionService.buildRecordPosition({...}); // Query mỗi lần
    return sInvoiceItemRepository.create({...});
  }),
);

// Cải thiện: Batch position generation
const positions = await this.recordPositionService.buildBatchPositions({
  count: itemsPayload.length,
  objectMetadata: { nameSingular: 'mktSInvoiceItem' },
  workspaceId,
});
const itemsToCreate = itemsPayload.map((item, index) => ({
  ...item,
  position: positions[index],
}));
```

### 5.2 Blocking I/O

```typescript
// Hiện tại (blocking)
fs.writeFileSync(filePath, fileBuffer);
fs.existsSync(filePath);
fs.statSync(filePath);

// Cải thiện (non-blocking)
import { promises as fsPromises } from 'fs';
await fsPromises.writeFile(filePath, fileBuffer);
await fsPromises.stat(filePath);
```

### 5.3 Missing Caching

```typescript
// Đề xuất cache cho template/config
@Injectable()
export class SInvoiceConfigService {
  private configCache: Map<string, SInvoiceConfig> = new Map();

  async getConfig(workspaceId: string): Promise<SInvoiceConfig> {
    if (this.configCache.has(workspaceId)) {
      return this.configCache.get(workspaceId);
    }
    const config = await this.loadConfig(workspaceId);
    this.configCache.set(workspaceId, config);
    return config;
  }
}
```

---

## 6. Vấn Đề Về Architecture

### 6.1 Responsibility Issues

| Component | Current Responsibility | Should Be |
|-----------|----------------------|-----------|
| Pre-Query Hook | Data population + calculation | Only data population |
| Post-Query Hook | Create 5 related entities + soft-delete | Delegate to services |
| File Update Hook | API call + File save | Only prepare data, Job handles API |

### 6.2 Coupling Issues

```
invoice-file.controller ──┬── Tightly coupled to filesystem
                          └── Duplicated crypto logic

mkt-sinvoice-file-update-one.pre-query.hook ──┬── Calls external API (should be job)
                                               └── Writes to filesystem (side-effect)

s-invoice.integration.service (2 files!) ──── Duplicate functionality
```

### 6.3 Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Invoice Module                            │
├─────────────────────────────────────────────────────────────────┤
│  Controllers                                                     │
│  ├── InvoiceFileController (download only)                      │
│  └── InvoiceApiController (CRUD operations) [NEW]               │
├─────────────────────────────────────────────────────────────────┤
│  Services                                                        │
│  ├── SInvoiceIntegrationService (API calls)                     │
│  ├── InvoiceCalculatorService (calculations) [NEW]              │
│  ├── InvoiceFileService (file operations) [NEW]                 │
│  └── InvoiceConfigService (configuration) [NEW]                 │
├─────────────────────────────────────────────────────────────────┤
│  Hooks (lightweight, no side-effects)                           │
│  ├── SInvoiceCreatePreHook (data population only)               │
│  └── SInvoiceCreatePostHook (trigger jobs only)                 │
├─────────────────────────────────────────────────────────────────┤
│  Jobs                                                            │
│  ├── SInvoiceIntegrationJob (sync to Viettel)                   │
│  ├── InvoiceFileDownloadJob (download files) [NEW]              │
│  └── InvoiceCleanupJob (cleanup old invoices) [NEW]             │
├─────────────────────────────────────────────────────────────────┤
│  Utils                                                           │
│  ├── NumberToWordsUtil [NEW]                                    │
│  └── SignatureUtil [NEW]                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Đề Xuất Cải Thiện

### 7.1 High Priority (Cần làm ngay)

#### 7.1.1 Fix Security Issues

```typescript
// 1. Path Traversal Fix
// File: invoice-file.controller.ts

import { BadRequestException } from '@nestjs/common';

private sanitizeFileName(fileName: string): string {
  // Remove any path components
  const baseName = path.basename(fileName);

  // Validate characters
  if (!/^[a-zA-Z0-9._-]+$/.test(baseName)) {
    throw new BadRequestException('Invalid file name characters');
  }

  // Validate extension
  const allowedExtensions = ['.pdf', '.zip'];
  const ext = path.extname(baseName).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    throw new BadRequestException('Invalid file extension');
  }

  return baseName;
}
```

#### 7.1.2 Remove Duplicate File

```bash
# Xóa file duplicate
rm packages/twenty-server/src/mkt-core/invoice/s-invoice.integration.service.ts

# Update module imports to use integration/s-invoice.integration.service.ts
```

#### 7.1.3 Move API Call out of Hook

```typescript
// File: mkt-sinvoice-file-update-one.pre-query.hook.ts

// BEFORE: API call trong hook
async execute(authContext, objectName, payload) {
  const apiResponse = await this.callViettelInvoiceAPI({...}); // ❌
  // ...
}

// AFTER: Chỉ trigger job
async execute(authContext, objectName, payload) {
  if (input.status === SINVOICE_FILE_STATUS.GETTING) {
    // Queue job để xử lý async
    await this.messageQueueService.add(
      InvoiceFileDownloadJob.name,
      { fileId, workspaceId }
    );

    // Set status to PENDING, job sẽ update khi xong
    return {
      ...payload,
      data: { ...input, status: SINVOICE_FILE_STATUS.PENDING }
    };
  }
  return payload;
}
```

### 7.2 Medium Priority

#### 7.2.1 Extract Shared Utils

```typescript
// File: src/mkt-core/utils/number-to-words.util.ts

export class NumberToWordsUtil {
  private static readonly units = ['', 'nghìn', 'triệu', 'tỷ'];
  private static readonly ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  private static readonly tens = ['', 'mười', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];

  static convert(amount: number, currency = 'VND'): string {
    if (amount === 0) return 'không đồng';

    let result = '';
    let unitIndex = 0;

    while (amount > 0) {
      const chunk = amount % 1000;
      if (chunk > 0) {
        result = this.convertChunk(chunk) + this.units[unitIndex] + ' ' + result;
      }
      amount = Math.floor(amount / 1000);
      unitIndex++;
    }

    return result.trim() + (currency === 'VND' ? ' đồng' : ` ${currency}`);
  }

  private static convertChunk(chunk: number): string {
    // ... implementation
  }
}
```

#### 7.2.2 Create InvoiceCalculatorService

```typescript
// File: src/mkt-core/invoice/services/invoice-calculator.service.ts

@Injectable()
export class InvoiceCalculatorService {
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
      };
    });
  }

  calculateTotals(items: InvoiceItemInfo[]): InvoiceTotals {
    return {
      totalAmountWithoutTax: MoneyUtils.sumBy(items, 'itemTotalAmountWithoutTax').toNumber(),
      totalTaxAmount: MoneyUtils.sumBy(items, 'taxAmount').toNumber(),
      totalAmountWithTax: MoneyUtils.add(
        MoneyUtils.sumBy(items, 'itemTotalAmountWithoutTax'),
        MoneyUtils.sumBy(items, 'taxAmount')
      ).toNumber(),
    };
  }

  calculateTaxBreakdowns(items: InvoiceItemInfo[]): TaxBreakdown[] {
    const groups = new Map<number, { taxableAmount: number; taxAmount: number }>();

    for (const item of items) {
      const key = item.taxPercentage;
      const g = groups.get(key) || { taxableAmount: 0, taxAmount: 0 };
      g.taxableAmount = MoneyUtils.add(g.taxableAmount, item.itemTotalAmountWithoutTax).toNumber();
      g.taxAmount = MoneyUtils.add(g.taxAmount, item.taxAmount).toNumber();
      groups.set(key, g);
    }

    return Array.from(groups.entries()).map(([taxPercentage, v]) => ({
      taxPercentage,
      taxableAmount: v.taxableAmount,
      taxAmount: v.taxAmount,
    }));
  }
}
```

#### 7.2.3 Refactor Post-Hook

```typescript
// File: mkt-sinvoice-create-one.post-query.hook.ts

@Injectable()
@WorkspaceQueryHook({ key: 'mktSInvoice.createOne', type: WorkspaceQueryHookType.POST_HOOK })
export class MktSInvoiceCreateOnePostQueryHook implements WorkspacePostQueryHookInstance {

  constructor(
    private readonly invoiceItemCreator: InvoiceItemCreatorService,
    private readonly invoiceMetadataCreator: InvoiceMetadataCreatorService,
    private readonly invoicePaymentCreator: InvoicePaymentCreatorService,
    private readonly invoiceTaxCreator: InvoiceTaxCreatorService,
    private readonly invoiceCleanupService: InvoiceCleanupService,
  ) {}

  async execute(authContext: AuthContext, objectName: string, payload: MktSInvoiceWorkspaceEntity[]): Promise<void> {
    const created = payload?.[0];
    if (!created) return;

    try {
      // Delegate to specialized services
      await this.invoiceItemCreator.create(created);
      await this.invoiceMetadataCreator.create(created);
      await this.invoicePaymentCreator.create(created);
      await this.invoiceTaxCreator.create(created);
      await this.invoiceCleanupService.cleanupOldInvoices(created);
    } catch (error) {
      this.logger.error('[SInvoice POST HOOK] Failed', error);
    }
  }
}
```

### 7.3 Low Priority

#### 7.3.1 Add Configuration Validation

```typescript
// File: src/mkt-core/invoice/config/invoice.config.ts

import { z } from 'zod';

export const SInvoiceConfigSchema = z.object({
  baseUrl: z.string().url(),
  taxCode: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  templateCode: z.string().default('1/770'),
  invoiceSeries: z.string().default('K23TXM'),
  timeout: z.number().default(30000),
});

export type SInvoiceConfig = z.infer<typeof SInvoiceConfigSchema>;

export const validateSInvoiceConfig = (): SInvoiceConfig => {
  return SInvoiceConfigSchema.parse({
    baseUrl: process.env.S_INVOICE_BASE_URL,
    taxCode: process.env.S_INVOICE_TAX_CODE,
    username: process.env.S_INVOICE_USERNAME,
    password: process.env.S_INVOICE_PASSWORD,
    templateCode: process.env.S_INVOICE_TEMPLATE_CODE,
    invoiceSeries: process.env.S_INVOICE_SERIES,
    timeout: parseInt(process.env.S_INVOICE_TIMEOUT || '30000'),
  });
};
```

#### 7.3.2 Add Unit Tests

```typescript
// File: src/mkt-core/invoice/services/__tests__/invoice-calculator.service.spec.ts

describe('InvoiceCalculatorService', () => {
  let service: InvoiceCalculatorService;

  beforeEach(() => {
    service = new InvoiceCalculatorService();
  });

  describe('calculateItemInfo', () => {
    it('should calculate correct amounts without tax', () => {
      const items = [{ quantity: 2, unitPrice: 100000, taxPercentage: 0 }];
      const result = service.calculateItemInfo(items as any);
      expect(result[0].itemTotalAmountWithoutTax).toBe(200000);
      expect(result[0].taxAmount).toBe(0);
    });

    it('should calculate correct amounts with 10% VAT', () => {
      const items = [{ quantity: 1, unitPrice: 1000000, taxPercentage: 10 }];
      const result = service.calculateItemInfo(items as any);
      expect(result[0].itemTotalAmountWithoutTax).toBe(1000000);
      expect(result[0].taxAmount).toBe(100000);
      expect(result[0].itemTotalAmountWithTax).toBe(1100000);
    });
  });
});
```

---

## 8. Refactoring Roadmap

### Phase 1: Critical Fixes (1-2 ngày)

| Task | Priority | Effort |
|------|----------|--------|
| Fix Path Traversal vulnerability | 🔴 Critical | 2h |
| Remove hardcoded secrets | 🔴 Critical | 1h |
| Remove duplicate s-invoice.integration.service.ts | 🔴 Critical | 1h |
| Move API call from hook to job | 🟡 High | 4h |

### Phase 2: Code Quality (2-3 ngày)

| Task | Priority | Effort |
|------|----------|--------|
| Extract NumberToWordsUtil | 🟡 Medium | 2h |
| Create InvoiceCalculatorService | 🟡 Medium | 4h |
| Refactor post-hook (split services) | 🟡 Medium | 6h |
| Replace blocking fs calls | 🟡 Medium | 2h |

### Phase 3: Architecture (3-4 ngày)

| Task | Priority | Effort |
|------|----------|--------|
| Create InvoiceFileService | 🟢 Low | 4h |
| Create InvoiceConfigService with Zod | 🟢 Low | 3h |
| Add comprehensive unit tests | 🟢 Low | 8h |
| Clean up dead code | 🟢 Low | 2h |

### Tổng Effort Ước Tính: **6-9 ngày**

---

## Phụ Lục

### A. Checklist Before Merge

- [ ] Path Traversal fixed
- [ ] No hardcoded secrets
- [ ] No blocking I/O calls
- [ ] No API calls in hooks
- [ ] No duplicate files
- [ ] Unit tests added
- [ ] Linting passed
- [ ] Type checking passed

### B. Files to Delete

```
packages/twenty-server/src/mkt-core/invoice/s-invoice.integration.service.ts
```

### C. Files to Create

```
packages/twenty-server/src/mkt-core/invoice/
├── config/
│   └── invoice.config.ts
├── services/
│   ├── invoice-calculator.service.ts
│   ├── invoice-file.service.ts
│   ├── invoice-item-creator.service.ts
│   ├── invoice-metadata-creator.service.ts
│   ├── invoice-payment-creator.service.ts
│   ├── invoice-tax-creator.service.ts
│   └── invoice-cleanup.service.ts
├── jobs/
│   └── invoice-file-download.job.ts
└── __tests__/
    ├── invoice-calculator.service.spec.ts
    └── invoice-file.controller.spec.ts
```

---

**Người review:** Claude Code
**Cập nhật lần cuối:** 2025-12-21
