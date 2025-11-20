import { Injectable, Logger } from '@nestjs/common';

import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MKT_LICENSE_STATUS } from 'src/mkt-core/license/license.constants';
import { MktLicenseHistoryService } from 'src/mkt-core/license/mkt-license-history.service';
import { MktLicenseService } from 'src/mkt-core/license/mkt-license.service';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { MktLicenseRenewService } from 'src/mkt-core/license/services/mkt-license.renew.service';
import { ORDER_ACTION, ORDER_METADATA } from 'src/mkt-core/order/constants';

export type Metadata = {
  orderAction?: string;
  note?: string;
  customer?: {
    mktCustomerId: string;
  };
  paymentMethods?: Array<{
    mktPaymentMethodId: string;
    name?: string;
  }>;
  variants?: Array<{
    mktVariantId: string;
    quantity?: number;
  }>;
};

@Injectable()
@WorkspaceQueryHook('mktLicense.updateOne')
export class MktLicenseUpdateOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  private readonly logger = new Logger(MktLicenseUpdateOnePreQueryHook.name);
  private note = '';

  constructor(
    private licenseService: MktLicenseService,
    private readonly licenseHistoryService: MktLicenseHistoryService,
    private mktLicenseRenewService: MktLicenseRenewService,
    private readonly mktRepo: MktRepositoryService,
  ) {}

  async execute(
    authContext: AuthContext,
    _objectName: string,
    payload: UpdateOneResolverArgs<MktLicenseWorkspaceEntity>,
  ): Promise<UpdateOneResolverArgs<MktLicenseWorkspaceEntity>> {
    const input = payload?.data;
    const status = input?.status;
    const licenseId = payload?.id;
    const rawMetadata = input?.metadata;

    const metadataString = typeof rawMetadata === 'string' ? rawMetadata : null;

    const metadata = await this.getMetadata(metadataString);
    const paymentMethods = metadata.paymentMethods;
    const variants = metadata.variants;

    if (typeof metadata.note === 'string') this.note = metadata.note;

    const license = await this.licenseService.getLicenseForForUpdate(licenseId);

    this.mktLicenseRenewService.mktContractId =
      license?.mktOrder?.mktContractId || null;

    let licenseHistory = null;

    // Handle license history update
    if (licenseId && status) {
      if (license) {
        licenseHistory =
          await this.licenseHistoryService.addHistoryEntryFromLicense(
            authContext,
            license,
            status,
            this.note,
          );
        this.mktLicenseRenewService.mktCommonOrderService.licenseHistory =
          licenseHistory;
      }
    }

    if (status === MKT_LICENSE_STATUS.CHANGE_VARIANT) {
      const newMetadata: ORDER_METADATA =
        await this.makeMetadataForChangeVariant(
          license,
          paymentMethods,
          variants,
        );
      const validate = await this.validateCreatedAtForChangeVariant(license);

      if (!validate) {
        this.logger.error(this.note);
        payload = {
          ...payload,
          data: {
            ...payload.data,
            status: license?.status || MKT_LICENSE_STATUS.ERROR,
            notes: this.note,
          },
        };
      } else {
        await this.mktLicenseRenewService.shouldChangeVariantForLicense(
          status,
          newMetadata,
          licenseId,
          license,
        );

        payload = {
          ...payload,
          data: {
            ...payload.data,
            metadata: newMetadata as unknown as JSON, // Type assertion an toàn cho RAW_JSON field
            status: MKT_LICENSE_STATUS.ACTIVE,
          },
        };
      }
    }

    if (status === MKT_LICENSE_STATUS.RENEWING) {
      const newMetadata: ORDER_METADATA = await this.makeMetadataForRenew(
        license,
        paymentMethods,
        variants,
      );

      const validate = await this.validateExpiredAtForRenew(license);

      if (!validate) {
        this.logger.error(this.note);
        payload = {
          ...payload,
          data: {
            ...payload.data,
            status: license?.status || MKT_LICENSE_STATUS.ERROR,
            notes: this.note,
          },
        };
      } else {
        await this.mktLicenseRenewService.shouldRenewLicense(
          status,
          newMetadata,
          licenseId,
          license,
        );

        payload = {
          ...payload,
          data: {
            ...payload.data,
            metadata: newMetadata as unknown as JSON, // Type assertion an toàn cho RAW_JSON field
            status: MKT_LICENSE_STATUS.ACTIVE,
            trialLicense: false,
          },
        };
      }
    }

    if (status === MKT_LICENSE_STATUS.REFUND) {
      const newMetadata: ORDER_METADATA =
        await this.makeMetadataForRefund(license);

      await this.mktLicenseRenewService.shouldRefundLicense(
        status,
        newMetadata,
        licenseId,
        license,
      );

      payload = {
        ...payload,
        data: {
          ...payload.data,
          metadata: newMetadata as unknown as JSON, // Type assertion an toàn cho RAW_JSON field
        },
      };
    }

    if (status === MKT_LICENSE_STATUS.TRIAL_RENEW && license?.trialLicense) {
      const newMetadata: ORDER_METADATA = await this.makeMetadataForRenew(
        license,
        paymentMethods,
        variants,
      );

      this.mktLicenseRenewService.trialLicense = true;

      await this.mktLicenseRenewService.shouldRenewLicense(
        status,
        newMetadata,
        licenseId,
        license,
      );

      payload = {
        ...payload,
        data: {
          ...payload.data,
          metadata: newMetadata as unknown as JSON, // Type assertion an toàn cho RAW_JSON field
          status: MKT_LICENSE_STATUS.ACTIVE,
          trialLicense: true,
        },
      };
    }

    const updatedMetadata = await this.getMetadata(
      payload.data?.metadata as string | null,
    );

    if (licenseHistory) {
      updatedMetadata.licenseHistory = licenseHistory;
    }

    if (this.note && licenseHistory) licenseHistory.note = this.note;
    await this.licenseHistoryService.saveLicenseHistory(
      license,
      licenseHistory,
    );

    return {
      ...payload,
      data: {
        ...payload.data,
        metadata: updatedMetadata as unknown as JSON,
      },
    };
  }

  async makeMetadataForRenew(
    license: MktLicenseWorkspaceEntity | null,
    paymentMethods?: Array<{ mktPaymentMethodId: string; name?: string }>,
    variants?: Array<{ mktVariantId: string; quantity?: number }>,
  ): Promise<ORDER_METADATA> {
    if (!paymentMethods || paymentMethods.length === 0) {
      paymentMethods = [
        {
          mktPaymentMethodId:
            license?.mktOrder?.mktPayments[0]?.mktPaymentMethodId || 'unknown',
          name: 'SEPay QR',
        },
      ];
    }

    return {
      orderAction: ORDER_ACTION.LICENSE_RENEWING,
      customer: {
        mktCustomerId: license?.mktOrder?.mktCustomerId || 'unknown',
      },
      paymentMethods,
      variants,
    };
  }

  async makeMetadataForChangeVariant(
    license: MktLicenseWorkspaceEntity | null,
    paymentMethods?: Array<{ mktPaymentMethodId: string; name?: string }>,
    variants?: Array<{ mktVariantId: string; quantity?: number }>,
  ): Promise<ORDER_METADATA> {
    if (!paymentMethods || paymentMethods.length === 0) {
      paymentMethods = [
        {
          mktPaymentMethodId:
            license?.mktOrder?.mktPayments[0]?.mktPaymentMethodId || 'unknown',
          name: 'SEPay QR',
        },
      ];
    }

    return {
      orderAction: ORDER_ACTION.CHANGE_VARIANT,
      customer: {
        mktCustomerId: license?.mktOrder?.mktCustomerId || 'unknown',
      },
      paymentMethods,
      variants,
    };
  }

  async makeMetadataForRefund(
    license: MktLicenseWorkspaceEntity | null,
  ): Promise<ORDER_METADATA> {
    return {
      orderAction: ORDER_ACTION.REFUND,
      variants: [
        {
          mktVariantId: license?.mktVariantId || 'unknown',
          quantity: 1,
        },
      ],
    };
  }

  private async getMetadata(
    newMetadata: string | null,
  ): Promise<ORDER_METADATA> {
    if (typeof newMetadata === 'object' && newMetadata !== null) {
      return newMetadata as ORDER_METADATA;
    }
    if (typeof newMetadata === 'string') {
      return JSON.parse(newMetadata) as ORDER_METADATA;
    } else {
      return {} as ORDER_METADATA;
    }
  }

  private async validateExpiredAtForRenew(
    license: MktLicenseWorkspaceEntity | null,
  ): Promise<boolean> {
    let note = '';
    const expiredAt = license?.expiresAt;
    // get license_renew_before_days from mktOption
    const mktOptionRepo = await this.mktRepo.getOptionRepository();
    const option = await mktOptionRepo.findOne({
      where: { key: 'license_renew_before_days' },
    });
    const licenseRenewBeforeDays = option ? parseInt(option.value) || 15 : 15; // default 15 days

    //expiredAt - today <= licenseRenewBeforeDays
    if (expiredAt) {
      const today = new Date();
      const timeDiff = expiredAt.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

      note = `Thời hạn bản quyền ${expiredAt.toISOString()}, tính bằng ${daysDiff} ngày. Ngưỡng gia hạn là ${licenseRenewBeforeDays} ngày.`;

      if (daysDiff > licenseRenewBeforeDays) {
        note = `Bản quyền không đủ điều kiện gia hạn. Bản quyền sẽ hết hạn sau ${daysDiff} ngày, dài hơn ngưỡng ${licenseRenewBeforeDays} ngày.`;
        this.note = `${this.note}. ${note}`;
      }
      this.logger.log(note);

      return daysDiff <= licenseRenewBeforeDays;
    }

    return false;
  }

  private async validateCreatedAtForChangeVariant(
    license: MktLicenseWorkspaceEntity | null,
  ): Promise<boolean> {
    let note = '';
    const createdAt = license?.createdAt;
    // get license_change_variant_after_days from mktOption or default 15 days
    const mktOptionRepo = await this.mktRepo.getOptionRepository();
    const option = await mktOptionRepo.findOne({
      where: { key: 'license_change_variant_after_days' },
    });
    const licenseChangeVariantAfterDays = option
      ? parseInt(option.value) || 15
      : 15; // default 15 days

    // today - createdAt <= licenseChangeVariantAfterDays
    if (createdAt) {
      const today = new Date();
      const createdAtDate =
        typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
      const timeDiff = today.getTime() - createdAtDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

      note = `Bản quyền được tạo ngày ${createdAtDate.toISOString()}, đã ${daysDiff} ngày. Ngưỡng thay đổi variant là ${licenseChangeVariantAfterDays} ngày.`;

      if (daysDiff > licenseChangeVariantAfterDays) {
        note = `Bản quyền không đủ điều kiện thay đổi variant. Bản quyền đã được tạo ${daysDiff} ngày, vượt quá ngưỡng ${licenseChangeVariantAfterDays} ngày.`;
        this.note = `${this.note}. ${note}`;
      }
      this.logger.log(note);

      return daysDiff <= licenseChangeVariantAfterDays;
    }

    return false;
  }
}
