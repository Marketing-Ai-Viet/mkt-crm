import { Injectable, Logger } from '@nestjs/common';

import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import {
  CUSTOMER_MESSAGES,
  MKT_CUSTOMER_LOG_CONTEXT,
} from 'src/mkt-core/customer/messages';
import { LinkedAccount } from 'src/mkt-core/customer/types';
import { LinkedAccountValidationUtil } from 'src/mkt-core/customer/utils';

// ============================================
// TYPES
// ============================================

type CreateValidationInput = {
  email?: string;
  taxCode?: string;
  workspaceId?: string;
};

type UpdateValidationInput = {
  customerId: string;
  email?: string;
  taxCode?: string;
  mktCustomerCode?: string;
  linkedAccounts?: LinkedAccount[];
  workspaceId?: string;
};

type ValidationResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

// ============================================
// SERVICE
// ============================================

/**
 * MktCustomerValidationService
 *
 * Centralized validation logic for Customer operations.
 * Extracted from legacy hooks for better testability and reusability.
 *
 * Validation rules:
 * - Email: RFC 5322 format, unique per workspace
 * - Tax code: Vietnamese format (10 or 13 digits)
 * - Customer code: Immutable after creation
 * - Linked accounts: One primary per provider
 */
@Injectable()
export class MktCustomerValidationService {
  private readonly logger = new Logger(
    `${MKT_CUSTOMER_LOG_CONTEXT}:Validation`,
  );

  constructor(private readonly customerRepository: MktCustomerRepository) {}

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Validate input for creating a customer
   */
  async validateCreate(
    input: CreateValidationInput,
  ): Promise<ValidationResult> {
    // 1. Validate email format
    if (input.email) {
      const emailResult = this.validateEmailFormat(input.email);

      if (!emailResult.success) {
        return emailResult;
      }

      // 2. Validate email uniqueness
      const uniqueResult = await this.validateEmailUniqueness(
        input.email,
        undefined,
        input.workspaceId,
      );

      if (!uniqueResult.success) {
        return uniqueResult;
      }
    }

    // 3. Validate tax code format
    if (input.taxCode) {
      const taxResult = this.validateTaxCode(input.taxCode);

      if (!taxResult.success) {
        return taxResult;
      }
    }

    return { success: true };
  }

  /**
   * Validate input for updating a customer
   */
  async validateUpdate(
    input: UpdateValidationInput,
  ): Promise<ValidationResult<{ linkedAccounts?: LinkedAccount[] }>> {
    type UpdateValidationResult = ValidationResult<{
      linkedAccounts?: LinkedAccount[];
    }>;

    // 1. Prevent mktCustomerCode from being changed
    if (input.mktCustomerCode !== undefined) {
      const codeResult = await this.validateCustomerCodeImmutable(
        input.customerId,
        input.mktCustomerCode,
      );

      if (!codeResult.success) {
        return {
          success: false,
          error: codeResult.error,
        } as UpdateValidationResult;
      }
    }

    // 2. Validate email format (if email is being updated)
    if (input.email !== undefined && input.email !== null) {
      const emailResult = this.validateEmailFormat(input.email);

      if (!emailResult.success) {
        return {
          success: false,
          error: emailResult.error,
        } as UpdateValidationResult;
      }

      // 3. Validate email uniqueness
      const uniqueResult = await this.validateEmailUniqueness(
        input.email,
        input.customerId,
        input.workspaceId,
      );

      if (!uniqueResult.success) {
        return {
          success: false,
          error: uniqueResult.error,
        } as UpdateValidationResult;
      }
    }

    // 4. Validate tax code format
    if (input.taxCode !== undefined && input.taxCode !== null) {
      const taxResult = this.validateTaxCode(input.taxCode);

      if (!taxResult.success) {
        return {
          success: false,
          error: taxResult.error,
        } as UpdateValidationResult;
      }
    }

    // 5. Validate and auto-fix linkedAccounts
    let fixedLinkedAccounts: LinkedAccount[] | undefined;

    if (input.linkedAccounts !== undefined && input.linkedAccounts !== null) {
      const linkedResult = this.validateAndFixLinkedAccounts(
        input.linkedAccounts,
      );

      if (!linkedResult.success) {
        return {
          success: false,
          error: linkedResult.error,
        } as UpdateValidationResult;
      }
      fixedLinkedAccounts = linkedResult.data;
    }

    return { success: true, data: { linkedAccounts: fixedLinkedAccounts } };
  }

  // ============================================
  // PRIVATE VALIDATION METHODS
  // ============================================

  private validateEmailFormat(email: string): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: CUSTOMER_MESSAGES.ERROR.INVALID_EMAIL_FORMAT(email),
      };
    }

    return { success: true };
  }

  private async validateEmailUniqueness(
    email: string,
    currentCustomerId?: string,
    workspaceId?: string,
  ): Promise<ValidationResult> {
    const existingCustomer = await this.customerRepository.findByEmail(
      email,
      workspaceId,
    );

    if (existingCustomer) {
      // For update: allow if same customer
      if (currentCustomerId && existingCustomer.id === currentCustomerId) {
        return { success: true };
      }

      return {
        success: false,
        error: CUSTOMER_MESSAGES.ERROR.EMAIL_ALREADY_EXISTS(email),
      };
    }

    return { success: true };
  }

  private validateTaxCode(taxCode: string): ValidationResult {
    const cleanTaxCode = taxCode.replace(/\D/g, '');

    if (cleanTaxCode.length !== 10 && cleanTaxCode.length !== 13) {
      return {
        success: false,
        error: CUSTOMER_MESSAGES.ERROR.INVALID_TAX_CODE(taxCode),
      };
    }

    return { success: true };
  }

  private async validateCustomerCodeImmutable(
    customerId: string,
    newCode: string,
  ): Promise<ValidationResult> {
    const existingCustomer =
      await this.customerRepository.findByIdOrNull(customerId);

    if (
      existingCustomer?.mktCustomerCode &&
      existingCustomer.mktCustomerCode !== newCode
    ) {
      return {
        success: false,
        error: 'Customer code cannot be changed after creation',
      };
    }

    return { success: true };
  }

  private validateAndFixLinkedAccounts(
    linkedAccounts: LinkedAccount[],
  ): ValidationResult<LinkedAccount[]> {
    const { fixed, fixedProviders } =
      LinkedAccountValidationUtil.autoFixPrimary(linkedAccounts);

    if (fixedProviders.length > 0) {
      this.logger.warn(
        CUSTOMER_MESSAGES.WARN.LINKED_ACCOUNT_PRIMARY_AUTO_FIXED(
          fixedProviders,
        ),
      );
    }

    // Final validation
    try {
      LinkedAccountValidationUtil.validateOrThrow(fixed);

      return { success: true, data: fixed };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Invalid linked accounts',
      };
    }
  }
}
