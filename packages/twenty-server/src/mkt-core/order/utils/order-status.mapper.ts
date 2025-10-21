import { ORDER_STATUS as OrderStatus } from 'src/mkt-core/order/constants/order-status.constants';
import { OrderStatusGraphQL } from 'src/mkt-core/order/graphql/order-status.enum';

/**
 * Maps GraphQL OrderStatus enum to workspace entity OrderStatus enum
 */
export function mapGraphQLOrderStatusToEntity(
  graphqlStatus?: OrderStatusGraphQL,
): OrderStatus | undefined {
  if (!graphqlStatus) {
    return undefined;
  }
  const statusMap: Record<OrderStatusGraphQL, OrderStatus> = {
    [OrderStatusGraphQL.COMPLETED]: OrderStatus.COMPLETED,
    [OrderStatusGraphQL.CONFIRMED]: OrderStatus.CONFIRMED,
    [OrderStatusGraphQL.TRIAL]: OrderStatus.TRIAL,
    [OrderStatusGraphQL.DRAFT]: OrderStatus.DRAFT,
    [OrderStatusGraphQL.WAIT]: OrderStatus.WAIT,
    [OrderStatusGraphQL.OVERDUE]: OrderStatus.OVERDUE,
    [OrderStatusGraphQL.REFUSE]: OrderStatus.REFUSE,
    [OrderStatusGraphQL.REFUND]: OrderStatus.REFUND,
  };

  const mappedStatus = statusMap[graphqlStatus];

  if (!mappedStatus) {
    throw new Error(`Invalid order status: ${graphqlStatus}`);
  }

  return mappedStatus;
}

/**
 * Maps workspace entity OrderStatus enum to GraphQL OrderStatus enum
 */
export function mapEntityOrderStatusToGraphQL(
  entityStatus: OrderStatus,
): OrderStatusGraphQL {
  const statusMap: Record<OrderStatus, OrderStatusGraphQL> = {
    [OrderStatus.COMPLETED]: OrderStatusGraphQL.COMPLETED,
    [OrderStatus.CONFIRMED]: OrderStatusGraphQL.CONFIRMED,
    [OrderStatus.TRIAL]: OrderStatusGraphQL.TRIAL,
    [OrderStatus.DRAFT]: OrderStatusGraphQL.DRAFT,
    [OrderStatus.WAIT]: OrderStatusGraphQL.WAIT,
    [OrderStatus.OVERDUE]: OrderStatusGraphQL.OVERDUE,
    [OrderStatus.REFUSE]: OrderStatusGraphQL.REFUSE,
    [OrderStatus.REFUND]: OrderStatusGraphQL.REFUND,
  };

  const mappedStatus = statusMap[entityStatus];

  if (!mappedStatus) {
    throw new Error(`Invalid entity order status: ${entityStatus}`);
  }

  return mappedStatus;
}
