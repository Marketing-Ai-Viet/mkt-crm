import { Injectable, Logger } from '@nestjs/common';

import { MktGenericComboRepository } from 'src/mkt-core/mkt-combo/repositories/mkt-generic-combo.repository';
import {
  GenericComboWithItems,
  CreateGenericComboData,
  CreateGenericComboItemData,
} from 'src/mkt-core/mkt-combo/types/generic-combo.types';
import {
  GENERIC_COMBO_LOG_CONTEXT,
  COMBO_ITEM_TYPE,
  ComboItemType,
} from 'src/mkt-core/mkt-combo/constants/generic-combo.constants';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * Chi tiết lỗi validation
 */
export type GenericComboValidationErrorDetail = {
  field: string;
  message: string;
  code: string;
};

/**
 * Kết quả validation
 */
export type GenericComboValidationResult = {
  valid: boolean;
  errors: GenericComboValidationErrorDetail[];
  combo?: GenericComboWithItems;
};

/**
 * Service validation cho Generic Combo
 */
@Injectable()
export class GenericComboValidationService {
  private readonly logger = new Logger(GENERIC_COMBO_LOG_CONTEXT);

  constructor(private readonly comboRepository: MktGenericComboRepository) {}

  /**
   * Validate dữ liệu tạo combo
   */
  async validateCreateData(
    workspaceId: string,
    data: CreateGenericComboData,
  ): Promise<GenericComboValidationResult> {
    const errors: GenericComboValidationErrorDetail[] = [];

    // Check combo code
    if (!data.comboCode?.trim()) {
      errors.push({
        field: 'comboCode',
        message: 'Combo code is required',
        code: 'REQUIRED',
      });
    } else {
      const codeExists = await this.comboRepository.codeExists(
        workspaceId,
        data.comboCode,
      );

      if (codeExists) {
        errors.push({
          field: 'comboCode',
          message: 'Combo code already exists',
          code: 'DUPLICATE',
        });
      }
    }

    // Check name
    if (!data.name?.trim()) {
      errors.push({
        field: 'name',
        message: 'Name is required',
        code: 'REQUIRED',
      });
    }

    // Check pricing type
    if (!data.pricingType) {
      errors.push({
        field: 'pricingType',
        message: 'Pricing type is required',
        code: 'REQUIRED',
      });
    }

    // Check items
    if (!data.items || data.items.length === 0) {
      errors.push({
        field: 'items',
        message: 'At least one item is required',
        code: 'REQUIRED',
      });
    } else {
      // Validate each item
      for (const [index, item] of data.items.entries()) {
        const itemErrors = this.validateItemData(item, index);

        errors.push(...itemErrors);
      }
    }

    // Check validity period
    if (data.validFrom && data.validTo) {
      const validFrom = DateTimeUtils.fromDate(data.validFrom);
      const validTo = DateTimeUtils.fromDate(data.validTo);

      if (validFrom.isValid && validTo.isValid && validFrom > validTo) {
        errors.push({
          field: 'validTo',
          message: 'Valid to must be after valid from',
          code: 'INVALID_RANGE',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate dữ liệu item
   */
  private validateItemData(
    item: CreateGenericComboItemData,
    index: number,
  ): GenericComboValidationErrorDetail[] {
    const errors: GenericComboValidationErrorDetail[] = [];
    const prefix = `items[${index}]`;

    // Check item type
    if (!item.itemType) {
      errors.push({
        field: `${prefix}.itemType`,
        message: 'Item type is required',
        code: 'REQUIRED',
      });

      return errors;
    }

    // Validate type-specific fields
    const typeErrors = this.validateItemTypeSpecificFields(
      item.itemType,
      item,
      prefix,
    );

    errors.push(...typeErrors);

    // Check quantity
    if (item.quantity !== undefined && item.quantity < 1) {
      errors.push({
        field: `${prefix}.quantity`,
        message: 'Quantity must be at least 1',
        code: 'INVALID_VALUE',
      });
    }

    return errors;
  }

  /**
   * Validate fields dựa trên item type
   */
  private validateItemTypeSpecificFields(
    itemType: ComboItemType,
    item: CreateGenericComboItemData,
    prefix: string,
  ): GenericComboValidationErrorDetail[] {
    const errors: GenericComboValidationErrorDetail[] = [];

    switch (itemType) {
      case COMBO_ITEM_TYPE.DIGITAL_EXTERNAL: {
        // Phải có productId hoặc packageId
        if (!item.externalProductId && !item.externalPackageId) {
          errors.push({
            field: `${prefix}`,
            message:
              'DIGITAL_EXTERNAL item requires either externalProductId or externalPackageId',
            code: 'REQUIRED',
          });
        }
        break;
      }

      case COMBO_ITEM_TYPE.INTERNAL_PRODUCT: {
        if (!item.mktProductId) {
          errors.push({
            field: `${prefix}.mktProductId`,
            message: 'INTERNAL_PRODUCT item requires mktProductId',
            code: 'REQUIRED',
          });
        }
        break;
      }

      case COMBO_ITEM_TYPE.INTERNAL_VARIANT: {
        if (!item.mktVariantId) {
          errors.push({
            field: `${prefix}.mktVariantId`,
            message: 'INTERNAL_VARIANT item requires mktVariantId',
            code: 'REQUIRED',
          });
        }
        break;
      }

      case COMBO_ITEM_TYPE.SERVICE: {
        if (!item.serviceName) {
          errors.push({
            field: `${prefix}.serviceName`,
            message: 'SERVICE item requires serviceName',
            code: 'REQUIRED',
          });
        }

        if (
          item.servicePrice === undefined ||
          item.servicePrice === null ||
          item.servicePrice < 0
        ) {
          errors.push({
            field: `${prefix}.servicePrice`,
            message: 'SERVICE item requires a non-negative servicePrice',
            code: 'REQUIRED',
          });
        }
        break;
      }

      case COMBO_ITEM_TYPE.CUSTOM: {
        if (!item.customName) {
          errors.push({
            field: `${prefix}.customName`,
            message: 'CUSTOM item requires customName',
            code: 'REQUIRED',
          });
        }

        if (
          item.customPrice === undefined ||
          item.customPrice === null ||
          item.customPrice < 0
        ) {
          errors.push({
            field: `${prefix}.customPrice`,
            message: 'CUSTOM item requires a non-negative customPrice',
            code: 'REQUIRED',
          });
        }
        break;
      }

      default:
        errors.push({
          field: `${prefix}.itemType`,
          message: `Unknown item type: ${itemType}`,
          code: 'INVALID_VALUE',
        });
    }

    return errors;
  }

  /**
   * Validate combo cho order
   */
  async validateForOrder(
    workspaceId: string,
    comboId: string,
  ): Promise<GenericComboValidationResult> {
    const errors: GenericComboValidationErrorDetail[] = [];

    // Lấy combo với items
    const comboWithItems = await this.comboRepository.findByIdWithItems(
      workspaceId,
      comboId,
    );

    if (!comboWithItems) {
      return {
        valid: false,
        errors: [
          {
            field: 'comboId',
            message: 'Combo not found',
            code: 'NOT_FOUND',
          },
        ],
      };
    }

    const { combo, items } = comboWithItems;

    // Check if combo is active
    if (!combo.isActive) {
      errors.push({
        field: 'isActive',
        message: 'Combo is not active',
        code: 'INACTIVE',
      });
    }

    // Check validity period
    const now = DateTimeUtils.now();

    if (combo.validFrom) {
      const validFrom = DateTimeUtils.fromDate(combo.validFrom);

      if (validFrom.isValid && now < validFrom) {
        errors.push({
          field: 'validFrom',
          message: 'Combo is not yet valid',
          code: 'NOT_YET_VALID',
        });
      }
    }

    if (combo.validTo) {
      const validTo = DateTimeUtils.fromDate(combo.validTo);

      if (validTo.isValid && now > validTo) {
        errors.push({
          field: 'validTo',
          message: 'Combo has expired',
          code: 'EXPIRED',
        });
      }
    }

    // Check items
    if (items.length === 0) {
      errors.push({
        field: 'items',
        message: 'Combo has no items',
        code: 'EMPTY_ITEMS',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      combo: comboWithItems,
    };
  }
}
