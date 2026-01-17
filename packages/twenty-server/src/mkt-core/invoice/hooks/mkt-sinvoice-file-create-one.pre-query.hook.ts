import { Injectable, Logger } from '@nestjs/common';

import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { CreateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import {
  SINVOICE_FILE_STATUS,
  SINVOICE_FILE_TYPE,
} from 'src/mkt-core/invoice/constants';
import { MktSInvoiceFileWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice-file.workspace-entity';
import { MktSInvoiceRepository } from 'src/mkt-core/invoice/repositories';

/**
 * MktSInvoiceFileCreateOnePreQueryHook
 *
 * Uses MktSInvoiceRepository for thread-safe access to SInvoice data
 */
@Injectable()
@WorkspaceQueryHook('mktSInvoiceFile.createOne')
export class MktSInvoiceFileCreateOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  private readonly logger = new Logger(
    MktSInvoiceFileCreateOnePreQueryHook.name,
  );

  constructor(
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly sInvoiceRepository: MktSInvoiceRepository,
  ) {}

  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: CreateOneResolverArgs<MktSInvoiceFileWorkspaceEntity>,
  ): Promise<CreateOneResolverArgs<MktSInvoiceFileWorkspaceEntity>> {
    const input = payload?.data;
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    this.logger.log(
      `Creating SInvoiceFile with input: ${JSON.stringify(input)}`,
    );

    if (!workspaceId || !input?.mktSInvoiceId) {
      this.logger.warn(
        'Missing workspaceId or mktSInvoiceId, skipping API call',
      );

      return payload;
    }

    try {
      // get information of SInvoice to have enough information to call API
      // Uses MktSInvoiceRepository for thread-safe access
      const sInvoice = await this.sInvoiceRepository.findByIdWithContext(
        input.mktSInvoiceId,
      );

      if (!sInvoice) {
        this.logger.warn(`SInvoice not found with ID: ${input.mktSInvoiceId}`);

        return payload;
      }

      // Check if there is enough information to call API
      if (
        !sInvoice.supplierTaxCode ||
        !sInvoice.invoiceNo ||
        !sInvoice.templateCode
      ) {
        this.logger.warn(
          `SInvoice missing required fields for API call: ${input.mktSInvoiceId}`,
        );

        return payload;
      }

      // Update input with information from SInvoice
      const updatedInput = {
        ...input,
        name: input.name || `Invoice File - ${sInvoice.invoiceNo}`,
        fileName: `invoice-${sInvoice.invoiceNo}.${SINVOICE_FILE_TYPE.PDF.toLowerCase()}`,
        fileType: input.fileType || SINVOICE_FILE_TYPE.PDF,
        status: input.status || SINVOICE_FILE_STATUS.PENDING,
        supplierTaxCode: sInvoice.supplierTaxCode,
        invoiceNo: sInvoice.invoiceNo,
        templateCode: sInvoice.templateCode,
      };

      this.logger.log(
        `[S-INVOICE FILE HOOK] Prepared file data for SInvoice: ${input.mktSInvoiceId}`,
      );

      return {
        ...payload,
        data: updatedInput,
      };
    } catch (error) {
      this.logger.error(
        `[S-INVOICE FILE HOOK] Failed to prepare file data for SInvoice: ${input.mktSInvoiceId}`,
        error,
      );

      // Still create record with status ERROR
      const errorInput = {
        ...input,
        status: SINVOICE_FILE_STATUS.ERROR,
        errorMessage: `Failed to prepare file data: ${error.message}`,
      };

      return {
        ...payload,
        data: errorInput,
      };
    }
  }
}
