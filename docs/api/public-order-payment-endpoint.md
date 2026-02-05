# Public Order Payment - GraphQL Query

## Tổng quan

GraphQL query public trả về link QR thanh toán SePay và thông tin cơ bản của đơn hàng để render trang thanh toán cho khách hàng.

> **QR lifecycle do SePay/ngân hàng quản lý** (tạo, hết hạn, xác nhận). Server chỉ lưu và trả lại `qrCodeUrl`.

---

## 1. GraphQL Schema

```graphql
type Query {
  mktPublicOrderPayment(orderCode: String!): MktPublicOrderPaymentResponseDto!
}

type MktPublicOrderPaymentResponseDto {
  success: Boolean!
  data: MktPublicOrderPaymentDataDto
  error: MktPublicOrderPaymentErrorDto
}

type MktPublicOrderPaymentErrorDto {
  code: String!
  message: String!
}

type MktPublicOrderPaymentDataDto {
  order: MktPublicOrderInfoDto!
  customer: MktPublicCustomerInfoDto!
  items: [MktPublicOrderItemDto!]!
  payment: MktPublicPaymentInfoDto!
  company: MktPublicCompanyInfoDto!
}

"Amounts tính bằng đơn vị nhỏ nhất của currency (VND = đồng, Int tránh floating-point precision loss)"
type MktPublicOrderInfoDto {
  orderCode: String!
  status: String!
  paymentStatus: String!
  subtotal: Int!
  tax: Int!
  discount: Int!
  totalAmount: Int!
  paidAmount: Int!
  remainingAmount: Int!
  currency: String!
  paymentDeadline: String
  createdAt: String!
}

type MktPublicCustomerInfoDto {
  name: String!
  email: String
  phone: String
}

type MktPublicOrderItemDto {
  name: String!
  quantity: Int!
  unitPrice: Int!
  totalPrice: Int!
  productName: String
  packageName: String
}

type MktPublicPaymentInfoDto {
  "Link QR từ SePay. Lifecycle (hết hạn, renew) do SePay quản lý."
  qrCodeUrl: String!
  amount: Int!
  currency: String!
  bankInfo: MktPublicBankInfoDto
}

type MktPublicBankInfoDto {
  bankName: String
  accountNumber: String
  accountHolder: String
}

type MktPublicCompanyInfoDto {
  name: String!
  address: String
  phone: String
  email: String
}
```

---

## 2. Status Rules

### Allowed Order Statuses (whitelist)

| Order Status | Cho phép? | Error Code |
|---|---|---|
| `CONFIRMED` | Yes | - |
| `PENDING_PAYMENT` | Yes | - |
| `DRAFT` | No | `ORDER_NOT_PAYABLE` |
| `PROCESSING` | No | `ORDER_NOT_PAYABLE` |
| `CANCELLED` | No | `ORDER_CANCELLED` |
| `COMPLETED` | No | `ORDER_ALREADY_COMPLETED` |

### Allowed Payment Statuses (whitelist)

| Payment Status | Cho phép? | Error Code |
|---|---|---|
| `PENDING` | Yes | - |
| `PARTIAL` | Yes | - |
| `OVERDUE` | Yes | - |
| `PAID` | No | `ORDER_ALREADY_PAID` |
| `VOID` | No | `ORDER_PAYMENT_VOIDED` |
| `REFUNDED` | No | `ORDER_PAYMENT_REFUNDED` |

### Active Payment Selection

1. Filter: `status IN ('PENDING', 'AWAITING_CONFIRMATION')`
2. Sort: `createdAt DESC`
3. Lấy record đầu tiên. Không có → error `NO_ACTIVE_PAYMENT`

---

## 3. Example

### Request

```graphql
query MktPublicOrderPayment($orderCode: String!) {
  mktPublicOrderPayment(orderCode: $orderCode) {
    success
    error { code message }
    data {
      order {
        orderCode status paymentStatus
        subtotal tax discount
        totalAmount paidAmount remainingAmount currency
        paymentDeadline createdAt
      }
      customer { name email phone }
      items { name quantity unitPrice totalPrice productName packageName }
      payment {
        qrCodeUrl amount currency
        bankInfo { bankName accountNumber accountHolder }
      }
      company { name address phone email }
    }
  }
}
```

