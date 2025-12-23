import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import {
  CUSTOMER_MESSAGES,
  MKT_CUSTOMER_LOG_CONTEXT,
} from 'src/mkt-core/customer/messages';

/**
 * Pre-query hook for MktCustomer updateOne operation
 *
 * Responsibilities:
 * - Validate email format (if email is being updated)
 * - Validate email uniqueness (if email is being updated)
 * - Validate tax code format (if tax code is being updated)
 * - Prevent mktCustomerCode from being changed (immutable after creation)
 */
@Injectable()
@WorkspaceQueryHook('mktCustomer.updateOne')
export class MktCustomerUpdateOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  private readonly logger = new Logger(
    `${MKT_CUSTOMER_LOG_CONTEXT}:UpdateOneHook`,
  );

  constructor(private readonly customerRepository: MktCustomerRepository) {}

  async execute(
    authContext: AuthContext,
    _objectName: string,
    payload: UpdateOneResolverArgs<MktCustomerWorkspaceEntity>,
  ): Promise<UpdateOneResolverArgs<MktCustomerWorkspaceEntity>> {
    const workspaceId = authContext.workspace?.id;
    const data = payload.data;
    const customerId = payload.id;

    this.logger.debug(`Pre-update validation for customer: ${customerId}`);

    // 1. Prevent mktCustomerCode from being changed
    if (data.mktCustomerCode !== undefined) {
      const existingCustomer = await this.customerRepository.findByIdOrNull(
        customerId,
        workspaceId,
      );

      if (
        existingCustomer?.mktCustomerCode &&
        existingCustomer.mktCustomerCode !== data.mktCustomerCode
      ) {
        throw new BadRequestException(
          'Customer code cannot be changed after creation',
        );
      }
    }

    // 2. Validate email format (if email is being updated)
    if (data.email !== undefined && data.email !== null) {
      this.validateEmailFormat(data.email);

      // 3. Validate email uniqueness (if email is being updated)
      await this.validateEmailUniqueness(data.email, customerId, workspaceId);
    }

    // 4. Validate tax code format (if tax code is being updated)
    if (data.taxCode !== undefined && data.taxCode !== null) {
      this.validateTaxCode(data.taxCode);
    }

    return payload;
  }

  /**
   * Validate email format using regex
   * Throws BadRequestException if invalid
   */
  private validateEmailFormat(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      throw new BadRequestException(
        CUSTOMER_MESSAGES.ERROR.INVALID_EMAIL_FORMAT(email),
      );
    }
  }

  /**
   * Check if email already exists for another customer in the workspace
   * Throws BadRequestException if exists for different customer
   */
  private async validateEmailUniqueness(
    email: string,
    currentCustomerId: string,
    workspaceId?: string,
  ): Promise<void> {
    const existingCustomer = await this.customerRepository.findByEmail(
      email,
      workspaceId,
    );

    // Email exists and belongs to a different customer
    if (existingCustomer && existingCustomer.id !== currentCustomerId) {
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
