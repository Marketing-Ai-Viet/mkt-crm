import { Injectable, Logger } from '@nestjs/common';

import { createHash } from 'crypto';

import { MktProductProxyService } from 'src/mkt-core/mkt-product-integration/services/mkt-product-proxy.service';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { MktSupportedLanguage } from 'src/mkt-core/mkt-product-integration/types';
import { MktGenericComboWorkspaceEntity } from 'src/mkt-core/mkt-combo/objects/mkt-generic-combo.workspace-entity';
import { MktGenericComboItemWorkspaceEntity } from 'src/mkt-core/mkt-combo/objects/mkt-generic-combo-item.workspace-entity';
import {
  GenericComboSnapshot,
  GenericComboItemSnapshot,
  GenericComboCalculationResult,
  InternalProductSnapshot,
  InternalVariantSnapshot,
  ServiceSnapshot,
  CustomSnapshot,
} from 'src/mkt-core/mkt-combo/types/generic-combo.types';
import {
  GENERIC_COMBO_LOG_CONTEXT,
  COMBO_ITEM_TYPE,
  ComboItemType,
} from 'src/mkt-core/mkt-combo/constants/generic-combo.constants';

/**
 * Service tạo snapshot immutable cho combo
 * Snapshot được lưu cùng order để đảm bảo data integrity
 */
@Injectable()
export class GenericComboSnapshotService {
  private readonly logger = new Logger(GENERIC_COMBO_LOG_CONTEXT);

  constructor(private readonly mktProductProxy: MktProductProxyService) {}

  /**
   * Tạo snapshot combo với tất cả thông tin cần thiết
   * Snapshot này là IMMUTABLE và được lưu cùng order
   */
  async createComboSnapshot(
    combo: MktGenericComboWorkspaceEntity,
    items: MktGenericComboItemWorkspaceEntity[],
    calculationResult: GenericComboCalculationResult,
    _language: MktSupportedLanguage = 'vi',
  ): Promise<GenericComboSnapshot> {
    const capturedAt = DateTimeUtils.toISO(DateTimeUtils.now());

    // Tạo item snapshots
    const itemSnapshots = await this.createItemSnapshots(
      items,
      calculationResult,
      capturedAt,
    );

    // Tạo snapshot data (chưa có checksum)
    const snapshotData: Omit<GenericComboSnapshot, 'checksum'> = {
      id: combo.id,
      comboCode: combo.comboCode,
      name: combo.name,
      description: combo.description,
      pricingType: combo.pricingType,
      version: combo.version,
      items: itemSnapshots,
      originalPrice: calculationResult.originalPrice,
      comboPrice: calculationResult.comboPrice,
      savings: calculationResult.savings,
      savingsPercent: calculationResult.savingsPercent,
      currency: calculationResult.currency,
      capturedAt,
    };

    // Tính checksum từ snapshot data
    const checksum = this.calculateChecksum(snapshotData);

    this.logger.log(
      `Created snapshot for combo ${combo.id} with checksum ${checksum}`,
    );

    return {
      ...snapshotData,
      checksum,
    };
  }

  /**
   * Tạo snapshots cho tất cả items
   */
  private async createItemSnapshots(
    items: MktGenericComboItemWorkspaceEntity[],
    calculationResult: GenericComboCalculationResult,
    capturedAt: string,
  ): Promise<GenericComboItemSnapshot[]> {
    const itemDetails = calculationResult.itemDetails;
    const itemDetailMap = new Map(itemDetails.map((d) => [d.id, d]));

    const snapshots: GenericComboItemSnapshot[] = [];

    for (const item of items) {
      const detail = itemDetailMap.get(item.id);
      const snapshot = await this.createSingleItemSnapshot(
        item,
        detail,
        capturedAt,
      );

      snapshots.push(snapshot);
    }

    return snapshots;
  }

  /**
   * Tạo snapshot cho một item
   */
  private async createSingleItemSnapshot(
    item: MktGenericComboItemWorkspaceEntity,
    detail: GenericComboCalculationResult['itemDetails'][0] | undefined,
    capturedAt: string,
  ): Promise<GenericComboItemSnapshot> {
    const baseSnapshot: Omit<
      GenericComboItemSnapshot,
      | 'externalProductSnapshot'
      | 'externalPackageSnapshot'
      | 'internalProductSnapshot'
      | 'internalVariantSnapshot'
      | 'serviceSnapshot'
      | 'customSnapshot'
    > = {
      id: item.id,
      itemType: item.itemType as ComboItemType,
      displayName: detail?.displayName ?? item.displayName ?? '',
      quantity: item.quantity,
      unitPrice: detail?.unitPrice ?? 0,
      totalPrice: detail?.totalPrice ?? 0,
      position: item.position,
    };

    // Tạo type-specific snapshot
    const typeSnapshots = await this.createTypeSpecificSnapshots(
      item,
      capturedAt,
    );

    return {
      ...baseSnapshot,
      ...typeSnapshots,
    };
  }

