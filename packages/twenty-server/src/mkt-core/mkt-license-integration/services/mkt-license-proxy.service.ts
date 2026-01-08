import { Injectable, Logger } from '@nestjs/common';

import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { LinkedAccount } from 'src/mkt-core/customer/types/linked-account.types';
import { UserContext } from 'src/mkt-core/oauth2-client/types';
import {
  MktLicenseResponse,
  MktPaginatedLicenseResponse,
  MktLicenseValidationResult,
  MktLicenseAnalytics,
  MktQueryLicensesParams,
  MktCreateLicensePayload,
  MktCreateTrialLicensePayload,
  MktUpgradeTrialLicensePayload,
  MktUpdateLicensePayload,
  MktValidateLicensePayload,
  MktBulkCreateLicensePayload,
  MktBulkUpdateLicensePayload,
  MktBulkDeleteLicensePayload,
  MktLicenseAnalyticsQueryParams,
  MktFindTrialByProductParams,
  MktCreateOrReuseTrialResult,
  MktCreateTrialWithCustomerPayload,
} from 'src/mkt-core/mkt-license-integration/types';
import { MktLicenseRepository } from 'src/mkt-core/mkt-license-integration/repositories';

/**
 * MKT License Proxy Service
 *
 * Facade service that orchestrates license operations.
 * This service provides a unified API for:
 * - CRUD operations on licenses
 * - Bulk operations
 * - License validation
 * - Analytics
 *
 * Architecture:
 * - Uses MktLicenseRepository for data access (HTTP calls)
 * - Can be extended with caching, validation, etc. in the future
 *
 * NOTE: This is the main service that other modules should use.
 */
@Injectable()
export class MktLicenseProxyService {
  private readonly logger = new Logger(MktLicenseProxyService.name);

  constructor(
    private readonly licenseRepository: MktLicenseRepository,
    private readonly customerRepository: MktCustomerRepository,
  ) {}

  // ==================== READ OPERATIONS ====================

  async findAll(
    query: MktQueryLicensesParams,
    userContext?: UserContext,
  ): Promise<MktPaginatedLicenseResponse> {
    return this.licenseRepository.findAll(query, userContext);
  }

