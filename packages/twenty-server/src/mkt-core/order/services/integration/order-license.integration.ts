import { Injectable, Logger } from '@nestjs/common';

import { UserContext } from 'src/mkt-core/oauth2-client/types';
import { MktLicenseProxyService } from 'src/mkt-core/mkt-license-integration/services';
import { MktSnapshotService } from 'src/mkt-core/mkt-product-integration/services/mkt-snapshot.service';
import {
  MktLicenseResponse,
  MktCreateLicensePayload,
} from 'src/mkt-core/mkt-license-integration/types';
import { MktLicenseSnapshot } from 'src/mkt-core/order/types';

const ORDER_LICENSE_LOG_CONTEXT = 'OrderLicenseIntegration';

/**
 * License creation input for order
 */
export type OrderLicenseInput = {
  productId: string;
  packageId: string;
  customerId: string;
  maxDevices?: number;
};

/**
 * License creation result
 */
export type LicenseCreationResult = {
  success: boolean;
  license?: MktLicenseResponse;
  snapshot?: MktLicenseSnapshot;
  error?: string;
};

/**
 * Bulk license creation result
 */
export type BulkLicenseResult = {
  success: boolean;
  licenses: Array<{
    license: MktLicenseResponse;
    snapshot: MktLicenseSnapshot;
  }>;
  errors: Array<{
    input: OrderLicenseInput;
    error: string;
  }>;
};

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

    for (const item of items) {
      try {
        const payload: MktCreateLicensePayload = {
          productId: item.productId,
          productPackageId: item.packageId,
          userId: item.customerId,
          maxDevices: item.maxDevices,
        };

        const license = await this.licenseProxyService.create(
          payload,
          userContext,
        );

        const snapshot = this.snapshotService.createLicenseSnapshot(license);

        result.licenses.push({
          license,
          snapshot,
        });

        this.logger.debug('License created successfully', {
          licenseId: license.id,
          licenseKey: license.licenseKey,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        result.errors.push({
          input: item,
          error: errorMessage,
        });

        this.logger.warn('Failed to create license', {
          productId: item.productId,
          error: errorMessage,
        });
      }
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

    for (const licenseId of licenseIds) {
      try {
        const activated = await this.licenseProxyService.activate(
          licenseId,
          userContext,
        );

        result.activated.push(activated);

        this.logger.debug('License activated', { licenseId });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

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

    for (const licenseId of licenseIds) {
      try {
        const revoked = await this.licenseProxyService.revoke(
          licenseId,
          userContext,
        );

        result.revoked.push(revoked);

        this.logger.debug('License revoked', { licenseId });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

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
