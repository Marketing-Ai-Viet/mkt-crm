import { registerEnumType } from '@nestjs/graphql';

export enum RevenueMode {
  CASH = 'CASH',
  ORDER = 'ORDER',
  DUAL = 'DUAL',
}

registerEnumType(RevenueMode, {
  name: 'RevenueMode',
  description:
    'Chế độ tính doanh thu: CASH (tiền đã thu), ORDER (doanh số đơn hàng), DUAL (cả hai)',
  valuesMap: {
    CASH: { description: 'Doanh thu đã thu — dùng mktPayment.confirmedAt' },
    ORDER: {
      description: 'Doanh số đơn hàng — dùng mktOrder.completedAt',
    },
    DUAL: {
      description: 'Hiển thị song song cả hai chỉ số kèm gap analysis',
    },
  },
});
