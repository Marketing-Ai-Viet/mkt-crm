# Order & Combo Integration Design

## 1. Overview

Tài liệu này mô tả cách tích hợp **mkt-combo** module vào **mkt-order** để hỗ trợ tạo đơn hàng với combo.

### Mục tiêu

- Hỗ trợ tạo đơn hàng với **product đơn lẻ** (hiện tại)
- Hỗ trợ tạo đơn hàng với **combo** (mới)
- Có thể **mix** product và combo trong cùng một đơn hàng (optional)

---

## 2. Hiện trạng

### 2.1 mkt-combo module

```
MktGenericCombo
├── comboCode: string (unique)
├── name: string
├── description: string | null
├── pricingType: FIXED | SUM | DISCOUNT
├── fixedPrice: number | null (khi pricingType = FIXED)
├── discountPercent: number | null (khi pricingType = DISCOUNT)
├── validFrom: Date | null
├── validTo: Date | null
├── isActive: boolean
├── currency: string (default: VND)
└── items[] -> MktGenericComboItem
    ├── itemType: DIGITAL_EXTERNAL | SERVICE | CUSTOM
    ├── displayName: string
    ├── quantity: number
    ├── overridePrice: number | null
    ├── position: number
    │
    ├── [DIGITAL_EXTERNAL]
    │   ├── externalPackageId: string (BẮT BUỘC)
    │   ├── externalProductId: string | null
    │   ├── externalPackageCode: string | null
    │   └── externalProductCode: string | null
    │
    ├── [SERVICE]
    │   ├── serviceName: string
    │   ├── serviceDescription: string | null
    │   └── servicePrice: number
    │
    └── [CUSTOM]
        ├── customName: string
        ├── customDescription: string | null
        └── customPrice: number
```

### 2.2 mkt-order module (hiện tại)

```typescript
// CreateOrderWithItemsInputDto
{
  customerId: string;
  currency?: string;
  note?: string;
  requireContract?: boolean;
  orderLanguage?: string;
  action: CREATE_ORDER_ACTION;  // NEW_ORDER | LICENSE_RENEWING | TRIAL_TO_PAID

  // Product-based items
  externalProducts: ExternalMktProductInputDto[];

  // Promotion
  couponCode?: string;
  applyAutoPromotions?: boolean;

  // Payment
  paymentMethods?: OrderPaymentMethodInputDto[];
}

// ExternalMktProductInputDto
{
  productId: string;
  packageId: string;
  maxDevices?: number;
  splitLicenses?: boolean;
}
```

### 2.3 Create Order Saga Flow (hiện tại)

```
1. CreateOrderStep        - Tạo order entity
2. CreateSnapshotsStep    - Validate & create product/package snapshots
3. CreateOrderItemsStep   - Tạo order items từ external products
4. CalculatePromotionStep - Calculate and apply promotions
5. CreateLicensesStep     - Tạo licenses cho order items
6. CreatePaymentStep      - Tạo payment (nếu không phải TRIAL)
7. FinalizeOrderStep      - Finalize order status
```

---

## 3. Đề xuất thiết kế

### 3.1 Approach Comparison

| Approach | Mô tả | Ưu điểm | Nhược điểm |
|----------|-------|---------|------------|
| **A. Mutually Exclusive** | Order chỉ có thể là product-based HOẶC combo-based | Đơn giản, logic tách biệt | Không linh hoạt |
| **B. Extend OrderItem** | OrderItem hỗ trợ 2 source: PRODUCT hoặc COMBO_ITEM | Linh hoạt, reuse code | Phức tạp hơn |
| **C. Hybrid (Đề xuất)** | Kết hợp A + B với validation rõ ràng | Cân bằng giữa đơn giản và linh hoạt | Cần thiết kế cẩn thận |

### 3.2 Đề xuất: Hybrid Approach

#### 3.2.1 Input DTO mới