### Success Response

```json
{
  "data": {
    "mktPublicOrderPayment": {
      "success": true,
      "error": null,
      "data": {
        "order": {
          "orderCode": "MKT-20250205-000123",
          "status": "PENDING_PAYMENT",
          "paymentStatus": "PENDING",
          "subtotal": 5900000,
          "tax": 0,
          "discount": 0,
          "totalAmount": 5900000,
          "paidAmount": 0,
          "remainingAmount": 5900000,
          "currency": "VND",
          "paymentDeadline": "2025-02-12T23:59:59.000Z",
          "createdAt": "2025-02-05T10:30:00.000Z"
        },
        "customer": {
          "name": "Nguyễn Văn A",
          "email": "nguyenvana@example.com",
          "phone": "0901234567"
        },
        "items": [
          {
            "name": "MKT Pro - Gói 1 năm",
            "quantity": 1,
            "unitPrice": 5900000,
            "totalPrice": 5900000,
            "productName": "MKT Pro",
            "packageName": "Gói 1 năm"
          }
        ],
        "payment": {
          "qrCodeUrl": "https://qr.sepay.vn/img?acc=123456789&bank=BIDV&amount=5900000&des=MKT-20250205-000123",
          "amount": 5900000,
          "currency": "VND",
          "bankInfo": {
            "bankName": "BIDV",
            "accountNumber": "123456789",
            "accountHolder": "CONG TY TNHH MARKETING AI VIET NAM"
          }
        },
        "company": {
          "name": "Marketing AI Việt Nam",
          "address": null,
          "phone": null,
          "email": null
        }
      }
    }
  }
}
```

### Error Responses

Business errors trả trong `error` field (HTTP luôn 200). Message **không chứa orderCode** (anti-enumeration).

| Code | Message | Khi nào |
|---|---|---|
| `ORDER_NOT_FOUND` | Không tìm thấy thông tin thanh toán | Invalid format hoặc không tồn tại |
| `ORDER_NOT_PAYABLE` | Đơn hàng chưa sẵn sàng để thanh toán | DRAFT, PROCESSING |
| `ORDER_CANCELLED` | Đơn hàng đã bị hủy | CANCELLED |
| `ORDER_ALREADY_COMPLETED` | Đơn hàng đã hoàn tất | COMPLETED |
| `ORDER_ALREADY_PAID` | Đơn hàng đã được thanh toán | PAID |
| `ORDER_PAYMENT_VOIDED` | Thanh toán cho đơn hàng đã bị hủy | VOID |
| `ORDER_PAYMENT_REFUNDED` | Đơn hàng đã được hoàn tiền | REFUNDED |
| `NO_ACTIVE_PAYMENT` | Không có thông tin thanh toán khả dụng | Không có payment PENDING |
| `RATE_LIMITED` | Quá nhiều yêu cầu, vui lòng thử lại sau | > 20 req/min per IP |

---

## 4. Security

### Rate Limiting (bắt buộc)

Dùng `RedisRateLimiterService` có sẵn, 20 req/min per IP:

```typescript
const PUBLIC_ORDER_RATE_LIMIT = {
  MAX_ATTEMPTS: 20,
  WINDOW_MS: 60_000,
  KEY_PREFIX: 'mkt:public-order',
} as const;
```

### Anti-Enumeration

| Biện pháp | Chi tiết |
|---|---|
| Format validation | Regex `^[A-Z]{2,5}-\d{8}-\d{6}$` trước khi query DB |
| Generic message | `ORDER_NOT_FOUND` không chứa orderCode. Invalid format = same response |
| Timing mitigation | Random delay 50-150ms khi not found |

### Output Encoding

Server **không escape HTML** (GraphQL = JSON, không có XSS risk ở transport). Client dùng JSX `{value}` (React auto-escapes).

### GraphQL Error Masking

- Business errors → response DTO `{ success: false, error }`, HTTP 200
- Unexpected errors → GraphQL framework mask thành `"Internal server error"` trong production
- Config: `maskedErrors: process.env.NODE_ENV === 'production'`

### Caching

