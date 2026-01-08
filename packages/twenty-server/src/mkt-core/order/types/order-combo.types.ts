/**
 * Types and constants for Order-Combo integration
 */

import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';
import {
  GenericComboSnapshot,
  GenericComboItemSnapshot,
  InternalProductSnapshot,
  InternalVariantSnapshot,
} from 'src/mkt-core/mkt-combo/types/generic-combo.types';
import {
  MktProductSnapshot,
  MktPackageSnapshot,
} from 'src/mkt-core/mkt-product-integration/types';

// ============================================
// ORDER ITEM SOURCE
// ============================================

/**
 * Source of order item:
 * - PRODUCT: Direct product purchase
 * - COMBO_ITEM: Item from a combo
 */
export const ORDER_ITEM_SOURCE = {
  PRODUCT: 'PRODUCT',
  COMBO_ITEM: 'COMBO_ITEM',
} as const;

export type OrderItemSource =
  (typeof ORDER_ITEM_SOURCE)[keyof typeof ORDER_ITEM_SOURCE];

export const ORDER_ITEM_SOURCE_OPTIONS = [
  {
    value: ORDER_ITEM_SOURCE.PRODUCT,
    label: 'Product',
    color: 'blue' as TagColor,
    position: 0,
  },
  {
    value: ORDER_ITEM_SOURCE.COMBO_ITEM,
    label: 'Combo Item',
    color: 'purple' as TagColor,
    position: 1,
  },
];

// ============================================
// ORDER ITEM TYPE
// ============================================

/**
 * Type of order item - ALIGNED with COMBO_ITEM_TYPE
 *
 * - DIGITAL_EXTERNAL: Digital product from MKT Server (license-based)
 * - INTERNAL_PRODUCT: Internal CRM product (for future use)
 * - INTERNAL_VARIANT: Internal CRM product variant (for future use)
 * - SERVICE: Service item (consulting, support, etc.)
 * - CUSTOM: Custom/ad-hoc item
 */
export const ORDER_ITEM_TYPE = {
  DIGITAL_EXTERNAL: 'DIGITAL_EXTERNAL',
  INTERNAL_PRODUCT: 'INTERNAL_PRODUCT',
  INTERNAL_VARIANT: 'INTERNAL_VARIANT',
  SERVICE: 'SERVICE',
  CUSTOM: 'CUSTOM',
} as const;

export type OrderItemType =
  (typeof ORDER_ITEM_TYPE)[keyof typeof ORDER_ITEM_TYPE];

export const ORDER_ITEM_TYPE_OPTIONS = [
  {
    value: ORDER_ITEM_TYPE.DIGITAL_EXTERNAL,
    label: 'Digital External',
    color: 'blue' as TagColor,
    position: 0,
  },
  {
    value: ORDER_ITEM_TYPE.INTERNAL_PRODUCT,
    label: 'Internal Product',
    color: 'green' as TagColor,
    position: 1,
  },
  {
    value: ORDER_ITEM_TYPE.INTERNAL_VARIANT,
    label: 'Internal Variant',
    color: 'turquoise' as TagColor,
    position: 2,
  },
  {
    value: ORDER_ITEM_TYPE.SERVICE,
    label: 'Service',
    color: 'purple' as TagColor,
    position: 3,
  },
  {
    value: ORDER_ITEM_TYPE.CUSTOM,
    label: 'Custom',
    color: 'orange' as TagColor,
    position: 4,
  },
];

// ============================================
// COMBO ORDER INPUT
// ============================================

/**
 * Input for ordering a combo
 */
export type ComboOrderInput = {
  comboId: string;
  quantity: number;
  maxDevices?: number;
  splitLicenses?: boolean;
};

// ============================================
// FLATTENED COMBO RESULT
// ============================================

/**
 * Result from flattening combo into order items
 */
export type FlattenedComboResult = {
  orderItems: CreateOrderItemFromComboData[];
  comboSnapshot: GenericComboSnapshot;
  comboDiscount: number;
};

/**
 * Data to create OrderItem from combo item
 */
export type CreateOrderItemFromComboData = {
  // Common fields
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  itemSource: typeof ORDER_ITEM_SOURCE.COMBO_ITEM;
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

  // For INTERNAL_PRODUCT type
  mktProductId?: string | null;
  internalProductSnapshot?: InternalProductSnapshot | null;

  // For INTERNAL_VARIANT type
  mktVariantId?: string | null;
  internalVariantSnapshot?: InternalVariantSnapshot | null;

  // For SERVICE type
  serviceName?: string | null;
  serviceDescription?: string | null;
  servicePrice?: number | null;

  // For CUSTOM type
  customName?: string | null;
  customDescription?: string | null;
  customPrice?: number | null;
};

// ============================================
// ORDER CALCULATION WITH COMBOS
// ============================================

/**
 * Result of order calculation with combo pricing
 */
export type OrderComboCalculationResult = {
  /** Sum of all item prices (before combo pricing) */
  subtotal: number;
  /** Total discount from combo pricing */
  comboDiscount: number;
  /** Total after combo discount (before promotions) */
  totalBeforePromotion: number;
  /** Applied combo snapshots */
  appliedCombos: GenericComboSnapshot[];
};

// ============================================
// RE-EXPORTS FOR CONVENIENCE
// ============================================

export type {
  GenericComboSnapshot,
  GenericComboItemSnapshot,
  InternalProductSnapshot,
  InternalVariantSnapshot,
};
