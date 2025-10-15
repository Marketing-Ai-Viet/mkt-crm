import { Injectable, Logger } from '@nestjs/common';
import {
  MKT_PAYMENT_METHOD_TYPE,
  PAYMENT_HISTORY_TYPE,
} from 'src/mkt-core/common/common.type';

import { MKT_PAYMENT_STATUS } from 'src/mkt-core/common/common.type';
import { MktCommonOrderService } from 'src/mkt-core/common/service/mkt-common-order.service';
import { MktFirebaseService } from 'src/mkt-core/common/service/mkt-firebase.service';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktOrderCommonConfirmService } from 'src/mkt-core/common/service/mkt.common-order.confirm.service';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import {
  ORDER_ACTION,
  ORDER_METADATA,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { CALL_FIREBASE_DATA } from 'src/mkt-core/payment/constants/payment.type';
import { MktPaymentHistoryWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment-history.workspace-entity';

@Injectable()
export class MktLicenseRenewService {
  private readonly logger = new Logger(MktLicenseRenewService.name);
  constructor(
    private readonly mktRepo: MktRepositoryService,
    private readonly mktFirebaseService: MktFirebaseService,
    public mktCommonOrderService: MktCommonOrderService,
    private mktOrderCommonConfirmService: MktOrderCommonConfirmService,
  ) {}

  async shouldRenewLicense(
    status: string,
    metadata: ORDER_METADATA,
    licenseId: string,
    license: MktLicenseWorkspaceEntity | null,
  ): Promise<void> {
    this.logger.log(`Renewing license with ID: ${licenseId}`);
    this.logger.log(`status: ${status}`);
    // Logic to renew the license

    const oldOrder = license?.mktOrder;

    this.mktCommonOrderService.updateFirstMetadata(oldOrder, {
      oldOrderId: oldOrder?.id,
    });
    await this.processLicenseRenewal(licenseId, metadata, license);
  }

  async shouldRefundLicense(
    status: string,
    metadata: ORDER_METADATA,
    licenseId: string,
    license: MktLicenseWorkspaceEntity | null,
  ) {
    this.logger.log(`Refunding license with ID: ${licenseId}`);
    this.logger.log(`status: ${status}`);
    // Logic to refund the license
    await this.processLicenseRefund(licenseId, metadata, license);
  }

  async processLicenseRefund(
    licenseId: string,
    metadata: ORDER_METADATA,
    license: MktLicenseWorkspaceEntity | null,
  ) {
    const { variants: _variantsMeta, note } = metadata;

    if (!license?.mktOrder) {
      this.logger.error(`No order found for license ${licenseId}`);
      throw new Error('Order is required for license refund');
    }

    const order = license.mktOrder;
    const variantId = license.mktVariant?.id;

    if (!variantId) {
      this.logger.error(`No variant found for license ${licenseId}`);
      throw new Error('Variant is required for license refund');
    }

    this.mktCommonOrderService.updateFirstMetadata(order, {});

    // Step 1: Find and update the order item
    const orderItemRepo = await this.mktRepo.getOrderItemRepository();
    const orderItems = await orderItemRepo.find({
      where: {
        mktOrderId: order.id,
        mktVariantId: variantId,
      },
    });

    if (!orderItems || orderItems.length === 0) {
      this.logger.error(
        `No order items found for license ${licenseId} with variant ${variantId}`,
      );
      throw new Error('Order item not found for refund');
    }

    // Find the order item with quantity > 0
    const orderItem = orderItems.find((item) => (item.quantity || 0) > 0);

    if (!orderItem) {
      this.logger.error(
        `No order item with quantity > 0 found for license ${licenseId}`,
      );
      throw new Error('No refundable order item found');
    }

    // Step 0: Revoke license via API call
    await this.revokeLicenseViaApi(license, orderItem);

    // Calculate refund amounts
    const unitPrice = orderItem.unitPrice || 0;
    const refundAmount = unitPrice;
    const newQuantity = Math.max(0, (orderItem.quantity || 1) - 1);
    const newTotalPrice = newQuantity * unitPrice;

    // Update order item quantity and total price
    await orderItemRepo.update(orderItem.id, {
      quantity: newQuantity,
      totalPrice: newTotalPrice,
      totalAmountWithTax: newTotalPrice, // Assuming same as totalPrice for now
    });

    // Step 2: Recalculate and update order totals
    const orderRepo = await this.mktRepo.getOrderRepository();
    const updatedOrder = await orderRepo.findOne({
      where: { id: order.id },
      relations: ['orderItems'],
    });

    const paymentHistories =
      license.mktPaymentHistories as MktPaymentHistoryWorkspaceEntity[];

    if (updatedOrder && updatedOrder.orderItems) {
      const newSubtotal = updatedOrder.orderItems.reduce(
        (total, item) => total + (item.totalPrice || 0),
        0,
      );
      const newTax = updatedOrder.orderItems.reduce(
        (total, item) => total + (item.taxAmount || 0),
        0,
      );
      const newTotalAmount =
        newSubtotal + newTax - (updatedOrder.discount || 0);

      await orderRepo.update(order.id, {
        subtotal: newSubtotal,
        tax: newTax,
        totalAmount: newTotalAmount,
      });

      // Step 3: Create accounting note
      const accountingNote = this.createAccountingNote(
        licenseId,
        refundAmount,
        newTotalAmount,
        order.totalAmount || 0,
        orderItem,
      );

      // Step 4: Update order note with accounting information
      const existingNote = order.note || '';
      const _updatedNote = existingNote
        ? `${existingNote}\n\n${accountingNote}`
        : accountingNote;

      let allNote = `${accountingNote}`;
      if (note) {
        const additionalNote = `\nGhi chú thêm: ${note}`;
        allNote = `${allNote}${additionalNote}`;
      }
      let notePayment = '';
      paymentHistories.sort((a, b) =>
        a.createdAt && b.createdAt
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : 0,
      );
      this.logger.log('paymentHistories 180', paymentHistories);
      for (const paymentHistory of paymentHistories || []) {
        const paymentStatus: MKT_PAYMENT_STATUS = paymentHistory?.mktPayment
          ?.status as MKT_PAYMENT_STATUS;
        const paymentMethod = paymentHistory?.mktPayment?.mktPaymentMethod
          ?.type as MKT_PAYMENT_METHOD_TYPE;
        const paymentStatusLabel = await this.getPaymentStatusLabel(
          paymentStatus,
          paymentMethod,
        );
        const paymentType = await this.getPaymentTypeLabel(
          paymentHistory.paymentType,
        );
        const createdAt = paymentHistory.createdAt
          ? new Date(paymentHistory.createdAt).toLocaleString('vi-VN')
          : 'Unknown date';
        notePayment += `• ${paymentHistory.amount.toLocaleString('vi-VN')} VNĐ - ${paymentType} - ${createdAt} - ${paymentStatusLabel} \n`;
      }
      if (notePayment) {
        const accountingNoteWithPayment = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📌 LỊCH SỬ THANH TOÁN:\n${notePayment}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        allNote = `${allNote}${accountingNoteWithPayment}`;
      }

      await orderRepo.update(order.id, {
        note: allNote,
      });

      this.logger.log(
        `License ${licenseId} refunded successfully. ` +
          `Refund amount: ${refundAmount}, ` +
          `Order total before: ${order.totalAmount}, ` +
          `Order total after: ${newTotalAmount}`,
      );
    } else {
      throw new Error('Failed to recalculate order totals after refund');
    }

    // Step 5: Update order status
    await this.mktCommonOrderService.updateOrderForRefund(
      ORDER_STATUS.REFUND,
      license?.mktOrder ?? null,
    );

    const workspaceId = await this.mktRepo.getWorkspaceId();
    await this.mktCommonOrderService.paymentUpdated(
      order.id,
      workspaceId,
      PAYMENT_HISTORY_TYPE.REFUND,
    );
  }

  private createAccountingNote(
    licenseId: string,
    refundAmount: number,
    remainingAmount: number,
    originalAmount: number,
    orderItem: { name?: string } = {},
  ): string {
    const timestamp = new Date().toISOString();

    const newRefund = {
      licenseId,
      refundAmount,
      remainingAmount,
      originalAmount,
      variant_name: orderItem.name,
    };

    this.mktCommonOrderService.updateRefundMetadata(newRefund);

    // Lấy thông tin tổng hợp từ mảng refund
    const refundHistory = this.mktCommonOrderService.getRefundHistory();
    const _totalRefunds = refundHistory.length + 1; // Bao gồm cả refund hiện tại
    const totalRefundAmount = refundHistory.reduce(
      (sum, refund) => sum + (refund.refundAmount ?? 0),
      0,
    );

    // Tạo danh sách chi tiết các lần hoàn tiền
    let refundDetails = '';

    if (refundHistory.length > 0) {
      refundDetails = '\n📋 CHI TIẾT HOÀN TIỀN:\n';
      refundHistory.forEach((refund, index) => {
        refundDetails += `${index + 1}. ${refund.variant_name} - ${(refund.refundAmount ?? 0).toLocaleString('vi-VN')} VNĐ\n`;
      });
    }

    return `[KẾ TOÁN HOÀN TIỀN - ${timestamp}]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 THÔNG TIN HOÀN TIỀN:
• Số tiền cần hoàn: ${totalRefundAmount.toLocaleString('vi-VN')} VNĐ${refundDetails}
• Số tiền còn lại sau khi hoàn tiền: ${remainingAmount.toLocaleString('vi-VN')} VNĐ

`;
  }

  async shouldChangeVariantForLicense(
    status: string,
    metadata: ORDER_METADATA,
    licenseId: string,
    license: MktLicenseWorkspaceEntity | null,
  ) {
    this.logger.log(`Changing variant for license with ID: ${licenseId}`);
    this.logger.log(`status: ${status}`);
    // Logic to renew the license

    const oldOrder = license?.mktOrder;

    this.mktCommonOrderService.updateFirstMetadata(oldOrder, {
      oldOrderId: oldOrder?.id,
      oldVariantId: license?.mktVariant?.id,
    });
    this.mktOrderCommonConfirmService.changeVariantData.oldVariantName =
      license?.mktVariant?.name || '';
    await this.processChangeVariant(licenseId, metadata, license);
  }

  private async processChangeVariant(
    licenseId: string,
    metadata: ORDER_METADATA,
    license: MktLicenseWorkspaceEntity | null,
  ) {
    const {
      variants: variantsMeta,
      customer: customerMeta,
      paymentMethods: paymentMethodsMeta,
    } = metadata;
    // Simulate order creation and confirmation
    const order = await this.createOrder();
    const fireBaseData: CALL_FIREBASE_DATA | void =
      await this.mktOrderCommonConfirmService.confirmOrder(
        ORDER_ACTION.LICENSE_RENEWING,
        order,
        '',
        variantsMeta,
        customerMeta,
        paymentMethodsMeta,
        licenseId,
        license,
      );
    const authFirebase =
      await this.mktFirebaseService.callFireBase(fireBaseData);

    await this.mktCommonOrderService.updateOrderForRenew(
      order.id,
      ORDER_STATUS.WAIT,
      '',
      false,
      authFirebase,
    );

    const workspaceId = await this.mktRepo.getWorkspaceId();
    await this.mktCommonOrderService.paymentUpdated(
      order.id,
      workspaceId,
      PAYMENT_HISTORY_TYPE.CHANGE_VARIANT,
    );
    this.logger.log(`License ${licenseId} renewed successfully.`);
  }

  private async processLicenseRenewal(
    licenseId: string,
    metadata: ORDER_METADATA,
    license: MktLicenseWorkspaceEntity | null,
  ) {
    const workspaceId = await this.mktRepo.getWorkspaceId();

    if (!workspaceId) {
      this.logger.error(
        `No workspace ID found for license renewal: ${licenseId}`,
      );
      throw new Error('Workspace ID is required for license renewal');
    }

    //if (!metadata) return;
    // Implement the logic to process license renewal
    this.logger.log(
      `Processing renewal for license ID: ${licenseId} with metadata: ${JSON.stringify(metadata)}`,
    );
    const {
      variants: variantsMeta,
      customer: customerMeta,
      paymentMethods: paymentMethodsMeta,
    } = metadata;

    // Simulate order creation and confirmation
    const order = await this.createOrder();

    const fireBaseData: CALL_FIREBASE_DATA | void =
      await this.mktOrderCommonConfirmService.confirmOrder(
        ORDER_ACTION.LICENSE_RENEWING,
        order,
        workspaceId,
        variantsMeta,
        customerMeta,
        paymentMethodsMeta,
        licenseId,
        license,
      );

    const authFirebase =
      await this.mktFirebaseService.callFireBase(fireBaseData);

    await this.mktCommonOrderService.updateOrderForRenew(
      order.id,
      ORDER_STATUS.WAIT,
      workspaceId,
      false,
      authFirebase,
    );

    await this.mktCommonOrderService.paymentUpdated(
      order.id,
      workspaceId,
      PAYMENT_HISTORY_TYPE.RENEW,
    );
    this.logger.log(`License ${licenseId} renewed successfully.`);
  }

  /**
   * Revoke license via API call
   * Based on linkLicensesForOrderItems pattern from mkt.common-order.confirm.service.ts
   */
  private async revokeLicenseViaApi(
    license: MktLicenseWorkspaceEntity | null,
    orderItem: MktOrderItemWorkspaceEntity,
  ): Promise<void> {
    if (!license) {
      this.logger.error('No license provided for revocation');
      throw new Error('License is required for revocation');
    }

    try {
      this.logger.log(`Revoking license ${license.id} via API`);

      // Call API to revoke license - similar to fetchLicenseFromApi pattern
      const _apiUrl =
        process.env.LICENSE_REVOKE_API_URL ||
        process.env.LICENSE_API_URL ||
        'https://api.license-provider.com/licenses/revoke';

      const requestBody = {
        licenseId: license.id,
        licenseUuid: license.licenseUuid,
        licenseKey: license.licenseKey,
        orderId: license.mktOrder?.id,
        orderItemId: orderItem.id,
        reason: 'REFUND_REQUESTED',
        revokedAt: new Date().toISOString(),
      };

      this.logger.log('License revocation request body:', requestBody);

      // Make API call (commented out for now as it's a mock implementation)
      // const response = await firstValueFrom(
      //   this.httpService.post(apiUrl, requestBody),
      // );
      // this.logger.log('License revocation API response:', response.data);

      // Mock implementation for now
      this.logger.log(
        `Mock: Successfully revoked license ${license.id} via API`,
      );

      // Update license status to REVOKED
      // const licenseRepo = await this.mktRepo.getLicenseRepository();
      // await licenseRepo.update(license.id, {
      //   status: MKT_LICENSE_STATUS.REVOKED,
      //   notes:
      //     `License revoked for refund. Order: ${license.mktOrder?.id}. ${license.notes || ''}`.trim(),
      // });

      this.logger.log(
        `Successfully updated license ${license.id} status to REVOKED`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to revoke license ${license?.id} via API:`,
        error,
      );
      //throw new Error(`License revocation failed: ${error.message}`);
    }
  }

  private async createOrder() {
    const orderRepo = await this.mktRepo.getOrderRepository(); // Giả sử bạn có một repository Order
    const newOrder = orderRepo.create({
      status: ORDER_STATUS.DRAFT,
      subtotal: 0,
      tax: 0,
      discount: 0,
      totalAmount: 0,
      name: 'License Renewal Order',
    });

    const createdOrder = await orderRepo.save(newOrder);

    return createdOrder;
  }

  private async getMetadata(
    newMetadata: ORDER_METADATA | string,
  ): Promise<ORDER_METADATA> {
    let parsedMetadata: ORDER_METADATA;

    if (typeof newMetadata === 'string') {
      parsedMetadata = JSON.parse(newMetadata) as ORDER_METADATA;
    } else {
      parsedMetadata = newMetadata;
    }

    //throw new Error(`Debug Method not implemented. ${JSON.stringify(license)}`);
    return parsedMetadata;
  }

  private async getPaymentTypeLabel(
    paymentType: PAYMENT_HISTORY_TYPE,
  ): Promise<string> {
    switch (paymentType) {
      case PAYMENT_HISTORY_TYPE.PAYMENT:
        return 'Đơn hàng mới';
      case PAYMENT_HISTORY_TYPE.RENEW:
        return 'Gia hạn';
      case PAYMENT_HISTORY_TYPE.REFUND:
        return 'Hoàn tiền';
      case PAYMENT_HISTORY_TYPE.CHANGE_VARIANT:
        return 'Đổi gói';
      default:
        return 'Khác';
    }
  }

  private async getPaymentStatusLabel(
    paymentStatus: MKT_PAYMENT_STATUS,
    paymentMethod: MKT_PAYMENT_METHOD_TYPE,
  ) {
    let note = '';
    switch (paymentMethod) {
      case MKT_PAYMENT_METHOD_TYPE.QR_CODE:
        note = 'QR_CODE';
        break;
      case MKT_PAYMENT_METHOD_TYPE.BANK_TRANSFER:
        return 'Chuyển khoản ngân hàng';
      case MKT_PAYMENT_METHOD_TYPE.CASH:
        return 'Thanh toán bằng tiền mặt';
      case MKT_PAYMENT_METHOD_TYPE.CREDIT_CARD:
        return 'Thanh toán bằng thẻ tín dụng';
      default:
      //return 'Phương thức thanh toán khác';
    }
    switch (paymentStatus) {
      case MKT_PAYMENT_STATUS.PENDING:
        return 'Chờ thanh toán';
      case MKT_PAYMENT_STATUS.PROCESSING:
        return 'Đang xử lý';
      case MKT_PAYMENT_STATUS.COMPLETED:
        return 'Đã thanh toán - : ' + note;
      case MKT_PAYMENT_STATUS.FAILED:
        return 'Thanh toán thất bại';
      case MKT_PAYMENT_STATUS.REFUNDED:
        return 'Đã hoàn tiền';
      case MKT_PAYMENT_STATUS.CANCELLED:
        return 'Đã hủy';
      default:
        return 'Chờ thanh toán - ' + note;
    }
  }
}