**Không cache** (payment data dynamic + PII): `Cache-Control: no-store`

### Thông tin KHÔNG trả về

citizenId, taxCode, internal IDs, license keys, internal notes, payment history, staff info

---

## 5. Logging

```typescript
this.logger.log('Public order payment query', {
  orderCodeMasked: maskOrderCode(orderCode), // "MKT-202502**-***123"
  clientIp,
  result, // SUCCESS | NOT_FOUND | BLOCKED | RATE_LIMITED
  durationMs,
});
```

Log **không chứa** QR URL gốc, accountNumber đầy đủ, customer email/phone.

Alert khi: rate limit exceeded liên tục, nhiều NOT_FOUND từ 1 IP, traffic spike bất thường.

---

## 6. Implementation

### File Structure

```
packages/twenty-server/src/mkt-core/order/
├── resolvers/order-public.resolver.ts
├── services/public/order-public.service.ts
├── dto/public/order-payment-public.output.ts
└── constants/public-order.constants.ts
```

### Resolver

```typescript
@Resolver()
export class OrderPublicResolver {
  constructor(private readonly orderPublicService: OrderPublicService) {}

  @UseGuards(PublicEndpointGuard)
  @Query(() => MktPublicOrderPaymentResponseDto, {
    description: 'Get public order payment info for payment page rendering',
  })
  async mktPublicOrderPayment(
    @Args('orderCode') orderCode: string,
    @Context() ctx: GraphQLContext,
  ): Promise<MktPublicOrderPaymentResponseDto> {
    const clientIp = ctx.req?.ip ?? ctx.req?.socket?.remoteAddress ?? 'unknown';

    return this.orderPublicService.getOrderPaymentPublicInfo(orderCode, clientIp);
  }
}
```

### Service