```typescript
// create-order.input.ts

@InputType()
export class ComboOrderInputDto {
  @Field(() => String, { description: 'Combo ID' })
  @IsUUID()
  comboId: string;

  @Field(() => Int, { defaultValue: 1, description: 'Số lượng combo' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Override maxDevices cho tất cả digital items trong combo'
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxDevices?: number;

  @Field(() => Boolean, {
    nullable: true,
    defaultValue: false,
    description: 'Split licenses cho digital items'
  })
  @IsOptional()
  @IsBoolean()
  splitLicenses?: boolean;
}

@InputType()
export class CreateOrderWithItemsInputDto {
  // ... existing fields ...

  // === OPTION A: Product-based order ===
  @Field(() => [ExternalMktProductInputDto], {
    nullable: true,
    description: 'List of external MKT Server products'
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalMktProductInputDto)
  externalProducts?: ExternalMktProductInputDto[];

  // === OPTION B: Combo-based order ===
  @Field(() => [ComboOrderInputDto], {
    nullable: true,
    description: 'List of combos to order'
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboOrderInputDto)
  combos?: ComboOrderInputDto[];
}
```

#### 3.2.2 Entity Changes

**MktOrderWorkspaceEntity - thêm fields:**

```typescript
// Combo tracking (RAW_JSON)
@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.appliedCombos,
  type: FieldMetadataType.RAW_JSON,
  label: msg`Applied Combos`,
  description: msg`Immutable snapshots of applied combos at order time`,
  icon: 'IconPackages',
})
@WorkspaceIsNullable()
appliedCombos?: GenericComboSnapshot[] | null;

// Tổng giảm giá từ combo pricing
@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.comboDiscount,
  type: FieldMetadataType.NUMBER,
  label: msg`Combo Discount`,
  description: msg`Total discount from combo pricing`,
  icon: 'IconDiscount',
  defaultValue: 0,
})
@WorkspaceIsNullable()
comboDiscount?: number;
```

**MktOrderItemWorkspaceEntity - thêm fields:**

```typescript
// Item source type
export const ORDER_ITEM_SOURCE = {
  PRODUCT: 'PRODUCT',
  COMBO_ITEM: 'COMBO_ITEM',
} as const;

export type OrderItemSource = typeof ORDER_ITEM_SOURCE[keyof typeof ORDER_ITEM_SOURCE];

@WorkspaceField({
  standardId: MKT_ORDER_ITEM_FIELD_IDS.itemSource,
  type: FieldMetadataType.SELECT,
  label: msg`Item Source`,
  description: msg`Source of this order item (PRODUCT or COMBO_ITEM)`,
  icon: 'IconSource',
  options: ORDER_ITEM_SOURCE_OPTIONS,
  defaultValue: `'${ORDER_ITEM_SOURCE.PRODUCT}'`,
})
itemSource: OrderItemSource;

// Combo reference (nếu từ combo)
@WorkspaceField({
  standardId: MKT_ORDER_ITEM_FIELD_IDS.sourceComboId,
  type: FieldMetadataType.UUID,
  label: msg`Source Combo ID`,
  description: msg`ID of combo this item belongs to (if from combo)`,
  icon: 'IconPackages',
})
@WorkspaceIsNullable()
sourceComboId: string | null;

@WorkspaceField({
  standardId: MKT_ORDER_ITEM_FIELD_IDS.sourceComboItemId,
  type: FieldMetadataType.UUID,
  label: msg`Source Combo Item ID`,
  description: msg`ID of combo item this order item was created from`,
  icon: 'IconBox',
})
@WorkspaceIsNullable()
sourceComboItemId: string | null;

// Combo item snapshot
@WorkspaceField({
  standardId: MKT_ORDER_ITEM_FIELD_IDS.comboItemSnapshot,
  type: FieldMetadataType.RAW_JSON,
  label: msg`Combo Item Snapshot`,
  description: msg`Immutable snapshot of combo item at order time`,
  icon: 'IconCamera',
})
@WorkspaceIsNullable()
comboItemSnapshot: GenericComboItemSnapshot | null;

// Item type cho SERVICE/CUSTOM items
@WorkspaceField({
  standardId: MKT_ORDER_ITEM_FIELD_IDS.itemType,
  type: FieldMetadataType.SELECT,
  label: msg`Item Type`,
  description: msg`Type of order item`,
  icon: 'IconCategory',
  options: ORDER_ITEM_TYPE_OPTIONS,
  defaultValue: `'${ORDER_ITEM_TYPE.DIGITAL_EXTERNAL}'`,
})
@WorkspaceIsNullable()
itemType: OrderItemType | null;
```

