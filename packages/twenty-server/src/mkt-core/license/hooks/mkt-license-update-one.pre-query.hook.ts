import { Injectable, Logger } from '@nestjs/common';

import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
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

  constructor(
    private licenseService: MktLicenseService,
    private readonly licenseHistoryService: MktLicenseHistoryService,
    private readonly mktLicenseRenewService: MktLicenseRenewService,
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

    let metadata: ORDER_METADATA;
    let paymentMethods, variants, note;

    const metadataString = typeof rawMetadata === 'string' ? rawMetadata : null;
    metadata = await this.getMetadata(metadataString);
    paymentMethods = metadata.paymentMethods;
    variants = metadata.variants;
    note = metadata.note;

    const license = await this.licenseService.getLicenseForForUpdate(licenseId);

    // Handle license history update
    if (licenseId && status) {
      if (license) {
        await this.licenseHistoryService.addHistoryEntryFromLicense(
          authContext,
          license,
          status,
          note,
        );
      }
    }

    if (status === MKT_LICENSE_STATUS.CHANGE_VARIANT) {
      const newMetadata: ORDER_METADATA =
        await this.makeMetadataForChangeVariant(
          license,
          paymentMethods,
          variants,
        );

      await this.mktLicenseRenewService.shouldChangeVariantForLicense(
        status,
        newMetadata,
        licenseId,
        license,
      );

      return {
        ...payload,
        data: {
          ...payload.data,
          metadata: newMetadata as unknown as JSON, // Type assertion an toàn cho RAW_JSON field
        },
      };
    }

    if (status === MKT_LICENSE_STATUS.RENEWING) {
      const newMetadata: ORDER_METADATA = await this.makeMetadataForRenew(
        license,
        paymentMethods,
      );

      await this.mktLicenseRenewService.shouldRenewLicense(
        status,
        newMetadata,
        licenseId,
        license,
      );

      return {
        ...payload,
        data: {
          ...payload.data,
          //status: MKT_LICENSE_STATUS.ACTIVE,
          metadata: newMetadata as unknown as JSON, // Type assertion an toàn cho RAW_JSON field
        },
      };
    }

    if (status === MKT_LICENSE_STATUS.REFUND) {
      const newMetadata: Metadata = await this.makeMetadataForRefund();

      return {
        ...payload,
        data: {
          ...payload.data,
          metadata: newMetadata as unknown as JSON, // Type assertion an toàn cho RAW_JSON field
        },
      };
    }

    return payload;
  }

  async makeMetadataForRenew(
    license: MktLicenseWorkspaceEntity | null,
    paymentMethods?: Array<{ mktPaymentMethodId: string; name?: string }>,
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
      variants: [
        {
          mktVariantId: license?.mktVariantId || 'unknown',
          quantity: 1,
        },
      ],
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

  async makeMetadataForRefund(): Promise<Metadata> {
    return {
      orderAction: ORDER_ACTION.REFUND,
    };
  }

  private async getMetadata(
    newMetadata: string | null,
  ): Promise<ORDER_METADATA> {
    if (typeof newMetadata === 'string') {
      return JSON.parse(newMetadata) as ORDER_METADATA;
    } else {
      return {};
    }
  }
}
