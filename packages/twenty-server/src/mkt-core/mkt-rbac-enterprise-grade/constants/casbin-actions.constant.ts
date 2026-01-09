/**
 * RBAC Action identifiers cho Casbin
 *
 * Sử dụng trong policy definitions và permission checks
 */
export const CASBIN_ACTIONS = {
  // ===== CRUD Operations =====
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',

  // ===== List Operations =====
  LIST: 'list',
  SEARCH: 'search',

  // ===== Data Operations =====
  EXPORT: 'export',
  IMPORT: 'import',
  DOWNLOAD: 'download',
  UPLOAD: 'upload',

  // ===== Workflow Operations =====
  APPROVE: 'approve',
  REJECT: 'reject',
  SUBMIT: 'submit',
  CANCEL: 'cancel',
  PROCESS: 'process',

  // ===== Admin Operations =====
  MANAGE: 'manage',
  ASSIGN: 'assign',
  CONFIGURE: 'configure',

  // ===== Special Operations =====
  VIEW_SENSITIVE: 'viewSensitive',
  AUDIT: 'audit',
  SYNC: 'sync',

  // ===== Wildcard =====
  ALL: '*',
} as const;

export type CasbinAction = (typeof CASBIN_ACTIONS)[keyof typeof CASBIN_ACTIONS];

/**
 * Action groups - định nghĩa nhóm actions liên quan
 */
export const CASBIN_ACTION_GROUPS = {
  // Read-only actions
  READ_ONLY: [CASBIN_ACTIONS.READ, CASBIN_ACTIONS.LIST, CASBIN_ACTIONS.SEARCH],

  // CRUD actions
  CRUD: [
    CASBIN_ACTIONS.READ,
    CASBIN_ACTIONS.CREATE,
    CASBIN_ACTIONS.UPDATE,
    CASBIN_ACTIONS.DELETE,
  ],

  // Data transfer actions
  DATA_TRANSFER: [
    CASBIN_ACTIONS.EXPORT,
    CASBIN_ACTIONS.IMPORT,
    CASBIN_ACTIONS.DOWNLOAD,
    CASBIN_ACTIONS.UPLOAD,
  ],

  // Workflow actions
  WORKFLOW: [
    CASBIN_ACTIONS.APPROVE,
    CASBIN_ACTIONS.REJECT,
    CASBIN_ACTIONS.SUBMIT,
    CASBIN_ACTIONS.CANCEL,
    CASBIN_ACTIONS.PROCESS,
  ],

  // Admin actions
  ADMIN: [
    CASBIN_ACTIONS.MANAGE,
    CASBIN_ACTIONS.ASSIGN,
    CASBIN_ACTIONS.CONFIGURE,
  ],
} as const;
