import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { DashboardCacheService } from 'src/mkt-core/mkt-dashboard/services/core/dashboard-cache.service';
import { getErrorMessage } from 'src/mkt-core/utils';

const LOG_CONTEXT = 'DashboardCacheInvalidation';

/**
 * Dashboard cache invalidation events
 * These events are emitted by domain services when data changes
 */
export const DASHBOARD_INVALIDATION_EVENTS = {
  ORDER_CHANGED: 'dashboard.invalidate.order',
  PAYMENT_CHANGED: 'dashboard.invalidate.payment',
  CUSTOMER_CHANGED: 'dashboard.invalidate.customer',
  KPI_CHANGED: 'dashboard.invalidate.kpi',
  WIDGET_CHANGED: 'dashboard.invalidate.widget',
  LAYOUT_CHANGED: 'dashboard.invalidate.layout',
} as const;

export type DashboardInvalidationPayload = {
  workspaceId: string;
  entityId?: string;
  userId?: string;
  widgetId?: string;
};

@Injectable()
export class DashboardCacheInvalidationListener {
  private readonly logger = new Logger(LOG_CONTEXT);

  constructor(private readonly cacheService: DashboardCacheService) {}

  /**
   * When an order is created/updated/completed,
   * invalidate summary + revenue stats + order stats caches
   */
  @OnEvent(DASHBOARD_INVALIDATION_EVENTS.ORDER_CHANGED)
  async handleOrderChanged(
    payload: DashboardInvalidationPayload,
  ): Promise<void> {
    const { workspaceId } = payload;

    this.logger.log('Invalidating dashboard caches for order change', {
      workspaceId,
    });

    try {
      await this.cacheService.invalidateSummary(workspaceId);
      // Stats caches will expire via TTL (5 minutes)
      // For more granular invalidation, call invalidateStats per data source
      await this.cacheService.invalidateStats(workspaceId, 'REVENUE', [
        'TODAY',
        'THIS_WEEK',
        'THIS_MONTH',
        'THIS_QUARTER',
        'THIS_YEAR',
      ]);
      await this.cacheService.invalidateStats(workspaceId, 'ORDERS', [
        'TODAY',
        'THIS_WEEK',
        'THIS_MONTH',
        'THIS_QUARTER',
        'THIS_YEAR',
      ]);
      await this.cacheService.invalidateLeaderboard(workspaceId, [
        'TODAY',
        'THIS_WEEK',
        'THIS_MONTH',
        'THIS_QUARTER',
        'THIS_YEAR',
      ]);
    } catch (error) {
      this.logger.error('Failed to invalidate order caches', {
        error: getErrorMessage(error),
        workspaceId,
      });
    }
  }

  /**
   * When a payment is confirmed/rejected,
   * invalidate summary + payment stats + revenue stats caches
   */
  @OnEvent(DASHBOARD_INVALIDATION_EVENTS.PAYMENT_CHANGED)
  async handlePaymentChanged(
    payload: DashboardInvalidationPayload,
  ): Promise<void> {
    const { workspaceId } = payload;

    this.logger.log('Invalidating dashboard caches for payment change', {
      workspaceId,
    });

    try {
      await this.cacheService.invalidateSummary(workspaceId);
      await this.cacheService.invalidateStats(workspaceId, 'PAYMENTS', [
        'TODAY',
        'THIS_WEEK',
        'THIS_MONTH',
        'THIS_QUARTER',
        'THIS_YEAR',
      ]);
      await this.cacheService.invalidateStats(workspaceId, 'REVENUE', [
        'TODAY',
        'THIS_WEEK',
        'THIS_MONTH',
        'THIS_QUARTER',
        'THIS_YEAR',
      ]);
      await this.cacheService.invalidateLeaderboard(workspaceId, [
        'TODAY',
        'THIS_WEEK',
        'THIS_MONTH',
        'THIS_QUARTER',
        'THIS_YEAR',
      ]);
    } catch (error) {
      this.logger.error('Failed to invalidate payment caches', {
        error: getErrorMessage(error),
        workspaceId,
      });
    }
  }

  /**
   * When a customer is created/updated,
   * invalidate summary + customer stats caches
   */
  @OnEvent(DASHBOARD_INVALIDATION_EVENTS.CUSTOMER_CHANGED)
  async handleCustomerChanged(
    payload: DashboardInvalidationPayload,
  ): Promise<void> {
    const { workspaceId } = payload;

    this.logger.log('Invalidating dashboard caches for customer change', {
      workspaceId,
    });

    try {
      await this.cacheService.invalidateSummary(workspaceId);
      await this.cacheService.invalidateStats(workspaceId, 'CUSTOMERS', [
        'TODAY',
        'THIS_WEEK',
        'THIS_MONTH',
        'THIS_QUARTER',
        'THIS_YEAR',
      ]);
    } catch (error) {
      this.logger.error('Failed to invalidate customer caches', {
        error: getErrorMessage(error),
        workspaceId,
      });
    }
  }

  /**
   * When a KPI is updated,
   * invalidate summary + KPI stats caches
   */
  @OnEvent(DASHBOARD_INVALIDATION_EVENTS.KPI_CHANGED)
  async handleKpiChanged(payload: DashboardInvalidationPayload): Promise<void> {
    const { workspaceId } = payload;

    this.logger.log('Invalidating dashboard caches for KPI change', {
      workspaceId,
    });

    try {
      await this.cacheService.invalidateSummary(workspaceId);
      await this.cacheService.invalidateStats(workspaceId, 'KPIS', [
        'TODAY',
        'THIS_WEEK',
        'THIS_MONTH',
        'THIS_QUARTER',
        'THIS_YEAR',
      ]);
    } catch (error) {
      this.logger.error('Failed to invalidate KPI caches', {
        error: getErrorMessage(error),
        workspaceId,
      });
    }
  }

  /**
   * When widget config is changed
   */
  @OnEvent(DASHBOARD_INVALIDATION_EVENTS.WIDGET_CHANGED)
  async handleWidgetChanged(
    payload: DashboardInvalidationPayload,
  ): Promise<void> {
    if (!payload.widgetId) {
      return;
    }

    this.logger.log('Invalidating widget cache', {
      widgetId: payload.widgetId,
    });

    try {
      await this.cacheService.invalidateWidget(payload.widgetId);
    } catch (error) {
      this.logger.error('Failed to invalidate widget cache', {
        error: getErrorMessage(error),
        widgetId: payload.widgetId,
      });
    }
  }

  /**
   * When layout is saved
   */
  @OnEvent(DASHBOARD_INVALIDATION_EVENTS.LAYOUT_CHANGED)
  async handleLayoutChanged(
    payload: DashboardInvalidationPayload,
  ): Promise<void> {
    if (!payload.userId) {
      return;
    }

    this.logger.log('Invalidating layout cache', {
      userId: payload.userId,
    });

    try {
      await this.cacheService.invalidateLayout(payload.userId);
    } catch (error) {
      this.logger.error('Failed to invalidate layout cache', {
        error: getErrorMessage(error),
        userId: payload.userId,
      });
    }
  }
}
