/**
 * Type definitions for Promotion Rule evaluation
 */

import {
  PromotionRuleType,
  RuleOperator,
  LogicOperator,
} from 'src/mkt-core/mkt-promotion/constants';

// ============================================
// RULE DEFINITION
// ============================================

export type RuleDefinition = {
  id: string;
  name: string;
  ruleType: PromotionRuleType;
  operator: RuleOperator;
  targetIds: string[] | null;
  targetValues: Record<string, unknown> | null;
  isRequired: boolean;
  logicOperator: LogicOperator;
  position: number;
};

// ============================================
// RULE EVALUATION CONTEXT
// ============================================

export type RuleEvaluationContext = {
  orderItems: RuleOrderItem[];
  orderSubtotal: number;
  customerId: string;
  customerTags: string[];
  isFirstOrder: boolean;
};

export type RuleOrderItem = {
  productId: string;
  variantId: string | null;
  categoryId: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

// ============================================
// RULE EVALUATION RESULT
// ============================================

export type RuleEvaluationResult = {
  ruleId: string;
  ruleName: string;
  ruleType: PromotionRuleType;
  passed: boolean;
  reason: string | null;
  matchedItems?: RuleMatchedItem[];
};

export type RuleMatchedItem = {
  productId: string;
  variantId: string | null;
  quantity: number;
  totalPrice: number;
};

// ============================================
// RULE GROUP EVALUATION
// ============================================

export type RuleGroup = {
  logicOperator: LogicOperator;
  isRequired: boolean;
  rules: RuleDefinition[];
};

export type RuleGroupEvaluationResult = {
  groupId: string;
  logicOperator: LogicOperator;
  isRequired: boolean;
  passed: boolean;
  results: RuleEvaluationResult[];
};

// ============================================
// TARGET VALUES TYPES
// ============================================

export type OrderValueTargetValues = {
  min?: number;
  max?: number;
};

export type QuantityTargetValues = {
  min?: number;
  max?: number;
  productIds?: string[];
};

export type BetweenTargetValues = {
  min: number;
  max: number;
};

// ============================================
// RULE VALIDATOR
// ============================================

export type RuleValidationError = {
  ruleId: string;
  field: string;
  message: string;
};

export type RuleValidationResult = {
  valid: boolean;
  errors: RuleValidationError[];
};
