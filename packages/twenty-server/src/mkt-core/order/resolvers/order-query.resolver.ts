import { UseGuards } from '@nestjs/common';
import { Args, Context, Query, Resolver } from '@nestjs/graphql';

import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  ORDER_GRAPHQL_DESCRIPTIONS,
  PAYMENT_STATUS,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants';
import {
  OrderPaymentSummaryOutput,
  OrderOutput,
  OrderListOutput,
  CustomerOrderStatsOutput,
} from 'src/mkt-core/order/dto/order-response.output';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { DataScope } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators';
import { DataScopeContext } from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/types';
import { filterToWhere } from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/utils';

// ============================================
// TYPES
// ============================================

type GraphQLContext = {
  req: {
    dataScope?: DataScopeContext;
  };
};

// ============================================
// CONSTANTS
// ============================================

const ORDER_RESOURCE = 'mktOrder';

/**
 * OrderQueryResolver - GraphQL resolver for order queries with hierarchical access filtering
 *
 * Access rules (automatically applied by @DataScope):
 * - Staff (level 8-11): Only see own orders (createdById = self)
 * - Manager (level 7): See orders from direct subordinates
 * - Upper Management (level 4-6): See orders in reporting chain
 * - Executive (level 1-3): See all orders
 *
 * Provides queries for:
 * - getOrderById: Get order by ID
 * - getOrderByCode: Get order by order code
 * - getOrdersByCustomer: Get orders by customer ID
 * - getOrdersByStatus: Get orders by status
 * - getOrderPaymentSummary: Get payment summary for an order
 * - getCustomerOrderStats: Get order statistics for a customer
 */
