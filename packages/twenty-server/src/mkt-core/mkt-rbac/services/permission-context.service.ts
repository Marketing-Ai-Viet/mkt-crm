import { Injectable, Logger, Scope } from '@nestjs/common';

import { Request } from 'express';

import {
  SENSITIVE_OBJECTS,
  SECURITY_PATTERNS,
  DEFAULT_VALUES,
  STRING_LIMITS,
  SENSITIVE_METADATA_KEYS,
} from 'src/mkt-core/mkt-rbac/constants/rbac.constants';
import {
  AuditContext,
  PermissionContext,
  PermissionResult,
} from 'src/mkt-core/mkt-rbac/types/permission-context.type';

@Injectable({ scope: Scope.REQUEST })
export class PermissionContextService {
  private readonly logger = new Logger(PermissionContextService.name);

  private currentContext: PermissionContext | null = null;
  private permissionResults: Map<string, PermissionResult> = new Map();
  private auditMetadata: Record<
    string,
    string | number | boolean | null | undefined
  > = {};

  /**
   * Set the current permission context for the request
   */
  setContext(context: PermissionContext): void {
    this.currentContext = context;
    this.logger.debug(
      `Permission context set: ${context.action} ${context.objectName}`,
    );
  }

  /**
   * Get the current permission context
   */
  getContext(): PermissionContext | null {
    return this.currentContext;
  }

  /**
   * Add a permission result to the context
   */
  addPermissionResult(key: string, result: PermissionResult): void {
    this.permissionResults.set(key, result);
    this.logger.debug(`Permission result cached: ${key} -> ${result.result}`);
  }

  /**
   * Get a cached permission result
   */
  getPermissionResult(key: string): PermissionResult | null {
    return this.permissionResults.get(key) || null;
  }

  /**
   * Get all permission results for this request
   */
  getAllPermissionResults(): Map<string, PermissionResult> {
    return new Map(this.permissionResults);
  }

  /**
   * Add metadata for auditing
   */
  addAuditMetadata(
    key: string,
    value: string | number | boolean | null | undefined,
  ): void {
    this.auditMetadata[key] = value;
  }

  /**
   * Get all audit metadata
   */
  getAuditMetadata(): Record<
    string,
    string | number | boolean | null | undefined
  > {
    return { ...this.auditMetadata };
  }

  /**
   * Extract comprehensive audit context from request
   */
  extractAuditContext(request: Request): AuditContext {
    const baseContext = {
      ipAddress: this.extractClientIP(request),
      userAgent: request.get('User-Agent'),
      requestMethod: request.method,
      requestPath: request.path,
      sessionId: request.sessionID,
    };

    const additionalMetadata = {
      // Request timing
      timestamp: new Date().toISOString(),

      // Request details
      protocol: request.protocol,
      host: request.get('Host'),
      referrer: request.get('Referer'),
      acceptLanguage: request.get('Accept-Language'),

      // Custom headers (security-relevant)
      forwardedFor: request.get('X-Forwarded-For'),
      realIP: request.get('X-Real-IP'),

      // Query parameters (non-sensitive)
      queryKeys: Object.keys(request.query).join(','),
      hasBody: !!request.body && Object.keys(request.body).length > 0,

      // Content type for POST/PUT requests
      contentType: request.get('Content-Type'),

      // Custom audit metadata
      ...this.auditMetadata,
    };

    return {
      ...baseContext,
      additionalMetadata,
    };
  }

  /**
   * Generate a cache key for permission results
   */
  generatePermissionCacheKey(context: PermissionContext): string {
    const parts = [
      context.workspaceMemberId,
      context.action,
      context.objectName,
    ];

    if (context.recordId) {
      parts.push(context.recordId);
    }

    if (context.fieldName) {
      parts.push(context.fieldName);
    }

    return parts.join(':');
  }

  /**
   * Check if the current request should be audited
   */
  shouldAuditRequest(context: PermissionContext): boolean {
    // Always audit security-sensitive operations
    if (context.action === 'MUTATION') {
      return true;
    }

    // Audit operations on sensitive objects
    if ((SENSITIVE_OBJECTS as readonly string[]).includes(context.objectName)) {
      return true;
    }

    // Check metadata flags
    if (context.metadata?.forceAudit === true) {
      return true;
    }

    if (context.metadata?.skipAudit === true) {
      return false;
    }

    // Default: audit mutations and field writes but not queries for performance
    return context.action !== 'QUERY' && context.action !== 'SUBSCRIPTION';
  }

