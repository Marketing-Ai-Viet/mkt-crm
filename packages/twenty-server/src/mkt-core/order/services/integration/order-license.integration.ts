import { Injectable, Logger } from '@nestjs/common';

import { UserContext } from 'src/mkt-core/oauth2-client/types';
import { MktLicenseProxyService } from 'src/mkt-core/mkt-license-integration/services';
import { MktSnapshotService } from 'src/mkt-core/mkt-product-integration/services/mkt-snapshot.service';
import {
  MktLicenseResponse,
  MktCreateLicensePayload,
} from 'src/mkt-core/mkt-license-integration/types';
import {
  BulkLicenseResult,
  MktLicenseSnapshot,
  OrderLicenseInput,
} from 'src/mkt-core/order/types';

const ORDER_LICENSE_LOG_CONTEXT = 'OrderLicenseIntegration';

/**
 * OrderLicenseIntegrationService
 *
 * Integration service that bridges Order module with MKT License Integration module.
 * Provides unified API for:
 * - Creating licenses for order items
 * - Activating/revoking licenses
 * - Creating license snapshots
 *
 * Architecture:
 * - Wraps MktLicenseProxyService for license operations
 * - Uses MktSnapshotService for snapshot creation
 */
@Injectable()
export class OrderLicenseIntegrationService {
  private readonly logger = new Logger(ORDER_LICENSE_LOG_CONTEXT);

  constructor(
    private readonly licenseProxyService: MktLicenseProxyService,
    private readonly snapshotService: MktSnapshotService,
  ) {}

  /**
   * Create licenses for order items
   * Uses bulk API to prevent N+1 sequential calls
   *
   * @param items - License creation inputs
   * @param userContext - OAuth2 user context for API calls
   * @returns Bulk creation result with licenses and snapshots
   */
  async createLicenses(
    items: OrderLicenseInput[],
    userContext?: UserContext,
  ): Promise<BulkLicenseResult> {
    this.logger.debug('Creating licenses for order', {
      itemCount: items.length,
    });

    const result: BulkLicenseResult = {
      success: true,
      licenses: [],
      errors: [],
    };

    if (items.length === 0) {
      return result;
    }

    try {
      // Build bulk payload
      const bulkPayload: MktCreateLicensePayload[] = items.map((item) => ({
        productId: item.productId,
        productPackageId: item.packageId,
        email: item.email,
        maxDevices: item.maxDevices,
      }));

      // Use bulk API instead of N+1 individual calls
      const licenses = await this.licenseProxyService.bulkCreate(
        { items: bulkPayload },
        userContext,
      );

      // Create snapshots for all licenses
      for (const license of licenses) {
        const snapshot = this.snapshotService.createLicenseSnapshot(license);

        result.licenses.push({
          license,
          snapshot,
        });

        this.logger.debug('License created successfully', {
          licenseId: license.id,
          licenseKey: license.licenseKey,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // If bulk operation fails, add error for all items
      for (const item of items) {
        result.errors.push({
          input: item,
          error: errorMessage,
        });
      }

      this.logger.warn('Bulk license creation failed', {
        error: errorMessage,
      });
    }

    result.success = result.errors.length === 0;

    this.logger.log('Licenses creation completed', {
      total: items.length,
      success: result.licenses.length,
      failed: result.errors.length,
    });

    return result;
  }

  /**
   * Activate licenses
   * Uses Promise.allSettled for parallel execution to prevent N+1 sequential calls
   *
   * @param licenseIds - License IDs to activate
   * @param userContext - OAuth2 user context for API calls
   * @returns Activated licenses
   */
  async activateLicenses(
    licenseIds: string[],
    userContext?: UserContext,
  ): Promise<{
    success: boolean;
    activated: MktLicenseResponse[];
    errors: Array<{ licenseId: string; error: string }>;
  }> {
    this.logger.debug('Activating licenses', {
      count: licenseIds.length,
    });

    const result = {
      success: true,
      activated: [] as MktLicenseResponse[],
      errors: [] as Array<{ licenseId: string; error: string }>,
    };

    if (licenseIds.length === 0) {
      return result;
    }

    // Execute all activations in parallel
    const promises = licenseIds.map(async (licenseId) => {
      const activated = await this.licenseProxyService.activate(
        licenseId,
        userContext,
      );

      return { licenseId, activated };
    });

    const settledResults = await Promise.allSettled(promises);

    // Process results
    for (let i = 0; i < settledResults.length; i++) {
      const settledResult = settledResults[i];
      const licenseId = licenseIds[i];

      if (settledResult.status === 'fulfilled') {
        result.activated.push(settledResult.value.activated);
        this.logger.debug('License activated', { licenseId });
      } else {
        const errorMessage =
          settledResult.reason instanceof Error
            ? settledResult.reason.message
            : 'Unknown error';

        result.errors.push({
          licenseId,
          error: errorMessage,
        });

        this.logger.warn('Failed to activate license', {
          licenseId,
          error: errorMessage,
        });
      }
    }

    result.success = result.errors.length === 0;

    return result;
  }

  /**
   * Revoke licenses (for refund/cancellation)
   * Uses Promise.allSettled for parallel execution to prevent N+1 sequential calls
   *
   * @param licenseIds - License IDs to revoke
   * @param userContext - OAuth2 user context for API calls
   * @returns Revoked licenses
   */
  async revokeLicenses(
    licenseIds: string[],
    userContext?: UserContext,
  ): Promise<{
    success: boolean;
    revoked: MktLicenseResponse[];
    errors: Array<{ licenseId: string; error: string }>;
  }> {
    this.logger.debug('Revoking licenses', {
      count: licenseIds.length,
    });

    const result = {
      success: true,
      revoked: [] as MktLicenseResponse[],
      errors: [] as Array<{ licenseId: string; error: string }>,
    };

    if (licenseIds.length === 0) {
      return result;
    }

    // Execute all revocations in parallel
    const promises = licenseIds.map(async (licenseId) => {
      const revoked = await this.licenseProxyService.revoke(
        licenseId,
        userContext,
      );

      return { licenseId, revoked };
    });

    const settledResults = await Promise.allSettled(promises);

    // Process results
    for (let i = 0; i < settledResults.length; i++) {
      const settledResult = settledResults[i];
      const licenseId = licenseIds[i];

      if (settledResult.status === 'fulfilled') {
        result.revoked.push(settledResult.value.revoked);
        this.logger.debug('License revoked', { licenseId });
      } else {
        const errorMessage =
          settledResult.reason instanceof Error
            ? settledResult.reason.message
            : 'Unknown error';

        result.errors.push({
          licenseId,
          error: errorMessage,
        });

        this.logger.warn('Failed to revoke license', {
          licenseId,
          error: errorMessage,
        });
      }
    }

    result.success = result.errors.length === 0;

    return result;
  }

  /**
   * Get license by ID
   */
  async getLicense(
    licenseId: string,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse | null> {
    try {
      return await this.licenseProxyService.findById(licenseId, userContext);
    } catch {
      return null;
    }
  }

  /**
   * Get license by license key
   */
  async getLicenseByKey(
    licenseKey: string,
    userContext?: UserContext,
  ): Promise<MktLicenseResponse | null> {
    try {
      return await this.licenseProxyService.findByLicenseKey(
        licenseKey,
        userContext,
      );
    } catch {
      return null;
    }
  }

  /**
   * Create license snapshot from existing license
   */
  createLicenseSnapshot(license: MktLicenseResponse): MktLicenseSnapshot {
    return this.snapshotService.createLicenseSnapshot(license);
  }
}