```typescript
const DEFAULT_CURRENCY = 'VND';
const DEFAULT_CUSTOMER_NAME = 'Khách hàng';

@Injectable()
export class OrderPublicService {
  private readonly logger = new Logger(OrderPublicService.name);

  constructor(
    private readonly mktOrderRepository: MktOrderRepository,
    private readonly redisRateLimiterService: RedisRateLimiterService,
    private readonly configService: ConfigService,
  ) {}

  async getOrderPaymentPublicInfo(
    orderCode: string,
    clientIp: string,
  ): Promise<MktPublicOrderPaymentResponseDto> {
    // 1. Rate limit
    const rateLimitError = await this.checkRateLimit(clientIp);
    if (rateLimitError) return rateLimitError;

    // 2. Validate format (same response as not found)
    if (!ORDER_CODE_PATTERN.test(orderCode)) {
      await this.antiEnumerationDelay();
      return this.notFoundResponse();
    }

    // 3. Find order
    const order = await this.mktOrderRepository.findByOrderCodeWithRelations(
      orderCode,
      ['mktCustomer', 'orderItems', 'mktPayments', 'mktPayments.mktPaymentMethod'],
    );

    if (!order) {
      await this.antiEnumerationDelay();
      return this.notFoundResponse();
    }

    // 4. Validate statuses
    const statusError = this.validateOrderStatus(order);
    if (statusError) return statusError;

    // 5. Find active payment
    const activePayment = this.getActivePayment(order.mktPayments);
    if (!activePayment) {
      return this.errorResponse(
        PUBLIC_ORDER_ERROR_CODE.NO_ACTIVE_PAYMENT,
        PUBLIC_ORDER_ERROR_MESSAGE.noActivePayment,
      );
    }

    // 6. Build response
    return { success: true, data: this.buildData(order, activePayment) };
  }

  private getActivePayment(
    payments: MktPaymentWorkspaceEntity[],
  ): MktPaymentWorkspaceEntity | null {
    if (!payments || payments.length === 0) return null;

    return _.chain(payments)
      .filter((p) => ACTIVE_PAYMENT_STATUSES.has(p.status))
      .orderBy(['createdAt'], ['desc'])
      .head()
      .value() ?? null;
  }

  private buildData(
    order: MktOrderWorkspaceEntity,
    payment: MktPaymentWorkspaceEntity,
  ): MktPublicOrderPaymentDataDto {
    return {
      order: {
        orderCode: order.orderCode,
        status: order.status,
        paymentStatus: order.paymentStatus,
        subtotal: MoneyUtils.round(order.subtotal ?? 0, 0).toNumber(),
        tax: MoneyUtils.round(order.tax ?? 0, 0).toNumber(),
        discount: MoneyUtils.round(order.discount ?? 0, 0).toNumber(),
        totalAmount: MoneyUtils.round(order.totalAmount ?? 0, 0).toNumber(),
        paidAmount: MoneyUtils.round(order.paidAmount ?? 0, 0).toNumber(),
        remainingAmount: MoneyUtils.round(order.remainingAmount ?? 0, 0).toNumber(),
        currency: order.currency ?? DEFAULT_CURRENCY,
        paymentDeadline: order.paymentDeadline
          ? DateTimeUtils.toISO(DateTimeUtils.fromJSDate(order.paymentDeadline))
          : null,
        createdAt: DateTimeUtils.toISO(DateTimeUtils.fromJSDate(order.createdAt)),
      },
      customer: {
        name: order.mktCustomer?.name ?? DEFAULT_CUSTOMER_NAME,
        email: order.mktCustomer?.email ?? null,
        phone: order.mktCustomer?.phone ?? null,
      },
      items: (order.orderItems ?? []).map((item) => ({
        name: item.name,
        quantity: item.quantity ?? 1,
        unitPrice: MoneyUtils.round(item.unitPrice ?? 0, 0).toNumber(),
        totalPrice: MoneyUtils.round(item.totalPrice ?? 0, 0).toNumber(),
        productName: item.snapshotProductName ?? null,
        packageName: item.snapshotPackageName ?? null,
      })),
      payment: {
        qrCodeUrl: payment.qrCodeUrl,
        amount: MoneyUtils.round(payment.amount ?? 0, 0).toNumber(),
        currency: payment.currency ?? DEFAULT_CURRENCY,
        bankInfo: payment.mktPaymentMethod
          ? {
              bankName: payment.mktPaymentMethod.bankName ?? null,
              accountNumber: payment.mktPaymentMethod.accountNumber ?? null,
              accountHolder: payment.mktPaymentMethod.accountHolderName ?? null,
            }
          : null,
      },
      company: {
        name: this.configService.get('MKT_COMPANY_NAME', 'Marketing AI Việt Nam'),
        address: this.configService.get('MKT_COMPANY_ADDRESS', null),
        phone: this.configService.get('MKT_COMPANY_PHONE', null),
        email: this.configService.get('MKT_COMPANY_EMAIL', null),
      },
    };
  }

  // ... checkRateLimit, validateOrderStatus, antiEnumerationDelay (xem Section 2, 4)
}
```

---

## 7. Client-side Usage

```typescript
const MKT_PUBLIC_ORDER_PAYMENT = gql`
  query MktPublicOrderPayment($orderCode: String!) {
    mktPublicOrderPayment(orderCode: $orderCode) {
      success
      error { code message }
      data {
        order { orderCode status paymentStatus subtotal tax discount totalAmount paidAmount remainingAmount currency paymentDeadline createdAt }
        customer { name email phone }
        items { name quantity unitPrice totalPrice productName packageName }
        payment { qrCodeUrl amount currency bankInfo { bankName accountNumber accountHolder } }
        company { name }
      }
    }
  }
`;

const usePublicOrderPayment = (orderCode: string) => {
  const { data, loading, error } = useQuery(MKT_PUBLIC_ORDER_PAYMENT, {
    variables: { orderCode },
    fetchPolicy: 'no-cache',
  });

  const result = data?.mktPublicOrderPayment;

  return {
    loading,
    graphqlError: error,
    success: result?.success ?? false,
    orderData: result?.data ?? null,
    businessError: result?.error ?? null,
  };
};

// Format tiền: Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 })
```

---

## 8. Roadmap triển khai

### Phase 1: Backend Core (Priority: Critical)