#### 3.2.3 New Types

```typescript
// order-combo.types.ts

export const ORDER_ITEM_SOURCE = {
  PRODUCT: 'PRODUCT',
  COMBO_ITEM: 'COMBO_ITEM',
} as const;

export type OrderItemSource = typeof ORDER_ITEM_SOURCE[keyof typeof ORDER_ITEM_SOURCE];

export const ORDER_ITEM_TYPE = {
  DIGITAL_EXTERNAL: 'DIGITAL_EXTERNAL',
  SERVICE: 'SERVICE',
  CUSTOM: 'CUSTOM',
} as const;

export type OrderItemType = typeof ORDER_ITEM_TYPE[keyof typeof ORDER_ITEM_TYPE];

/**
 * Result từ việc flatten combo thành order items
 */
export type FlattenedComboResult = {
  orderItems: CreateOrderItemFromComboData[];
  comboSnapshot: GenericComboSnapshot;
  comboDiscount: number;  // Số tiền giảm do combo pricing
};

/**
 * Data để tạo OrderItem từ combo item
 */
export type CreateOrderItemFromComboData = {
  // Common fields
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  itemSource: 'COMBO_ITEM';
  itemType: OrderItemType;
  sourceComboId: string;
  sourceComboItemId: string;
  comboItemSnapshot: GenericComboItemSnapshot;

  // For DIGITAL_EXTERNAL type
  externalMktProductId?: string | null;
  externalMktPackageId?: string | null;
  externalMktProductCode?: string | null;
  externalMktPackageCode?: string | null;
  snapshotMktProduct?: MktProductSnapshot | null;
  snapshotMktPackage?: MktPackageSnapshot | null;
  maxDevices?: number;
  splitLicenses?: boolean;

  // For SERVICE type
  serviceName?: string | null;
  serviceDescription?: string | null;

  // For CUSTOM type
  customName?: string | null;
  customDescription?: string | null;
};
```

---

