import { createModuleMessages } from 'src/mkt-core/common/messages';

// ============================================
// LICENSE MESSAGES
// ============================================

export const MKT_LICENSE_MESSAGES = createModuleMessages({
  entityName: 'License',
  entityNamePlural: 'Licenses',
  customSuccess: {
    ACTIVATED: 'License activated successfully',
    REVOKED: 'License revoked successfully',
    VALIDATED: 'License validated successfully',
    ANALYTICS_RETRIEVED: 'License analytics retrieved successfully',
    BULK_CREATED: 'Licenses created successfully',
    BULK_UPDATED: 'Licenses updated successfully',
    BULK_DELETED: 'Licenses deleted successfully',
  },
  customError: {
    ACTIVATION_FAILED: 'Failed to activate license',
    REVOKE_FAILED: 'Failed to revoke license',
    VALIDATION_FAILED: 'Failed to validate license',
    ANALYTICS_FAILED: 'Failed to fetch license analytics',
    BULK_CREATE_FAILED: 'Failed to bulk create licenses',
    BULK_UPDATE_FAILED: 'Failed to bulk update licenses',
    BULK_DELETE_FAILED: 'Failed to bulk delete licenses',
    INVALID_LICENSE_KEY: 'Invalid license key',
  },
  customOperation: {
    FETCH_ALL: 'Fetch all licenses',
    FETCH_BY_ID: 'Fetch license by ID',
    FETCH_BY_KEY: 'Fetch license by key',
    VALIDATE: 'Validate license',
    ACTIVATE: 'Activate license',
    REVOKE: 'Revoke license',
    BULK_CREATE: 'Bulk create licenses',
    BULK_UPDATE: 'Bulk update licenses',
    BULK_DELETE: 'Bulk delete licenses',
    ANALYTICS: 'Fetch license analytics',
  },
});

// ============================================
// BULK SUCCESS MESSAGE BUILDER
// ============================================

export const MKT_LICENSE_BULK_SUCCESS_MESSAGE_BUILDER = {
  created: (count: number) => `${count} licenses created successfully`,
  updated: (count: number) => `${count} licenses updated successfully`,
  deleted: (count: number) => `${count} licenses deleted successfully`,
} as const;