| # | Task | Mô tả | Dependencies |
|---|------|-------|-------------|
| 1.1 | Tạo constants & error codes | `public-order.constants.ts` - định nghĩa `PUBLIC_ORDER_ERROR_CODE`, `PUBLIC_ORDER_ERROR_MESSAGE`, `ORDER_CODE_PATTERN`, `ACTIVE_PAYMENT_STATUSES`, rate limit config | - |
| 1.2 | Tạo DTO output types | `order-payment-public.output.ts` - tất cả GraphQL output types (Response, Data, Order, Customer, Item, Payment, Bank, Company) | - |
| 1.3 | Implement `OrderPublicService` | `services/public/order-public.service.ts` - business logic: rate limit, format validation, status validation, active payment selection, response building | 1.1, 1.2 |
| 1.4 | Implement `OrderPublicResolver` | `resolvers/order-public.resolver.ts` - GraphQL query endpoint với `PublicEndpointGuard` | 1.3 |
| 1.5 | Register vào module | Thêm resolver + service vào `MktOrderModule` providers | 1.4 |

### Phase 2: Security Layer (Priority: Critical)

| # | Task | Mô tả | Dependencies |
|---|------|-------|-------------|
| 2.1 | Rate limiting | Tích hợp `RedisRateLimiterService` - 20 req/min per IP | Phase 1 |
| 2.2 | Anti-enumeration | Format validation regex + random delay 50-150ms cho NOT_FOUND | Phase 1 |
| 2.3 | GraphQL error masking | Verify `maskedErrors` config trong production, business errors trả qua DTO | Phase 1 |
| 2.4 | Output sanitization | Đảm bảo không leak internal IDs, citizenId, taxCode, license keys, staff info | Phase 1 |

### Phase 3: Repository & Data Access (Priority: High)

| # | Task | Mô tả | Dependencies |
|---|------|-------|-------------|
| 3.1 | `findByOrderCodeWithRelations` | Thêm method vào `MktOrderRepository` - query order với relations: customer, orderItems, payments, paymentMethod | - |
| 3.2 | Company config | Thêm env vars: `MKT_COMPANY_NAME`, `MKT_COMPANY_ADDRESS`, `MKT_COMPANY_PHONE`, `MKT_COMPANY_EMAIL` | - |

### Phase 4: Frontend Integration (Priority: Medium)

| # | Task | Mô tả | Dependencies |
|---|------|-------|-------------|
| 4.1 | GraphQL query | Tạo `MKT_PUBLIC_ORDER_PAYMENT` query và `usePublicOrderPayment` hook | Phase 1-3 backend deployed |
| 4.2 | Payment page UI | Trang thanh toán: hiển thị order info, QR code, bank info, items list | 4.1 |
| 4.3 | Error handling UI | Hiển thị business errors (hủy, đã thanh toán, hết hạn...) với UX phù hợp | 4.1 |
| 4.4 | Currency formatting | `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 })` | 4.2 |

### Phase 5: Observability (Priority: Medium)

| # | Task | Mô tả | Dependencies |
|---|------|-------|-------------|
| 5.1 | Structured logging | Log với `orderCodeMasked`, `clientIp`, `result`, `durationMs` - không log QR URL, accountNumber, PII | Phase 1 |
| 5.2 | Alerting rules | Alert khi: rate limit exceeded liên tục, nhiều NOT_FOUND từ 1 IP, traffic spike | 5.1 |

---

### Timeline tổng quan

```
Week 1: Phase 1 + Phase 3 (Backend Core + Data Access)
Week 2: Phase 2 (Security Layer) + Phase 5 (Logging)
Week 3: Phase 4 (Frontend Integration)
Week 4: QA + Bug fixes + Deploy staging
```

### Checklist trước khi deploy production

- [ ] Rate limiting hoạt động đúng (20 req/min per IP)
- [ ] Anti-enumeration: invalid format và not found trả cùng response + timing
- [ ] Error messages không chứa orderCode
- [ ] Không leak internal data (IDs, citizenId, license keys...)
- [ ] GraphQL error masking enabled trong production
- [ ] Logging đúng format, không log sensitive data
- [ ] Company info lấy từ env config
- [ ] Amounts là integers (VND = đồng)
- [ ] `fetchPolicy: 'no-cache'` ở client
- [ ] Active payment selection: chỉ PENDING/AWAITING_CONFIRMATION, sort createdAt DESC
