import { ForbiddenException } from '@nestjs/common';

import { CASBIN_ERROR_CODES } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/constants/error-codes.constant';

/**
 * Permission denied error details
 */
type PermissionDeniedDetails = {
  resource: string;
  action: string;
  reason?: string;
  userId?: string;
  workspaceId?: string;
};

/**
 * Permission Denied Error
 *
 * Standard error cho permission denied responses.
 * Extends ForbiddenException với additional context.
 */
export class PermissionDeniedError extends ForbiddenException {
  readonly code = CASBIN_ERROR_CODES.PERMISSION_DENIED;
  readonly resource: string;
  readonly action: string;
  readonly permissionReason?: string;

  constructor(details: PermissionDeniedDetails) {
    const message = PermissionDeniedError.formatMessage(details);

    super({
      statusCode: 403,
      error: 'Forbidden',
      message,
      code: CASBIN_ERROR_CODES.PERMISSION_DENIED,
      resource: details.resource,
      action: details.action,
    });

    this.resource = details.resource;
    this.action = details.action;
    this.permissionReason = details.reason;
  }

  /**
   * Format error message
   */
  private static formatMessage(details: PermissionDeniedDetails): string {
    const base = `Permission denied: cannot ${details.action} on ${details.resource}`;

    if (details.reason) {
      return `${base}. ${details.reason}`;
    }

    return base;
  }

  /**
   * Get error details for logging
   */
  getLogDetails(): Record<string, unknown> {
    return {
      code: this.code,
      resource: this.resource,
      action: this.action,
      reason: this.permissionReason,
    };
  }
}
