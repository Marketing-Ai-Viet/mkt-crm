import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';

import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { OrderOverdueQueueStatsOutput } from 'src/mkt-core/order/dto/order-response.output';
import { OrderOverdueSchedulerService } from 'src/mkt-core/order/services/core/order-overdue-scheduler.service';

/**
 * OrderOverdueQueryResolver - GraphQL resolver for order overdue observability
 *
 * Provides queries for:
 * - getOrderOverdueQueueStats: Get queue statistics for monitoring
 */
@Resolver()
export class OrderOverdueQueryResolver {
  constructor(
    private readonly orderOverdueSchedulerService: OrderOverdueSchedulerService,
  ) {}

  /**
   * Get order overdue queue statistics
   *
   * Returns current state of the order overdue delayed job queue:
   * - waiting: Jobs waiting to be processed
   * - delayed: Jobs scheduled for future execution (orders pending payment)
   * - active: Jobs currently being processed
   * - completed: Jobs completed successfully
   * - failed: Jobs that failed
   * - total: Total jobs in queue (waiting + delayed + active)
   *
   * Use cases:
   * - Admin dashboard monitoring
   * - Alert when failed > threshold
   * - Capacity planning (delayed count shows pending orders volume)
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Query(() => OrderOverdueQueueStatsOutput, {
    description: 'Get order overdue queue statistics for monitoring',
  })
  async getOrderOverdueQueueStats(): Promise<OrderOverdueQueueStatsOutput> {
    return this.orderOverdueSchedulerService.getQueueStats();
  }
}
