/**
 * Error classes for RBAC module
 */

// ============================================
// BASE ERROR CLASS
// ============================================

export class RbacError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'RbacError';
  }
}

// ============================================
// PERMISSION ERRORS
// ============================================

export class PermissionDeniedError extends RbacError {
  constructor(action: string, resource: string) {
    super(
      `Permission denied for action "${action}" on resource "${resource}"`,
      'PERMISSION_DENIED',
      { action, resource },
    );
    this.name = 'PermissionDeniedError';
  }
}

export class PermissionTemplateNotFoundError extends RbacError {
  constructor(templateId: string) {
    super(
      `Permission template not found: ${templateId}`,
      'PERMISSION_TEMPLATE_NOT_FOUND',
      { templateId },
    );
    this.name = 'PermissionTemplateNotFoundError';
  }
}

export class InvalidPermissionContextError extends RbacError {
  constructor(message: string) {
    super(
      `Invalid permission context: ${message}`,
      'INVALID_PERMISSION_CONTEXT',
      { message },
    );
    this.name = 'InvalidPermissionContextError';
  }
}

export class PermissionExpiredError extends RbacError {
  constructor(permissionId: string, expiredAt: Date) {
    super(`Permission has expired: ${permissionId}`, 'PERMISSION_EXPIRED', {
      permissionId,
      expiredAt,
    });
    this.name = 'PermissionExpiredError';
  }
}

// ============================================
// HIERARCHY ERRORS
// ============================================

export class HierarchyValidationError extends RbacError {
  constructor(message: string, userId?: string, targetLevel?: number) {
    super(
      `Hierarchy validation failed: ${message}`,
      'HIERARCHY_VALIDATION_FAILED',
      {
        userId,
        targetLevel,
      },
    );
    this.name = 'HierarchyValidationError';
  }
}

export class HierarchyLevelMismatchError extends RbacError {
  constructor(userLevel: number, requiredLevel: number) {
    super(
      `User hierarchy level ${userLevel} does not meet required level ${requiredLevel}`,
      'HIERARCHY_LEVEL_MISMATCH',
      { userLevel, requiredLevel },
    );
    this.name = 'HierarchyLevelMismatchError';
  }
}

export class InvalidHierarchyStructureError extends RbacError {
  constructor(message: string) {
    super(
      `Invalid hierarchy structure: ${message}`,
      'INVALID_HIERARCHY_STRUCTURE',
      { message },
    );
    this.name = 'InvalidHierarchyStructureError';
  }
}

// ============================================
// POLICY ERRORS
// ============================================

export class PolicyEvaluationError extends RbacError {
  constructor(policyId: string, reason: string) {
    super(
      `Policy evaluation failed for ${policyId}: ${reason}`,
      'POLICY_EVALUATION_FAILED',
      { policyId, reason },
    );
    this.name = 'PolicyEvaluationError';
  }
}

export class PolicyNotFoundError extends RbacError {
  constructor(policyId: string) {
    super(`Policy not found: ${policyId}`, 'POLICY_NOT_FOUND', { policyId });
    this.name = 'PolicyNotFoundError';
  }
}

export class InvalidPolicyConditionError extends RbacError {
  constructor(condition: string, reason?: string) {
    super(
      `Invalid policy condition: ${condition}${reason ? ` - ${reason}` : ''}`,
      'INVALID_POLICY_CONDITION',
      { condition, reason },
    );
    this.name = 'InvalidPolicyConditionError';
  }
}

export class PolicyConditionNotMetError extends RbacError {
  constructor(policyId: string, failedConditions: string[]) {
    super(
      `Policy conditions not met for ${policyId}`,
      'POLICY_CONDITION_NOT_MET',
      { policyId, failedConditions },
    );
    this.name = 'PolicyConditionNotMetError';
  }
}

// ============================================
// VALIDATION ERRORS
// ============================================

export class ValidationStepError extends RbacError {
  constructor(stepNumber: number, stepName: string, reason: string) {
    super(
      `Step ${stepNumber} (${stepName}) failed: ${reason}`,
      'VALIDATION_STEP_FAILED',
      { stepNumber, stepName, reason },
    );
    this.name = 'ValidationStepError';
  }
}