## 4. Updated Saga Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CREATE ORDER SAGA (Updated)                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Step 1: CreateOrderStep                                              │
│   └── Tạo order entity (unchanged)                                   │
│                                                                      │
│ Step 2: ValidateInputStep (NEW)                                      │
│   ├── Validate externalProducts OR combos (hoặc cả hai)              │
│   ├── Không cho phép empty (phải có ít nhất 1 product hoặc combo)    │
│   └── Validate combo: isActive, validFrom/validTo                    │
│                                                                      │
│ Step 3: CreateSnapshotsStep (UPDATED)                                │
│   ├── If externalProducts:                                           │
│   │   └── Validate & create product/package snapshots                │
│   └── If combos:                                                     │
│       ├── Validate each combo (active, validity period)              │
│       ├── Create GenericComboSnapshot for each combo                 │
│       └── Store in context.comboSnapshots                            │
│                                                                      │
│ Step 4: CreateOrderItemsStep (UPDATED)                               │
│   ├── From externalProducts:                                         │
│   │   └── Create OrderItem (itemSource = PRODUCT)                    │
│   └── From combos:                                                   │
│       └── Flatten combo items → OrderItems (itemSource = COMBO_ITEM) │    
│           ├── DIGITAL_EXTERNAL → OrderItem với packageId             │
│           ├── SERVICE → OrderItem (itemType = SERVICE)               │
│           └── CUSTOM → OrderItem (itemType = CUSTOM)                 │
│                                                                      │
│ Step 5: CalculateOrderTotalStep (NEW/UPDATED)                        │
│   ├── Sum all order items                                            │
│   ├── Apply combo pricing:                                           │
│   │   ├── FIXED: Replace combo items total with fixedPrice           │
│   │   ├── DISCOUNT: Apply discountPercent to combo items             │
│   │   └── SUM: No change (sum of items)                              │
│   └── Calculate comboDiscount                                        │
│                                                                      │
│ Step 6: CalculatePromotionStep                                       │
│   └── Apply promotions (coupon, auto promotions)                     │
│                                                                      │
│ Step 7: CreateLicensesStep (UPDATED)                                 │
│   └── Create licenses only for items where:                          │
│       ├── itemType = DIGITAL_EXTERNAL                                │
│       └── externalMktPackageId is not null                           │
│                                                                      │
│ Step 8: CreatePaymentStep                                            │
│   └── Create payment records (unchanged)                             │
│                                                                      │
│ Step 9: FinalizeOrderStep (UPDATED)                                  │
│   ├── Save appliedCombos to order                                    │
│   ├── Save comboDiscount to order                                    │
│   └── Finalize order status                                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Service Implementation

### 5.1 OrderComboIntegrationService

```typescript
// order/services/integration/order-combo.integration.ts

@Injectable()
export class OrderComboIntegrationService {
  constructor(
    private readonly genericComboService: GenericComboService,
  ) {}

  /**
   * Validate và flatten combos thành order items
   */
  async validateAndFlattenCombos(
    workspaceId: string,
    combos: ComboOrderInputDto[],
    language: MktSupportedLanguage,
    options?: {
      defaultMaxDevices?: number;
      defaultSplitLicenses?: boolean;
    },
  ): Promise<{
    flattenedItems: CreateOrderItemFromComboData[];
    comboSnapshots: GenericComboSnapshot[];
    totalComboDiscount: number;
  }> {
    const flattenedItems: CreateOrderItemFromComboData[] = [];
    const comboSnapshots: GenericComboSnapshot[] = [];
    let totalComboDiscount = 0;

    for (const comboInput of combos) {
      // Validate và tạo snapshot
      const snapshot = await this.genericComboService.createComboSnapshot(
        workspaceId,
        comboInput.comboId,
        language,
      );

      comboSnapshots.push(snapshot);

      // Flatten items
      const items = this.flattenComboItems(
        snapshot,
        comboInput,
        options,
      );

      flattenedItems.push(...items);

      // Calculate combo discount
      const discount = snapshot.originalPrice - snapshot.comboPrice;
      totalComboDiscount += discount * comboInput.quantity;
    }

    return {
      flattenedItems,
      comboSnapshots,
      totalComboDiscount,
    };
  }

  /**
   * Flatten combo snapshot thành order items
   */
  private flattenComboItems(
    snapshot: GenericComboSnapshot,
    comboInput: ComboOrderInputDto,
    options?: {
      defaultMaxDevices?: number;
      defaultSplitLicenses?: boolean;
    },
  ): CreateOrderItemFromComboData[] {
    const items: CreateOrderItemFromComboData[] = [];

    for (const itemSnapshot of snapshot.items) {
      // Tạo order item data dựa trên item type
      const orderItemData = this.createOrderItemFromComboItem(
        itemSnapshot,
        snapshot.id,
        comboInput,
        options,
      );

      // Multiply by combo quantity
      for (let i = 0; i < comboInput.quantity; i++) {
        items.push({ ...orderItemData });
      }
    }

    return items;
  }

  /**
   * Tạo order item data từ combo item snapshot
   */
  private createOrderItemFromComboItem(
    itemSnapshot: GenericComboItemSnapshot,
    comboId: string,
    comboInput: ComboOrderInputDto,
    options?: {
      defaultMaxDevices?: number;
      defaultSplitLicenses?: boolean;
    },
  ): CreateOrderItemFromComboData {
    const baseData: CreateOrderItemFromComboData = {
      name: itemSnapshot.displayName,
      quantity: itemSnapshot.quantity,
      unitPrice: itemSnapshot.unitPrice,
      totalPrice: itemSnapshot.totalPrice,
      itemSource: 'COMBO_ITEM',
      itemType: itemSnapshot.itemType as OrderItemType,
      sourceComboId: comboId,
      sourceComboItemId: itemSnapshot.id,
      comboItemSnapshot: itemSnapshot,
    };

    switch (itemSnapshot.itemType) {
      case 'DIGITAL_EXTERNAL': {
        const productSnap = itemSnapshot.externalProductSnapshot;
        const packageSnap = itemSnapshot.externalPackageSnapshot;

        return {
          ...baseData,
          externalMktProductId: productSnap?.id ?? null,
          externalMktPackageId: packageSnap?.id ?? null,
          externalMktProductCode: productSnap?.productCode ?? null,
          externalMktPackageCode: packageSnap?.packageCode ?? null,
          snapshotMktProduct: productSnap,
          snapshotMktPackage: packageSnap,
          maxDevices: comboInput.maxDevices ?? options?.defaultMaxDevices ?? 1,
          splitLicenses: comboInput.splitLicenses ?? options?.defaultSplitLicenses ?? false,
        };
      }

      case 'SERVICE': {
        const serviceSnap = itemSnapshot.serviceSnapshot;
        return {
          ...baseData,
          serviceName: serviceSnap?.serviceName ?? null,
          serviceDescription: serviceSnap?.serviceDescription ?? null,
        };
      }

      case 'CUSTOM': {
        const customSnap = itemSnapshot.customSnapshot;
        return {
          ...baseData,
          customName: customSnap?.customName ?? null,
          customDescription: customSnap?.customDescription ?? null,
        };
      }

      default:
        return baseData;
    }
  }
}
```

