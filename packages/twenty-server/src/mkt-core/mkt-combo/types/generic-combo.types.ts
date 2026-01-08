/**
 * Type definitions for Generic Combo module
 */

import {
  MktProductSnapshot,
  MktPackageSnapshot,
} from 'src/mkt-core/mkt-product-integration/types';
import {
  ComboItemType,
  GenericComboPricingType,
} from 'src/mkt-core/mkt-combo/constants';
import { MktGenericComboWorkspaceEntity } from 'src/mkt-core/mkt-combo/objects/mkt-generic-combo.workspace-entity';
import { MktGenericComboItemWorkspaceEntity } from 'src/mkt-core/mkt-combo/objects/mkt-generic-combo-item.workspace-entity';

// ============================================
// INTERNAL SNAPSHOTS
// ============================================

export type InternalProductSnapshot = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  type: string | null;
  sku: string | null;
  price: number | null;
  isActive: boolean | null;
  capturedAt: string;
};

export type InternalVariantSnapshot = {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  price: number | null;
  isActive: boolean | null;
  productId: string;
  productName: string | null;
  capturedAt: string;
};

export type ServiceSnapshot = {
  serviceName: string;
  serviceDescription: string | null;
  servicePrice: number;
  capturedAt: string;
};

export type CustomSnapshot = {
  customName: string;
  customDescription: string | null;
  customPrice: number;
  capturedAt: string;
};

// ============================================
// COMBO SNAPSHOT
// ============================================

/**
 * Combo snapshot lưu trữ cùng với order
 * IMMUTABLE sau khi tạo
 */
export type GenericComboSnapshot = {
  id: string;
  comboCode: string;
  name: string;
  description: string | null;
  pricingType: string;
  version: number;
  items: GenericComboItemSnapshot[];
  originalPrice: number;
  comboPrice: number;
  savings: number;
  savingsPercent: number;
  currency: string;
  capturedAt: string;
  checksum: string;
};

/**
 * Individual item snapshot trong combo
 */
export type GenericComboItemSnapshot = {
  id: string;
  itemType: ComboItemType;
  displayName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  position: number;

  // Type-specific snapshots (only one will be populated based on itemType)
  externalProductSnapshot: MktProductSnapshot | null;
  externalPackageSnapshot: MktPackageSnapshot | null;
  internalProductSnapshot: InternalProductSnapshot | null;
  internalVariantSnapshot: InternalVariantSnapshot | null;
  serviceSnapshot: ServiceSnapshot | null;
  customSnapshot: CustomSnapshot | null;
};

// ============================================
// CALCULATION TYPES
// ============================================

/**
 * Kết quả tính toán giá combo
 */
export type GenericComboCalculationResult = {
  originalPrice: number;
  comboPrice: number;
  savings: number;
  savingsPercent: number;
  currency: string;
  itemDetails: GenericComboItemCalculation[];
  calculatedAt: Date;
};

/**
 * Chi tiết tính toán cho từng item
 */
export type GenericComboItemCalculation = {
  id: string;
  itemType: ComboItemType;
  displayName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  adjustedUnitPrice: number;
  adjustedTotalPrice: number;
};

// ============================================
// COMBO WITH ITEMS
// ============================================

/**
 * Combo với items đã load
 */
export type GenericComboWithItems = {
  combo: MktGenericComboWorkspaceEntity;
  items: MktGenericComboItemWorkspaceEntity[];
};

// ============================================
// CREATE/UPDATE TYPES
// ============================================

/**
 * Input tạo combo
 */
export type CreateGenericComboData = {
  comboCode: string;
  name: string;
  description?: string | null;
  pricingType: GenericComboPricingType;
  fixedPrice?: number | null;
  discountPercent?: number | null;
  currency?: string;
  isActive?: boolean;
  validFrom?: Date | null;
  validTo?: Date | null;
  metadata?: Record<string, unknown> | null;
  items: CreateGenericComboItemData[];
  // Ownership fields (optional, will be set by service if not provided)
  createdById?: string | null;
  accountOwnerId?: string | null;
};

/**
 * Input tạo combo item
 *
 * DIGITAL_EXTERNAL type yêu cầu externalPackageId (bán theo package)
 * - externalPackageId: BẮT BUỘC - ID của package từ MKT Server
 * - externalProductId: optional - ID của product (lấy tự động từ package nếu không cung cấp)
 */
export type CreateGenericComboItemData = {
  itemType: ComboItemType;
  displayName?: string | null;
  quantity?: number;
  overridePrice?: number | null;
  position?: number;

  // DIGITAL_EXTERNAL fields (bán theo package)
  // externalPackageId là BẮT BUỘC cho DIGITAL_EXTERNAL type
  externalProductId?: string | null;
  externalProductCode?: string | null;
  externalPackageId?: string | null;
  externalPackageCode?: string | null;

  // INTERNAL_PRODUCT fields
  mktProductId?: string | null;

  // INTERNAL_VARIANT fields
  mktVariantId?: string | null;

  // SERVICE fields
  serviceName?: string | null;
  serviceDescription?: string | null;
  servicePrice?: number | null;

  // CUSTOM fields
  customName?: string | null;
  customDescription?: string | null;
  customPrice?: number | null;
};

/**
 * Input cập nhật combo
 */
export type UpdateGenericComboData = Partial<
  Omit<CreateGenericComboData, 'items' | 'comboCode'>
> & {
  expectedVersion?: number; // For optimistic locking
};

/**
 * Input cập nhật combo item
 */
export type UpdateGenericComboItemData = Partial<
  Omit<CreateGenericComboItemData, 'itemType'>
>;

// ============================================
// QUERY TYPES
// ============================================

/**
 * Filter input cho query combos
 */
export type GenericComboFilter = {
  isActive?: boolean;
  pricingType?: GenericComboPricingType;
  search?: string;
  validAt?: Date;
};

/**
 * Sort input
 */
export type GenericComboSortInput = {
  field: 'createdAt' | 'name' | 'comboCode';
  direction: 'ASC' | 'DESC';
};

/**
 * Pagination options
 */
export type PaginationOptions = {
  limit?: number;
  offset?: number;
};

/**
 * Paginated result
 */
export type PaginatedGenericComboResult<T> = {
  items: T[];
  total: number;
  hasMore: boolean;
};