export class PreValidationError extends RbacError {
  constructor(message: string) {
    super(`Pre-validation failed: ${message}`, 'PRE_VALIDATION_FAILED', {
      message,
    });
    this.name = 'PreValidationError';
  }
}

export class ValidationTimeoutError extends RbacError {
  constructor(timeoutMs: number) {
    super(`Validation timed out after ${timeoutMs}ms`, 'VALIDATION_TIMEOUT', {
      timeoutMs,
    });
    this.name = 'ValidationTimeoutError';
  }
}

// ============================================
// RESOURCE ERRORS
// ============================================

export class ResourceNotFoundError extends RbacError {
  constructor(resourceType: string, resourceId: string) {
    super(
      `Resource not found: ${resourceType}/${resourceId}`,
      'RESOURCE_NOT_FOUND',
      { resourceType, resourceId },
    );
    this.name = 'ResourceNotFoundError';
  }
}

export class ResourceAccessDeniedError extends RbacError {
  constructor(resourceType: string, resourceId: string, reason?: string) {
    super(
      `Access denied to resource: ${resourceType}/${resourceId}${reason ? ` - ${reason}` : ''}`,
      'RESOURCE_ACCESS_DENIED',
      { resourceType, resourceId, reason },
    );
    this.name = 'ResourceAccessDeniedError';
  }
}

// ============================================
// USER CONTEXT ERRORS
// ============================================

export class UserContextResolutionError extends RbacError {
  constructor(userId: string, reason: string) {
    super(
      `Failed to resolve user context for ${userId}: ${reason}`,
      'USER_CONTEXT_RESOLUTION_FAILED',
      { userId, reason },
    );
    this.name = 'UserContextResolutionError';
  }
}

export class UserNotFoundError extends RbacError {
  constructor(userId: string) {
    super(`User not found: ${userId}`, 'USER_NOT_FOUND', { userId });
    this.name = 'UserNotFoundError';
  }
}

// ============================================
// CACHE ERRORS
// ============================================

export class CacheOperationError extends RbacError {
  constructor(operation: string, key: string, reason?: string) {
    super(
      `Cache operation "${operation}" failed for key: ${key}${reason ? ` - ${reason}` : ''}`,
      'CACHE_OPERATION_FAILED',
      { operation, key, reason },
    );
    this.name = 'CacheOperationError';
  }
}

export class CacheInvalidationError extends RbacError {
  constructor(tags: string[], reason?: string) {
    super(
      `Cache invalidation failed for tags: ${tags.join(', ')}${reason ? ` - ${reason}` : ''}`,
      'CACHE_INVALIDATION_FAILED',
      { tags, reason },
    );
    this.name = 'CacheInvalidationError';
  }
}

// ============================================
// AUDIT ERRORS
// ============================================

export class AuditLogError extends RbacError {
  constructor(operation: string, reason: string) {
    super(`Audit log ${operation} failed: ${reason}`, 'AUDIT_LOG_FAILED', {
      operation,
      reason,
    });
    this.name = 'AuditLogError';
  }
}

// ============================================
// TEMPORARY PERMISSION ERRORS
// ============================================

export class TemporaryPermissionExpiredError extends RbacError {
  constructor(permissionId: string) {
    super(
      `Temporary permission has expired: ${permissionId}`,
      'TEMPORARY_PERMISSION_EXPIRED',
      { permissionId },
    );
    this.name = 'TemporaryPermissionExpiredError';
  }
}

export class TemporaryPermissionNotFoundError extends RbacError {
  constructor(permissionId: string) {
    super(
      `Temporary permission not found: ${permissionId}`,
      'TEMPORARY_PERMISSION_NOT_FOUND',
      { permissionId },
    );
    this.name = 'TemporaryPermissionNotFoundError';
  }
}

// ============================================
// DEPARTMENT RESTRICTION ERRORS
// ============================================

export class DepartmentRestrictionError extends RbacError {
  constructor(
    userId: string,
    departmentId: string,
    targetDepartmentId: string,
  ) {
    super(
      `User ${userId} from department ${departmentId} cannot access department ${targetDepartmentId}`,
      'DEPARTMENT_RESTRICTION',
      { userId, departmentId, targetDepartmentId },
    );
    this.name = 'DepartmentRestrictionError';
  }
}
