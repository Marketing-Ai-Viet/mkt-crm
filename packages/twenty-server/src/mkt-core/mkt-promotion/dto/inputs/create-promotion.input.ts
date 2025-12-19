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
  IsArray,
  IsBoolean,
  ValidateNested,
  IsEnum,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

import {
  PROMOTION_TYPE,
  PROMOTION_RULE_TYPE,
  RULE_OPERATOR,
  LOGIC_OPERATOR,
} from 'src/mkt-core/mkt-promotion/constants';

// Register enums for GraphQL
registerEnumType(PROMOTION_TYPE, {
  name: 'PromotionType',
  description: 'Promotion type values',
});

registerEnumType(PROMOTION_RULE_TYPE, {
  name: 'PromotionRuleType',
  description: 'Promotion rule type values',
});

registerEnumType(RULE_OPERATOR, {
  name: 'RuleOperator',
  description: 'Rule operator values',
});

registerEnumType(LOGIC_OPERATOR, {
  name: 'LogicOperator',
  description: 'Logic operator values',
});

/**
 * Input for creating promotion rule
 */
@InputType()
export class CreatePromotionRuleInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  name: string;

  @Field(() => PROMOTION_RULE_TYPE)
  @IsEnum(PROMOTION_RULE_TYPE)
  ruleType: string;

  @Field(() => RULE_OPERATOR)
  @IsEnum(RULE_OPERATOR)
  operator: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  targetIds?: string[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  targetValues?: Record<string, unknown>;

  @Field(() => Boolean, { defaultValue: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @Field(() => LOGIC_OPERATOR, { defaultValue: LOGIC_OPERATOR.AND })
  @IsOptional()
  @IsEnum(LOGIC_OPERATOR)
  logicOperator?: string;

  @Field(() => Int, { defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number;
}

/**
 * Input for creating promotion
 */
@InputType()
export class CreatePromotionInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/, {
    message:
      'Code must contain only uppercase letters, numbers, hyphens, and underscores',
  })
  code: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => String)
  @IsEnum(PROMOTION_TYPE)
  promotionType: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  discountValue: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @Field(() => String, { defaultValue: 'VND' })
  @IsOptional()
  @IsString()
  currency?: string;

  @Field(() => Date)
  startDate: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  endDate?: Date;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimitPerCustomer?: number;

  @Field(() => Int, { defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

  @Field(() => Boolean, { defaultValue: false })
  @IsOptional()
  @IsBoolean()
  stackable?: boolean;

  @Field(() => Boolean, { defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isAutoApply?: boolean;

  @Field(() => [CreatePromotionRuleInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePromotionRuleInput)
  rules?: CreatePromotionRuleInput[];
}
