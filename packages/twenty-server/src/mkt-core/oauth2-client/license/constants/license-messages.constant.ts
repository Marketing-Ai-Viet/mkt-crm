// License Success Messages
export const LICENSE_SUCCESS_MESSAGES = {
  RETRIEVED: 'Licenses retrieved successfully',
  DETAIL_RETRIEVED: 'License detail retrieved',
  CREATED: 'License created successfully',
  UPDATED: 'License updated successfully',
  DELETED: 'License deleted successfully',
  ACTIVATED: 'License activated successfully',
  REVOKED: 'License revoked successfully',
  VALIDATED: 'License validated successfully',
  ANALYTICS_RETRIEVED: 'License analytics retrieved successfully',
} as const;

// License Success Messages with parameters (functions)
export const LICENSE_BULK_SUCCESS_MESSAGE_BUILDER = {
  created: (count: number) => `${count} licenses created successfully`,
  updated: (count: number) => `${count} licenses updated successfully`,
  deleted: (count: number) => `${count} licenses deleted successfully`,
} as const;

// License Error Messages
export const LICENSE_ERROR_MESSAGES = {
  FETCH_FAILED: 'Failed to fetch licenses',
  CREATE_FAILED: 'Failed to create license',
  UPDATE_FAILED: 'Failed to update license',
  DELETE_FAILED: 'Failed to delete license',
  ACTIVATE_FAILED: 'Failed to activate license',
  REVOKE_FAILED: 'Failed to revoke license',
  VALIDATION_FAILED: 'Failed to validate license',
  NOT_FOUND: 'License not found',
  ANALYTICS_FAILED: 'Failed to fetch license analytics',
  BULK_CREATE_FAILED: 'Failed to bulk create licenses',
  BULK_UPDATE_FAILED: 'Failed to bulk update licenses',
  BULK_DELETE_FAILED: 'Failed to bulk delete licenses',
} as const;

// License Error Messages with parameters (functions)
export const LICENSE_ERROR_MESSAGE_BUILDER = {
  fetchFailed: (error: string) => `Failed to fetch licenses: ${error}`,
  createFailed: (error: string) => `Failed to create license: ${error}`,
  updateFailed: (error: string) => `Failed to update license: ${error}`,
  deleteFailed: (error: string) => `Failed to delete license: ${error}`,
  activateFailed: (error: string) => `Failed to activate license: ${error}`,
  revokeFailed: (error: string) => `Failed to revoke license: ${error}`,
  validationFailed: (error: string) => `Failed to validate license: ${error}`,
  notFound: (id: string) => `License not found: ${id}`,
  analyticsFailure: (error: string) =>
    `Failed to fetch license analytics: ${error}`,
} as const;

// License Operation Messages (for logging)
export const LICENSE_OPERATION_MESSAGES = {
  FETCH_ALL: 'Fetch all licenses',
  FETCH_BY_ID: 'Fetch license by ID',
  FETCH_BY_KEY: 'Fetch license by key',
  CREATE: 'Create license',
  UPDATE: 'Update license',
  DELETE: 'Delete license',
  ACTIVATE: 'Activate license',
  REVOKE: 'Revoke license',
  VALIDATE: 'Validate license',
  BULK_CREATE: 'Bulk create licenses',
  BULK_UPDATE: 'Bulk update licenses',
  BULK_DELETE: 'Bulk delete licenses',
  ANALYTICS: 'Fetch license analytics',
} as const;

export type LicenseSuccessMessageType =
  (typeof LICENSE_SUCCESS_MESSAGES)[keyof typeof LICENSE_SUCCESS_MESSAGES];

export type LicenseErrorMessageType =
  (typeof LICENSE_ERROR_MESSAGES)[keyof typeof LICENSE_ERROR_MESSAGES];

export type LicenseOperationMessageType =
  (typeof LICENSE_OPERATION_MESSAGES)[keyof typeof LICENSE_OPERATION_MESSAGES];
