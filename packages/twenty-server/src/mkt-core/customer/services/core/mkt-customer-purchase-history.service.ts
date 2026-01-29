import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { CUSTOMER_MESSAGES } from 'src/mkt-core/customer/messages';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderRepository } from 'src/mkt-core/order/repositories/mkt-order.repository';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import {
  PurchaseHistoryOutput,
  PurchaseOrderOutput,
  PurchaseOrderItemOutput,
  PurchasedProductsOutput,
  PurchasedProductOutput,
} from 'src/mkt-core/customer/dto/purchase-history.dto';
import {
  GetPurchaseHistoryArgs,
  GetPurchasedProductsArgs,
} from 'src/mkt-core/customer/dto/purchase-history.args';

/**
 * MktCustomerPurchaseHistoryService
 *
 * Service for fetching customer purchase history
 * Uses existing MktOrderRepository from OrderModule
 */
@Injectable()
export class MktCustomerPurchaseHistoryService {
  private readonly logger = new Logger(MktCustomerPurchaseHistoryService.name);

  constructor(
    private readonly orderRepository: MktOrderRepository,
    private readonly customerRepository: MktCustomerRepository,
  ) {}

  /**
   * Get purchase history for a customer with pagination and filters
   */
  async getPurchaseHistory(
    args: GetPurchaseHistoryArgs,
    _workspaceId: string,
  ): Promise<PurchaseHistoryOutput> {
    const {
      customerId,
      take = 20,
      skip = 0,
      status,
      paymentStatus,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = args;

    this.logger.debug(`Getting purchase history for customer: ${customerId}`);

    // 1. Verify customer exists
    const customer = await this.customerRepository.findByIdOrNull(customerId);

    if (!customer) {
      throw new NotFoundException(
        CUSTOMER_MESSAGES.ERROR.CUSTOMER_NOT_FOUND(customerId),
      );
    }

    // 2. Get orders using existing repository method
    const allOrders = await this.orderRepository.findByCustomerId(customerId, {
      relations: { orderItems: true },
    });

    // 3. Apply filters
    let filteredOrders = allOrders.filter((o) => !o.deletedAt);

    if (status) {
      filteredOrders = filteredOrders.filter((o) => o.status === status);
    }

    if (paymentStatus) {
      filteredOrders = filteredOrders.filter(
        (o) => o.paymentStatus === paymentStatus,
      );
    }

    // 4. Sort orders
    filteredOrders = this.sortOrders(filteredOrders, sortBy, sortOrder);

    // 5. Pagination
    const totalCount = filteredOrders.length;
    const paginatedOrders = filteredOrders.slice(skip, skip + take);

    // 6. Get summary using existing repository method
    const stats = await this.orderRepository.getCustomerOrderStats(customerId);

    this.logger.debug(
      `Found ${totalCount} orders for customer ${customerId}, returning ${paginatedOrders.length}`,
    );

    // 7. Map to output
    return {
      orders: paginatedOrders.map((order) => this.mapOrderToOutput(order)),
      summary: {
        totalOrders: stats.orderCount,
        totalSpent: stats.totalValue,
        averageOrderValue:
          stats.orderCount > 0
            ? MoneyUtils.divideSafe(
                stats.totalValue,
                stats.orderCount,
              ).toNumber()
            : 0,
        firstPurchaseDate: stats.firstOrderDate ?? undefined,
        lastPurchaseDate: stats.lastOrderDate ?? undefined,
      },
      pagination: {
        take,
        skip,
        totalCount,
        hasMore: skip + take < totalCount,
      },
    };
  }

  /**
   * Sort orders by field and direction
   */
  private sortOrders(
    orders: MktOrderWorkspaceEntity[],
    sortBy: string,
    sortOrder: 'ASC' | 'DESC',
  ): MktOrderWorkspaceEntity[] {
    const multiplier = sortOrder === 'DESC' ? -1 : 1;

    return [...orders].sort((a, b) => {
      switch (sortBy) {
        case 'totalAmount':
          return ((a.totalAmount ?? 0) - (b.totalAmount ?? 0)) * multiplier;
        case 'orderCode':
          return (
            (a.orderCode ?? '').localeCompare(b.orderCode ?? '') * multiplier
          );
        case 'createdAt':
        default:
          return (
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()) *
            multiplier
          );
      }
    });
  }

  /**
   * Map order entity to output DTO
   */
  private mapOrderToOutput(
    order: MktOrderWorkspaceEntity,
  ): PurchaseOrderOutput {
    return {
      id: order.id,
      orderCode: order.orderCode ?? '',
      name: order.name,
      status: order.status ?? undefined,
      paymentStatus: order.paymentStatus ?? undefined,
      totalAmount: order.totalAmount ?? 0,
      paidAmount: order.paidAmount ?? 0,
      remainingAmount: order.remainingAmount ?? 0,
      discount: order.discount ?? undefined,
      tax: order.tax ?? undefined,
      subtotal: order.subtotal ?? undefined,
      currency: order.currency,
      createdAt: this.dateToISOString(order.createdAt),
      updatedAt: order.updatedAt
        ? this.dateToISOString(order.updatedAt)
        : undefined,
      items: this.mapOrderItems(order.orderItems),
    };
  }