  async findById(
    id: string,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse> {
    return this.licenseRepository.findById(id, userContext);
  }

  async findByLicenseKey(
    licenseKey: string,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse> {
    return this.licenseRepository.findByLicenseKey(licenseKey, userContext);
  }

  /**
   * Find existing trial license by product and email.
   *
   * Used to check if user already has trial before creating new one.
   * Returns the first active/pending trial license if found, or null.
   *
   * Business Rule: 1 user can only have 1 active trial per product
   */
  async findTrialByProductAndEmail(
    params: MktFindTrialByProductParams,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse | null> {
    return this.licenseRepository.findTrialByProductAndEmail(
      params,
      userContext,
    );
  }

  async validate(
    payload: MktValidateLicensePayload,
    userContext?: UserContext,
  ): Promise<MktLicenseValidationResult> {
    return this.licenseRepository.validate(payload, userContext);
  }

  // ==================== WRITE OPERATIONS ====================

  async create(
    payload: MktCreateLicensePayload,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse> {
    return this.licenseRepository.create(payload, userContext);
  }

  /**
   * Create a trial license on MKT Server
   *
   * Trial license does NOT require productPackageId.
   * Default: maxDevices = 1 (single device only)
   */
  async createTrial(
    payload: MktCreateTrialLicensePayload,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse> {
    return this.licenseRepository.createTrial(payload, userContext);
  }

  /**
   * Create or reuse existing trial license (with customerId)
   *
   * Business Logic:
   * - 1 user can only have 1 active trial per product
   * - Lookup email from customer's linkedAccounts (MKT_SERVER, isPrimary, ACTIVE)
   * - If trial exists → reuse existing trial license
   * - If no trial exists → create new trial license
   *
   * @param payload - Contains customerId (not email)
   * @param userContext
   * @returns Object containing license and whether it was reused
   */
  async createOrReuseTrial(
    payload: MktCreateTrialWithCustomerPayload,
    userContext?: UserContext,
  ): Promise<MktCreateOrReuseTrialResult> {
    // Lookup email from customer's linkedAccounts
    const email = await this.getCustomerEmail(
      payload.customerId,
      payload.workspaceId,
    );

    this.logger.debug(
      `Customer ${payload.customerId}: using email "${email}" for trial license`,
    );

    // Check for existing trial license
    const existingTrial = await this.findTrialByProductAndEmail(
      {
        productId: payload.productId,
        email,
      },
      userContext,
    );

    if (existingTrial) {
      this.logger.log(
        `Reusing existing trial license ${existingTrial.id} for product ${payload.productId}`,
      );

      return {
        license: existingTrial,
        reused: true,
      };
    }

    // Create new trial license
    const license = await this.createTrial(
      {
        productId: payload.productId,
        email,
        trialDays: payload.trialDays,
        maxDevices: payload.maxDevices,
      },
      userContext,
    );

    this.logger.log(
      `Created new trial license ${license.id} for product ${payload.productId}`,
    );

    return {
      license,
      reused: false,
    };
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Get customer email for license creation from linkedAccounts
   *
   * Priority:
   * 1. MKT_SERVER linkedAccount (isPrimary=true, status=ACTIVE)
   * 2. Any ACTIVE MKT_SERVER linkedAccount with email
   *
   * @throws Error if no valid email found
   */
  private async getCustomerEmail(
    customerId: string,
    workspaceId: string,
  ): Promise<string> {
    const customer = await this.customerRepository.findByIdOrNull(
      customerId,
      workspaceId,
    );

    if (!customer) {
      throw new Error(
        `Customer "${customerId}" not found. Cannot determine email for license creation.`,
      );
    }

    // Extract email from linkedAccounts (throws if not found)
    return this.customerRepository.extractMktServerEmail(
      customer.linkedAccounts as LinkedAccount[] | null,
      customerId,
    );
  }

  async update(
    id: string,
    payload: MktUpdateLicensePayload,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse> {
    return this.licenseRepository.update(id, payload, userContext);
  }

  async remove(id: string, userContext?: UserContext): Promise<void> {
    return this.licenseRepository.remove(id, userContext);
  }

  // ==================== ACTIVATE OPERATIONS ====================

  async activate(
    id: string,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse> {
    return this.licenseRepository.activate(id, userContext);
  }

  async revoke(
    id: string,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse> {
    return this.licenseRepository.revoke(id, userContext);
  }

  /**
   * Upgrade a trial license to official license
   *
   * This is an atomic operation on MKT Server:
   * - Validates trial license
   * - Converts to official with productPackageId
   * - License key remains the same
   */
  async upgradeTrial(
    id: string,
    payload: MktUpgradeTrialLicensePayload,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse> {
    return this.licenseRepository.upgradeTrial(id, payload, userContext);
  }

  // ==================== BULK OPERATIONS ====================

  async bulkCreate(
    payload: MktBulkCreateLicensePayload,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse[]> {
    return this.licenseRepository.bulkCreate(payload, userContext);
  }

  async bulkUpdate(
    payload: MktBulkUpdateLicensePayload,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse[]> {
    return this.licenseRepository.bulkUpdate(payload, userContext);
  }

  async bulkDelete(
    payload: MktBulkDeleteLicensePayload,
    userContext?: UserContext,
  ): Promise<void> {
    return this.licenseRepository.bulkDelete(payload, userContext);
  }

  // ==================== ANALYTICS ====================

  async getAnalytics(
    query: MktLicenseAnalyticsQueryParams,
    userContext?: UserContext,
  ): Promise<MktLicenseAnalytics> {
    return this.licenseRepository.getAnalytics(query, userContext);
  }
}