  /**
   * Tạo snapshots type-specific dựa trên item type
   */
  private async createTypeSpecificSnapshots(
    item: MktGenericComboItemWorkspaceEntity,
    capturedAt: string,
  ): Promise<
    Pick<
      GenericComboItemSnapshot,
      | 'externalProductSnapshot'
      | 'externalPackageSnapshot'
      | 'internalProductSnapshot'
      | 'internalVariantSnapshot'
      | 'serviceSnapshot'
      | 'customSnapshot'
    >
  > {
    const result = {
      externalProductSnapshot:
        null as GenericComboItemSnapshot['externalProductSnapshot'],
      externalPackageSnapshot:
        null as GenericComboItemSnapshot['externalPackageSnapshot'],
      internalProductSnapshot: null as InternalProductSnapshot | null,
      internalVariantSnapshot: null as InternalVariantSnapshot | null,
      serviceSnapshot: null as ServiceSnapshot | null,
      customSnapshot: null as CustomSnapshot | null,
    };

    switch (item.itemType) {
      case COMBO_ITEM_TYPE.DIGITAL_EXTERNAL: {
        // Bán theo package - package là bắt buộc
        if (!item.externalPackageId) {
          this.logger.warn(
            `Digital external item ${item.id} missing externalPackageId`,
          );
          break;
        }

        // Fetch package trước
        try {
          const pkg = await this.mktProductProxy.getPackage(
            item.externalPackageId,
          );

          if (!pkg) {
            this.logger.warn(
              `Package ${item.externalPackageId} not found for item ${item.id}`,
            );
            break;
          }

          // Tạo package snapshot
          result.externalPackageSnapshot =
            this.mktProductProxy.createPackageSnapshot(pkg);

          // Lấy productId từ item hoặc package
          const productId = item.externalProductId ?? pkg.productId;

          // Fetch product để tạo product snapshot
          const product = await this.mktProductProxy.getProduct(productId);

          if (product) {
            result.externalProductSnapshot =
              this.mktProductProxy.createProductSnapshot(product);
          }
        } catch (error) {
          this.logger.warn(
            `Failed to create snapshots for digital external item ${item.id}`,
            error,
          );
        }
        break;
      }

      case COMBO_ITEM_TYPE.INTERNAL_PRODUCT: {
        // Internal product snapshot - chỉ lưu ID vì relation đã bị remove
        // Product/Variant relations sẽ bị deprecate trong tương lai
        if (item.mktProductId) {
          result.internalProductSnapshot = {
            id: item.mktProductId,
            code: null,
            name: item.displayName ?? '',
            description: null,
            type: null,
            sku: null,
            price: item.overridePrice ?? null,
            isActive: null,
            capturedAt,
          };
        }
        break;
      }

      case COMBO_ITEM_TYPE.INTERNAL_VARIANT: {
        // Internal variant snapshot - chỉ lưu ID vì relation đã bị remove
        // Product/Variant relations sẽ bị deprecate trong tương lai
        if (item.mktVariantId) {
          result.internalVariantSnapshot = {
            id: item.mktVariantId,
            name: item.displayName ?? '',
            description: null,
            sku: null,
            price: item.overridePrice ?? null,
            isActive: null,
            productId: item.mktProductId ?? '',
            productName: null,
            capturedAt,
          };
        }
        break;
      }

      case COMBO_ITEM_TYPE.SERVICE: {
        result.serviceSnapshot = {
          serviceName: item.serviceName ?? '',
          serviceDescription: item.serviceDescription,
          servicePrice: item.servicePrice ?? 0,
          capturedAt,
        };
        break;
      }

      case COMBO_ITEM_TYPE.CUSTOM: {
        result.customSnapshot = {
          customName: item.customName ?? '',
          customDescription: item.customDescription,
          customPrice: item.customPrice ?? 0,
          capturedAt,
        };
        break;
      }
    }

    return result;
  }

  /**
   * Tính checksum SHA-256 cho snapshot data
   */
  private calculateChecksum(
    data: Omit<GenericComboSnapshot, 'checksum'>,
  ): string {
    // Loại bỏ các fields có thể thay đổi và capturedAt
    const { capturedAt: _, ...dataToHash } = data;
    const jsonString = JSON.stringify(dataToHash);

    return createHash('sha256').update(jsonString).digest('hex');
  }

  /**
   * Verify checksum của snapshot
   */
  verifyChecksum(snapshot: GenericComboSnapshot): boolean {
    const { checksum, ...dataWithoutChecksum } = snapshot;
    const calculatedChecksum = this.calculateChecksum(dataWithoutChecksum);

    return checksum === calculatedChecksum;
  }
}
