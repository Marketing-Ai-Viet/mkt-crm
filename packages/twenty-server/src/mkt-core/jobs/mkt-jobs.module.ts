import { Module } from '@nestjs/common';

// import { CasbinModule } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/casbin.module';
import { CustomerModule } from 'src/mkt-core/customer/customer.module';
// import { MktInvoiceModule } from 'src/mkt-core/invoice/mkt-invoice.module';
import { MktOrderModule } from 'src/mkt-core/order/mkt-order.module';
import { MktProductIntegrationModule } from 'src/mkt-core/mkt-product-integration/mkt-product-integration.module';
import { MktPaymentModule } from 'src/mkt-core/payment/mkt-payment.module';
// import { MktPromotionModule } from 'src/mkt-core/mkt-promotion/mkt-promotion.module';

/**
 * MktJobsModule
 *
 * Module tập trung tất cả background jobs của mkt-core.
 * Import module này vào JobsModule để worker có thể discover và xử lý các jobs.
 *
 * Jobs included:
 *
 * @CustomerModule (cronQueue, customerQueue)
 * - MktCustomerCategorizationCronJob: Tự động phân loại khách hàng theo lifecycle
 * - MktCustomerTierCronJob: Cập nhật tier khách hàng dựa trên metrics
 * - MktCustomerTierUpdateJob: Xử lý cập nhật tier đơn lẻ (customerQueue)
 *
 * @MktOrderModule (cronQueue)
 * - PaymentDeadlineProcessor: Xử lý deadline thanh toán
 * - PaymentOverdueScanJob: Quét và xử lý đơn hàng quá hạn thanh toán
 *
 * @MktInvoiceModule (billingQueue)
 * - SInvoiceIntegrationJob: Tích hợp hóa đơn điện tử S-Invoice
 *
 * @MktProductIntegrationModule (cronQueue)
 * - MktProductScheduledSyncJob: Đồng bộ sản phẩm từ MKT Server theo lịch
 *
 * @MktPaymentModule (cronQueue)
 * - VAExpirationScanJob: Quét và deactivate VA hết hạn
 * - WebhookRetryJob: Retry các webhook thất bại
 *
 * @MktPromotionModule (cronQueue)
 * - PromotionExpirationCheckJob: Kiểm tra và cập nhật promotion hết hạn
 * - CouponExpirationCheckJob: Kiểm tra và cập nhật coupon hết hạn
 * - PromotionUsageCleanupJob: Dọn dẹp usage records cũ
 * - PromotionCacheWarmupJob: Làm nóng cache promotions
 *
 * @CasbinModule (cronQueue)
 * - CacheWarmerJob: Làm nóng cache RBAC policies
 * - CrossRegionReloadJob: Sync policies cross-region
 *
 * Architecture:
 * - Worker imports JobsModule
 * - JobsModule imports MktJobsModule
 * - MktJobsModule imports các feature modules chứa jobs
 * - MessageQueueExplorer discovers tất cả @Processor providers
 */
@Module({
  imports: [
    // Customer lifecycle jobs (cronQueue, customerQueue)
    CustomerModule,

    // Order payment flow jobs (cronQueue)
    MktOrderModule,

    // Payment jobs - VA expiration scan, webhook retry (cronQueue)
    MktPaymentModule,

    // Invoice integration jobs (billingQueue)
    // MktInvoiceModule,

    // Product sync jobs (cronQueue)
    MktProductIntegrationModule,

    // Promotion expiration jobs (cronQueue)
    // MktPromotionModule,

    // RBAC cache warmer jobs (cronQueue)
    // CasbinModule,
  ],
})
export class MktJobsModule {}
