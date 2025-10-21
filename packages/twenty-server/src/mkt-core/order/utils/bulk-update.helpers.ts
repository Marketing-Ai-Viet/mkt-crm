import {
  UpdateManyOrderInput,
  UpdateOrderDataInput,
} from 'src/mkt-core/order/dto';

/**
 * Helper function để tạo UpdateManyOrderInput từ danh sách order IDs và data chung
 */
export function createBulkUpdateInput(
  orderIds: string[],
  commonData: UpdateOrderDataInput,
): UpdateManyOrderInput {
  return {
    updates: orderIds.map((id) => ({
      id,
      data: commonData,
    })),
  };
}

/**
 * Helper function để tạo UpdateManyOrderInput từ map của ID và data tương ứng
 */
export function createBulkUpdateFromMap(
  orderDataMap: Map<string, UpdateOrderDataInput>,
): UpdateManyOrderInput {
  return {
    updates: Array.from(orderDataMap.entries()).map(([id, data]) => ({
      id,
      data,
    })),
  };
}

/**
 * Helper function để tạo UpdateManyOrderInput từ array of objects
 */
export function createBulkUpdateFromArray(
  updates: Array<{ id: string; data: UpdateOrderDataInput }>,
): UpdateManyOrderInput {
  return { updates };
}

/**
 * Helper function để update status cho nhiều orders
 */
export function createBulkStatusUpdate(
  orderIds: string[],
  status: UpdateOrderDataInput['status'],
  note?: string,
): UpdateManyOrderInput {
  return {
    updates: orderIds.map((id) => ({
      id,
      data: {
        status,
        ...(note && { note }),
      },
    })),
  };
}
