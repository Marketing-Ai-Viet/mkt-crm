import { Injectable, Logger } from '@nestjs/common';

import { createHash } from 'crypto';

import {
  MktProduct,
  MktProductPackage,
  MktProductSnapshot,
  MktPackageSnapshot,
  MktMultiLangField,
  MktSupportedLanguage,
} from 'src/mkt-core/mkt-product-integration/types';
import {
  MKT_DEFAULT_CURRENCY,
  MKT_LANGUAGE_FALLBACK_ORDER,
  MKT_PRODUCT_LOG_CONTEXT,
} from 'src/mkt-core/mkt-product-integration/constants';
import { MKT_PRODUCT_MESSAGES } from 'src/mkt-core/mkt-product-integration/message';

@Injectable()
export class MktSnapshotService {
  private readonly logger = new Logger(MKT_PRODUCT_LOG_CONTEXT);

  /**
   * Create immutable product snapshot
   *
   * @param product - Product data from MKT Server
   * @param language - Display language for snapshot
   * @returns Immutable product snapshot
   */
  createProductSnapshot(
    product: MktProduct,
    language: MktSupportedLanguage = 'vi',
  ): MktProductSnapshot {
    const snapshot: MktProductSnapshot = {
      id: product.id,
      code: product.code,
      productName: product.productName,
      productDescription: product.productDescription,
      displayName: this.getLocalizedText(product.productName, language),
      displayDescription: product.productDescription
        ? this.getLocalizedText(product.productDescription, language)
        : null,
      displayLanguage: language,
      basePrice: product.basePrice,
      currency: MKT_DEFAULT_CURRENCY,
      status: product.status,
      version: product.version,
      iconUrl: product.iconUrl,
      bannerUrl: product.bannerUrl,
      capturedAt: new Date().toISOString(),
      sourceVersion: product.updatedAt,
      checksum: '',
    };

    snapshot.checksum = this.generateChecksum(snapshot);

    this.logger.debug(MKT_PRODUCT_MESSAGES.SNAPSHOT_CREATED, {
      productId: product.id,
      checksum: snapshot.checksum,
    });

    return snapshot;
  }

  /**
   * Create immutable package snapshot
   *
   * @param pkg - Package data from MKT Server
   * @param language - Display language for snapshot
   * @returns Immutable package snapshot
   */
  createPackageSnapshot(
    pkg: MktProductPackage,
    language: MktSupportedLanguage = 'vi',
  ): MktPackageSnapshot {
    const snapshot: MktPackageSnapshot = {
      id: pkg.id,
      packageCode: pkg.packageCode,
      productId: pkg.productId,
      packageName: pkg.packageName,
      packageDescription: pkg.packageDescription,
      displayName: this.getLocalizedText(pkg.packageName, language),
      displayDescription: pkg.packageDescription
        ? this.getLocalizedText(pkg.packageDescription, language)
        : null,
      packageType: pkg.packageType,
      licenseType: pkg.licenseType,
      billingCycle: pkg.billingCycle,
      durationDays: pkg.durationDays,
      price: pkg.price,
      currency: pkg.currency,
      capturedAt: new Date().toISOString(),
    };

    this.logger.debug(MKT_PRODUCT_MESSAGES.SNAPSHOT_CREATED, {
      packageId: pkg.id,
    });

    return snapshot;
  }

  /**
   * Verify snapshot integrity by comparing checksum
   *
   * @param snapshot - Product snapshot to verify
   * @returns True if checksum is valid
   */
  verifyChecksum(snapshot: MktProductSnapshot): boolean {
    const originalChecksum = snapshot.checksum;
    const snapshotCopy = { ...snapshot, checksum: '' };
    const calculatedChecksum = this.generateChecksum(snapshotCopy);

    const isValid = originalChecksum === calculatedChecksum;

    if (!isValid) {
      this.logger.warn(MKT_PRODUCT_MESSAGES.SNAPSHOT_CHECKSUM_MISMATCH, {
        productId: snapshot.id,
        expected: originalChecksum,
        calculated: calculatedChecksum,
      });
    }

    return isValid;
  }

  /**
   * Get localized text with fallback
   *
   * @param field - Multi-language field
   * @param language - Preferred language
   * @returns Localized text or fallback
   */
  getLocalizedText(
    field: MktMultiLangField,
    language: MktSupportedLanguage,
  ): string {
    if (field[language]) {
      return field[language];
    }

    // Fallback order: vi -> en -> ko
    for (const lang of MKT_LANGUAGE_FALLBACK_ORDER) {
      if (field[lang]) {
        return field[lang];
      }
    }

    return '';
  }

  /**
   * Generate SHA-256 checksum for snapshot
   */
  private generateChecksum(
    snapshot: Omit<MktProductSnapshot, 'checksum'> & { checksum: string },
  ): string {
    const dataToHash = JSON.stringify({
      id: snapshot.id,
      code: snapshot.code,
      basePrice: snapshot.basePrice,
      capturedAt: snapshot.capturedAt,
    });

    return createHash('sha256')
      .update(dataToHash)
      .digest('hex')
      .substring(0, 16);
  }
}
