import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { DashboardWidgetRepository } from 'src/mkt-core/mkt-dashboard/repositories/dashboard-widget.repository';
import { DashboardCacheService } from 'src/mkt-core/mkt-dashboard/services/core/dashboard-cache.service';
import { MktDashboardWidgetWorkspaceEntity } from 'src/mkt-core/mkt-dashboard/workspace-entity/mkt-dashboard-widget.workspace-entity';
import { CreateDashboardWidgetInput } from 'src/mkt-core/mkt-dashboard/dto/input/create-widget.input';
import { UpdateWidgetPositionInput } from 'src/mkt-core/mkt-dashboard/dto/input/update-widget-position.input';
import {
  widgetFilterConfigSchema,
  widgetDisplayConfigSchema,
} from 'src/mkt-core/mkt-dashboard/types/dashboard-config.schema';
import { getErrorMessage } from 'src/mkt-core/utils';

const LOG_CONTEXT = 'DashboardWidgetService';

@Injectable()
export class DashboardWidgetService {
  private readonly logger = new Logger(LOG_CONTEXT);

  constructor(
    private readonly widgetRepository: DashboardWidgetRepository,
    private readonly cacheService: DashboardCacheService,
  ) {}

  async getWidgetById(
    widgetId: string,
  ): Promise<MktDashboardWidgetWorkspaceEntity> {
    // Check cache first
    const cacheKey = this.cacheService.buildWidgetKey(widgetId);
    const cached =
      await this.cacheService.get<MktDashboardWidgetWorkspaceEntity>(cacheKey);

    if (cached) return cached;

    const widget = await this.widgetRepository.findById(widgetId);

    if (!widget) {
      throw new NotFoundException(`Widget not found: ${widgetId}`);
    }

    await this.cacheService.set(cacheKey, widget, 3600); // 1 hour TTL

    return widget;
  }

  async getWidgetByCode(
    widgetCode: string,
  ): Promise<MktDashboardWidgetWorkspaceEntity | null> {
    return this.widgetRepository.findByWidgetCode(widgetCode);
  }

  async getActiveWidgets(): Promise<MktDashboardWidgetWorkspaceEntity[]> {
    return this.widgetRepository.findActiveWidgets();
  }

  async getSystemDefaultWidgets(): Promise<
    MktDashboardWidgetWorkspaceEntity[]
  > {
    return this.widgetRepository.findSystemDefaultWidgets();
  }

  async getWidgetsByOwner(
    ownerId: string,
  ): Promise<MktDashboardWidgetWorkspaceEntity[]> {
    return this.widgetRepository.findByOwnerId(ownerId);
  }

  async createWidget(
    input: CreateDashboardWidgetInput,
    _workspaceMemberId: string | undefined,
  ): Promise<MktDashboardWidgetWorkspaceEntity> {
    // Validate Zod schemas for JSON fields
    if (input.filterConfig) {
      widgetFilterConfigSchema.parse(input.filterConfig);
    }
    if (input.widgetConfig) {
      widgetDisplayConfigSchema.parse(input.widgetConfig);
    }

    try {
      const widget = await this.widgetRepository.create({
        widgetName: input.widgetName,
        widgetCode: input.widgetCode,
        widgetType: input.widgetType,
        dataSource: input.dataSource,
        description: input.description,
        filterConfig: input.filterConfig,
        widgetConfig: input.widgetConfig,
        visibility: input.visibility ?? 'ALL',
        isActive: true,
        isSystemDefault: false,
        displayOrder: input.displayOrder ?? 0,
      });

      this.logger.log('Widget created', {
        widgetId: widget.id,
        widgetCode: input.widgetCode,
      });

      return widget;
    } catch (error) {
      this.logger.error('Failed to create widget', {
        error: getErrorMessage(error),
        input: { widgetCode: input.widgetCode },
      });
      throw error;
    }
  }

  async updateWidgetPosition(
    input: UpdateWidgetPositionInput,
  ): Promise<MktDashboardWidgetWorkspaceEntity | null> {
    const widget = await this.widgetRepository.findById(input.widgetId);

    if (!widget) {
      throw new NotFoundException(`Widget not found: ${input.widgetId}`);
    }

    await this.widgetRepository.update(input.widgetId, {
      displayOrder: input.displayOrder,
    });

    // Invalidate cache
    await this.cacheService.invalidateWidget(input.widgetId);

    return this.widgetRepository.findById(input.widgetId);
  }

  async deactivateWidget(widgetId: string): Promise<void> {
    await this.widgetRepository.update(widgetId, { isActive: false });
    await this.cacheService.invalidateWidget(widgetId);
  }
}