  /**
   * Sanitize permission context for logging (remove sensitive data)
   */
  sanitizeContextForLogging(
    context: PermissionContext,
  ): Partial<PermissionContext> {
    return {
      action: context.action,
      objectName: context.objectName,
      recordId: context.recordId,
      workspaceMemberId: this.maskId(context.workspaceMemberId),
      workspaceId: this.maskId(context.workspaceId),
      fieldName: context.fieldName,
      metadata: this.sanitizeMetadata(context.metadata),
    };
  }

  /**
   * Get request fingerprint for security analysis
   */
  getRequestFingerprint(request: Request): string {
    const components = [
      request.ip || DEFAULT_VALUES.UNKNOWN_IP,
      request.get('User-Agent') || DEFAULT_VALUES.UNKNOWN_USER_AGENT,
      request.get('Accept-Language') || DEFAULT_VALUES.UNKNOWN_LANGUAGE,
    ];

    return Buffer.from(components.join('|'))
      .toString('base64')
      .slice(0, STRING_LIMITS.MAX_FINGERPRINT_LENGTH);
  }

  /**
   * Detect potential security threats in the request
   */
  detectSecurityThreats(request: Request): string[] {
    const threats: string[] = [];

    // Detect potential SQL injection in query parameters
    const sqlPatterns = SECURITY_PATTERNS.SQL_INJECTION;

    const queryString = new URLSearchParams(
      request.query as Record<string, string>,
    ).toString();

    if (sqlPatterns.some((pattern) => pattern.test(queryString))) {
      threats.push('SQL_INJECTION_ATTEMPT');
    }

    // Detect XSS attempts in parameters
    const xssPatterns = SECURITY_PATTERNS.XSS;

    if (xssPatterns.some((pattern) => pattern.test(queryString))) {
      threats.push('XSS_ATTEMPT');
    }

    // Detect suspicious user agents
    const userAgent =
      request.get('User-Agent') || DEFAULT_VALUES.UNKNOWN_USER_AGENT;

    if (
      SECURITY_PATTERNS.SUSPICIOUS_AGENTS.some((agent) =>
        userAgent.toLowerCase().includes(agent),
      )
    ) {
      threats.push('SUSPICIOUS_USER_AGENT');
    }

    // Detect rapid requests (basic rate limiting check)
    if (request.headers['x-forwarded-for']) {
      threats.push('PROXY_DETECTED');
    }

    return threats;
  }

  private extractClientIP(request: Request): string | undefined {
    return (
      request.ip ||
      request.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
      request.get('X-Real-IP') ||
      request.socket.remoteAddress ||
      DEFAULT_VALUES.UNKNOWN_IP
    );
  }

  private maskId(id: string): string {
    if (!id || id.length < STRING_LIMITS.MIN_ID_LENGTH)
      return DEFAULT_VALUES.MASKED_ID;

    return (
      id.substring(0, STRING_LIMITS.MASK_PREFIX_LENGTH) +
      '***' +
      id.substring(id.length - STRING_LIMITS.MASK_SUFFIX_LENGTH)
    );
  }

  private sanitizeMetadata(
    metadata:
      | Record<string, string | number | boolean | null | undefined>
      | undefined,
  ): Record<string, string | number | boolean | null | undefined> | undefined {
    if (!metadata) return undefined;

    const sanitized: Record<
      string,
      string | number | boolean | null | undefined
    > = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (
        SENSITIVE_METADATA_KEYS.some((sensitive) =>
          key.toLowerCase().includes(sensitive),
        )
      ) {
        sanitized[key] = DEFAULT_VALUES.REDACTED_VALUE;
      } else if (
        typeof value === 'string' &&
        value.length > STRING_LIMITS.MAX_METADATA_STRING_LENGTH
      ) {
        sanitized[key] =
          value.substring(0, STRING_LIMITS.MAX_METADATA_STRING_LENGTH) +
          DEFAULT_VALUES.TRUNCATED_SUFFIX;
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
