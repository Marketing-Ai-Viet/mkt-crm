import { Injectable, Logger } from '@nestjs/common';

import { MktLicenseProxyService } from 'src/mkt-core/mkt-license-integration/services/mkt-license-proxy.service';
import { MktLicenseResponse } from 'src/mkt-core/mkt-license-integration/types';
import { MktOrderItemRepository } from 'src/mkt-core/order/repositories/mkt-order-item.repository';
import { LicenseStatus, OrderLicenseSummary } from 'src/mkt-core/order/types';

/**
 * OrderLicenseQueryService - Query license status from MKT Server
 *
 * This service provides methods to:
 * - Query individual license status by ID
 * - Get all licenses for an order
 * - Get license summary for an order
 *
 * Note: MKT Server is the source of truth for license data.
 * The licenseSnapshot in OrderItem is for historical reference only.
 */
@Injectable()
export class OrderLicenseQueryService {
  private readonly logger = new Logger(OrderLicenseQueryService.name);

  constructor(
    private readonly mktLicenseProxy: MktLicenseProxyService,
    private readonly orderItemRepository: MktOrderItemRepository,
  ) {}

  /**
   * Get license status from MKT Server
   *
   * @param externalMktLicenseId - License ID from MKT Server
   * @returns License status or null if not found
   */
  async getLicenseStatus(
    externalMktLicenseId: string,
  ): Promise<LicenseStatus | null> {
    try {
      this.logger.debug(`Fetching license status: ${externalMktLicenseId}`);

      const license = await this.mktLicenseProxy.findById(externalMktLicenseId);

      return this.mapLicenseToStatus(license);
    } catch (error) {
      this.logger.error(
        `Failed to get license status for ${externalMktLicenseId}`,
        error,
      );

      return null;
    }
  }

  /**
   * Get all licenses for an order
   *
   * @param workspaceId - Workspace ID
   * @param orderId - Order ID
   * @returns Array of license statuses
   */
  async getOrderLicenses(
    workspaceId: string,
    orderId: string,
  ): Promise<LicenseStatus[]> {
    this.logger.debug(`Fetching licenses for order: ${orderId}`);

    const orderItems = await this.orderItemRepository.findByOrderId(
      workspaceId,
      orderId,
    );

    const licensePromises = orderItems
      .filter(
        (item): item is typeof item & { externalMktLicenseId: string } =>
          !!item.externalMktLicenseId,
      )
      .map(async (item): Promise<LicenseStatus | null> => {
        const status = await this.getLicenseStatus(item.externalMktLicenseId);

        if (status) {
          return { ...status, orderItemId: item.id };
        }

        return null;
      });

    const results = await Promise.all(licensePromises);

    return results.filter((status): status is LicenseStatus => status !== null);
  }

  /**
   * Get license summary for an order
   *
   * @param workspaceId - Workspace ID
   * @param orderId - Order ID
   * @returns License summary with counts and statuses
   */
  async getOrderLicenseSummary(
    workspaceId: string,
    orderId: string,
  ): Promise<OrderLicenseSummary> {
    const licenses = await this.getOrderLicenses(workspaceId, orderId);

    const summary: OrderLicenseSummary = {
      orderId,
      totalLicenses: licenses.length,
      activeLicenses: licenses.filter((l) => l.status === 'active').length,
      expiredLicenses: licenses.filter((l) => l.status === 'expired').length,
      revokedLicenses: licenses.filter((l) => l.status === 'revoked').length,
      licenses,
    };

    this.logger.debug(
      `Order ${orderId} license summary: ${summary.totalLicenses} total, ${summary.activeLicenses} active`,
    );

    return summary;
  }

  /**
   * Check if all licenses for an order are active
   *
   * @param workspaceId - Workspace ID
   * @param orderId - Order ID
   * @returns True if all licenses are active
   */
  async areAllLicensesActive(
    workspaceId: string,
    orderId: string,
  ): Promise<boolean> {
    const licenses = await this.getOrderLicenses(workspaceId, orderId);

    if (licenses.length === 0) {
      return true; // No licenses means nothing to check
    }

    return licenses.every((l) => l.status === 'active');
  }

  /**
   * Get license by license key
   *
   * @param licenseKey - License key
   * @returns License status or null if not found
   */
  async getLicenseByKey(licenseKey: string): Promise<LicenseStatus | null> {
    try {
      this.logger.debug(`Fetching license by key: ${licenseKey}`);

      const license = await this.mktLicenseProxy.findByLicenseKey(licenseKey);

      return this.mapLicenseToStatus(license);
    } catch (error) {
      this.logger.error(`Failed to get license by key ${licenseKey}`, error);

      return null;
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Map MktLicenseResponse to LicenseStatus
   */
  private mapLicenseToStatus(license: MktLicenseResponse): LicenseStatus {
    return {
      id: license.id,
      licenseKey: license.licenseKey,
      status: license.status,
      type: license.type,
      startDate: license.startDate,
      endDate: license.endDate,
      maxDevices: license.maxDevices,
      productId: license.productId,
    };
  }
}
