/**
 * Policy Evaluator Utilities
 *
 * Functions for evaluating policy conditions
 */

/**
 * Condition operator types
 */
export type ConditionOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'IN'
  | 'NOT_IN'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'GREATER_THAN_OR_EQUALS'
  | 'LESS_THAN_OR_EQUALS'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'STARTS_WITH'
  | 'ENDS_WITH'
  | 'BETWEEN'
  | 'IS_NULL'
  | 'IS_NOT_NULL';

/**
 * Policy condition type
 */
export type PolicyCondition = {
  field: string;
  operator: ConditionOperator;
  value: unknown;
  logicalOperator?: 'AND' | 'OR';
};

/**
 * Policy context - the data to evaluate against
 */
export type PolicyContext = Record<string, unknown>;

/**
 * Get nested value from object using dot notation
 */
export const getNestedValue = (obj: PolicyContext, path: string): unknown => {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
};

/**
 * Evaluate a single condition
 */
export const evaluateCondition = (
  condition: PolicyCondition,
  context: PolicyContext,
): boolean => {
  const contextValue = getNestedValue(context, condition.field);
  const conditionValue = condition.value;

  switch (condition.operator) {
    case 'EQUALS':
      return contextValue === conditionValue;

    case 'NOT_EQUALS':
      return contextValue !== conditionValue;

    case 'IN':
      if (!Array.isArray(conditionValue)) return false;

      return conditionValue.includes(contextValue);

    case 'NOT_IN':
      if (!Array.isArray(conditionValue)) return true;

      return !conditionValue.includes(contextValue);

    case 'GREATER_THAN':
      if (
        typeof contextValue !== 'number' ||
        typeof conditionValue !== 'number'
      ) {
        return false;
      }

      return contextValue > conditionValue;

    case 'LESS_THAN':
      if (
        typeof contextValue !== 'number' ||
        typeof conditionValue !== 'number'
      ) {
        return false;
      }

      return contextValue < conditionValue;

    case 'GREATER_THAN_OR_EQUALS':
      if (
        typeof contextValue !== 'number' ||
        typeof conditionValue !== 'number'
      ) {
        return false;
      }

      return contextValue >= conditionValue;

    case 'LESS_THAN_OR_EQUALS':
      if (
        typeof contextValue !== 'number' ||
        typeof conditionValue !== 'number'
      ) {
        return false;
      }

      return contextValue <= conditionValue;

    case 'CONTAINS':
      if (
        typeof contextValue !== 'string' ||
        typeof conditionValue !== 'string'
      ) {
        return false;
      }

      return contextValue.includes(conditionValue);

    case 'NOT_CONTAINS':
      if (
        typeof contextValue !== 'string' ||
        typeof conditionValue !== 'string'
      ) {
        return true;
      }

      return !contextValue.includes(conditionValue);

    case 'STARTS_WITH':
      if (
        typeof contextValue !== 'string' ||
        typeof conditionValue !== 'string'
      ) {
        return false;
      }

      return contextValue.startsWith(conditionValue);

    case 'ENDS_WITH':
      if (
        typeof contextValue !== 'string' ||
        typeof conditionValue !== 'string'
      ) {
        return false;
      }

      return contextValue.endsWith(conditionValue);

    case 'BETWEEN': {
      if (
        typeof contextValue !== 'number' ||
        !Array.isArray(conditionValue) ||
        conditionValue.length !== 2
      ) {
        return false;
      }
      const [min, max] = conditionValue as [number, number];

      return contextValue >= min && contextValue <= max;
    }

    case 'IS_NULL':
      return contextValue === null || contextValue === undefined;

    case 'IS_NOT_NULL':
      return contextValue !== null && contextValue !== undefined;

    default:
      return false;
  }
};

/**
 * Evaluate multiple conditions with logical operators
 */
export const evaluateConditions = (
  conditions: PolicyCondition[],
  context: PolicyContext,
  defaultOperator: 'AND' | 'OR' = 'AND',
): boolean => {
  if (conditions.length === 0) {
    return true;
  }

  const results: boolean[] = [];

  for (const condition of conditions) {
    results.push(evaluateCondition(condition, context));
  }

  // If using default operator for all
  if (conditions.every((c) => !c.logicalOperator)) {
    if (defaultOperator === 'AND') {
      return results.every(Boolean);
    }

    return results.some(Boolean);
  }

  // Complex evaluation with mixed operators
  // This is a simplified implementation - a full implementation would need proper precedence
  let result = results[0];

  for (let i = 1; i < conditions.length; i++) {
    const operator = conditions[i].logicalOperator ?? defaultOperator;

    if (operator === 'AND') {
      result = result && results[i];
    } else {
      result = result || results[i];
    }
  }

  return result;
};

/**
 * Validate that a policy condition is well-formed
 */
export const validateCondition = (
  condition: PolicyCondition,
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!condition.field || typeof condition.field !== 'string') {
    errors.push('Condition field is required and must be a string');
  }

  if (!condition.operator) {
    errors.push('Condition operator is required');
  }

  const validOperators: ConditionOperator[] = [
    'EQUALS',
    'NOT_EQUALS',
    'IN',
    'NOT_IN',
    'GREATER_THAN',
    'LESS_THAN',
    'GREATER_THAN_OR_EQUALS',
    'LESS_THAN_OR_EQUALS',
    'CONTAINS',
    'NOT_CONTAINS',
    'STARTS_WITH',
    'ENDS_WITH',
    'BETWEEN',
    'IS_NULL',
    'IS_NOT_NULL',
  ];

  if (!validOperators.includes(condition.operator)) {
    errors.push(`Invalid operator: ${condition.operator}`);
  }

  // Validate value based on operator
  if (condition.operator === 'IN' || condition.operator === 'NOT_IN') {
    if (!Array.isArray(condition.value)) {
      errors.push(`Operator ${condition.operator} requires an array value`);
    }
  }

  if (condition.operator === 'BETWEEN') {
    if (!Array.isArray(condition.value) || condition.value.length !== 2) {
      errors.push('BETWEEN operator requires an array of exactly 2 values');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