  /**
   * Map order items to output DTOs
   */
  private mapOrderItems(
    items: MktOrderItemWorkspaceEntity[] | undefined,
  ): PurchaseOrderItemOutput[] {
    if (!items || items.length === 0) {
      return [];
    }

    return items.map((item) => ({
      id: item.id,
      snapshotProductName: item.snapshotProductName ?? undefined,
      snapshotPackageName: item.snapshotPackageName ?? undefined,
      quantity: item.quantity ?? 1,
      unitPrice: item.unitPrice ?? 0,
      totalPrice: item.totalPrice ?? 0,
      itemType: item.itemType ?? undefined,
    }));
  }

  /**
   * Convert Date to ISO string using DateTimeUtils
   */
  private dateToISOString(date: Date | string): string {
    if (typeof date === 'string') {
      return date;
    }

    return DateTimeUtils.toISO(DateTimeUtils.fromDate(date));
  }

  /**
   * Get list of purchased products for a customer with aggregation
   * Only includes orders with COMPLETED or CONFIRMED status (not soft-deleted)
   */
  async getPurchasedProducts(
    args: GetPurchasedProductsArgs,
    workspaceId: string,
  ): Promise<PurchasedProductsOutput> {
    const {
      customerId,
      take = 20,
      skip = 0,
      itemType,
      productNameSearch,
      sortBy = 'totalSpent',
      sortOrder = 'DESC',
    } = args;

    this.logger.debug(`Getting purchased products for customer: ${customerId}`);

    // 1. Verify customer exists
    await this.verifyCustomerExists(customerId);

    // 2. Get valid orders (COMPLETED, CONFIRMED only, not soft-deleted)
    const orders = await this.orderRepository.findValidOrdersByCustomerId(
      customerId,
      [ORDER_STATUS.COMPLETED, ORDER_STATUS.CONFIRMED],
      { relations: { orderItems: true } },
      workspaceId,
    );

    // 3. Aggregate products from order items
    const productMap = this.aggregateProductsFromOrders(orders, itemType);

    // 4. Apply search filter and sort
    let products = this.filterProductsByName(
      Array.from(productMap.values()),
      productNameSearch,
    );

    products = this.sortProducts(products, sortBy, sortOrder);

    // 5. Pagination
    const totalCount = products.length;
    const paginatedProducts = products.slice(skip, skip + take);

    this.logger.debug(
      `Found ${totalCount} unique products for customer ${customerId}, returning ${paginatedProducts.length}`,
    );

    return {
      products: paginatedProducts.map((p) => this.mapProductToOutput(p)),
      totalUniqueProducts: totalCount,
      pagination: {
        take,
        skip,
        totalCount,
        hasMore: skip + take < totalCount,
      },
    };
  }

  /**
   * Verify customer exists, throws if not found
   */
  private async verifyCustomerExists(customerId: string): Promise<void> {
    const customer = await this.customerRepository.findByIdOrNull(customerId);

    if (!customer) {
      throw new NotFoundException(
        CUSTOMER_MESSAGES.ERROR.CUSTOMER_NOT_FOUND(customerId),
      );
    }
  }

  /**
   * Aggregate products from orders into a map
   */
  private aggregateProductsFromOrders(
    orders: MktOrderWorkspaceEntity[],
    itemTypeFilter?: string,
  ): Map<string, AggregatedProduct> {
    const productMap = new Map<string, AggregatedProduct>();

    for (const order of orders) {
      const validItems = this.getValidOrderItems(order, itemTypeFilter);

      for (const item of validItems) {
        this.aggregateOrderItem(productMap, item, new Date(order.createdAt));
      }
    }

    return productMap;
  }

  /**
   * Get order items filtered by type
   * Note: deletedAt already filtered at DB level in repository
   */
  private getValidOrderItems(
    order: MktOrderWorkspaceEntity,
    itemTypeFilter?: string,
  ): MktOrderItemWorkspaceEntity[] {
    const items = order.orderItems ?? [];

    if (!itemTypeFilter) return items;

    return items.filter((item) => item.itemType === itemTypeFilter);
  }

  /**
   * Aggregate a single order item into the product map
   */
  private aggregateOrderItem(
    productMap: Map<string, AggregatedProduct>,
    item: MktOrderItemWorkspaceEntity,
    orderDate: Date,
  ): void {
    const productKey = this.generateProductKey(item);
    const existing = productMap.get(productKey);

    if (existing) {
      this.updateExistingProduct(existing, item, orderDate);
    } else {
      productMap.set(productKey, this.createNewProduct(item, orderDate));
    }
  }

