import { Field, ObjectType, Int, Float, ID } from '@nestjs/graphql';

import { COMBO_ITEM_TYPE } from 'src/mkt-core/mkt-combo/constants/generic-combo.constants';

/**
 * Output cho generic combo item
 */
@ObjectType()
export class GenericComboItemOutput {
  @Field(() => ID)
  id: string;

  @Field(() => COMBO_ITEM_TYPE)
  itemType: string;

  @Field(() => String, { nullable: true })
  displayName: string | null;

  @Field(() => Int)
  quantity: number;

  @Field(() => Float, { nullable: true })
  overridePrice: number | null;

  @Field(() => Int)
  position: number;

  // DIGITAL_EXTERNAL fields
  @Field(() => String, { nullable: true })
  externalProductId: string | null;

  @Field(() => String, { nullable: true })
  externalProductCode: string | null;

  @Field(() => String, { nullable: true })
  externalPackageId: string | null;

  @Field(() => String, { nullable: true })
  externalPackageCode: string | null;

  // INTERNAL_PRODUCT fields
  @Field(() => String, { nullable: true })
  mktProductId: string | null;

  // INTERNAL_VARIANT fields
  @Field(() => String, { nullable: true })
  mktVariantId: string | null;

  // SERVICE fields
  @Field(() => String, { nullable: true })
  serviceName: string | null;

  @Field(() => String, { nullable: true })
  serviceDescription: string | null;

  @Field(() => Float, { nullable: true })
  servicePrice: number | null;

  // CUSTOM fields
  @Field(() => String, { nullable: true })
  customName: string | null;

  @Field(() => String, { nullable: true })
  customDescription: string | null;

  @Field(() => Float, { nullable: true })
  customPrice: number | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

/**
 * Output cho generic combo
 */
@ObjectType()
export class GenericComboOutput {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  comboCode: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description: string | null;

  @Field(() => String)
  pricingType: string;

  @Field(() => Float, { nullable: true })
  fixedPrice: number | null;

  @Field(() => Float, { nullable: true })
  discountPercent: number | null;

  @Field(() => String)
  currency: string;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Date, { nullable: true })
  validFrom: Date | null;

  @Field(() => Date, { nullable: true })
  validTo: Date | null;

  @Field(() => Int)
  version: number;

  @Field(() => [GenericComboItemOutput], { nullable: true })
  items?: GenericComboItemOutput[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

/**
 * Output cho danh sách combos có phân trang
 */
@ObjectType()
export class PaginatedGenericCombosOutput {
  @Field(() => [GenericComboOutput])
  items: GenericComboOutput[];

  @Field(() => Int)
  total: number;

  @Field(() => Boolean)
  hasMore: boolean;
}

/**
 * Output chi tiết tính giá item
 */
@ObjectType()
export class GenericComboItemCalculationOutput {
  @Field(() => ID)
  id: string;

  @Field(() => COMBO_ITEM_TYPE)
  itemType: string;

  @Field(() => String)
  displayName: string;

  @Field(() => Int)
  quantity: number;

  @Field(() => Float)
  unitPrice: number;

  @Field(() => Float)
  totalPrice: number;

  @Field(() => Float)
  adjustedUnitPrice: number;

  @Field(() => Float)
  adjustedTotalPrice: number;
}

/**
 * Output kết quả tính giá combo
 */
@ObjectType()
export class GenericComboPriceCalculationOutput {
  @Field(() => Float)
  originalPrice: number;

  @Field(() => Float)
  comboPrice: number;

  @Field(() => Float)
  savings: number;

  @Field(() => Float)
  savingsPercent: number;

  @Field(() => String)
  currency: string;

  @Field(() => [GenericComboItemCalculationOutput])
  itemDetails: GenericComboItemCalculationOutput[];

  @Field(() => Date)
  calculatedAt: Date;
}

/**
 * Output validation error
 */
@ObjectType()
export class GenericComboValidationErrorOutput {
  @Field(() => String)
  field: string;

  @Field(() => String)
  message: string;

  @Field(() => String)
  code: string;
}

/**
 * Output kết quả validation
 */
@ObjectType()
export class GenericComboValidationOutput {
  @Field(() => Boolean)
  valid: boolean;

  @Field(() => [GenericComboValidationErrorOutput])
  errors: GenericComboValidationErrorOutput[];

  @Field(() => GenericComboOutput, { nullable: true })
  combo?: GenericComboOutput;

  @Field(() => Int, { nullable: true })
  version?: number;
}

/**
 * Output snapshot cho item (simplified)
 */
@ObjectType()
export class GenericComboItemSnapshotOutput {
  @Field(() => ID)
  id: string;

  @Field(() => COMBO_ITEM_TYPE)
  itemType: string;

  @Field(() => String)
  displayName: string;

  @Field(() => Int)
  quantity: number;

  @Field(() => Float)
  unitPrice: number;

  @Field(() => Float)
  totalPrice: number;

  @Field(() => Int)
  position: number;
}

/**
 * Output snapshot combo
 */
@ObjectType()
export class GenericComboSnapshotOutput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  comboCode: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description: string | null;

  @Field(() => String)
  pricingType: string;

  @Field(() => Int)
  version: number;

  @Field(() => [GenericComboItemSnapshotOutput])
  items: GenericComboItemSnapshotOutput[];

  @Field(() => Float)
  originalPrice: number;

  @Field(() => Float)
  comboPrice: number;

  @Field(() => Float)
  savings: number;

  @Field(() => Float)
  savingsPercent: number;

  @Field(() => String)
  currency: string;

  @Field(() => String)
  capturedAt: string;

  @Field(() => String)
  checksum: string;
}
