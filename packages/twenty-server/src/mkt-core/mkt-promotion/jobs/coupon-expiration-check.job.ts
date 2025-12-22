import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { In } from 'typeorm';
import chunk from 'lodash.chunk';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktCouponWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities/mkt-coupon.workspace-entity';
import { COUPON_STATUS } from 'src/mkt-core/mkt-promotion/constants/mkt-promotion.constants';
import { CouponExpiredEvent } from 'src/mkt-core/mkt-promotion/events/promotion.events';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

const BATCH_SIZE = 100;

/**
 * Job data interface cho coupon expiration check
 */
export type CouponExpirationCheckJobData = {
  workspaceId: string;
};

/**
 * Job xử lý kiểm tra và cập nhật trạng thái hết hạn cho coupons
 *
 * Chức năng:
 * - Tìm các coupon có validTo < NOW() và status = ACTIVE
 * - Cập nhật status thành EXPIRED theo batch để tránh overload
 * - Emit CouponExpiredEvent cho mỗi coupon
 * - Log số lượng coupon đã hết hạn
 *
 * Job được trigger với workspaceId cụ thể
 */
@Injectable()
@Processor(MessageQueue.cronQueue)
export class CouponExpirationCheckJob {
  private readonly logger = new Logger(CouponExpirationCheckJob.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.log('CouponExpirationCheckJob initialized');
  }

  @Process(CouponExpirationCheckJob.name)
  async handle(data: CouponExpirationCheckJobData): Promise<void> {
    const { workspaceId } = data;

    this.logger.log(
      `Starting coupon expiration check for workspace ${workspaceId}`,
    );

    try {
      const expiredCount =
        await this.checkAndExpireCouponsForWorkspace(workspaceId);

      this.logger.log(
        `Coupon expiration check completed: ${expiredCount} coupons expired for workspace ${workspaceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Coupon expiration check failed for workspace ${workspaceId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Kiểm tra và cập nhật coupons hết hạn cho một workspace
   * Xử lý theo batch để tránh overload database
   */
  private async checkAndExpireCouponsForWorkspace(
    workspaceId: string,
  ): Promise<number> {
    const couponRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktCouponWorkspaceEntity>(
        workspaceId,
        'mktCoupon',
        { shouldBypassPermissionChecks: true },
      );

    const now = DateTimeUtils.now();
    const currentDateString = DateTimeUtils.toISO(now);

    // Tìm các coupon có validTo < NOW() và status = ACTIVE
    const expiredCoupons = await couponRepository
      .createQueryBuilder('coupon')
      .where('coupon.status = :status', { status: COUPON_STATUS.ACTIVE })
      .andWhere('coupon.validTo IS NOT NULL')
      .andWhere('coupon.validTo < :currentDate', {
        currentDate: currentDateString,
      })
      .andWhere('coupon.deletedAt IS NULL')
      .getMany();

    if (expiredCoupons.length === 0) {
      this.logger.debug(
        `No expired coupons found for workspace ${workspaceId}`,
      );

      return 0;
    }

    this.logger.log(
      `Found ${expiredCoupons.length} expired coupons for workspace ${workspaceId}`,
    );

    // Chia thành batches để xử lý
    const couponBatches = chunk(expiredCoupons, BATCH_SIZE);
    let totalProcessed = 0;

    for (const batch of couponBatches) {
      try {
        await this.processBatch(batch, couponRepository, workspaceId);
        totalProcessed += batch.length;

        this.logger.debug(
          `Processed batch: ${totalProcessed}/${expiredCoupons.length} coupons`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process batch for workspace ${workspaceId}`,
          error,
        );
      }
    }

    return totalProcessed;
  }

  /**
   * Xử lý một batch coupons hết hạn
   */
  private async processBatch(
    coupons: MktCouponWorkspaceEntity[],
    repository: WorkspaceRepository<MktCouponWorkspaceEntity>,
    workspaceId: string,
  ): Promise<void> {
    const couponIds = coupons.map((c) => c.id);

    // Bulk update status using In operator
    await repository.update(
      { id: In(couponIds) },
      { status: COUPON_STATUS.EXPIRED },
    );

    // Emit events cho từng coupon
    for (const coupon of coupons) {
      try {
        const event = new CouponExpiredEvent(
          workspaceId,
          coupon.id,
          coupon.code,
        );

        this.eventEmitter.emit('coupon.expired', event);

        this.logger.debug(
          `Expired coupon ${coupon.id} (${coupon.code}) - Valid to: ${coupon.validTo}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to emit event for coupon ${coupon.id}`,
          error,
        );
      }
    }
  }
}