### 5.2 OrderCalculationService Update

```typescript
// order/services/core/order-calculation.service.ts

/**
 * Tính toán order total với combo pricing
 */
calculateOrderTotalWithCombos(
  productItems: OrderItemData[],
  comboItems: CreateOrderItemFromComboData[],
  comboSnapshots: GenericComboSnapshot[],
): {
  subtotal: number;
  comboDiscount: number;
  totalBeforePromotion: number;
} {
  // Sum product items
  const productSubtotal = MoneyUtils.sumBy(productItems, 'totalPrice').toNumber();

  // Sum combo items (original prices)
  const comboOriginalTotal = MoneyUtils.sumBy(comboSnapshots, 'originalPrice').toNumber();

  // Sum combo items (after combo pricing)
  const comboPricedTotal = MoneyUtils.sumBy(comboSnapshots, 'comboPrice').toNumber();

  // Combo discount
  const comboDiscount = MoneyUtils.subtract(comboOriginalTotal, comboPricedTotal).toNumber();

  // Total
  const subtotal = MoneyUtils.add(productSubtotal, comboOriginalTotal).toNumber();
  const totalBeforePromotion = MoneyUtils.subtract(subtotal, comboDiscount).toNumber();

  return {
    subtotal,
    comboDiscount,
    totalBeforePromotion,
  };
}
```

---

## 6. Validation Rules

### 6.1 Input Validation