  /**
   * Update existing aggregated product with new item data
   */
  private updateExistingProduct(
    product: AggregatedProduct,
    item: MktOrderItemWorkspaceEntity,
    orderDate: Date,
  ): void {
    product.purchaseCount += 1;
    product.totalQuantity = MoneyUtils.add(
      product.totalQuantity,
      item.quantity ?? 1,
    ).toNumber();
    product.totalSpent = MoneyUtils.add(
      product.totalSpent,
      item.totalPrice ?? 0,
    ).toNumber();

    if (orderDate < product.firstPurchaseDate) {
      product.firstPurchaseDate = orderDate;
    }
    if (orderDate > product.lastPurchaseDate) {
      product.lastPurchaseDate = orderDate;
    }
  }

  /**
   * Create new aggregated product from order item
   */
  private createNewProduct(
    item: MktOrderItemWorkspaceEntity,
    orderDate: Date,
  ): AggregatedProduct {
    return {
      productName: item.snapshotProductName ?? 'Unknown Product',
      packageName: item.snapshotPackageName ?? undefined,
      externalProductId: item.externalMktProductId ?? undefined,
      externalProductCode: item.externalMktProductCode ?? undefined,
      externalPackageId: item.externalMktPackageId ?? undefined,
      externalPackageCode: item.externalMktPackageCode ?? undefined,
      itemType: item.itemType ?? undefined,
      purchaseCount: 1,
      totalQuantity: item.quantity ?? 1,
      totalSpent: item.totalPrice ?? 0,
      firstPurchaseDate: orderDate,
      lastPurchaseDate: orderDate,
    };
  }

  /**
   * Filter products by name search
   */
  private filterProductsByName(
    products: AggregatedProduct[],
    searchTerm?: string,
  ): AggregatedProduct[] {
    if (!searchTerm) return products;

    const searchLower = searchTerm.toLowerCase();

    return products.filter((p) =>
      p.productName.toLowerCase().includes(searchLower),
    );
  }

  /**
   * Generate unique key for product aggregation
   * Priority: externalProductId > externalProductCode > snapshotProductName
   */
  private generateProductKey(item: MktOrderItemWorkspaceEntity): string {
    if (item.externalMktProductId && item.externalMktPackageId) {
      return `${item.externalMktProductId}:${item.externalMktPackageId}`;
    }
    if (item.externalMktProductId) {
      return `product:${item.externalMktProductId}`;
    }
    if (item.externalMktProductCode) {
      return `code:${item.externalMktProductCode}`;
    }

    return `name:${item.snapshotProductName ?? 'unknown'}`;
  }

  /**
   * Sort products by field and direction
   */
  private sortProducts(
    products: AggregatedProduct[],
    sortBy: string,
    sortOrder: 'ASC' | 'DESC',
  ): AggregatedProduct[] {
    const multiplier = sortOrder === 'DESC' ? -1 : 1;

    return [...products].sort((a, b) => {
      switch (sortBy) {
        case 'totalQuantity':
          return (a.totalQuantity - b.totalQuantity) * multiplier;
        case 'purchaseCount':
          return (a.purchaseCount - b.purchaseCount) * multiplier;
        case 'lastPurchaseDate':
          return (
            (a.lastPurchaseDate.getTime() - b.lastPurchaseDate.getTime()) *
            multiplier
          );
        case 'productName':
          return a.productName.localeCompare(b.productName) * multiplier;
        case 'totalSpent':
        default:
          return (a.totalSpent - b.totalSpent) * multiplier;
      }
    });
  }

  /**
   * Map aggregated product to output DTO
   */
  private mapProductToOutput(
    product: AggregatedProduct,
  ): PurchasedProductOutput {
    const firstPurchaseDateISO = this.dateToISOString(
      product.firstPurchaseDate,
    );

    return {
      productName: product.productName,
      packageName: product.packageName,
      externalProductId: product.externalProductId,
      externalProductCode: product.externalProductCode,
      externalPackageId: product.externalPackageId,
      externalPackageCode: product.externalPackageCode,
      itemType: product.itemType,
      purchaseCount: product.purchaseCount,
      totalQuantity: product.totalQuantity,
      totalSpent: product.totalSpent,
      firstPurchaseDate: firstPurchaseDateISO,
      lastPurchaseDate: this.dateToISOString(product.lastPurchaseDate),
      createdAt: firstPurchaseDateISO,
    };
  }
}

/**
 * Internal type for product aggregation
 */
type AggregatedProduct = {
  productName: string;
  packageName?: string;
  externalProductId?: string;
  externalProductCode?: string;
  externalPackageId?: string;
  externalPackageCode?: string;
  itemType?: string;
  purchaseCount: number;
  totalQuantity: number;
  totalSpent: number;
  firstPurchaseDate: Date;
  lastPurchaseDate: Date;
};
