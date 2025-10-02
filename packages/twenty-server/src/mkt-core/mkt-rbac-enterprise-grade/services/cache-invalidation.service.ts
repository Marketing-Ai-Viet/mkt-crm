/**
 * Cache Invalidation Service
 * Handles automatic cache invalidation based on data changes
 */

import { Injectable, Logger } from '@nestjs/common';

import {
  CacheInvalidationEvent,
  CACHE_INVALIDATION_PATTERNS,
  EVENT_PRIORITY_MAP,
  InvalidationPriority,
  InvalidationScope,
  INVALIDATION_STRATEGY,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/cache-invalidation.constants';
import { ENTERPRISE_RBAC_CONFIG } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';

import { RbacCacheManagerService } from './rbac-cache-manager.service';

/**
 * Invalidation request
 */
interface InvalidationRequest {
  event: CacheInvalidationEvent;
  entityId?: string;
  workspaceMemberId?: string;
  workspaceId?: string;
  userId?: string;
  templateId?: string;
  departmentId?: string;
  resourceType?: string;
  recordId?: string;
  policyId?: string;
  priority?: InvalidationPriority;
  scope?: InvalidationScope;
  immediate?: boolean;
}

/**
 * Batched invalidation job
 */
interface InvalidationJob {
  patterns: Set<string>;
  priority: InvalidationPriority;
  timestamp: number;
}

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  // Queue for batched invalidations
  private invalidationQueue: InvalidationJob[] = [];
  private batchTimer?: NodeJS.Timeout;

  constructor(private readonly cacheManager: RbacCacheManagerService) {
    this.logger.log('Cache Invalidation Service initialized');
  }

  /**
   * Invalidate cache based on event
   */
  async invalidate(request: InvalidationRequest): Promise<void> {
    const validationMode = ENTERPRISE_RBAC_CONFIG.VALIDATION_MODE;
    const strategy = INVALIDATION_STRATEGY[validationMode];

    const priority =
      request.priority ||
      EVENT_PRIORITY_MAP[request.event] ||
      InvalidationPriority.MEDIUM;

    this.logger.debug('Cache invalidation requested', {
      event: request.event,
      priority,
      immediate: request.immediate,
      validationMode,
    });

    // Get patterns to invalidate
    const patterns = this.resolveInvalidationPatterns(request);

    if (patterns.length === 0) {
      this.logger.debug('No patterns to invalidate', { event: request.event });

      return;
    }

    // Immediate invalidation for critical events or simplified mode
    if (
      request.immediate ||
      priority === InvalidationPriority.CRITICAL ||
      !strategy.batchInvalidation
    ) {
      await this.executeInvalidation(patterns);
    } else {
      // Batch invalidation
      this.queueInvalidation(patterns, priority);
    }
  }

  /**
   * Invalidate cache when user data changes
   */
  async invalidateUserCache(
    workspaceMemberId: string,
    userId?: string,
  ): Promise<void> {
    await this.invalidate({
      event: CacheInvalidationEvent.USER_UPDATED,
      workspaceMemberId,
      userId,
      immediate: true,
    });
  }

  /**
   * Invalidate cache when permission template changes
   */
  async invalidateTemplateCache(templateId: string): Promise<void> {
    await this.invalidate({
      event: CacheInvalidationEvent.TEMPLATE_UPDATED,
      templateId,
      immediate: true,
      priority: InvalidationPriority.HIGH,
    });
  }

  /**
   * Invalidate cache when template is assigned to user
   */
  async invalidateOnTemplateAssignment(
    workspaceMemberId: string,
    templateId: string,
    userId?: string,
  ): Promise<void> {
    await this.invalidate({
      event: CacheInvalidationEvent.TEMPLATE_ASSIGNED,
      workspaceMemberId,
      templateId,
      userId,
      immediate: true,
      priority: InvalidationPriority.HIGH,
    });
  }

  /**
   * Invalidate cache when policy changes
   */
  async invalidatePolicyCache(policyId: string): Promise<void> {
    await this.invalidate({
      event: CacheInvalidationEvent.POLICY_UPDATED,
      policyId,
      priority: InvalidationPriority.HIGH,
    });
  }

  /**
   * Invalidate cache when department changes
   */
  async invalidateDepartmentCache(departmentId: string): Promise<void> {
    await this.invalidate({
      event: CacheInvalidationEvent.DEPARTMENT_UPDATED,
      departmentId,
      priority: InvalidationPriority.MEDIUM,
    });
  }

  /**
   * Invalidate cache when resource changes
   */
  async invalidateResourceCache(
    resourceType: string,
    recordId?: string,
  ): Promise<void> {
    await this.invalidate({
      event: CacheInvalidationEvent.RESOURCE_UPDATED,
      resourceType,
      recordId,
      priority: InvalidationPriority.LOW,
    });
  }

  /**
   * Manual invalidation (for testing or troubleshooting)
   */
  async manualInvalidation(
    scope: InvalidationScope = InvalidationScope.GLOBAL,
  ): Promise<void> {
    this.logger.warn('Manual cache invalidation triggered', { scope });

    await this.invalidate({
      event: CacheInvalidationEvent.MANUAL_INVALIDATION,
      scope,
      immediate: true,
      priority: InvalidationPriority.CRITICAL,
    });
  }

  /**
   * Flush pending invalidations
   */
  async flush(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    await this.processBatch();
  }

  /**
   * Private methods
   */

  private resolveInvalidationPatterns(request: InvalidationRequest): string[] {
    const basePatterns = CACHE_INVALIDATION_PATTERNS[request.event] || [];

    // Replace placeholders with actual values
    const resolvedPatterns = basePatterns.map((pattern) => {
      let resolved = pattern;

      if (request.userId) {
        resolved = resolved.replace('${userId}', request.userId);
      }
      if (request.workspaceMemberId) {
        resolved = resolved.replace(
          '${workspaceMemberId}',
          request.workspaceMemberId,
        );
      }
      if (request.templateId) {
        resolved = resolved.replace('${templateId}', request.templateId);
      }
      if (request.departmentId) {
        resolved = resolved.replace('${departmentId}', request.departmentId);
      }
      if (request.resourceType) {
        resolved = resolved.replace('${resourceType}', request.resourceType);
      }
      if (request.recordId) {
        resolved = resolved.replace('${recordId}', request.recordId);
      }
      if (request.policyId) {
        resolved = resolved.replace('${policyId}', request.policyId);
      }

      return resolved;
    });

    // Filter out patterns that still have placeholders (missing required data)
    return resolvedPatterns.filter((pattern) => !pattern.includes('${'));
  }

  private async executeInvalidation(patterns: string[]): Promise<void> {
    this.logger.debug('Executing cache invalidation', {
      patternCount: patterns.length,
    });

    for (const pattern of patterns) {
      try {
        await this.cacheManager.invalidateByPattern(pattern);
        this.logger.debug('Pattern invalidated', { pattern });
      } catch (error) {
        this.logger.error('Failed to invalidate pattern', {
          pattern,
          error: error.message,
        });
      }
    }
  }

  private queueInvalidation(
    patterns: string[],
    priority: InvalidationPriority,
  ): void {
    // Find existing job with same priority or create new one
    let job = this.invalidationQueue.find((j) => j.priority === priority);

    if (!job) {
      job = {
        patterns: new Set(),
        priority,
        timestamp: Date.now(),
      };
      this.invalidationQueue.push(job);
    }

    // Add patterns to job
    patterns.forEach((p) => job?.patterns.add(p));

    this.logger.debug('Invalidation queued', {
      priority,
      totalPatterns: job.patterns.size,
      queueLength: this.invalidationQueue.length,
    });

    // Schedule batch processing
    this.scheduleBatch();
  }

  private scheduleBatch(): void {
    if (this.batchTimer) {
      return; // Already scheduled
    }

    const validationMode = ENTERPRISE_RBAC_CONFIG.VALIDATION_MODE;
    const strategy = INVALIDATION_STRATEGY[validationMode];

    this.batchTimer = setTimeout(() => {
      this.batchTimer = undefined;
      this.processBatch();
    }, strategy.delayMs);
  }

  private async processBatch(): Promise<void> {
    if (this.invalidationQueue.length === 0) {
      return;
    }

    // Sort by priority (highest first)
    this.invalidationQueue.sort((a, b) => b.priority - a.priority);

    this.logger.debug('Processing invalidation batch', {
      jobs: this.invalidationQueue.length,
      totalPatterns: this.invalidationQueue.reduce(
        (sum, job) => sum + job.patterns.size,
        0,
      ),
    });

    // Process all jobs
    for (const job of this.invalidationQueue) {
      const patterns = Array.from(job.patterns);

      await this.executeInvalidation(patterns);
    }

    // Clear queue
    this.invalidationQueue = [];
  }
}
