/**
 * User Permission Override Types
 *
 * Types for user-specific permission override operations.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  Override cho phép GRANT hoặc DENY quyền CỤ THỂ cho từng user              │
 * │  Priority: Override > Template > Default DENY                               │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * @see MktUserPermissionOverrideWorkspaceEntity
 * @see docs/USER-PERMISSION-ASSIGNMENT-GUIDE.md
 */

/**
 * Các lý do override được hệ thống hỗ trợ
 */
export const OVERRIDE_REASON = {
  SPECIAL_PROJECT: 'SPECIAL_PROJECT',
  TEMPORARY_ACCESS: 'TEMPORARY_ACCESS',
  SECURITY_RESTRICTION: 'SECURITY_RESTRICTION',
  COMPLIANCE_REQUIREMENT: 'COMPLIANCE_REQUIREMENT',
  TRAINING_PERIOD: 'TRAINING_PERIOD',
  PROBATION_PERIOD: 'PROBATION_PERIOD',
  OTHER: 'OTHER',
} as const;

export type OverrideReason =
  (typeof OVERRIDE_REASON)[keyof typeof OVERRIDE_REASON];

/**
 * Input để tạo override mới
 */
export type CreateOverrideInput = {
  workspaceMemberId: string;
  resourceId: string;
  actionId: string;
  isAllowed: boolean;
  reason: OverrideReason;
  reasonDescription?: string;
  expiresAt?: Date;
  approvedById?: string;
  contextFilter?: Record<string, unknown>;
};

/**
 * Input để cập nhật override
 */
export type UpdateOverrideInput = {
  isAllowed?: boolean;
  reason?: OverrideReason;
  reasonDescription?: string;
  expiresAt?: Date | null;
  isActive?: boolean;
  contextFilter?: Record<string, unknown>;
};

/**
 * Context filter cho override - điều kiện bổ sung
 *
 * @example
 * // Chỉ cho phép xem Order của phòng ban mình
 * { "departmentId": "$user.departmentId" }
 *
 * @example
 * // Chỉ cho phép xem Order với status cụ thể
 * { "status": { "$in": ["PENDING", "CONFIRMED"] } }
 */
export type OverrideContextFilter = {
  [field: string]: unknown;
};

/**
 * Kết quả kiểm tra override cho một user
 */
export type OverrideCheckResult = {
  hasOverride: boolean;
  isAllowed: boolean;
  overrideId?: string;
  reason?: OverrideReason;
  expiresAt?: Date;
  contextFilter?: OverrideContextFilter;
};

/**
 * Thống kê override của một user
 */
export type UserOverrideSummary = {
  workspaceMemberId: string;
  overrides: Array<{
    id: string;
    resourceKey: string;
    resourceName: string;
    actionKey: string;
    actionName: string;
    isAllowed: boolean;
    reason: OverrideReason;
    expiresAt?: Date;
    isActive: boolean;
    isExpired: boolean;
  }>;
  grantCount: number;
  denyCount: number;
  activeCount: number;
  expiredCount: number;
};

/**
 * Override audit entry
 */
export type OverrideAuditEntry = {
  overrideId: string;
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'EXPIRED' | 'APPROVED';
  performedById: string;
  performedAt: Date;
  changes?: Record<string, { from: unknown; to: unknown }>;
};

/**
 * Input cho bulk override
 */
export type BulkCreateOverrideInput = {
  workspaceMemberIds: string[];
  resourceId: string;
  actionId: string;
  isAllowed: boolean;
  reason: OverrideReason;
  reasonDescription?: string;
  expiresAt?: Date;
  approvedById?: string;
};

/**
 * Kết quả đánh giá permission với override
 */
export type PermissionEvaluationWithOverride = {
  // Kết quả cuối cùng
  finalDecision: 'ALLOW' | 'DENY';

  // Nguồn quyết định
  decisionSource: 'OVERRIDE' | 'TEMPLATE' | 'DEFAULT';

  // Chi tiết override (nếu có)
  override?: {
    id: string;
    isAllowed: boolean;
    reason: OverrideReason;
  };

  // Chi tiết template (nếu có)
  template?: {
    id: string;
    templateKey: string;
  };

  // Metadata
  evaluatedAt: Date;
  cacheHit: boolean;
};
