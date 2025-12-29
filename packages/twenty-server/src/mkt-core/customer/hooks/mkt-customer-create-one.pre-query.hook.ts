import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { CreateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { MktCustomerCodeGenerationService } from 'src/mkt-core/customer/services/core/mkt-customer-code-generation.service';
import {
  CUSTOMER_MESSAGES,
  MKT_CUSTOMER_LOG_CONTEXT,
} from 'src/mkt-core/customer/messages';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * Pre-query hook for MktCustomer createOne operation
 *
 * Responsibilities:
 * - Validate email format
 * - Validate email uniqueness
 * - Validate tax code format (10 or 13 digits)
 * - Generate customer code if not provided (format: CUS-YYYY-NNNNNN)
 * - Set default values for status, tier, lifecycleStage
 */
@Injectable()
@WorkspaceQueryHook('mktCustomer.createOne')
export class MktCustomerCreateOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  private readonly logger = new Logger(
    `${MKT_CUSTOMER_LOG_CONTEXT}:CreateOneHook`,
  );

  constructor(
    private readonly customerRepository: MktCustomerRepository,
    private readonly codeGenerationService: MktCustomerCodeGenerationService,
  ) {}

  async execute(
    authContext: AuthContext,
    _objectName: string,
    payload: CreateOneResolverArgs<MktCustomerWorkspaceEntity>,
  ): Promise<CreateOneResolverArgs<MktCustomerWorkspaceEntity>> {
    const workspaceId = authContext.workspace?.id;
    const data = payload.data;

    this.logger.log(
      CUSTOMER_MESSAGES.LOG.CUSTOMER_PRE_CREATE(data.email ?? 'unknown'),
    );

    // 1. Validate email format
    if (data.email) {
      this.validateEmailFormat(data.email);
    }

    // 2. Validate email uniqueness
    if (data.email) {
      await this.validateEmailUniqueness(data.email, workspaceId);
    }

    // 3. Validate tax code format (10 or 13 digits)
    if (data.taxCode) {
      this.validateTaxCode(data.taxCode);
    }

    // 4. Generate customer code if not provided (format: CUS-YYYY-NNNNNN)
    let customerCode = data.mktCustomerCode;

    if (!customerCode) {
      customerCode =
        await this.codeGenerationService.generateUniqueCustomerCode(true);
    }

    // 5. Build payload with defaults
    const now = DateTimeUtils.toDate(DateTimeUtils.now());

    // 6. Set accountOwnerId to current user if not provided
    const accountOwnerId =
      data.accountOwnerId ?? authContext.workspaceMemberId ?? null;

    const enrichedPayload: CreateOneResolverArgs<MktCustomerWorkspaceEntity> = {
      ...payload,
      data: {
        ...data,
        mktCustomerCode: customerCode,
        status: data.status ?? 'ACTIVE',
        tier: data.tier ?? 'BRONZE',
        lifecycleStage: data.lifecycleStage ?? 'PROSPECTIVE',
        registrationDate: data.registrationDate ?? now,
        totalOrderValue: data.totalOrderValue ?? 0,
        licensesCount: data.licensesCount ?? 0,
        churnRiskScore: data.churnRiskScore ?? 0,
        engagementScore: data.engagementScore ?? 0,
        customerLtv: data.customerLtv ?? 0,
        accountOwnerId,
      },
    };

    return enrichedPayload;
  }

  /**
   * Validate email format using regex
   * Throws BadRequestException if invalid
   */
  private validateEmailFormat(email: string): void {
    // Standard email regex pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      throw new BadRequestException(
        CUSTOMER_MESSAGES.ERROR.INVALID_EMAIL_FORMAT(email),
      );
    }
  }

  /**
   * Check if email already exists in the workspace
   * Throws BadRequestException if exists
   */
  private async validateEmailUniqueness(
    email: string,
    workspaceId?: string,
  ): Promise<void> {
    const existingCustomer = await this.customerRepository.findByEmail(
      email,
      workspaceId,
    );

    if (existingCustomer) {
      throw new BadRequestException(
        CUSTOMER_MESSAGES.ERROR.EMAIL_ALREADY_EXISTS(email),
      );
    }
  }

  /**
   * Validate tax code format
   * Must be 10 or 13 digits (Vietnamese tax code format)
   * Throws BadRequestException if invalid
   */
  private validateTaxCode(taxCode: string): void {
    // Remove all non-digit characters
    const cleanTaxCode = taxCode.replace(/\D/g, '');

    // Vietnamese tax codes are either 10 or 13 digits
    if (cleanTaxCode.length !== 10 && cleanTaxCode.length !== 13) {
      throw new BadRequestException(
        CUSTOMER_MESSAGES.ERROR.INVALID_TAX_CODE(taxCode),
      );
    }
  }
}
