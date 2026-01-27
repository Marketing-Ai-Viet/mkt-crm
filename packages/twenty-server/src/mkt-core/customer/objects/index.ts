/**
 * Customer Module Workspace Entities
 *
 * Export all workspace entities and their entity name constants
 */

// Main customer entity
export {
  MKT_CUSTOMER_ENTITY_NAME,
  MktCustomerWorkspaceEntity,
} from './mkt-customer.workspace-entity';

// Tag entity (master data)
export {
  MKT_TAG_ENTITY_NAME,
  MktTagWorkspaceEntity,
  SEARCH_FIELDS_FOR_MKT_TAG,
} from './mkt-tag.workspace-entity';

// Customer-Tag junction entity
export {
  MKT_CUSTOMER_TAG_ENTITY_NAME,
  MktCustomerTagWorkspaceEntity,
  SEARCH_FIELDS_FOR_MKT_CUSTOMER_TAG,
} from './mkt-customer-tag.workspace-entity';

// Tier history entity (audit trail)
export {
  MKT_CUSTOMER_TIER_HISTORY_ENTITY_NAME,
  MktCustomerTierHistoryWorkspaceEntity,
} from './mkt-customer-tier-history.workspace-entity';

// Customer note entity
export {
  MKT_CUSTOMER_NOTE_ENTITY_NAME,
  MktCustomerNoteWorkspaceEntity,
} from './mkt-customer-note.workspace-entity';
