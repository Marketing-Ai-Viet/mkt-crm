import { Injectable, Logger } from '@nestjs/common';

import {
  RuleEvaluationResult,
  PromotionEvaluationContext,
} from 'src/mkt-core/mkt-promotion/types';
import {
  PROMOTION_LOG_CONTEXT,
  PROMOTION_RULE_TYPE,
  RULE_OPERATOR,
  LOGIC_OPERATOR,
} from 'src/mkt-core/mkt-promotion/constants';
import { MktPromotionRuleWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities';

/**
 * Service đánh giá promotion rules
 * Xử lý các rule types: PRODUCT, CATEGORY, ORDER_VALUE, CUSTOMER_TAG, FIRST_ORDER, QUANTITY
 */
@Injectable()
export class RuleEvaluationService {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  /**
   * Group array items by a key
   */
  private groupByKey<T, K extends keyof T>(
    items: T[],
    key: K,
  ): Record<string, T[]> {
    const result: Record<string, T[]> = {};

    for (const item of items) {
      const groupKey = String(item[key]);

      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
    }

    return result;
  }

  /**
   * Đánh giá tất cả rules của promotion với context
   * Returns true nếu tất cả required rules pass
   */
  async evaluateRules(
    rules: MktPromotionRuleWorkspaceEntity[],
    context: PromotionEvaluationContext,
  ): Promise<{ passed: boolean; results: RuleEvaluationResult[] }> {
    if (rules.length === 0) {
      return { passed: true, results: [] };
    }

    // Evaluate each rule
    const evaluationPromises = rules.map((rule) =>
      this.evaluateSingleRule(rule, context),
    );

    const results = await Promise.all(evaluationPromises);

    // Group rules by logic operator
    const rulesByLogic = this.groupByKey(rules, 'logicOperator');

    // Process AND groups (all must pass)
    const andRules = rulesByLogic[LOGIC_OPERATOR.AND] ?? [];
    const andResults = results.filter((r) =>
      andRules.some((rule) => rule.id === r.ruleId),
    );

    const requiredAndRules = andRules.filter((r) => r.isRequired);
    const requiredAndResults = andResults.filter((r) =>
      requiredAndRules.some((rule) => rule.id === r.ruleId),
    );

    // All required AND rules must pass
    const allRequiredAndPass = requiredAndResults.every((r) => r.passed);

    if (!allRequiredAndPass) {
      return { passed: false, results };
    }

    // Process OR groups (at least one must pass)
    const orRules = rulesByLogic[LOGIC_OPERATOR.OR] ?? [];
    const orResults = results.filter((r) =>
      orRules.some((rule) => rule.id === r.ruleId),
    );

    const requiredOrRules = orRules.filter((r) => r.isRequired);

    if (requiredOrRules.length > 0) {
      const requiredOrResults = orResults.filter((r) =>
        requiredOrRules.some((rule) => rule.id === r.ruleId),
      );

      // At least one required OR rule must pass
      const atLeastOneOrPass = requiredOrResults.some((r) => r.passed);

      if (!atLeastOneOrPass) {
        return { passed: false, results };
      }
    }

    return { passed: true, results };
  }

  /**
   * Đánh giá một rule với context
   */
  async evaluateSingleRule(
    rule: MktPromotionRuleWorkspaceEntity,
    context: PromotionEvaluationContext,
  ): Promise<RuleEvaluationResult> {
    let passed = false;
    let reason: string | null = null;

    switch (rule.ruleType) {
      case PROMOTION_RULE_TYPE.PRODUCT: {
        const result = this.evaluateProductRule(rule, context);

        passed = result.passed;
        reason = result.reason;
        break;
      }

      case PROMOTION_RULE_TYPE.CATEGORY: {
        const result = this.evaluateCategoryRule(rule, context);

        passed = result.passed;
        reason = result.reason;
        break;
      }

      case PROMOTION_RULE_TYPE.VARIANT: {
        const result = this.evaluateVariantRule(rule, context);

        passed = result.passed;
        reason = result.reason;
        break;
      }

      case PROMOTION_RULE_TYPE.ORDER_VALUE: {
        const result = this.evaluateOrderValueRule(rule, context);

        passed = result.passed;
        reason = result.reason;
        break;
      }

      case PROMOTION_RULE_TYPE.CUSTOMER_TAG: {
        const result = this.evaluateCustomerTagRule(rule, context);

        passed = result.passed;
        reason = result.reason;
        break;
      }

      case PROMOTION_RULE_TYPE.FIRST_ORDER: {
        const result = this.evaluateFirstOrderRule(rule, context);

        passed = result.passed;
        reason = result.reason;
        break;
      }

      case PROMOTION_RULE_TYPE.QUANTITY: {
        const result = this.evaluateQuantityRule(rule, context);

        passed = result.passed;
        reason = result.reason;
        break;
      }

      default: {
        this.logger.warn(`Unknown rule type: ${rule.ruleType}`);
        passed = false;
        reason = `Unknown rule type: ${rule.ruleType}`;
      }
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.ruleType,
      passed,
      reason,
    };
  }

  /**
   * Evaluate PRODUCT rule - check if order contains specific products
   */
  private evaluateProductRule(
    rule: MktPromotionRuleWorkspaceEntity,
    context: PromotionEvaluationContext,
  ): { passed: boolean; reason: string | null } {
    if (!rule.targetIds || rule.targetIds.length === 0) {
      return { passed: false, reason: 'No target product IDs specified' };
    }

    const orderProductIds = context.orderItems.map((item) => item.productId);

    switch (rule.operator) {
      case RULE_OPERATOR.IN: {
        // Order must contain at least one of the target products
        const hasProduct = rule.targetIds.some((id) =>
          orderProductIds.includes(id),
        );

        return {
          passed: hasProduct,
          reason: hasProduct
            ? null
            : 'Order does not contain required products',
        };
      }

      case RULE_OPERATOR.NOT_IN: {
        // Order must not contain any of the target products
        const hasProduct = rule.targetIds.some((id) =>
          orderProductIds.includes(id),
        );

        return {
          passed: !hasProduct,
          reason: hasProduct ? 'Order contains excluded products' : null,
        };
      }

      default:
        return {
          passed: false,
          reason: `Unsupported operator for PRODUCT rule: ${rule.operator}`,
        };
    }
  }

  /**
   * Evaluate CATEGORY rule - check if order contains products from specific categories
   */
  private evaluateCategoryRule(
    rule: MktPromotionRuleWorkspaceEntity,
    context: PromotionEvaluationContext,
  ): { passed: boolean; reason: string | null } {
    if (!rule.targetIds || rule.targetIds.length === 0) {
      return { passed: false, reason: 'No target category IDs specified' };
    }

    const orderCategoryIds = context.orderItems
      .map((item) => item.categoryId)
      .filter((id): id is string => id !== null && id !== undefined);

    switch (rule.operator) {
      case RULE_OPERATOR.IN: {
        const hasCategory = rule.targetIds.some((id) =>
          orderCategoryIds.includes(id),
        );

        return {
          passed: hasCategory,
          reason: hasCategory
            ? null
            : 'Order does not contain products from required categories',
        };
      }

      case RULE_OPERATOR.NOT_IN: {
        const hasCategory = rule.targetIds.some((id) =>
          orderCategoryIds.includes(id),
        );

        return {
          passed: !hasCategory,
          reason: hasCategory
            ? 'Order contains products from excluded categories'
            : null,
        };
      }

      default:
        return {
          passed: false,
          reason: `Unsupported operator for CATEGORY rule: ${rule.operator}`,
        };
    }
  }

  /**
   * Evaluate VARIANT rule - check if order contains specific variants
   */
  private evaluateVariantRule(
    rule: MktPromotionRuleWorkspaceEntity,
    context: PromotionEvaluationContext,
  ): { passed: boolean; reason: string | null } {
    if (!rule.targetIds || rule.targetIds.length === 0) {
      return { passed: false, reason: 'No target variant IDs specified' };
    }

    const orderVariantIds = context.orderItems
      .map((item) => item.variantId)
      .filter((id): id is string => id !== null && id !== undefined);

    switch (rule.operator) {
      case RULE_OPERATOR.IN: {
        const hasVariant = rule.targetIds.some((id) =>
          orderVariantIds.includes(id),
        );

        return {
          passed: hasVariant,
          reason: hasVariant
            ? null
            : 'Order does not contain required variants',
        };
      }

      case RULE_OPERATOR.NOT_IN: {
        const hasVariant = rule.targetIds.some((id) =>
          orderVariantIds.includes(id),
        );

        return {
          passed: !hasVariant,
          reason: hasVariant ? 'Order contains excluded variants' : null,
        };
      }

      default:
        return {
          passed: false,
          reason: `Unsupported operator for VARIANT rule: ${rule.operator}`,
        };
    }
  }

  /**
   * Evaluate ORDER_VALUE rule - check if order value meets criteria
   */
  private evaluateOrderValueRule(
    rule: MktPromotionRuleWorkspaceEntity,
    context: PromotionEvaluationContext,
  ): { passed: boolean; reason: string | null } {
    if (!rule.targetValues) {
      return { passed: false, reason: 'No target values specified' };
    }

    const { min, max } = rule.targetValues as {
      min?: number;
      max?: number;
    };

    const orderValue = context.orderSubtotal;

    switch (rule.operator) {
      case RULE_OPERATOR.GREATER_THAN: {
        if (min === undefined) {
          return { passed: false, reason: 'Min value not specified' };
        }

        const passed = orderValue > min;

        return {
          passed,
          reason: passed ? null : `Order value must be greater than ${min}`,
        };
      }

      case RULE_OPERATOR.GREATER_THAN_OR_EQUAL: {
        if (min === undefined) {
          return { passed: false, reason: 'Min value not specified' };
        }

        const passed = orderValue >= min;

        return {
          passed,
          reason: passed ? null : `Order value must be at least ${min}`,
        };
      }

      case RULE_OPERATOR.LESS_THAN: {
        if (max === undefined) {
          return { passed: false, reason: 'Max value not specified' };
        }

        const passed = orderValue < max;

        return {
          passed,
          reason: passed ? null : `Order value must be less than ${max}`,
        };
      }

      case RULE_OPERATOR.LESS_THAN_OR_EQUAL: {
        if (max === undefined) {
          return { passed: false, reason: 'Max value not specified' };
        }

        const passed = orderValue <= max;

        return {
          passed,
          reason: passed ? null : `Order value must be at most ${max}`,
        };
      }

      case RULE_OPERATOR.BETWEEN: {
        if (min === undefined || max === undefined) {
          return {
            passed: false,
            reason: 'Min and max values not specified',
          };
        }

        const passed = orderValue >= min && orderValue <= max;

        return {
          passed,
          reason: passed
            ? null
            : `Order value must be between ${min} and ${max}`,
        };
      }

      default:
        return {
          passed: false,
          reason: `Unsupported operator for ORDER_VALUE rule: ${rule.operator}`,
        };
    }
  }

  /**
   * Evaluate CUSTOMER_TAG rule - check if customer has specific tags
   */
  private evaluateCustomerTagRule(
    rule: MktPromotionRuleWorkspaceEntity,
    context: PromotionEvaluationContext,
  ): { passed: boolean; reason: string | null } {
    if (!rule.targetIds || rule.targetIds.length === 0) {
      return { passed: false, reason: 'No target tag IDs specified' };
    }

    const customerTags = context.customerTags ?? [];

    switch (rule.operator) {
      case RULE_OPERATOR.IN: {
        const hasTag = rule.targetIds.some((id) => customerTags.includes(id));

        return {
          passed: hasTag,
          reason: hasTag ? null : 'Customer does not have required tags',
        };
      }

      case RULE_OPERATOR.NOT_IN: {
        const hasTag = rule.targetIds.some((id) => customerTags.includes(id));

        return {
          passed: !hasTag,
          reason: hasTag ? 'Customer has excluded tags' : null,
        };
      }

      default:
        return {
          passed: false,
          reason: `Unsupported operator for CUSTOMER_TAG rule: ${rule.operator}`,
        };
    }
  }

  /**
   * Evaluate FIRST_ORDER rule - check if this is customer's first order
   */
  private evaluateFirstOrderRule(
    rule: MktPromotionRuleWorkspaceEntity,
    context: PromotionEvaluationContext,
  ): { passed: boolean; reason: string | null } {
    const isFirstOrder = context.isFirstOrder ?? false;

    switch (rule.operator) {
      case RULE_OPERATOR.EQUALS: {
        const targetValues = rule.targetValues as Record<
          string,
          unknown
        > | null;
        const targetValue = targetValues?.value as boolean | undefined;

        if (targetValue === undefined) {
          return { passed: false, reason: 'Target value not specified' };
        }

        const passed = isFirstOrder === targetValue;

        return {
          passed,
          reason: passed
            ? null
            : targetValue
              ? 'This is not your first order'
              : 'This promotion is only for returning customers',
        };
      }

      default:
        return {
          passed: false,
          reason: `Unsupported operator for FIRST_ORDER rule: ${rule.operator}`,
        };
    }
  }

  /**
   * Evaluate QUANTITY rule - check if total quantity meets criteria
   */
  private evaluateQuantityRule(
    rule: MktPromotionRuleWorkspaceEntity,
    context: PromotionEvaluationContext,
  ): { passed: boolean; reason: string | null } {
    if (!rule.targetValues) {
      return { passed: false, reason: 'No target values specified' };
    }

    const { min, max, productIds } = rule.targetValues as {
      min?: number;
      max?: number;
      productIds?: string[];
    };

    // Filter items by product IDs if specified
    const relevantItems = productIds
      ? context.orderItems.filter((item) => productIds.includes(item.productId))
      : context.orderItems;

    const totalQuantity = relevantItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    switch (rule.operator) {
      case RULE_OPERATOR.GREATER_THAN_OR_EQUAL: {
        if (min === undefined) {
          return { passed: false, reason: 'Min quantity not specified' };
        }

        const passed = totalQuantity >= min;

        return {
          passed,
          reason: passed ? null : `Minimum quantity is ${min}`,
        };
      }

      case RULE_OPERATOR.LESS_THAN_OR_EQUAL: {
        if (max === undefined) {
          return { passed: false, reason: 'Max quantity not specified' };
        }

        const passed = totalQuantity <= max;

        return {
          passed,
          reason: passed ? null : `Maximum quantity is ${max}`,
        };
      }

      case RULE_OPERATOR.BETWEEN: {
        if (min === undefined || max === undefined) {
          return {
            passed: false,
            reason: 'Min and max quantities not specified',
          };
        }

        const passed = totalQuantity >= min && totalQuantity <= max;

        return {
          passed,
          reason: passed ? null : `Quantity must be between ${min} and ${max}`,
        };
      }

      default:
        return {
          passed: false,
          reason: `Unsupported operator for QUANTITY rule: ${rule.operator}`,
        };
    }
  }
}
