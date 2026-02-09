import { UseGuards } from '@nestjs/common';
import { Args, Context, Query, Resolver } from '@nestjs/graphql';

import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  ORDER_GRAPHQL_DESCRIPTIONS,
  PAYMENT_STATUS,
  ORDER_STATUS,
  ORDER_DATA_SCOPE,
} from 'src/mkt-core/order/constants';
import {
  toPaginationOptions,
  calculatePageInfo,
} from 'src/mkt-core/common/dto/pagination.input';
import { GetOrdersInput } from 'src/mkt-core/order/dto/order-query.input';
import {
  OrderPaymentSummaryOutput,
  OrderOutput,
  OrderListOutput,
  CustomerOrderStatsOutput,
  PaginatedOrdersOutput,
} from 'src/mkt-core/order/dto/order-response.output';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import { DataScope } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators';
import { DataScopeContext } from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/types';
import { OrderQueryService } from 'src/mkt-core/order/services/domain/order-query.service';
import { RequireOrderReadAccess } from 'src/mkt-core/order/decorators/require-order-access.decorator';

// ============================================
// TYPES
// ============================================

type GraphQLContext = {
  req: {
    dataScope?: DataScopeContext;
  };
};

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
 * - getOrders: Get paginated list of orders with sorting and search
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
  constructor(
    private readonly orderRepository: MktOrderRepository,
    private readonly orderQueryService: OrderQueryService,
  ) {}

  /**
   * Get order by ID with hierarchical access filtering
   */
  @Query(() => OrderOutput, {
    description: ORDER_GRAPHQL_DESCRIPTIONS.GET_ORDER_BY_ID,
    nullable: true,
  })
  @RequireOrderReadAccess()
  @DataScope(ORDER_DATA_SCOPE.QUERY_SINGLE)
  async getOrderById(
    @Args('orderId', { type: () => String }) orderId: string,
    @Context() ctx: GraphQLContext,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<OrderOutput | null> {
    const whereClause = this.orderQueryService.buildWhereClause(
      { id: orderId },
      ctx,
    );
    const order = await this.orderRepository.findOneWithDetailsWorkspace(
      workspace.id,
      whereClause,
    );

    if (!order) {
      return null;
    }

    return this.orderQueryService.mapOrderToOutput(order);
  }

  /**
   * Get order by order code with hierarchical access filtering
   */
  @Query(() => OrderOutput, {
    description: ORDER_GRAPHQL_DESCRIPTIONS.GET_ORDER_BY_CODE,
    nullable: true,
  })
  @RequireOrderReadAccess()
  @DataScope(ORDER_DATA_SCOPE.QUERY_SINGLE)
  async getOrderByCode(
    @Args('orderCode', { type: () => String }) orderCode: string,
    @Context() ctx: GraphQLContext,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<OrderOutput | null> {
    const whereClause = this.orderQueryService.buildWhereClause(
      { orderCode },
      ctx,
    );
    const order = await this.orderRepository.findOneWithDetailsWorkspace(
      workspace.id,
      whereClause,
    );

    if (!order) {
      return null;
    }

    return this.orderQueryService.mapOrderToOutput(order);
  }

  /**
   * Get paginated list of orders with sorting and search
   *
   * Supports:
   * - Pagination (page, limit)
   * - Sorting (createdAt, updatedAt, orderCode, totalAmount, status, paymentStatus, paymentDeadline)
   * - Filtering (status, paymentStatus, customerId, salesStaffId)
   * - Search (orderCode, customer name/email/phone)
   */
  @Query(() => PaginatedOrdersOutput, {
    description: ORDER_GRAPHQL_DESCRIPTIONS.GET_ORDERS,
  })
  @RequireOrderReadAccess()
  @DataScope(ORDER_DATA_SCOPE.QUERY_LIST)
  async getOrders(
    @Args('input', { type: () => GetOrdersInput, nullable: true })
    input: GetOrdersInput | null,
    @Context() ctx: GraphQLContext,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<PaginatedOrdersOutput> {
    // Build pagination options
    const paginationOptions = toPaginationOptions(input?.pagination);

    // Build where clause from filter and hierarchical access
    const baseWhere: Record<string, unknown> = {};

    if (input?.filter?.status) {
      baseWhere.status = input.filter.status;
    }
    if (input?.filter?.paymentStatus) {
      baseWhere.paymentStatus = input.filter.paymentStatus;
    }
    if (input?.filter?.customerId) {
      baseWhere.mktCustomerId = input.filter.customerId;
    }
    if (input?.filter?.salesStaffId) {
      baseWhere.createdById = input.filter.salesStaffId;
    }

    // Apply hierarchical access filtering
    const whereClause = this.orderQueryService.buildWhereClause(baseWhere, ctx);

    // Build sort options
    const orderBy = input?.sort?.field
      ? {
          field: input.sort.field,
          direction: input.sort.direction ?? 'DESC',
        }
      : undefined;

    // Execute paginated query
    const { orders, totalCount } =
      await this.orderRepository.findPaginatedWithDetailsWorkspace(
        workspace.id,
        {
          where: whereClause as
            | Record<string, unknown>
            | Record<string, unknown>[],
          search: input?.filter?.search,
          orderBy: orderBy as { field: string; direction: 'ASC' | 'DESC' },
          skip: paginationOptions.skip,
          take: paginationOptions.limit,
        },
      );

    // Calculate page info
    const pageInfo = calculatePageInfo(totalCount, paginationOptions);

    return {
      orders: orders.map((order) =>
        this.orderQueryService.mapOrderToOutput(order),
      ),
      totalCount,
      pageInfo,
    };
  }

  /**
   * Get orders by customer ID with hierarchical access filtering
   */
  @Query(() => OrderListOutput, {
    description: ORDER_GRAPHQL_DESCRIPTIONS.GET_ORDERS_BY_CUSTOMER,
  })
  @RequireOrderReadAccess()
  @DataScope(ORDER_DATA_SCOPE.QUERY_BY_CUSTOMER)
  async getOrdersByCustomer(
    @Args('customerId', { type: () => String }) customerId: string,
    @Context() ctx: GraphQLContext,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<OrderListOutput> {
    const whereClause = this.orderQueryService.buildWhereClause(
      { mktCustomerId: customerId },
      ctx,
    );
    const orders = await this.orderRepository.findManyWithDetailsWorkspace(
      workspace.id,
      whereClause,
    );

    return {
      orders: orders.map((order) =>
        this.orderQueryService.mapOrderToOutput(order),
      ),
      totalCount: orders.length,
    };
  }

  /**
   * Get orders by status with hierarchical access filtering
   */
  @Query(() => OrderListOutput, {
    description: ORDER_GRAPHQL_DESCRIPTIONS.GET_ORDERS_BY_STATUS,
  })
  @RequireOrderReadAccess()
  @DataScope(ORDER_DATA_SCOPE.QUERY_LIST)
  async getOrdersByStatus(
    @Args('status', { type: () => ORDER_STATUS }) status: ORDER_STATUS,
    @Context() ctx: GraphQLContext,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<OrderListOutput> {
    const whereClause = this.orderQueryService.buildWhereClause(
      { status },
      ctx,
    );
    const orders = await this.orderRepository.findManyWithDetailsWorkspace(
      workspace.id,
      whereClause,
    );

    return {
      orders: orders.map((order) =>
        this.orderQueryService.mapOrderToOutput(order),
      ),
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
  @RequireOrderReadAccess()
  @DataScope(ORDER_DATA_SCOPE.QUERY_PAYMENT_SUMMARY)
  async getOrderPaymentSummary(
    @Args('orderId', { type: () => String }) orderId: string,
    @Context() ctx: GraphQLContext,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<OrderPaymentSummaryOutput | null> {
    const whereClause = this.orderQueryService.buildWhereClause(
      { id: orderId },
      ctx,
    );
    const order = await this.orderRepository.findOneWithWhereWorkspace(
      workspace.id,
      whereClause,
    );

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
  @RequireOrderReadAccess()
  @DataScope(ORDER_DATA_SCOPE.QUERY_AGGREGATION)
  async getCustomerOrderStats(
    @Args('customerId', { type: () => String }) customerId: string,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<CustomerOrderStatsOutput> {
    const stats = await this.orderRepository.getCustomerOrderStatsWithWorkspace(
      workspace.id,
      customerId,
    );

    return {
      orderCount: stats.orderCount,
      totalValue: stats.totalValue,
      firstOrderDate: stats.firstOrderDate ?? undefined,
      lastOrderDate: stats.lastOrderDate ?? undefined,
      averageOrderInterval: stats.averageOrderInterval,
    };
  }
}
