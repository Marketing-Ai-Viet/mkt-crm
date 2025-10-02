/**
 * Permission Template Cache Subscriber
 * Automatically invalidates cache when permission templates change
 */

import { Injectable, Logger } from '@nestjs/common';

import { CacheInvalidationEvent } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/cache-invalidation.constants';
import { CacheInvalidationService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/cache-invalidation.service';

/**
 * Note: Since we're using workspace entities, we need to handle this differently
 * This is a template showing how to implement cache invalidation
 * Actual implementation depends on your entity structure
 */
@Injectable()
export class PermissionTemplateCacheSubscriber {
  private readonly logger = new Logger(PermissionTemplateCacheSubscriber.name);

  constructor(private readonly cacheInvalidation: CacheInvalidationService) {}

  /**
   * Call this method when a template is created
   */
  async afterTemplateInsert(templateId: string): Promise<void> {
    this.logger.debug('Template created, invalidating cache', { templateId });

    await this.cacheInvalidation.invalidate({
      event: CacheInvalidationEvent.TEMPLATE_CREATED,
      templateId,
      immediate: true,
    });
  }

  /**
   * Call this method when a template is updated
   */
  async afterTemplateUpdate(templateId: string): Promise<void> {
    this.logger.debug('Template updated, invalidating cache', { templateId });

    await this.cacheInvalidation.invalidateTemplateCache(templateId);
  }

  /**
   * Call this method when a template is deleted
   */
  async afterTemplateRemove(templateId: string): Promise<void> {
    this.logger.debug('Template deleted, invalidating cache', { templateId });

    await this.cacheInvalidation.invalidate({
      event: CacheInvalidationEvent.TEMPLATE_DELETED,
      templateId,
      immediate: true,
    });
  }

  /**
   * Call this method when a template is assigned to a user
   */
  async afterTemplateAssigned(
    workspaceMemberId: string,
    templateId: string,
    userId?: string,
  ): Promise<void> {
    this.logger.debug('Template assigned, invalidating cache', {
      workspaceMemberId,
      templateId,
    });

    await this.cacheInvalidation.invalidateOnTemplateAssignment(
      workspaceMemberId,
      templateId,
      userId,
    );
  }

  /**
   * Call this method when a template is unassigned from a user
   */
  async afterTemplateUnassigned(
    workspaceMemberId: string,
    templateId: string,
  ): Promise<void> {
    this.logger.debug('Template unassigned, invalidating cache', {
      workspaceMemberId,
      templateId,
    });

    await this.cacheInvalidation.invalidate({
      event: CacheInvalidationEvent.TEMPLATE_UNASSIGNED,
      workspaceMemberId,
      templateId,
      immediate: true,
    });
  }
}
