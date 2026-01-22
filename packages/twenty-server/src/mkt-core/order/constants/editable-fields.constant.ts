/**
 * Editable Order Fields Configuration
 *
 * Định nghĩa các fields có thể edit qua optimistic locking.
 * Dùng cho conflict detection và privacy/performance optimization.
 */

/**
 * Danh sách fields có thể edit qua optimistic locking
 *
 * VERIFIED against MktOrderWorkspaceEntity và actual business requirements:
 * - KHÔNG bao gồm computed fields (totalAmount, paidAmount, remainingAmount, subtotal, tax)
 * - KHÔNG bao gồm status fields (được quản lý bởi state machine)
 * - KHÔNG bao gồm system fields (createdAt, updatedAt, searchVector)
 * - KHÔNG bao gồm relation IDs (được quản lý bởi specific mutations)
 *
 * @see MktOrderWorkspaceEntity
 */
export const EDITABLE_ORDER_FIELDS = [
  // Basic editable fields
  'name',
  'note',
  'currency',

  // Discount fields (manual adjustments)
  'discount',
  'discountPercent',

  // Contract requirement
  'requireContract',

  // Customer assignment (có thể thay đổi customer của order)
  'mktCustomerId',

  // Contract assignment
  'mktContractId',

  // Promotion (coupon code)
  'couponCode',

  // Payment deadline (for new payment flow)
  'paymentDeadline',
  'paymentDeadlineSource',

  // Metadata (arbitrary JSON)
  'metadata',
] as const;

/**
 * Required fields cho conflict resolution payload
 *
 * MUST include:
 * - id: Entity identifier
 * - version: Current version for conflict detection
 * - updatedAt: Last modification timestamp
 * - Plus editable fields for conflict UI
 */
export const ORDER_SELECT_FIELDS_FOR_CONFLICT = [
  'id',
  'version',
  'updatedAt',
  // Include editable fields for conflict UI
  ...EDITABLE_ORDER_FIELDS,
] as const;

/**
 * Type cho editable order field name
 */
export type EditableOrderField = (typeof EDITABLE_ORDER_FIELDS)[number];

/**
 * Type cho select fields trong conflict response
 */
export type OrderSelectFieldForConflict =
  (typeof ORDER_SELECT_FIELDS_FOR_CONFLICT)[number];