```typescript
// Validation trong CreateOrderInputValidator

class CreateOrderInputValidator {
  validate(input: CreateOrderWithItemsInputDto): ValidationResult {
    const errors: ValidationError[] = [];

    // Rule 1: Phải có ít nhất 1 product hoặc combo
    const hasProducts = input.externalProducts && input.externalProducts.length > 0;
    const hasCombos = input.combos && input.combos.length > 0;

    if (!hasProducts && !hasCombos) {
      errors.push({
        field: 'externalProducts/combos',
        message: 'At least one product or combo is required',
        code: 'REQUIRED',
      });
    }

    // Rule 2: Combo quantity phải >= 1
    if (input.combos) {
      for (const [index, combo] of input.combos.entries()) {
        if (combo.quantity < 1) {
          errors.push({
            field: `combos[${index}].quantity`,
            message: 'Combo quantity must be at least 1',
            code: 'INVALID_VALUE',
          });
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
```

### 6.2 Combo Validation (trong GenericComboValidationService)

```typescript
// Đã có sẵn trong generic-combo-validation.service.ts
async validateForOrder(workspaceId: string, comboId: string): Promise<GenericComboValidationResult> {
  // - Check combo exists
  // - Check isActive = true
  // - Check validFrom/validTo
  // - Check items not empty
  // - Validate digital external items với MKT Server
}
```

---

## 7. License Creation Logic

```typescript
// CreateLicensesStep update

shouldCreateLicense(orderItem: MktOrderItemWorkspaceEntity): boolean {
  // Chỉ tạo license cho digital external items
  if (orderItem.itemType !== ORDER_ITEM_TYPE.DIGITAL_EXTERNAL) {
    return false;
  }

  // Phải có packageId
  if (!orderItem.externalMktPackageId) {
    return false;
  }

  return true;
}
```

---

## 8. GraphQL Schema

```graphql
# Input types
input ComboOrderInput {
  comboId: ID!
  quantity: Int! = 1
  maxDevices: Int
  splitLicenses: Boolean = false
}

input CreateOrderWithItemsInput {
  customerId: ID!
  currency: String = "VND"
  note: String
  requireContract: Boolean = false
  orderLanguage: String = "vi"
  action: CreateOrderAction!

  # Product-based items (optional)
  externalProducts: [ExternalMktProductInput!]

  # Combo-based items (optional)
  combos: [ComboOrderInput!]

  # Promotion
  couponCode: String
  applyAutoPromotions: Boolean = true

  # Payment
  paymentMethods: [OrderPaymentMethodInput!]
}

# Response types
type OrderResponse {
  success: Boolean!
  orderId: ID
  orderCode: String
  error: String
  paymentQrCode: String

  # New fields
  appliedCombos: [GenericComboSnapshot!]
  comboDiscount: Float
}

# Enums
enum OrderItemSource {
  PRODUCT
  COMBO_ITEM
}

enum OrderItemType {
  DIGITAL_EXTERNAL
  SERVICE
  CUSTOM
}
```

---

## 9. Database Schema Changes

### 9.1 New Field IDs

```typescript
// mkt-field-ids.ts

export const MKT_ORDER_FIELD_IDS = {
  // ... existing ...
  appliedCombos: '20ae0001-0000-4000-8000-000000000001',
  comboDiscount: '20ae0001-0000-4000-8000-000000000002',
};

export const MKT_ORDER_ITEM_FIELD_IDS = {
  // ... existing ...
  itemSource: '20ae0002-0000-4000-8000-000000000001',
  itemType: '20ae0002-0000-4000-8000-000000000002',
  sourceComboId: '20ae0002-0000-4000-8000-000000000003',
  sourceComboItemId: '20ae0002-0000-4000-8000-000000000004',
  comboItemSnapshot: '20ae0002-0000-4000-8000-000000000005',
};
```

### 9.2 Migration

