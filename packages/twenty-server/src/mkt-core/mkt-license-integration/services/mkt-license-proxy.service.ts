import { Injectable, Logger } from '@nestjs/common';

import { UserContext } from 'src/mkt-core/oauth2-client/types';
import { MKT_LICENSE_LOG_CONTEXT } from 'src/mkt-core/mkt-license-integration/constants';
import {
  MktLicenseResponse,
  MktPaginatedLicenseResponse,
  MktLicenseValidationResult,
  MktLicenseAnalytics,
  MktQueryLicensesParams,
  MktCreateLicensePayload,
  MktUpdateLicensePayload,
  MktValidateLicensePayload,
  MktBulkCreateLicensePayload,
  MktBulkUpdateLicensePayload,
  MktBulkDeleteLicensePayload,
  MktLicenseAnalyticsQueryParams,
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
  private readonly logger = new Logger(MKT_LICENSE_LOG_CONTEXT);

  constructor(private readonly licenseRepository: MktLicenseRepository) {}

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