@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class OrderQueryResolver {
  constructor(private readonly orderRepository: MktOrderRepository) {}

  /**
   * Get order by ID with hierarchical access filtering
   */
  @Query(() => OrderOutput, {
    description: ORDER_GRAPHQL_DESCRIPTIONS.GET_ORDER_BY_ID,
    nullable: true,
  })
  @DataScope({
    resource: ORDER_RESOURCE,
    mode: 'AUTO',
    auditLevel: 'medium',
  })
  async getOrderById(
    @Args('orderId', { type: () => String }) orderId: string,
    @Context() ctx: GraphQLContext,
  ): Promise<OrderOutput | null> {
    const whereClause = this.buildWhereClause({ id: orderId }, ctx);
    const order = await this.orderRepository.findOneWithWhere(whereClause);

    if (!order) {
      return null;
    }

    return this.mapOrderToOutput(order);
  }

  /**
   * Get order by order code with hierarchical access filtering
   */
  @Query(() => OrderOutput, {
    description: ORDER_GRAPHQL_DESCRIPTIONS.GET_ORDER_BY_CODE,
    nullable: true,
  })
  @DataScope({
    resource: ORDER_RESOURCE,
    mode: 'AUTO',
    auditLevel: 'medium',
  })
  async getOrderByCode(
    @Args('orderCode', { type: () => String }) orderCode: string,
    @Context() ctx: GraphQLContext,
  ): Promise<OrderOutput | null> {
    const whereClause = this.buildWhereClause({ orderCode }, ctx);
    const order = await this.orderRepository.findOneWithWhere(whereClause);

    if (!order) {
      return null;
    }

    return this.mapOrderToOutput(order);
  }

  /**
   * Get orders by customer ID with hierarchical access filtering
   */
  @Query(() => OrderListOutput, {
    description: ORDER_GRAPHQL_DESCRIPTIONS.GET_ORDERS_BY_CUSTOMER,
  })
  @DataScope({
    resource: ORDER_RESOURCE,
    mode: 'AUTO',
    auditLevel: 'low',
  })
  async getOrdersByCustomer(
    @Args('customerId', { type: () => String }) customerId: string,
    @Context() ctx: GraphQLContext,
  ): Promise<OrderListOutput> {
    const whereClause = this.buildWhereClause(
      { mktCustomerId: customerId },
      ctx,
    );
    const orders = await this.orderRepository.findManyWithWhere(whereClause);

    return {
      orders: orders.map((order) => this.mapOrderToOutput(order)),
      totalCount: orders.length,
    };
  }

  /**
   * Get orders by status with hierarchical access filtering
   */
  @Query(() => OrderListOutput, {
    description: ORDER_GRAPHQL_DESCRIPTIONS.GET_ORDERS_BY_STATUS,
  })
  @DataScope({
    resource: ORDER_RESOURCE,
    mode: 'AUTO',
    auditLevel: 'low',
  })
  async getOrdersByStatus(
    @Args('status', { type: () => ORDER_STATUS }) status: ORDER_STATUS,
    @Context() ctx: GraphQLContext,
  ): Promise<OrderListOutput> {
    const whereClause = this.buildWhereClause({ status }, ctx);
    const orders = await this.orderRepository.findManyWithWhere(whereClause);

    return {
      orders: orders.map((order) => this.mapOrderToOutput(order)),
      totalCount: orders.length,
    };
  }

  /**
   * Get payment summary for an order with hierarchical access filtering
   *
   * Returns:
   * - totalAmount: Order total
   * - paidAmount: Total confirmed payments
   * - remainingAmount: Amount left to pay
   * - paymentStatus: PENDING | PARTIAL | PAID | OVERPAID
   * - paidPercent: Percentage of total paid (0-100)
   */
  @Query(() => OrderPaymentSummaryOutput, {
    description: ORDER_GRAPHQL_DESCRIPTIONS.GET_ORDER_PAYMENT_SUMMARY,
    nullable: true,
  })
  @DataScope({
    resource: ORDER_RESOURCE,
    mode: 'AUTO',
    auditLevel: 'medium',
  })
  async getOrderPaymentSummary(
    @Args('orderId', { type: () => String }) orderId: string,
    @Context() ctx: GraphQLContext,
  ): Promise<OrderPaymentSummaryOutput | null> {
    const whereClause = this.buildWhereClause({ id: orderId }, ctx);
    const order = await this.orderRepository.findOneWithWhere(whereClause);

    if (!order) {
      return null;
    }

    const totalAmount = order.totalAmount ?? 0;
    const paidAmount = order.paidAmount ?? 0;
    const remainingAmount = order.remainingAmount ?? 0;
    const paymentStatus =
      (order.paymentStatus as PAYMENT_STATUS) ?? PAYMENT_STATUS.PENDING;

    // Calculate paid percentage
    const paidPercent =
      totalAmount > 0
        ? MoneyUtils.round(
            MoneyUtils.multiply(
              MoneyUtils.divideSafe(paidAmount, totalAmount).toNumber(),
              100,
            ).toNumber(),
            2,
          ).toNumber()
        : 0;

    return {
      totalAmount,
      paidAmount,
      remainingAmount,
      paymentStatus,
      paidPercent,
    };
  }

  /**
   * Get order statistics for a customer
   *
   * Note: This query aggregates data and doesn't apply hierarchical filter
   * since it returns statistics, not individual records.
   */
  @Query(() => CustomerOrderStatsOutput, {
    description: ORDER_GRAPHQL_DESCRIPTIONS.GET_CUSTOMER_ORDER_STATS,
  })
  @DataScope({
    resource: ORDER_RESOURCE,
    mode: 'SKIP', // Skip filtering for aggregation query
    auditLevel: 'low',
  })
  async getCustomerOrderStats(
    @Args('customerId', { type: () => String }) customerId: string,
  ): Promise<CustomerOrderStatsOutput> {
    const stats = await this.orderRepository.getCustomerOrderStats(customerId);

    return {
      orderCount: stats.orderCount,
      totalValue: stats.totalValue,
      firstOrderDate: stats.firstOrderDate ?? undefined,
      lastOrderDate: stats.lastOrderDate ?? undefined,
      averageOrderInterval: stats.averageOrderInterval,
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Build TypeORM where clause combining base conditions with hierarchical filter
   */
  private buildWhereClause(
    baseWhere: Record<string, unknown>,
    ctx: GraphQLContext,
  ): Record<string, unknown> | Record<string, unknown>[] {
    const dataScope = ctx.req?.dataScope;

    // No filter or full access - return base where only
    if (!dataScope?.filter || dataScope.hasFullAccess) {
      return baseWhere;
    }

    // Convert hierarchical filter to TypeORM where clause
    const hierarchicalWhere = filterToWhere(dataScope.filter);

    // No hierarchical conditions
    if (!hierarchicalWhere) {
      return baseWhere;
    }

    // Merge base where with hierarchical filter
    return this.mergeWhereConditions(baseWhere, hierarchicalWhere);
  }

  /**
   * Merge base where conditions with hierarchical filter
   */
  private mergeWhereConditions(
    baseWhere: Record<string, unknown>,
    hierarchicalWhere: Record<string, unknown> | Record<string, unknown>[],
  ): Record<string, unknown> | Record<string, unknown>[] {
    // If hierarchical is array (OR conditions), merge base into each
    if (Array.isArray(hierarchicalWhere)) {
      return hierarchicalWhere.map((hw) => ({ ...baseWhere, ...hw }));
    }

    // Simple merge for AND conditions
    return { ...baseWhere, ...hierarchicalWhere };
  }

  /**
   * Map order entity to output DTO
   */
  private mapOrderToOutput(order: MktOrderWorkspaceEntity): OrderOutput {
    return {
      id: order.id,
      name: order.name,
      orderCode: order.orderCode,
      status: order.status as ORDER_STATUS,
      totalAmount: order.totalAmount,
      subtotal: order.subtotal,
      tax: order.tax,
      discount: order.discount,
      promotionDiscount: order.promotionDiscount,
      comboDiscount: order.comboDiscount,
      currency: order.currency,
      note: order.note,
      paidAmount: order.paidAmount,
      remainingAmount: order.remainingAmount,
      paymentStatus: order.paymentStatus as PAYMENT_STATUS,
      accountingConfirmed: order.accountingConfirmed,
      mktCustomerId: order.mktCustomerId ?? undefined,
      accountOwnerId: order.accountOwnerId,
      createdById: order.createdById ?? undefined,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
