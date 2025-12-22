import { createModuleMessages } from 'src/mkt-core/common/messages';

// ============================================
// COMBO MESSAGES
// ============================================

export const COMBO_MESSAGES = createModuleMessages({
  entityName: 'Combo',
  entityNamePlural: 'Combos',
  customSuccess: {
    ITEMS_ADDED: 'Items added to combo successfully',
    ITEM_REMOVED: 'Item removed from combo successfully',
    PRICE_CALCULATED: 'Combo price calculated successfully',
    VALIDATED: 'Combo validated successfully',
    SNAPSHOT_CREATED: 'Combo snapshot created successfully',
  },
  customError: {
    COMBO_NOT_FOUND: 'Combo not found',
    COMBO_INACTIVE: 'Combo is not active',
    COMBO_EXPIRED: 'Combo has expired',
    COMBO_NOT_YET_VALID: 'Combo is not yet valid',
    COMBO_NO_ITEMS: 'Combo has no items',
    COMBO_DUPLICATE_CODE: 'Combo code already exists',
    INVALID_PRICING_CONFIG: 'Invalid pricing configuration',
    ITEM_NOT_FOUND: 'Combo item not found',
    INVALID_ITEM_TYPE: 'Invalid item type',
    MISSING_REQUIRED_FIELDS: 'Missing required fields for item type',
    VERSION_CONFLICT: 'Version conflict - combo was modified by another user',
    VALIDATION_FAILED: 'Combo validation failed',
  },
  customOperation: {
    FETCH_ALL: 'Fetch all combos',
    FETCH_BY_ID: 'Fetch combo by ID',
    FETCH_BY_CODE: 'Fetch combo by code',
    CALCULATE_PRICE: 'Calculate combo price',
    VALIDATE: 'Validate combo',
    CREATE_SNAPSHOT: 'Create combo snapshot',
    ADD_ITEMS: 'Add items to combo',
    REMOVE_ITEM: 'Remove item from combo',
  },
});

// Alias for backward compatibility with generic combo
export const GENERIC_COMBO_MESSAGES = COMBO_MESSAGES;

// ============================================
// GRAPHQL DESCRIPTIONS
// ============================================

export const COMBO_GRAPHQL_DESCRIPTIONS = {
  // Queries
  COMBO_QUERY: 'Get combo by ID with items',
  COMBO_BY_CODE_QUERY: 'Get combo by code with items',
  COMBOS_QUERY: 'Get paginated list of combos',
  CALCULATE_PRICE_QUERY: 'Calculate combo price',
  VALIDATE_COMBO_QUERY: 'Validate combo for order',
  PREVIEW_SNAPSHOT_QUERY: 'Preview combo snapshot without saving',

  // Mutations
  CREATE_COMBO_MUTATION: 'Create a new combo',
  UPDATE_COMBO_MUTATION: 'Update an existing combo',
  DELETE_COMBO_MUTATION: 'Delete a combo (soft delete)',
  ADD_ITEMS_MUTATION: 'Add items to a combo',
  REMOVE_ITEM_MUTATION: 'Remove an item from a combo',
} as const;

// Alias for backward compatibility with generic combo
export const GENERIC_COMBO_GRAPHQL_DESCRIPTIONS = COMBO_GRAPHQL_DESCRIPTIONS;
