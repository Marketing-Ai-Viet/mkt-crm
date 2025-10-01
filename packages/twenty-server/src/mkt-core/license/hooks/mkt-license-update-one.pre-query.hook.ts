import { Logger } from '@nestjs/common';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { WorkspaceEventEmitter } from 'src/engine/workspace-event-emitter/workspace-event-emitter';
import { MKT_LICENSE_STATUS } from 'src/mkt-core/license/license.constants';
import { MktLicenseService } from 'src/mkt-core/license/mkt-license.service';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';

export type Metadata = {
  orderAction: string;
  customer: {
    mktCustomerId: string;
  };
  paymentMethods: Array<{
    mktPaymentMethodId: string;
    name: string;
  }>;
  variants: Array<{
    mktVariantId: string;
    quantity: number;
  }>;
};

@WorkspaceQueryHook('mktLicense.updateOne')
export class MktLicenseUpdateOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  private readonly logger = new Logger(MktLicenseUpdateOnePreQueryHook.name);

  constructor(
    private readonly workspaceEventEmitter: WorkspaceEventEmitter,
    private licenseService: MktLicenseService,
  ) {}
  async execute(
    authContext: AuthContext,
    _objectName: string,
    payload: UpdateOneResolverArgs<MktLicenseWorkspaceEntity>,
  ): Promise<UpdateOneResolverArgs<MktLicenseWorkspaceEntity>> {
    const status = payload?.data?.status;
    const licenseId = payload?.id;
    const metadata = payload?.data?.metadata as Metadata | undefined;

    if (status === MKT_LICENSE_STATUS.RENEWING) {
      if (!metadata) {
        const newMetadata: Metadata = await this.makeMetadata(licenseId);
        // throw new Error(
        //   `Debug Method not implemented. ${JSON.stringify(newMetadata)}`,
        // );
        return {
          ...payload,
          data: {
            ...payload.data,
            metadata: newMetadata as unknown as JSON, // Type assertion an toàn cho RAW_JSON field
          },
        };
      }
    }
    return payload;
  }

  async makeMetadata(licenseId: string): Promise<Metadata> {
    const license = await this.licenseService.getLicenseForRenew(licenseId);
    //throw new Error(`Debug Method not implemented. ${JSON.stringify(license)}`);
    return {
      orderAction: 'LICENSE_RENEWING',
      customer: {
        mktCustomerId: license?.mktOrder?.mktCustomerId || 'unknown',
      },
      paymentMethods: [
        {
          mktPaymentMethodId:
            license?.mktOrder?.mktPayments[0]?.mktPaymentMethodId || 'unknown',
          name: 'SEPay QR',
        },
      ],
      variants: [
        {
          mktVariantId: license?.mktVariantId || 'unknown',
          quantity: 1,
        },
      ],
    };
  }
}