```sql
-- Add new columns to mktOrder
ALTER TABLE "mktOrder"
ADD COLUMN "appliedCombos" JSONB,
ADD COLUMN "comboDiscount" DECIMAL(15,2) DEFAULT 0;

-- Add new columns to mktOrderItem
ALTER TABLE "mktOrderItem"
ADD COLUMN "itemSource" VARCHAR(20) DEFAULT 'PRODUCT',
ADD COLUMN "itemType" VARCHAR(20) DEFAULT 'DIGITAL_EXTERNAL',
ADD COLUMN "sourceComboId" UUID,
ADD COLUMN "sourceComboItemId" UUID,
ADD COLUMN "comboItemSnapshot" JSONB;

-- Add index for combo queries
CREATE INDEX "idx_mktOrderItem_sourceComboId" ON "mktOrderItem"("sourceComboId");
```

---

## 10. Questions to Clarify

| # | Question | Options | Default |
|---|----------|---------|---------|
| 1 | Cho phép mix products + combos trong cùng order? | Yes / No | Yes |
| 2 | Combo pricing áp dụng cho từng combo hay tổng order? | Per combo / Total | Per combo |
| 3 | SERVICE/CUSTOM items có cần tracking đặc biệt? | Yes / No | No |
| 4 | Cho phép order cùng combo nhiều lần? | Yes / No | Yes |
| 5 | Combo discount có stack với promotion discount? | Yes / No | Yes |

---

## 11. Implementation Checklist

### Phase 1: Entity & Types
- [ ] Add new field IDs to `mkt-field-ids.ts`
- [ ] Update `MktOrderWorkspaceEntity` with combo fields
- [ ] Update `MktOrderItemWorkspaceEntity` with combo fields
- [ ] Create `order-combo.types.ts`
- [ ] Create `ComboOrderInputDto`

### Phase 2: Services
- [ ] Create `OrderComboIntegrationService`
- [ ] Update `OrderCalculationService` for combo pricing
- [ ] Update input validation

### Phase 3: Saga Steps
- [ ] Update `CreateSnapshotsStep` for combos
- [ ] Update `CreateOrderItemsStep` for combos
- [ ] Create/Update `CalculateOrderTotalStep`
- [ ] Update `CreateLicensesStep` to filter by itemType
- [ ] Update `FinalizeOrderStep` to save combo data

### Phase 4: Testing
- [ ] Unit tests for `OrderComboIntegrationService`
- [ ] Integration tests for combo order creation
- [ ] Test combo + product mixed orders
- [ ] Test combo pricing (FIXED, DISCOUNT, SUM)

### Phase 5: Documentation
- [ ] Update API documentation
- [ ] Add GraphQL schema documentation
- [ ] Create usage examples

---

## 12. Example Usage

### 12.1 Create Order with Combo Only

```graphql
mutation CreateComboOrder {
  createOrderWithItems(input: {
    customerId: "cust-123"
    action: NEW_ORDER
    combos: [
      {
        comboId: "combo-abc"
        quantity: 1
        maxDevices: 3
      }
    ]
    couponCode: "SUMMER2024"
  }) {
    success
    orderId
    orderCode
    comboDiscount
  }
}
```

### 12.2 Create Order with Products + Combo (Mixed)

```graphql
mutation CreateMixedOrder {
  createOrderWithItems(input: {
    customerId: "cust-123"
    action: NEW_ORDER
    externalProducts: [
      {
        productId: "prod-1"
        packageId: "pkg-1"
        maxDevices: 1
      }
    ]
    combos: [
      {
        comboId: "combo-abc"
        quantity: 2
      }
    ]
  }) {
    success
    orderId
    appliedCombos {
      comboCode
      comboPrice
      savings
    }
  }
}
```

---

## 13. References

- [mkt-combo module](../../packages/twenty-server/src/mkt-core/mkt-combo/)
- [mkt-order module](../../packages/twenty-server/src/mkt-core/order/)
- [GenericComboSnapshot type](../../packages/twenty-server/src/mkt-core/mkt-combo/types/generic-combo.types.ts)
- [CreateOrderSaga](../../packages/twenty-server/src/mkt-core/order/orchestration/saga/create-order.saga.ts)
