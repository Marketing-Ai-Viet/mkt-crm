import {
  Field,
  InputType,
  Int,
  Float,
  registerEnumType,
} from '@nestjs/graphql';

import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsBoolean,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

import {
  GenericComboPricingType,
  GENERIC_COMBO_PRICING_TYPE,
  ComboItemType,
  COMBO_ITEM_TYPE,
} from 'src/mkt-core/mkt-combo/constants/generic-combo.constants';

// Register enums cho GraphQL
registerEnumType(GENERIC_COMBO_PRICING_TYPE, {
  name: 'GenericComboPricingType',
  description: 'Pricing type for generic combo',
});

registerEnumType(COMBO_ITEM_TYPE, {
  name: 'ComboItemType',
  description: 'Type of item in generic combo',
});

/**
 * Input tạo generic combo item
 *
 * Polymorphic fields dựa trên itemType:
 * - DIGITAL_EXTERNAL: Bán theo package từ MKT Server
 *   + externalPackageId: BẮT BUỘC - ID của package
 *   + externalProductId: optional - lấy tự động từ package.productId nếu không cung cấp
 * - INTERNAL_PRODUCT: mktProductId (deprecated - dùng DIGITAL_EXTERNAL)
 * - INTERNAL_VARIANT: mktVariantId (deprecated - dùng DIGITAL_EXTERNAL)
 * - SERVICE: serviceName, servicePrice
 * - CUSTOM: customName, customPrice
 */
@InputType()
export class CreateGenericComboItemInput {
  @Field(() => COMBO_ITEM_TYPE, {
    description: 'Loại item. DIGITAL_EXTERNAL yêu cầu externalPackageId',
  })
  @IsEnum(COMBO_ITEM_TYPE)
  itemType: ComboItemType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  displayName?: string;

  @Field(() => Int, { defaultValue: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  overridePrice?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number;

  // DIGITAL_EXTERNAL fields (bán theo package)
  @Field(() => String, {
    nullable: true,
    description:
      'Product ID từ MKT Server (optional - lấy từ package.productId)',
  })
  @IsOptional()
  @IsString()
  externalProductId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  externalProductCode?: string;

  @Field(() => String, {
    nullable: true,
    description: 'BẮT BUỘC cho DIGITAL_EXTERNAL - Package ID từ MKT Server',
  })
  @IsOptional()
  @IsString()
  externalPackageId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  externalPackageCode?: string;

  // INTERNAL_PRODUCT fields
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  mktProductId?: string;

  // INTERNAL_VARIANT fields
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  mktVariantId?: string;

  // SERVICE fields
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  serviceName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  serviceDescription?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  servicePrice?: number;

  // CUSTOM fields
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  customName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  customDescription?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  customPrice?: number;
}

/**
 * Input tạo generic combo mới
 */
@InputType()
export class CreateGenericComboInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  comboCode: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  name: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => GENERIC_COMBO_PRICING_TYPE)
  @IsEnum(GENERIC_COMBO_PRICING_TYPE)
  pricingType: GenericComboPricingType;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedPrice?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @Field(() => String, { defaultValue: 'VND' })
  @IsOptional()
  @IsString()
  currency?: string;

  @Field(() => Boolean, { defaultValue: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  validFrom?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  validTo?: Date;

  @Field(() => [CreateGenericComboItemInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGenericComboItemInput)
  items: CreateGenericComboItemInput[];
}

/**
 * Input cập nhật generic combo
 */
@InputType()
export class UpdateGenericComboInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => GENERIC_COMBO_PRICING_TYPE, { nullable: true })
  @IsOptional()
  @IsEnum(GENERIC_COMBO_PRICING_TYPE)
  pricingType?: GenericComboPricingType;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedPrice?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  currency?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  validFrom?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  validTo?: Date;

  @Field(() => Int, { nullable: true, description: 'For optimistic locking' })
  @IsOptional()
  @IsNumber()
  expectedVersion?: number;
}

/**
 * Input filter cho query
 */
@InputType()
export class GenericComboFilterInput {
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field(() => GENERIC_COMBO_PRICING_TYPE, { nullable: true })
  @IsOptional()
  @IsEnum(GENERIC_COMBO_PRICING_TYPE)
  pricingType?: GenericComboPricingType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  validAt?: Date;
}

/**
 * Input query combos
 */
@InputType()
export class GetGenericCombosInput {
  @Field(() => Int, { defaultValue: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @Field(() => Int, { defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @Field(() => GenericComboFilterInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => GenericComboFilterInput)
  filter?: GenericComboFilterInput;
}

/**
 * Input tính giá combo
 */
@InputType()
export class CalculateGenericComboPriceInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  comboId: string;

  @Field(() => String, { defaultValue: 'vi' })
  @IsOptional()
  @IsString()
  language?: string;
}
